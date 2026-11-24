import React, { useState, useEffect } from 'react';
import {
  Droplets, Search, Camera, CheckCircle, AlertTriangle, Clock, UserX,
  Share2, Printer, Settings, QrCode, Banknote, X, Save, FileText, MapPin, Phone, Calendar
} from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

// =========================================================================
// ฟังก์ชันจัดการวันที่ภาษาไทย (พ.ศ.) และคำนวณรอบวันเก็บ / วันครบกำหนดชำระ
// =========================================================================
const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const formatThaiMonth = (ymStr, short = false) => {
  if (!ymStr || !ymStr.includes('-')) return ymStr || '-';
  const [y, m] = ymStr.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return ymStr;
  return `${short ? THAI_MONTHS_SHORT[m - 1] : THAI_MONTHS_FULL[m - 1]} ${y + 543}`;
};

const formatThaiDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const computeScheduleDates = (ymStr, readingDay = 25, dueDay = 5, dueNextMonth = true) => {
  const [y, m] = (ymStr || new Date().toISOString().slice(0, 7)).split('-').map(Number);
  const daysInMonth = (yr, mo) => new Date(yr, mo, 0).getDate();

  const rDay = Math.min(Math.max(1, Number(readingDay || 25)), daysInMonth(y, m));
  let dueY = y;
  let dueM = m;
  if (dueNextMonth) {
    dueM += 1;
    if (dueM > 12) { dueM = 1; dueY += 1; }
  }
  const dDay = Math.min(Math.max(1, Number(dueDay || 5)), daysInMonth(dueY, dueM));

  const pad = (n) => String(n).padStart(2, '0');
  return {
    readingISO: `${y}-${pad(m)}-${pad(rDay)}`,
    dueISO: `${dueY}-${pad(dueM)}-${pad(dDay)}`,
    readingThai: `${rDay} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`,
    dueThai: `${dDay} ${THAI_MONTHS_SHORT[dueM - 1]} ${dueY + 543}`
  };
};

