import React, { useState, useEffect } from 'react';
import {
  Droplets, Search, Camera, CheckCircle, AlertTriangle, Clock, UserX,
  Share2, Printer, Settings, QrCode, Banknote, X, Save, FileText, MapPin, Phone
} from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

// =========================================================================
// ฟังก์ชันสร้าง Payload มาตรฐาน PromptPay EMVCo (สแกนได้ทุกแอปธนาคารไทย)
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
  } else if (clean.length === 13) {
    targetTag = `0213${clean}`;
  } else if (clean.length === 15) {
    targetTag = `0315${clean}`;
  } else {
    return null;
  }

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
  const staffName = userData.full_name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.username || 'คนจดมิเตอร์';

  const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({
    unit_rate: 7, meter_fee: 10, bank_name: '', account_name: '', account_number: '', promptpay_id: ''
  });
  const [summary, setSummary] = useState({
    total_meters: 0, recorded_count: 0, unrecorded_count: 0,
    paid_count: 0, unpaid_count: 0, not_found_count: 0,
    collected_total: 0, collected_cash: 0, collected_qr: 0, unpaid_amount: 0
  });
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [tabFilter, setTabFilter] = useState('ALL'); // ALL | UNRECORDED | PAID | UNPAID

  // Modal ตั้งค่าเรทค่าน้ำและบัญชีรับเงิน
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ ...settings });

  // Modal จดมิเตอร์
  const [readingTarget, setReadingTarget] = useState(null);
  const [readingForm, setReadingForm] = useState({
    previous_reading: 0,
    current_reading: '',
    reading_photo_url: '',
    action_type: 'CASH', // CASH | QR_PAID | UNPAID | NOT_FOUND
    slip_url: '',
    note: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal ใบเสร็จ / ใบแจ้งหนี้ & แชร์
  const [receiptItem, setReceiptItem] = useState(null);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/water/bills/${villageId}?month=${billingMonth}`);
      const result = await res.json();
      if (result.success) {
        setItems(result.data || []);
        setSummary(result.summary || summary);
        if (result.settings) {
          setSettings(result.settings);
          setSettingsForm(result.settings);
        }
      }
    } catch (err) {
      console.error('Fetch water billing error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBillingData(); }, [villageId, billingMonth]);

  // บันทึกตั้งค่าค่าน้ำ & บัญชีรับเงิน
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
        alert(result.message);
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
      reading_photo_url: item.reading_photo_url || '',
      action_type: defaultAction,
      slip_url: item.slip_url || '',
      note: item.bill_note || ''
    });
  };

  // แปลงรูปเป็น Base64
  const handleFileBase64 = (field) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setReadingForm((prev) => ({ ...prev, [field]: reader.result }));
    reader.readAsDataURL(file);
  };

  // คำนวณยอดใน Modal จดมิเตอร์แบบเรียลไทม์
  const calcPrev = Number(readingForm.previous_reading || 0);
  const calcCurr = readingForm.current_reading === '' ? calcPrev : Number(readingForm.current_reading);
  const calcUnits = Math.max(0, Number((calcCurr - calcPrev).toFixed(2)));
  const calcTotal = Number((calcUnits * Number(settings.unit_rate || 0) + Number(settings.meter_fee || 0)).toFixed(2));
  const modalQrUrl = buildPromptPayQRUrl(settings.promptpay_id, calcTotal);

  // บันทึกผลจดมิเตอร์
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
          meter_fee: Number(settings.meter_fee || 0),
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
          bill_payment_status: savedBill.payment_status
        };
        setReadingTarget(null);
        await fetchBillingData();
        setReceiptItem(mergedReceipt); // เปิดใบเสร็จ/ใบแจ้งหนี้ให้แชร์ได้ทันที
      } else {
        alert(result.message || 'บันทึกไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  // รับชำระบิลค้างจ่ายทันทีจากหน้าใบแจ้งหนี้
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

  // แชร์ใบเสร็จ / ใบแจ้งหนี้ให้เจ้าของบ้าน (รองรับ LINE / มือถือ / คัดลอก)
  const handleShareReceipt = async (bill) => {
    const statusText = bill.bill_payment_status === 'PAID'
      ? `ชำระแล้ว (${bill.payment_method === 'CASH' ? 'เงินสด' : 'โอน/QR'})`
      : 'รอชำระ / ค้างชำระ';

    const text = [
      `💧 ${bill.bill_payment_status === 'PAID' ? 'ใบเสร็จรับเงินค่าน้ำประปา' : 'ใบแจ้งหนี้ค่าน้ำประปาหมู่บ้าน'}`,
      `เลขที่บิล: ${bill.bill_no} (รอบเดือน ${bill.billing_month})`,
      `ผู้ใช้น้ำ: ${bill.full_name}`,
      `ที่อยู่: ${bill.full_address}`,
      `เลขมิเตอร์: ${bill.meter_code}`,
      `เลขเดิม ${bill.previous_reading} → เลขใหม่ ${bill.current_reading} = ใช้ไป ${bill.units_used} หน่วย`,
      `ค่าน้ำ (${bill.units_used} x ${bill.unit_rate} บ.) + ค่ารักษามิเตอร์ ${bill.meter_fee} บ.`,
      `ยอดรวมทั้งสิ้น: ${Number(bill.total_amount).toLocaleString()} บาท`,
      `สถานะ: ${statusText}`,
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
    alert('คัดลอกข้อความใบเสร็จ/ใบแจ้งหนี้เรียบร้อยแล้ว สามารถวางส่งใน LINE ให้เจ้าของบ้านได้เลย');
  };

  // กรองรายการ
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
      (tabFilter === 'UNPAID' && it.bill_id && it.bill_payment_status !== 'PAID');

    return matchText && matchTab;
  });

  const unpaidHouses = items.filter((it) => it.bill_id && it.bill_payment_status !== 'PAID');

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans">
      <TopNavbar userData={userData} />

      <div className="max-w-7xl mx-auto p-4 pt-20">
        {/* ส่วนหัว + เลือกเดือน + ปุ่มตั้งค่าบัญชี/ค่าน้ำ */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Droplets size={24} /></div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800">จดมิเตอร์และออกบิลค่าน้ำประปา</h1>
              <p className="text-xs md:text-sm text-slate-500">
                อัตราค่าน้ำ {settings.unit_rate} บ./หน่วย • ค่ารักษามิเตอร์ {settings.meter_fee} บ.
                {settings.promptpay_id ? ` • พร้อมเพย์ ${settings.promptpay_id}` : ' • (ยังไม่ตั้งค่าพร้อมเพย์)'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <input
              type="month"
              value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 bg-white"
            />
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Settings size={16} /> ตั้งค่าค่าน้ำ & บัญชีรับเงิน
            </button>
          </div>
        </div>

        {/* แดชบอร์ดสรุปการทำงานของคนจดมิเตอร์ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm">
            <div className="text-xs font-bold text-emerald-700">เก็บเงินได้แล้ว (รอบ {billingMonth})</div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">฿{summary.collected_total.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              เงินสด ฿{summary.collected_cash.toLocaleString()} • โอน/QR ฿{summary.collected_qr.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
            <div className="text-xs font-bold text-amber-700">ยอดค้างชำระ ({summary.unpaid_count} หลัง)</div>
            <div className="text-2xl font-extrabold text-amber-700 mt-1">฿{summary.unpaid_amount.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              ไม่พบผู้ใช้น้ำ {summary.not_found_count} หลัง
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm">
            <div className="text-xs font-bold text-blue-700">ความคืบหน้าการจดมิเตอร์</div>
            <div className="text-2xl font-extrabold text-blue-700 mt-1">
              {summary.recorded_count} / {summary.total_meters} หลัง
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              เหลือยังไม่จด {summary.unrecorded_count} หลัง
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-600">บ้านที่ค้างจ่ายในรอบนี้</div>
            {unpaidHouses.length === 0 ? (
              <div className="text-xs text-emerald-600 font-bold mt-2">ไม่มีบ้านค้างจ่าย</div>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1 max-h-14 overflow-y-auto">
                {unpaidHouses.map((u) => (
                  <button
                    key={u.meter_id}
                    type="button"
                    onClick={() => setReceiptItem(u)}
                    className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full hover:bg-amber-200"
                  >
                    บ้าน {u.house_no} (฿{Number(u.total_amount).toLocaleString()})
                  </button>
                ))}
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
              { code: 'UNPAID', label: `ค้างจ่าย/ไม่พบ (${summary.unpaid_count})` }
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
            ไม่พบรายการในเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((it) => {
              const isRecorded = Boolean(it.bill_id);
              const isPaid = it.bill_payment_status === 'PAID';
              const isNotFound = it.visit_status === 'NOT_FOUND';

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

                    {isRecorded && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500">เลขจด ({it.previous_reading} → {it.current_reading}):</span>
                          <span className="font-bold text-slate-800">{it.units_used} หน่วย</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ยอดรวมบิลนี้:</span>
                          <span className="font-extrabold text-blue-700 text-sm">฿{Number(it.total_amount).toLocaleString()}</span>
                        </div>
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
      {/* Modal 1: ตั้งค่าเรทค่าน้ำ & บัญชีรับเงิน (PromptPay) สำหรับกรรมการ */}
      {/* ================================================================= */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
              <h2 className="font-bold text-base flex items-center gap-2"><Settings size={18} /> ตั้งค่าค่าน้ำ & บัญชีรับเงินหมู่บ้าน</h2>
              <button type="button" onClick={() => setIsSettingsOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ราคาต่อหน่วย (บาท) *</label>
                  <input type="number" step="0.01" required value={settingsForm.unit_rate} onChange={(e) => setSettingsForm({ ...settingsForm, unit_rate: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ค่ารักษามิเตอร์ (บาท/เดือน)</label>
                  <input type="number" step="0.01" value={settingsForm.meter_fee} onChange={(e) => setSettingsForm({ ...settingsForm, meter_fee: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm" />
                </div>
              </div>
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
                <label className="block text-xs font-bold text-blue-900 mb-1">หมายเลขพร้อมเพย์ (เบอร์โทร 10 หลัก หรือเลข 13 หลัก) *</label>
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
      {/* Modal 2: จดมิเตอร์ คำนวณยอด ถ่ายรูปหลักฐาน & รับชำระเงิน / QR */}
      {/* ================================================================= */}
      {readingTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveReading} className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center">
              <div>
                <h2 className="font-bold text-base">จดมิเตอร์: บ้านเลขที่ {readingTarget.house_no}</h2>
                <div className="text-xs text-blue-100">{readingTarget.full_name} • มิเตอร์ {readingTarget.meter_code}</div>
              </div>
              <button type="button" onClick={() => setReadingTarget(null)}><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* กรอกเลขมิเตอร์ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เลขมิเตอร์เดือนก่อน</label>
                  <input type="number" step="0.01" value={readingForm.previous_reading} onChange={(e) => setReadingForm({ ...readingForm, previous_reading: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm bg-slate-100 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-800 mb-1">เลขมิเตอร์ที่จดได้วันนี้ *</label>
                  <input required type="number" step="0.01" min={calcPrev} placeholder="กรอกเลขหน้าปัด..." value={readingForm.current_reading} onChange={(e) => setReadingForm({ ...readingForm, current_reading: e.target.value })} className="w-full p-2.5 border-2 border-blue-400 rounded-lg text-base font-extrabold font-mono" />
                </div>
              </div>

              {/* กล่องคำนวณยอดอัตโนมัติ */}
              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 flex justify-between items-center">
                <div className="text-xs text-blue-900">
                  <div>ใช้น้ำไป: <strong className="text-base">{calcUnits} หน่วย</strong></div>
                  <div className="text-[11px] text-blue-700">({calcUnits} × {settings.unit_rate} บ.) + ค่ารักษามิเตอร์ {settings.meter_fee} บ.</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-blue-700 font-bold">ยอดต้องชำระ</div>
                  <div className="text-2xl font-extrabold text-blue-800">฿{calcTotal.toLocaleString()}</div>
                </div>
              </div>

              {/* ถ่ายรูปหน้าปัดมิเตอร์เป็นหลักฐาน */}
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

              {/* เลือกสถานะการชำระ / การเข้าพบ */}
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

              {/* แสดง QR Code PromptPay ทันทีเมื่อเลือกสแกนจ่าย */}
              {readingForm.action_type === 'QR_PAID' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2">
                  {modalQrUrl ? (
                    <>
                      <div className="text-xs font-bold text-blue-800">ให้เจ้าของบ้านสแกน QR พร้อมเพย์ ยอด ฿{calcTotal.toLocaleString()}</div>
                      <img src={modalQrUrl} alt="PromptPay QR" className="mx-auto w-48 h-48 rounded-xl border bg-white p-2" />
                      <div className="text-xs text-slate-600">
                        {settings.bank_name} • {settings.account_name} ({settings.promptpay_id})
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-red-600 font-bold">กรุณากด "ตั้งค่าค่าน้ำ & บัญชีรับเงิน" เพื่อใส่หมายเลขพร้อมเพย์ก่อนครับ</div>
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
                <input type="text" placeholder="เช่น ฝากบิลไว้หน้าบ้าน / มิเตอร์หมุนปกติ" value={readingForm.note} onChange={(e) => setReadingForm({ ...readingForm, note: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm" />
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
      {/* Modal 3: ใบเสร็จรับเงิน / ใบแจ้งหนี้ + ปุ่มแชร์ / พิมพ์ / รับชำระ */}
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
                <div className="text-xs text-slate-500">เลขที่บิล: {receiptItem.bill_no} • รอบเดือน {receiptItem.billing_month}</div>
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

              <div className="bg-slate-50 p-3 rounded-xl border text-xs space-y-1.5">
                <div className="flex justify-between"><span>เลขมิเตอร์ครั้งก่อน</span><span className="font-mono">{receiptItem.previous_reading}</span></div>
                <div className="flex justify-between"><span>เลขมิเตอร์ครั้งนี้</span><span className="font-mono font-bold">{receiptItem.current_reading}</span></div>
                <div className="flex justify-between border-t pt-1.5"><span>จำนวนน้ำที่ใช้</span><strong>{receiptItem.units_used} หน่วย</strong></div>
                <div className="flex justify-between"><span>ค่าน้ำ ({receiptItem.units_used} × {receiptItem.unit_rate} บ.)</span><span>฿{(Number(receiptItem.units_used) * Number(receiptItem.unit_rate)).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>ค่ารักษามิเตอร์</span><span>฿{Number(receiptItem.meter_fee).toLocaleString()}</span></div>
                <div className="flex justify-between border-t pt-2 text-base font-extrabold text-blue-700">
                  <span>ยอดรวมทั้งสิ้น</span><span>฿{Number(receiptItem.total_amount).toLocaleString()}</span>
                </div>
              </div>

              {receiptItem.reading_photo_url && (
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">ภาพถ่ายหน้าปัดมิเตอร์หลักฐาน:</div>
                  <img src={receiptItem.reading_photo_url} alt="Evidence" className="w-full h-32 object-cover rounded-xl border" />
                </div>
              )}

              {/* กรณียังไม่ชำระ แสดง QR พร้อมเพย์ให้สแกนจ่ายได้เลย */}
              {receiptItem.bill_payment_status !== 'PAID' && buildPromptPayQRUrl(settings.promptpay_id, receiptItem.total_amount) && (
                <div className="text-center bg-blue-50 p-3 rounded-xl border border-blue-200">
                  <div className="text-xs font-bold text-blue-900 mb-1">สแกน QR พร้อมเพย์เพื่อชำระค่าน้ำ</div>
                  <img src={buildPromptPayQRUrl(settings.promptpay_id, receiptItem.total_amount)} alt="QR" className="mx-auto w-40 h-40 rounded-lg bg-white p-1.5 border" />
                  <div className="text-[11px] text-slate-600 mt-1">{settings.account_name} ({settings.promptpay_id})</div>
                </div>
              )}

              {/* ปุ่มรับชำระทันทีกรณียังค้างจ่าย */}
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