// =========================================================================
// ฟังก์ชันสร้าง QR PromptPay มาตรฐาน EMVCo (สแกนได้ทุกแอปธนาคารไทย)
// =========================================================================
const crc16CCITT = (str) => {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

const buildPromptPayQRUrl = (promptpayId, amount) => {
  const clean = String(promptpayId || '').replace(/\D/g, '');
  if (!clean) return null;

  let targetTag = '';
  if (clean.length === 10 && clean.startsWith('0')) {
    const mobile = '0066' + clean.slice(1);
    targetTag = `01${String(mobile.length).padStart(2, '0')}${mobile}`;
  } else if (clean.length === 13) targetTag = `0213${clean}`;
  else if (clean.length === 15) targetTag = `0315${clean}`;
  else return null;

  const merchantInfo = `0016A000000677010111${targetTag}`;
  const tag29 = `29${String(merchantInfo.length).padStart(2, '0')}${merchantInfo}`;
  const numAmount = Number(amount || 0);
  const amountTag =
    numAmount > 0
      ? `54${String(numAmount.toFixed(2).length).padStart(2, '0')}${numAmount.toFixed(2)}`
      : '';

  const rawPayload = `0002010102${numAmount > 0 ? '12' : '11'}${tag29}5802TH5303764${amountTag}6304`;
  const fullPayload = rawPayload + crc16CCITT(rawPayload);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(fullPayload)}`;
};

const WaterBilling = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const villageId = userData.village_id || 1;
  const staffName =
    userData.full_name ||
    `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
    userData.username ||
    'คนจดมิเตอร์';

  // ตัวเลือกเดือน / ปี พ.ศ. ไทย
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const billingMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2];

  const [items, setItems] = useState([]);
  const [apiError, setApiError] = useState('');
  const [settings, setSettings] = useState({
    unit_rate: 7,
    meter_fee: 10,
    reader_fee: 5,
    reading_day: 25,
    due_day: 5,
    due_next_month: true,
    bank_name: '',
    account_name: '',
    account_number: '',
    promptpay_id: ''
  });
  const [summary, setSummary] = useState({
    total_meters: 0, recorded_count: 0, unrecorded_count: 0,
    paid_count: 0, unpaid_count: 0, not_found_count: 0,
    collected_total: 0, collected_cash: 0, collected_qr: 0,
    unpaid_amount: 0, total_arrears_previous: 0, total_reader_fee: 0
  });
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [tabFilter, setTabFilter] = useState('ALL');

  // Modal ตั้งค่า
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ ...settings });

  // Modal จดมิเตอร์
  const [readingTarget, setReadingTarget] = useState(null);
  const [readingForm, setReadingForm] = useState({
    previous_reading: 0,
    current_reading: '',
    reader_fee: 5,
    reading_photo_url: '',
    action_type: 'CASH',
    slip_url: '',
    note: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal ใบเสร็จ
  const [receiptItem, setReceiptItem] = useState(null);

  const schedule = computeScheduleDates(
    billingMonth,
    settings.reading_day,
    settings.due_day,
    settings.due_next_month
  );

  const fetchBillingData = async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await fetch(`${API_URL}/api/water/bills/${villageId}?month=${billingMonth}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setApiError('ไม่พบ API /api/water/bills ในเซิร์ฟเวอร์ (กรุณาตรวจสอบว่า Push server.js ขึ้น Railway แล้ว)');
        setLoading(false);
        return;
      }
      const result = await res.json();
      if (!res.ok || !result.success) {
        setApiError(`เซิร์ฟเวอร์แจ้ง Error: ${result.message || res.status} (ตรวจสอบว่าได้รัน SQL สร้างตาราง water_settings และ water_bills ใน Neon แล้ว)`);
        setLoading(false);
        return;
      }
      setItems(result.data || []);
      setSummary(result.summary || summary);
      if (result.settings) {
        setSettings(result.settings);
        setSettingsForm(result.settings);
      }
    } catch (err) {
      setApiError(`เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBillingData(); }, [villageId, billingMonth]);

  // บันทึกการตั้งค่า
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/water/settings/${villageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settingsForm, updated_by: staffName })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setSettings(result.data);
        setIsSettingsOpen(false);
      } else {
        alert(result.message || 'บันทึกไม่สำเร็จ');
      }
    } catch (err) {
      alert('บันทึกตั้งค่าไม่สำเร็จ');
    }
  };

  // เปิด Modal จดมิเตอร์
  const openReadingModal = (item) => {
    setReadingTarget(item);
    const prevVal = item.bill_id ? Number(item.previous_reading || 0) : Number(item.last_meter_reading || 0);
    const currVal = item.bill_id ? String(item.current_reading || '') : '';
    const rFeeVal = item.bill_id ? Number(item.reader_fee ?? settings.reader_fee ?? 0) : Number(settings.reader_fee ?? 0);

    let defaultAction = 'CASH';
    if (item.bill_id) {
      if (item.bill_payment_status === 'PAID') {
        defaultAction = item.payment_method === 'CASH' ? 'CASH' : 'QR_PAID';
      } else if (item.visit_status === 'NOT_FOUND') {
        defaultAction = 'NOT_FOUND';
      } else {
        defaultAction = 'UNPAID';
      }
    }

    setReadingForm({
      previous_reading: prevVal,
      current_reading: currVal,
      reader_fee: rFeeVal,
      reading_photo_url: item.reading_photo_url || '',
      action_type: defaultAction,
      slip_url: item.slip_url || '',
      note: item.bill_note || ''
    });
  };

  const handleFileBase64 = (field) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setReadingForm((prev) => ({ ...prev, [field]: reader.result }));
    reader.readAsDataURL(file);
  };

  // คำนวณยอดแบบเรียลไทม์ใน Modal จดมิเตอร์ (รวมค่าจ้างคนจดมิเตอร์ + ยอดค้างเดือนก่อน)
  const calcPrev = Number(readingForm.previous_reading || 0);
  const calcCurr = readingForm.current_reading === '' ? calcPrev : Number(readingForm.current_reading);
  const calcUnits = Math.max(0, Number((calcCurr - calcPrev).toFixed(2)));
  const calcWaterPrice = Number((calcUnits * Number(settings.unit_rate || 0)).toFixed(2));
  const calcMeterFee = Number(settings.meter_fee || 0);
  const calcReaderFee = Number(readingForm.reader_fee || 0);
  const calcCurrentTotal = Number((calcWaterPrice + calcMeterFee + calcReaderFee).toFixed(2));
  const calcArrearsTotal = Number(readingTarget?.arrears_total || 0);
  const calcGrandTotal = Number((calcCurrentTotal + calcArrearsTotal).toFixed(2));
  const modalQrUrl = buildPromptPayQRUrl(settings.promptpay_id, calcCurrentTotal);

  // บันทึกการจดมิเตอร์
  const handleSaveReading = async (e) => {
    e.preventDefault();
    if (readingForm.current_reading === '' || Number(readingForm.current_reading) < calcPrev) {
      return alert('กรุณากรอกเลขมิเตอร์ปัจจุบันให้ถูกต้อง (ต้องไม่น้อยกว่าเดือนก่อน)');
    }

    let visit_status = 'NORMAL';
    let payment_status = 'UNPAID';
    let payment_method = 'NONE';

    if (readingForm.action_type === 'CASH') {
      payment_status = 'PAID';
      payment_method = 'CASH';
    } else if (readingForm.action_type === 'QR_PAID') {
      payment_status = 'PAID';
      payment_method = 'QR_TRANSFER';
    } else if (readingForm.action_type === 'NOT_FOUND') {
      visit_status = 'NOT_FOUND';
      payment_status = 'UNPAID';
    } else {
      visit_status = 'DEFERRED';
      payment_status = 'UNPAID';
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/water/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          village_id: villageId,
          meter_id: readingTarget.meter_id,
          household_id: readingTarget.household_id,
          member_id: readingTarget.member_id,
          billing_month: billingMonth,
          previous_reading: calcPrev,
          current_reading: Number(readingForm.current_reading),
          unit_rate: Number(settings.unit_rate || 0),
          meter_fee: calcMeterFee,
          reader_fee: calcReaderFee,
          reading_date: schedule.readingISO,
          due_date: schedule.dueISO,
          reading_photo_url: readingForm.reading_photo_url,
          visit_status,
          payment_status,
          payment_method,
          slip_url: readingForm.slip_url,
          note: readingForm.note,
          recorded_by: staffName
        })
      });
      const result = await res.json();
      if (result.success) {
        const savedBill = result.data;
        const mergedReceipt = {
          ...readingTarget,
          ...savedBill,
          bill_payment_status: savedBill.payment_status,
          grand_total_with_arrears: Number(savedBill.total_amount || 0) + Number(readingTarget.arrears_total || 0)
        };
        setReadingTarget(null);
        await fetchBillingData();
        setReceiptItem(mergedReceipt);
      } else {
        alert(result.message || 'บันทึกไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // รับชำระบิลค้างจ่ายทันที
  const handleMarkPaid = async (bill, method) => {
    if (!window.confirm(`ยืนยันรับชำระบิล ${bill.bill_no} ยอด ฿${Number(bill.total_amount).toLocaleString()} ด้วยวิธี ${method === 'CASH' ? 'เงินสด' : 'โอน/QR'}?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/water/bills/${bill.bill_id}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: method, payment_status: 'PAID', changed_by: staffName })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setReceiptItem({ ...bill, bill_payment_status: 'PAID', payment_method: method });
        fetchBillingData();
      }
    } catch (err) {
      alert('บันทึกการชำระไม่สำเร็จ');
    }
  };

  // แชร์ใบเสร็จ / ใบแจ้งหนี้ (ภาษาไทยครบถ้วน รวมค่าจ้างคนจดมิเตอร์ + รอบค้างชำระ)
  const handleShareReceipt = async (bill) => {
    const isPaid = bill.bill_payment_status === 'PAID';
    const statusText = isPaid
      ? `ชำระแล้ว (${bill.payment_method === 'CASH' ? 'เงินสด' : 'โอน/QR'})`
      : 'รอชำระ / ค้างชำระ';

    const arrearsLines =
      Array.isArray(bill.arrears_list) && bill.arrears_list.length > 0
        ? [
            `ยอดค้างชำระเดือนก่อน:`,
            ...bill.arrears_list.map(
              (a) => `  - รอบ ${formatThaiMonth(a.billing_month, true)}: ${Number(a.total_amount).toLocaleString()} บาท`
            ),
            `รวมยอดค้างชำระเดิม: ${Number(bill.arrears_total || 0).toLocaleString()} บาท`
          ]
        : [];

    const dueDisplay = bill.due_date ? formatThaiDate(bill.due_date) : schedule.dueThai;
    const readingDisplay = bill.reading_date ? formatThaiDate(bill.reading_date) : schedule.readingThai;
    const grandTotal = Number(bill.total_amount || 0) + Number(bill.arrears_total || 0);

    const text = [
      `💧 ${isPaid ? 'ใบเสร็จรับเงินค่าน้ำประปาหมู่บ้าน' : 'ใบแจ้งหนี้ค่าน้ำประปาหมู่บ้าน'}`,
      `เลขที่บิล: ${bill.bill_no} | รอบเดือน: ${formatThaiMonth(bill.billing_month)}`,
      `วันที่จดมิเตอร์: ${readingDisplay} | กำหนดชำระภายใน: ${dueDisplay}`,
      `ผู้ใช้น้ำ: ${bill.full_name}`,
      `ที่อยู่: ${bill.full_address}`,
      `เลขมิเตอร์: ${bill.meter_code}`,
      `เลขเดิม ${bill.previous_reading} → เลขใหม่ ${bill.current_reading} = ใช้ไป ${bill.units_used} หน่วย`,
      `- ค่าน้ำ (${bill.units_used} x ${bill.unit_rate} บ.): ${(Number(bill.units_used) * Number(bill.unit_rate)).toLocaleString()} บาท`,
      `- ค่ารักษามิเตอร์: ${Number(bill.meter_fee || 0).toLocaleString()} บาท`,
      `- ค่าจ้างคนจดมิเตอร์: ${Number(bill.reader_fee || 0).toLocaleString()} บาท`,
      `ยอดรวมรอบเดือนนี้: ${Number(bill.total_amount).toLocaleString()} บาท`,
      ...arrearsLines,
      `ยอดรวมสุทธิทั้งหมด: ${grandTotal.toLocaleString()} บาท`,
      `สถานะบิลนี้: ${statusText}`,
      settings.promptpay_id ? `พร้อมเพย์: ${settings.promptpay_id} (${settings.account_name || 'ประปาหมู่บ้าน'})` : '',
      `ดูบิล/สแกนจ่ายได้ที่: https://banrao.life/my-water-bills`
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: `บิลค่าน้ำ ${bill.bill_no}`, text });
        return;
      } catch (e) {}
    }
    navigator.clipboard?.writeText(text);
    alert('คัดลอกใบเสร็จ/ใบแจ้งหนี้เรียบร้อยแล้ว สามารถวางส่งใน LINE ให้เจ้าของบ้านได้เลย');
  };

  const filteredItems = items.filter((it) => {
    const q = searchText.trim().toLowerCase();
    const matchText =
      !q ||
      (it.house_no || '').toLowerCase().includes(q) ||
      (it.meter_code || '').toLowerCase().includes(q) ||
      (it.full_name || '').toLowerCase().includes(q);

    const matchTab =
      tabFilter === 'ALL' ||
      (tabFilter === 'UNRECORDED' && !it.bill_id) ||
      (tabFilter === 'PAID' && it.bill_payment_status === 'PAID') ||
      (tabFilter === 'UNPAID' && ((it.bill_id && it.bill_payment_status !== 'PAID') || Number(it.arrears_total || 0) > 0));

    return matchText && matchTab;
  });

  const unpaidHouses = items.filter(
    (it) => (it.bill_id && it.bill_payment_status !== 'PAID') || Number(it.arrears_total || 0) > 0
  );

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans">
      <TopNavbar userData={userData} />

      <div className="max-w-7xl mx-auto p-4 pt-20">
        {/* แถบแจ้งเตือนหาก Backend / SQL ยังไม่พร้อม */}
        {apiError && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-300 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* ส่วนหัว + ตัวเลือกเดือน/ปี พ.ศ. ไทย + ปุ่มตั้งค่า */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Droplets size={24} /></div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800">จดมิเตอร์และออกบิลค่าน้ำประปา</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                ค่าน้ำ <strong>{settings.unit_rate}</strong> บ./หน่วย • รักษามิเตอร์ <strong>{settings.meter_fee}</strong> บ. • ค่าจ้างจด <strong>{settings.reader_fee || 0}</strong> บ.
              </p>
              <div className="text-xs text-blue-700 font-semibold mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md">
                  <Calendar size={12} /> เก็บทุกวันที่ {settings.reading_day || 25} ({schedule.readingThai})
                </span>
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md">
                  ครบกำหนดชำระภายใน: {schedule.dueThai}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {/* ตัวเลือกเดือนแบบภาษาไทย */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 bg-white"
            >
              {THAI_MONTHS_FULL.map((name, idx) => (
                <option key={name} value={idx + 1}>{name}</option>
              ))}
            </select>

            {/* ตัวเลือกปี พ.ศ. */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 bg-white"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>พ.ศ. {y + 543}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Settings size={16} /> ตั้งค่าค่าน้ำ / รอบวันเก็บ / บัญชี
            </button>
          </div>
        </div>

        {/* แดชบอร์ดสรุปการทำงานของคนจดมิเตอร์ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm">
            <div className="text-xs font-bold text-emerald-700">เก็บเงินได้แล้ว ({formatThaiMonth(billingMonth, true)})</div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">฿{summary.collected_total.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              เงินสด ฿{summary.collected_cash.toLocaleString()} • โอน/QR ฿{summary.collected_qr.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
            <div className="text-xs font-bold text-amber-700">ยอดค้างชำระรวม ({summary.unpaid_count} หลังรอบนี้)</div>
            <div className="text-2xl font-extrabold text-amber-700 mt-1">
              ฿{(Number(summary.unpaid_amount || 0) + Number(summary.total_arrears_previous || 0)).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              รอบนี้ ฿{summary.unpaid_amount.toLocaleString()} • ค้างเดือนก่อน ฿{(summary.total_arrears_previous || 0).toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm">
            <div className="text-xs font-bold text-blue-700">ความคืบหน้า & ค่าจ้างจดมิเตอร์</div>
            <div className="text-2xl font-extrabold text-blue-700 mt-1">
              {summary.recorded_count} / {summary.total_meters} หลัง
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              ค่าจ้างจดมิเตอร์รวม: <strong className="text-blue-700">฿{(summary.total_reader_fee || 0).toLocaleString()}</strong>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-600">บ้านที่ค้างจ่าย (รอบนี้ + ย้อนหลัง)</div>
            {unpaidHouses.length === 0 ? (
              <div className="text-xs text-emerald-600 font-bold mt-2">ไม่มีบ้านค้างจ่าย</div>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                {unpaidHouses.map((u) => {
                  const dueSum =
                    (u.bill_id && u.bill_payment_status !== 'PAID' ? Number(u.total_amount || 0) : 0) +
                    Number(u.arrears_total || 0);
                  return (
                    <button
                      key={u.meter_id}
                      type="button"
                      onClick={() => (u.bill_id ? setReceiptItem(u) : openReadingModal(u))}
                      className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full hover:bg-amber-200"
                    >
                      บ้าน {u.house_no} (฿{dueSum.toLocaleString()})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* แถบค้นหาและตัวกรอง */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm mb-5 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา บ้านเลขที่ / เลขมิเตอร์ / ชื่อผู้ใช้น้ำ..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {[
              { code: 'ALL', label: `ทั้งหมด (${summary.total_meters})` },
              { code: 'UNRECORDED', label: `ยังไม่จด (${summary.unrecorded_count})` },
              { code: 'PAID', label: `ชำระแล้ว (${summary.paid_count})` },
              { code: 'UNPAID', label: `ค้างจ่าย/ไม่พบ (${unpaidHouses.length})` }
            ].map((t) => (
              <button
                key={t.code}
                onClick={() => setTabFilter(t.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                  tabFilter === t.code ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* รายการบ้านสำหรับเดินจดมิเตอร์ */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">กำลังโหลดข้อมูลการจดมิเตอร์...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
            ไม่พบรายการผู้ใช้น้ำในเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((it) => {
              const isRecorded = Boolean(it.bill_id);
              const isPaid = it.bill_payment_status === 'PAID';
              const isNotFound = it.visit_status === 'NOT_FOUND';
              const hasArrears = Array.isArray(it.arrears_list) && it.arrears_list.length > 0;

              return (
                <div key={it.meter_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center gap-2 mb-3">
                      <span className="text-xs font-mono font-extrabold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                        บ้าน {it.house_no} • {it.meter_code}
                      </span>
                      {!isRecorded ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                          <Clock size={12} /> รอจดมิเตอร์
                        </span>
                      ) : isPaid ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <CheckCircle size={12} /> ชำระแล้ว ({it.payment_method === 'CASH' ? 'เงินสด' : 'QR/โอน'})
                        </span>
                      ) : isNotFound ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                          <UserX size={12} /> ไม่พบผู้ใช้น้ำ
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle size={12} /> ค้างชำระ
                        </span>
                      )}
                    </div>

                    <div className="flex gap-3 items-center mb-3">
                      <img src={it.member_image} alt="" className="w-12 h-12 rounded-xl object-cover border" />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">{it.full_name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1"><Phone size={11} /> {it.phone || '-'}</div>
                        <div className="text-xs text-slate-500">เลขมิเตอร์ล่าสุด: <strong className="text-slate-800">{it.last_meter_reading}</strong></div>
                      </div>
                    </div>

                    {/* แสดงยอดค้างย้อนหลัง (ระบุรอบเดือนภาษาไทย) */}
                    {hasArrears && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs mb-3">
                        <div className="font-bold text-amber-900">
                          ยอดค้างเดิมรวม: ฿{Number(it.arrears_total).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-amber-800 mt-0.5">
                          ค้างรอบ:{' '}
                          {it.arrears_list
                            .map((a) => `${formatThaiMonth(a.billing_month, true)} (฿${Number(a.total_amount).toLocaleString()})`)
                            .join(', ')}
                        </div>
                      </div>
                    )}

                    {isRecorded && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500">เลขจด ({it.previous_reading} → {it.current_reading}):</span>
                          <span className="font-bold text-slate-800">{it.units_used} หน่วย</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ค่าจ้างคนจดมิเตอร์:</span>
                          <span className="font-semibold text-slate-700">฿{Number(it.reader_fee || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ยอดบิลรอบนี้:</span>
                          <span className="font-extrabold text-blue-700 text-sm">฿{Number(it.total_amount).toLocaleString()}</span>
                        </div>
                        {hasArrears && (
                          <div className="flex justify-between border-t pt-1 text-amber-800 font-extrabold">
                            <span>รวมยอดค้างทั้งสิ้น:</span>
                            <span>฿{Number(it.grand_total_with_arrears).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openReadingModal(it)}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                    >
                      {isRecorded ? 'แก้ไขเลขจด / รับชำระ' : 'จดเลขมิเตอร์'}
                    </button>

                    {isRecorded && (
                      <button
                        type="button"
                        onClick={() => setReceiptItem(it)}
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1"
                      >
                        <FileText size={14} /> ใบเสร็จ/แชร์
                      </button>
                    )}

                    {it.latitude && it.longitude && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${it.latitude},${it.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                        title="นำทางไปที่มิเตอร์"
                      >
                        <MapPin size={15} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Modal 1: ตั้งค่าค่าน้ำ ค่าจ้างจด รอบวันเก็บ/ครบกำหนด และบัญชีรับเงิน */}
      {/* ================================================================= */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
              <h2 className="font-bold text-base flex items-center gap-2"><Settings size={18} /> ตั้งค่าค่าน้ำ / รอบวันเก็บ / บัญชีรับเงิน</h2>
              <button type="button" onClick={() => setIsSettingsOpen(false)}><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {/* อัตราค่าน้ำและค่าจ้างจดมิเตอร์ */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ค่าน้ำ/หน่วย (บ.) *</label>
                  <input type="number" step="0.01" required value={settingsForm.unit_rate} onChange={(e) => setSettingsForm({ ...settingsForm, unit_rate: e.target.value })} className="w-full p-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">รักษามิเตอร์ (บ.)</label>
                  <input type="number" step="0.01" value={settingsForm.meter_fee} onChange={(e) => setSettingsForm({ ...settingsForm, meter_fee: e.target.value })} className="w-full p-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-blue-800 mb-1">ค่าจ้างจดมิเตอร์ (บ.)</label>
                  <input type="number" step="0.01" value={settingsForm.reader_fee ?? 0} onChange={(e) => setSettingsForm({ ...settingsForm, reader_fee: e.target.value })} className="w-full p-2 border border-blue-300 rounded-lg text-sm bg-blue-50/40" />
                </div>
              </div>

              {/* รอบวันที่เก็บ & วันครบกำหนดชำระ */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-2">
                <div className="text-xs font-bold text-amber-900">รอบวันที่จดมิเตอร์และกำหนดชำระเงิน</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">เก็บทุกวันที่ (1-31)</label>
                    <input type="number" min="1" max="31" required value={settingsForm.reading_day ?? 25} onChange={(e) => setSettingsForm({ ...settingsForm, reading_day: e.target.value })} className="w-full p-2 border rounded-lg text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ต้องจ่ายภายในวันที่ (1-31)</label>
                    <input type="number" min="1" max="31" required value={settingsForm.due_day ?? 5} onChange={(e) => setSettingsForm({ ...settingsForm, due_day: e.target.value })} className="w-full p-2 border rounded-lg text-sm bg-white" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={Boolean(settingsForm.due_next_month)}
                    onChange={(e) => setSettingsForm({ ...settingsForm, due_next_month: e.target.checked })}
                  />
                  <span>กำหนดชำระใน <strong>เดือนถัดไป</strong> (เช่น จด 25 พ.ย. → จ่ายภายใน 5 ธ.ค.)</span>
                </label>
              </div>

              {/* บัญชีธนาคารและพร้อมเพย์ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อธนาคาร</label>
                <input type="text" placeholder="เช่น ธ.ก.ส. / กรุงไทย / กสิกรไทย" value={settingsForm.bank_name || ''} onChange={(e) => setSettingsForm({ ...settingsForm, bank_name: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อบัญชีรับเงิน</label>
                <input type="text" placeholder="เช่น คณะกรรมการประปาหมู่บ้าน หมู่ 6" value={settingsForm.account_name || ''} onChange={(e) => setSettingsForm({ ...settingsForm, account_name: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่บัญชีธนาคาร</label>
                <input type="text" placeholder="XXX-X-XXXXX-X" value={settingsForm.account_number || ''} onChange={(e) => setSettingsForm({ ...settingsForm, account_number: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm font-mono" />
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <label className="block text-xs font-bold text-blue-900 mb-1">หมายเลขพร้อมเพย์ (เบอร์โทร 10 หลัก หรือเลข 13 หลัก)</label>
                <input type="text" placeholder="ใช้สร้าง QR Code สแกนจ่ายอัตโนมัติ" value={settingsForm.promptpay_id || ''} onChange={(e) => setSettingsForm({ ...settingsForm, promptpay_id: e.target.value })} className="w-full p-2.5 border border-blue-200 rounded-lg text-sm font-mono bg-white" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex gap-2">
              <button type="button" onClick={() => setIsSettingsOpen(false)} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 text-sm">ยกเลิก</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-1.5"><Save size={16} /> บันทึกตั้งค่า</button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* Modal 2: จดมิเตอร์ + กรอกค่าจ้างจดมิเตอร์ + ถ่ายรูป + QR */}
      {/* ================================================================= */}
      {readingTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveReading} className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center">
              <div>
                <h2 className="font-bold text-base">จดมิเตอร์: บ้านเลขที่ {readingTarget.house_no}</h2>
                <div className="text-xs text-blue-100">
                  {readingTarget.full_name} • มิเตอร์ {readingTarget.meter_code} • รอบ {formatThaiMonth(billingMonth)}
                </div>
              </div>
              <button type="button" onClick={() => setReadingTarget(null)}><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* รอบวันเก็บ / ครบกำหนด */}
              <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between text-slate-600">
                <span>วันที่จด: <strong>{schedule.readingThai}</strong></span>
                <span>จ่ายภายใน: <strong className="text-amber-700">{schedule.dueThai}</strong></span>
              </div>

              {/* กรอกเลขมิเตอร์ & ค่าจ้างคนจดมิเตอร์ */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">เลขเดือนก่อน</label>
                  <input type="number" step="0.01" value={readingForm.previous_reading} onChange={(e) => setReadingForm({ ...readingForm, previous_reading: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm bg-slate-100 font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-blue-800 mb-1">เลขที่จดวันนี้ *</label>
                  <input required type="number" step="0.01" min={calcPrev} placeholder="กรอกเลข..." value={readingForm.current_reading} onChange={(e) => setReadingForm({ ...readingForm, current_reading: e.target.value })} className="w-full p-2.5 border-2 border-blue-400 rounded-lg text-sm font-extrabold font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 mb-1">ค่าจ้างคนจด (บ.)</label>
                  <input type="number" step="0.01" min="0" value={readingForm.reader_fee} onChange={(e) => setReadingForm({ ...readingForm, reader_fee: e.target.value })} className="w-full p-2.5 border border-emerald-300 rounded-lg text-sm font-bold bg-emerald-50/40" />
                </div>
              </div>

              {/* กล่องคำนวณยอดอัตโนมัติ */}
              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-blue-900">
                  <span>ค่าน้ำ ({calcUnits} หน่วย × {settings.unit_rate} บ.)</span>
                  <strong>฿{calcWaterPrice.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between text-blue-900">
                  <span>ค่ารักษามิเตอร์</span>
                  <span>฿{calcMeterFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>ค่าจ้างคนจดมิเตอร์</span>
                  <span>฿{calcReaderFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-blue-200 pt-1.5 text-sm font-extrabold text-blue-800">
                  <span>รวมยอดบิลรอบเดือนนี้</span>
                  <span>฿{calcCurrentTotal.toLocaleString()}</span>
                </div>
                {calcArrearsTotal > 0 && (
                  <>
                    <div className="flex justify-between text-amber-800 font-bold pt-1">
                      <span>ยอดค้างเดือนก่อน ({readingTarget.arrears_list.map((a) => formatThaiMonth(a.billing_month, true)).join(', ')})</span>
                      <span>฿{calcArrearsTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-300 pt-1.5 text-base font-extrabold text-red-700">
                      <span>ยอดรวมสุทธิทั้งหมด (รวมค้าง)</span>
                      <span>฿{calcGrandTotal.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              {/* ถ่ายรูปหน้าปัดมิเตอร์ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ภาพถ่ายหน้าปัดมิเตอร์ (หลักฐานการจด)</label>
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 text-sm text-slate-600">
                  <Camera size={18} /> ถ่ายรูปหน้าปัดมิเตอร์
                  <input type="file" accept="image/*" capture="environment" onChange={handleFileBase64('reading_photo_url')} className="hidden" />
                </label>
                {readingForm.reading_photo_url && (
                  <img src={readingForm.reading_photo_url} alt="Meter Evidence" className="mt-2 w-full h-36 object-cover rounded-xl border" />
                )}
              </div>

              {/* เลือกสถานะการชำระ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">ผลการจดมิเตอร์และการชำระเงิน *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { code: 'CASH', label: 'ชำระเงินสดแล้ว', icon: Banknote, activeCls: 'border-emerald-600 bg-emerald-50 text-emerald-800' },
                    { code: 'QR_PAID', label: 'สแกน QR จ่ายแล้ว', icon: QrCode, activeCls: 'border-blue-600 bg-blue-50 text-blue-800' },
                    { code: 'UNPAID', label: 'ยังไม่ชำระ (ค้างจ่าย)', icon: AlertTriangle, activeCls: 'border-amber-600 bg-amber-50 text-amber-800' },
                    { code: 'NOT_FOUND', label: 'ไม่พบผู้ใช้น้ำ', icon: UserX, activeCls: 'border-orange-600 bg-orange-50 text-orange-800' }
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = readingForm.action_type === opt.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => setReadingForm({ ...readingForm, action_type: opt.code })}
                        className={`p-2.5 rounded-xl border-2 text-xs font-bold flex items-center gap-2 ${active ? opt.activeCls : 'border-slate-200 text-slate-600 bg-white'}`}
                      >
                        <Icon size={16} /> {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {readingForm.action_type === 'QR_PAID' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2">
                  {modalQrUrl ? (
                    <>
                      <div className="text-xs font-bold text-blue-800">สแกน QR พร้อมเพย์ ยอด ฿{calcCurrentTotal.toLocaleString()}</div>
                      <img src={modalQrUrl} alt="PromptPay QR" className="mx-auto w-48 h-48 rounded-xl border bg-white p-2" />
                      <div className="text-xs text-slate-600">{settings.bank_name} • {settings.account_name} ({settings.promptpay_id})</div>
                    </>
                  ) : (
                    <div className="text-xs text-red-600 font-bold">กรุณาตั้งค่าหมายเลขพร้อมเพย์ที่ปุ่มตั้งค่าด้านบนก่อนครับ</div>
                  )}
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 cursor-pointer pt-1">
                    <Camera size={14} /> แนบรูปสลิปการโอน (ถ้ามี)
                    <input type="file" accept="image/*" onChange={handleFileBase64('slip_url')} className="hidden" />
                  </label>
                  {readingForm.slip_url && <img src={readingForm.slip_url} alt="Slip" className="mx-auto h-28 rounded-lg border" />}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                <input type="text" placeholder="เช่น ฝากบิลไว้หน้าบ้าน" value={readingForm.note} onChange={(e) => setReadingForm({ ...readingForm, note: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex gap-2">
              <button type="button" onClick={() => setReadingTarget(null)} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 text-sm">ยกเลิก</button>
              <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-1.5">
                <Save size={16} /> {submitting ? 'กำลังบันทึก...' : 'บันทึกและออกใบเสร็จ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* Modal 3: ใบเสร็จรับเงิน / ใบแจ้งหนี้ (วันที่ไทย + ค่าจ้างจด + ยอดค้างรวม) */}
      {/* ================================================================= */}
      {receiptItem && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <span className="font-bold text-sm">
                {receiptItem.bill_payment_status === 'PAID' ? 'ใบเสร็จรับเงินค่าน้ำประปา' : 'ใบแจ้งหนี้ค่าน้ำประปาหมู่บ้าน'}
              </span>
              <button type="button" onClick={() => setReceiptItem(null)}><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 text-sm">
              <div className="text-center border-b pb-3">
                <div className="font-extrabold text-base text-slate-900">ประปาหมู่บ้าน (Ban Rao)</div>
                <div className="text-xs text-slate-500">
                  เลขที่บิล: {receiptItem.bill_no} • รอบเดือน {formatThaiMonth(receiptItem.billing_month)}
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  วันที่จดมิเตอร์: <strong>{receiptItem.reading_date ? formatThaiDate(receiptItem.reading_date) : schedule.readingThai}</strong> •{' '}
                  ชำระภายใน: <strong className="text-amber-700">{receiptItem.due_date ? formatThaiDate(receiptItem.due_date) : schedule.dueThai}</strong>
                </div>
                <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full ${receiptItem.bill_payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                  {receiptItem.bill_payment_status === 'PAID'
                    ? `ชำระแล้ว (${receiptItem.payment_method === 'CASH' ? 'เงินสด' : 'โอน/QR'})`
                    : receiptItem.visit_status === 'NOT_FOUND' ? 'ค้างชำระ (ไม่พบผู้ใช้น้ำ)' : 'ค้างชำระ'}
                </span>
              </div>

              <div className="text-xs space-y-1 text-slate-700">
                <div><strong>ผู้ใช้น้ำ:</strong> {receiptItem.full_name}</div>
                <div><strong>ที่อยู่:</strong> {receiptItem.full_address}</div>
                <div><strong>เลขมิเตอร์:</strong> {receiptItem.meter_code}</div>
              </div>

              {/* รายการคำนวณท้ายใบเสร็จ */}
              <div className="bg-slate-50 p-3 rounded-xl border text-xs space-y-1.5">
                <div className="flex justify-between"><span>เลขมิเตอร์ครั้งก่อน</span><span className="font-mono">{receiptItem.previous_reading}</span></div>
                <div className="flex justify-between"><span>เลขมิเตอร์ครั้งนี้</span><span className="font-mono font-bold">{receiptItem.current_reading}</span></div>
                <div className="flex justify-between border-t pt-1.5"><span>จำนวนน้ำที่ใช้</span><strong>{receiptItem.units_used} หน่วย</strong></div>
                <div className="flex justify-between"><span>ค่าน้ำ ({receiptItem.units_used} × {receiptItem.unit_rate} บ.)</span><span>฿{(Number(receiptItem.units_used) * Number(receiptItem.unit_rate)).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>ค่ารักษามิเตอร์</span><span>฿{Number(receiptItem.meter_fee || 0).toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-emerald-800"><span>ค่าจ้างคนจดมิเตอร์</span><span>฿{Number(receiptItem.reader_fee || 0).toLocaleString()}</span></div>
                <div className="flex justify-between border-t pt-2 text-sm font-extrabold text-blue-700">
                  <span>ยอดรวมรอบเดือนนี้</span><span>฿{Number(receiptItem.total_amount).toLocaleString()}</span>
                </div>

                {/* แสดงยอดค้างชำระรอบเดือนก่อน + ยอดค้างรวม */}
                {Array.isArray(receiptItem.arrears_list) && receiptItem.arrears_list.length > 0 && (
                  <div className="border-t border-dashed border-amber-300 pt-2 mt-2 space-y-1">
                    <div className="font-bold text-amber-800">รายการค้างชำระรอบเดือนก่อน:</div>
                    {receiptItem.arrears_list.map((a) => (
                      <div key={a.bill_id} className="flex justify-between text-amber-900 pl-2">
                        <span>• รอบเดือน {formatThaiMonth(a.billing_month, true)}</span>
                        <span>฿{Number(a.total_amount).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-amber-900 pt-1">
                      <span>ยอดค้างชำระรวม</span>
                      <span>฿{Number(receiptItem.arrears_total || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-base font-extrabold text-red-700">
                      <span>ยอดรวมสุทธิทั้งสิ้น</span>
                      <span>฿{(Number(receiptItem.total_amount || 0) + Number(receiptItem.arrears_total || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {receiptItem.reading_photo_url && (
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">ภาพถ่ายหน้าปัดมิเตอร์หลักฐาน:</div>
                  <img src={receiptItem.reading_photo_url} alt="Evidence" className="w-full h-32 object-cover rounded-xl border" />
                </div>
              )}

              {receiptItem.bill_payment_status !== 'PAID' &&
                buildPromptPayQRUrl(
                  settings.promptpay_id,
                  Number(receiptItem.total_amount || 0) + Number(receiptItem.arrears_total || 0)
                ) && (
                  <div className="text-center bg-blue-50 p-3 rounded-xl border border-blue-200">
                    <div className="text-xs font-bold text-blue-900 mb-1">สแกน QR พร้อมเพย์เพื่อชำระค่าน้ำ</div>
                    <img
                      src={buildPromptPayQRUrl(
                        settings.promptpay_id,
                        Number(receiptItem.total_amount || 0) + Number(receiptItem.arrears_total || 0)
                      )}
                      alt="QR"
                      className="mx-auto w-40 h-40 rounded-lg bg-white p-1.5 border"
                    />
                    <div className="text-[11px] text-slate-600 mt-1">{settings.account_name} ({settings.promptpay_id})</div>
                  </div>
                )}

              {receiptItem.bill_payment_status !== 'PAID' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button type="button" onClick={() => handleMarkPaid(receiptItem, 'CASH')} className="py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">รับชำระ (เงินสด)</button>
                  <button type="button" onClick={() => handleMarkPaid(receiptItem, 'QR_TRANSFER')} className="py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">รับชำระ (โอน/QR)</button>
                </div>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 border-t flex gap-2">
              <button type="button" onClick={() => handleShareReceipt(receiptItem)} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                <Share2 size={15} /> แชร์ให้เจ้าของบ้าน
              </button>
              <button type="button" onClick={() => window.print()} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1">
                <Printer size={15} /> พิมพ์
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavbar />
    </div>
  );
};

export default WaterBilling;