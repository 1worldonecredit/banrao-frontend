import React, { useState, useEffect } from 'react';
import {
  Droplets, QrCode, CheckCircle, AlertTriangle, Clock, Camera,
  X, Upload, CreditCard, Calendar, FileText, Printer, Receipt, Lock, Ban, Phone, User
} from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';
import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

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

const formatThaiDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543} เวลา ${pad(d.getHours())}:${pad(d.getMinutes())} น.`;
};

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
  const amountTag = numAmount > 0 ? `54${String(numAmount.toFixed(2).length).padStart(2, '0')}${numAmount.toFixed(2)}` : '';
  const raw = `0002010102${numAmount > 0 ? '12' : '11'}${tag29}5802TH5303764${amountTag}6304`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(raw + crc16CCITT(raw))}`;
};

const MyWaterBills = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const accountId = userData.account_id || userData.id;

  const [bills, setBills] = useState([]);
  const [settings, setSettings] = useState(null);
  const [villageInfo, setVillageInfo] = useState({
    village_title: 'หมู่บ้านประปาชุมชน',
    village_full_address: '',
    president_name: ''
  });
  const [loading, setLoading] = useState(true);

  const [payModalBill, setPayModalBill] = useState(null);
  const [docModalBill, setDocModalBill] = useState(null);
  const [slipBase64, setSlipBase64] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMyBills = async () => {
    if (!accountId) return setLoading(false);
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/water/my-bills/${accountId}`);
      const result = await res.json();
      if (result.success) {
        setBills(result.data || []);
        setSettings(result.settings || null);
        if (result.village_info) setVillageInfo(result.village_info);
      }
    } catch (err) {
      console.error('Fetch my water bills error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyBills(); }, [accountId]);

  const handleSlipUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setSlipBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmitSlip = async () => {
    if (!slipBase64) return alert('กรุณาแนบรูปสลิปการโอนเงินก่อนกดยืนยัน');
    setSending(true);
    try {
      const res = await authFetch(`${API_URL}/api/water/bills/${payModalBill.bill_id}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: 'QR_TRANSFER',
          payment_status: 'PENDING_VERIFY',
          slip_url: slipBase64,
          changed_by: userData.full_name || userData.username || 'CITIZEN'
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setPayModalBill(null);
        setSlipBase64('');
        fetchMyBills();
      } else {
        alert(result.message || 'ส่งสลิปไม่สำเร็จ');
      }
    } catch (err) {
      alert('ส่งสลิปไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  };

  const activeBills = bills.filter((b) => !b.is_voided);
  const voidedBills = bills.filter((b) => b.is_voided);
  const unpaidBills = activeBills.filter((b) => b.payment_status !== 'PAID');
  const totalUnpaid = unpaidBills.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

  const modalIsReceipt = Boolean(docModalBill && (docModalBill.payment_status === 'PAID' || docModalBill.document_stage === 'RECEIPT'));
  const modalVillageTitle = docModalBill?.snapshot_village_name || villageInfo?.village_title || 'หมู่บ้านประปาชุมชน';
  const modalVillageAddr = docModalBill?.snapshot_village_address || villageInfo?.village_full_address || '';
  const modalPresidentName = docModalBill?.snapshot_president_name || settings?.president_name || villageInfo?.president_name || '-';
  const modalReaderName = docModalBill?.snapshot_reader_name || docModalBill?.recorded_by || '-';
  const modalReceiverName = docModalBill?.snapshot_receiver_name || modalReaderName;

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #my-water-slip-printable, #my-water-slip-printable * { visibility: visible; }
          #my-water-slip-printable {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            padding: 16px;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <TopNavbar userData={userData} />

      <div className="max-w-3xl mx-auto p-4 pt-20">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-5 rounded-2xl shadow-md mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl"><Droplets size={24} /></div>
            <div>
              <h1 className="text-lg font-bold">ค่าน้ำประปา • {villageInfo.village_title}</h1>
              <p className="text-xs text-blue-100">
                {villageInfo.village_full_address || 'ตรวจสอบใบแจ้งหนี้ ใบเสร็จรับเงิน และสแกนจ่ายค่าน้ำประปา'}
              </p>
              {settings && (
                <p className="text-[11px] text-blue-50 mt-0.5">
                  รอบจดทุกวันที่ {settings.reading_day || 25} • ชำระภายในวันที่ {settings.due_day || 5} {settings.due_next_month ? 'ของเดือนถัดไป' : 'ของเดือน'}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white/15 rounded-xl p-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold">ยอดค้างชำระรวมทั้งหมด (ใบแจ้งหนี้รอจ่าย)</span>
              <span className="text-2xl font-extrabold">฿{totalUnpaid.toLocaleString()}</span>
            </div>
            {unpaidBills.length > 0 && (
              <div className="text-[11px] text-blue-50 mt-1.5 pt-1.5 border-t border-white/20">
                ค้างชำระรอบเดือน:{' '}
                {unpaidBills.map((b) => `${formatThaiMonth(b.billing_month, true)} (฿${Number(b.total_amount).toLocaleString()})`).join(', ')}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">กำลังโหลดข้อมูลค่าน้ำประปา...</div>
        ) : activeBills.length === 0 && voidedBills.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
            ยังไม่มีรายการใบแจ้งหนี้หรือใบเสร็จค่าน้ำประปาสำหรับบ้านของคุณ
          </div>
        ) : (
          <div className="space-y-4">
            {activeBills.map((b) => {
              const isPaid = b.payment_status === 'PAID' || b.document_stage === 'RECEIPT';
              const isPending = b.payment_status === 'PENDING_VERIFY';
              return (
                <div
                  key={b.bill_id}
                  className={`bg-white rounded-2xl border shadow-sm p-4 space-y-3 ${isPaid ? 'border-emerald-200' : 'border-amber-200'}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="text-xs font-mono text-slate-500">
                        {isPaid
                          ? `ใบเสร็จ: ${b.receipt_no || b.bill_no} • รอบเดือน ${formatThaiMonth(b.billing_month)}`
                          : `ใบแจ้งหนี้: ${b.bill_no} • รอบเดือน ${formatThaiMonth(b.billing_month)}`}
                      </div>
                      <div className="font-bold text-slate-800">
                        บ้านเลขที่ {b.house_no} (มิเตอร์ {b.meter_code})
                      </div>
                      {/* แสดงชื่อผู้ใช้น้ำและเบอร์โทรชัดเจนบนการ์ดทุกใบ */}
                      <div className="text-xs text-slate-700 font-semibold flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        <span className="inline-flex items-center gap-1 text-blue-800">
                          <User size={12} /> ผู้ใช้น้ำ: {b.full_name || '-'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-600 font-mono">
                          <Phone size={11} /> {b.phone || '-'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-2 mt-1">
                        {isPaid ? (
                          <span className="text-emerald-700 font-semibold">
                            รับชำระเมื่อ {formatThaiDateTime(b.receipt_issued_at || b.paid_at)}
                          </span>
                        ) : (
                          <>
                            {b.reading_date && <span className="inline-flex items-center gap-1"><Calendar size={11} /> จดวันที่ {formatThaiDate(b.reading_date)}</span>}
                            {b.due_date && <span className="text-amber-700 font-semibold">• ชำระภายใน {formatThaiDate(b.due_date)}</span>}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        isPaid ? 'bg-emerald-100 text-emerald-700' : isPending ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isPaid ? <><Receipt size={13} /> ใบเสร็จรับเงิน</> : isPending ? <><Clock size={13} /> รอตรวจสลิป</> : <><AlertTriangle size={13} /> ใบแจ้งหนี้รอชำระ</>}
                      </span>
                      {isPaid && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                          <Lock size={10} /> ล็อกหลักฐานชำระแล้ว
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">เลขมิเตอร์ ({b.previous_reading} → {b.current_reading})</span>
                      <strong>ใช้ไป {b.units_used} หน่วย</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ค่าน้ำ ({b.units_used} × {b.unit_rate} บ.)</span>
                      <span>฿{(Number(b.units_used) * Number(b.unit_rate)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ค่ารักษามิเตอร์</span>
                      <span>฿{Number(b.meter_fee || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-semibold">
                      <span>ค่าจ้างคนจดมิเตอร์</span>
                      <span>฿{Number(b.reader_fee || 0).toLocaleString()}</span>
                    </div>
                    <div className={`flex justify-between border-t pt-1.5 text-base font-extrabold ${isPaid ? 'text-emerald-700' : 'text-blue-700'}`}>
                      <span>{isPaid ? 'ยอดชำระแล้วสุทธิ' : 'ยอดแจ้งหนี้รอบนี้'}</span>
                      <span>฿{Number(b.total_amount).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* แสดงรูปถ่ายหน้าปัดมิเตอร์พร้อมลายน้ำ เฉพาะใบแจ้งหนี้ที่รอชำระ */}
                  {!isPaid && b.reading_photo_url && (
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 mb-1">รูปถ่ายหน้าปัดมิเตอร์:</div>
                      <img
                        src={b.reading_photo_url}
                        alt="Meter"
                        className="mx-auto block max-h-72 w-auto max-w-full rounded-xl border border-slate-200 shadow-sm"
                      />
                      <div className="text-[10.5px] text-center text-slate-500 mt-1 font-medium">
                        รอบเดือน {formatThaiMonth(b.billing_month)} • บ้านเลขที่ {b.house_no} • มิเตอร์ {b.meter_code} • จดวันที่ {formatThaiDate(b.reading_date)}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDocModalBill(b)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                        isPaid
                          ? 'flex-1 bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {isPaid ? <><Receipt size={15} /> ดูใบเสร็จรับเงินทางการ</> : <><FileText size={15} /> ดูใบแจ้งหนี้</>}
                    </button>

                    {!isPaid && !isPending && (
                      <button
                        type="button"
                        onClick={() => { setPayModalBill(b); setSlipBase64(''); }}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2"
                      >
                        <QrCode size={17} /> สแกน QR ชำระ (฿{Number(b.total_amount).toLocaleString()})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {voidedBills.length > 0 && (
              <div className="pt-3 space-y-2.5">
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 px-1">
                  <Ban size={14} className="text-red-500" /> ประวัติเอกสารที่ถูกยกเลิก (ไม่คิดยอดค้างชำระ)
                </div>
                {voidedBills.map((vb) => (
                  <div key={vb.bill_id} className="bg-slate-100/80 border border-slate-300 rounded-xl p-3.5 text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold line-through">
                        {vb.receipt_no || vb.bill_no} • รอบ {formatThaiMonth(vb.billing_month, true)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                        ยกเลิกเอกสารแล้ว
                      </span>
                    </div>
                    <div>ผู้ใช้น้ำ: {vb.full_name || '-'} • ยอดเดิม: ฿{Number(vb.total_amount || 0).toLocaleString()} • เหตุผล: <strong>{vb.void_reason || '-'}</strong></div>
                    <div className="text-[11px] text-slate-500">
                      ยกเลิกโดย {vb.voided_by_name || '-'} เมื่อ {formatThaiDateTime(vb.voided_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal ดูเอกสารทางการ: ใบแจ้งหนี้มีภาพมิเตอร์+QR / ใบเสร็จรับเงินสะอาดไม่มีภาพ */}
      {docModalBill && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-3 sm:p-4 z-[9999]">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className={`p-3.5 text-white flex justify-between items-center no-print ${modalIsReceipt ? 'bg-gradient-to-r from-emerald-800 to-teal-900' : 'bg-gradient-to-r from-slate-900 to-blue-950'}`}>
              <span className="font-bold text-sm flex items-center gap-2">
                {modalIsReceipt ? <Receipt size={16} /> : <FileText size={16} />}
                {modalIsReceipt ? 'ใบเสร็จรับเงินค่าน้ำประปา' : 'ใบแจ้งหนี้ค่าน้ำประปา (ยังไม่ใช่ใบเสร็จ)'}
              </span>
              <button type="button" onClick={() => setDocModalBill(null)}><X size={20} /></button>
            </div>

            <div id="my-water-slip-printable" className="p-5 overflow-y-auto space-y-3.5 text-sm bg-white flex-1">
              <div className={`border rounded-2xl p-4 text-center relative overflow-hidden ${modalIsReceipt ? 'bg-gradient-to-b from-emerald-50/90 to-white border-emerald-200' : 'bg-gradient-to-b from-blue-50/90 to-white border-blue-200'}`}>
                <div className={`absolute top-0 left-0 w-full h-1.5 ${modalIsReceipt ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600' : 'bg-gradient-to-r from-amber-500 via-blue-600 to-indigo-600'}`} />
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-white shadow-sm mb-2 ${modalIsReceipt ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                  {modalIsReceipt ? <Receipt size={20} /> : <Droplets size={20} />}
                </div>
                <div className={`font-extrabold text-[15px] ${modalIsReceipt ? 'text-emerald-950' : 'text-slate-900'}`}>
                  {modalIsReceipt ? `ใบเสร็จรับเงินค่าน้ำประปา ${modalVillageTitle}` : `ใบแจ้งหนี้ค่าน้ำประปา ${modalVillageTitle}`}
                </div>
                {modalVillageAddr && <div className="text-[11.5px] text-slate-600 mt-1">{modalVillageAddr}</div>}
                <div className="text-xs font-bold text-blue-900 mt-1.5 pt-1.5 border-t border-slate-200/70">
                  ประธานกรรมการ: <span className="text-slate-900">{modalPresidentName}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-dashed border-slate-300 text-[11px] text-slate-600 space-y-0.5">
                  {modalIsReceipt ? (
                    <>
                      <div className="font-bold text-emerald-800">
                        เลขที่ใบเสร็จ: <span className="font-mono">{docModalBill.receipt_no || docModalBill.bill_no}</span>
                      </div>
                      <div>อ้างอิงใบแจ้งหนี้: <strong className="font-mono">{docModalBill.bill_no}</strong> • รอบ {formatThaiMonth(docModalBill.billing_month)}</div>
                      <div>รับชำระเมื่อ: <strong>{formatThaiDateTime(docModalBill.receipt_issued_at || docModalBill.paid_at)}</strong></div>
                    </>
                  ) : (
                    <>
                      <div>เลขที่ใบแจ้งหนี้: <strong className="font-mono text-slate-900">{docModalBill.bill_no}</strong> • รอบ {formatThaiMonth(docModalBill.billing_month)}</div>
                      <div>
                        วันที่จด: <strong>{formatThaiDate(docModalBill.reading_date)}</strong> • ชำระภายใน: <strong className="text-amber-700">{formatThaiDate(docModalBill.due_date)}</strong>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ข้อมูลผู้ใช้น้ำ + เบอร์โทรครบถ้วน */}
              <div className="bg-slate-50 border rounded-xl p-3 text-xs space-y-1 text-slate-700">
                <div className="flex justify-between"><span className="text-slate-500">ผู้ใช้น้ำ:</span><strong className="text-slate-900">{docModalBill.full_name || '-'}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">เบอร์โทร:</span><strong className="font-mono text-slate-800">{docModalBill.phone || '-'}</strong></div>
                <div className="flex justify-between gap-2"><span className="text-slate-500 shrink-0">ที่อยู่:</span><span className="text-right">{docModalBill.full_address}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">เลขมิเตอร์:</span><strong className="font-mono text-blue-800">{docModalBill.meter_code}</strong></div>
              </div>

              <div className="bg-white border rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between"><span>เลขมิเตอร์ครั้งก่อน</span><span className="font-mono">{docModalBill.previous_reading}</span></div>
                <div className="flex justify-between"><span>เลขมิเตอร์ครั้งนี้</span><span className="font-mono font-bold">{docModalBill.current_reading}</span></div>
                <div className="flex justify-between border-t border-dashed pt-1.5"><span>จำนวนน้ำที่ใช้</span><strong>{docModalBill.units_used} หน่วย</strong></div>
                <div className="flex justify-between"><span>ค่าน้ำ ({docModalBill.units_used} × {docModalBill.unit_rate} บ.)</span><span>฿{(Number(docModalBill.units_used) * Number(docModalBill.unit_rate)).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>ค่ารักษามิเตอร์</span><span>฿{Number(docModalBill.meter_fee || 0).toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-emerald-800"><span>ค่าจ้างคนจดมิเตอร์</span><span>฿{Number(docModalBill.reader_fee || 0).toLocaleString()}</span></div>
                <div className={`flex justify-between border-t pt-2 text-sm font-extrabold ${modalIsReceipt ? 'text-emerald-700' : 'text-blue-700'}`}>
                  <span>{modalIsReceipt ? 'ยอดรับชำระสุทธิ' : 'ยอดแจ้งหนี้สุทธิ'}</span>
                  <span>฿{Number(docModalBill.total_amount).toLocaleString()}</span>
                </div>
              </div>

              {/* แสดงภาพถ่ายมิเตอร์และ QR เฉพาะ "ใบแจ้งหนี้" — ใบเสร็จรับเงินไม่ต้องมีภาพ */}
              {!modalIsReceipt && docModalBill.reading_photo_url && (
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1.5">ภาพถ่ายหน้าปัดมิเตอร์หลักฐาน:</div>
                  <img
                    src={docModalBill.reading_photo_url}
                    alt="Meter Evidence"
                    className="mx-auto block max-h-72 w-auto max-w-full rounded-xl border border-slate-200 shadow-sm"
                  />
                  <div className="text-[10.5px] text-center text-slate-500 mt-1 font-medium">
                    รอบเดือน {formatThaiMonth(docModalBill.billing_month)} • บ้านเลขที่ {docModalBill.house_no} • มิเตอร์ {docModalBill.meter_code} • จดวันที่ {formatThaiDate(docModalBill.reading_date)}
                  </div>
                </div>
              )}

              {!modalIsReceipt && buildPromptPayQRUrl(settings?.promptpay_id, docModalBill.total_amount) && (
                <div className="text-center bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                  <div className="text-xs font-bold text-blue-900 mb-1">สแกน QR พร้อมเพย์เพื่อชำระค่าน้ำ</div>
                  <img
                    src={buildPromptPayQRUrl(settings?.promptpay_id, docModalBill.total_amount)}
                    alt="QR"
                    className="mx-auto w-40 h-40 rounded-lg bg-white p-1.5 border"
                  />
                  <div className="text-[11px] text-slate-600 mt-1">
                    {settings?.bank_name ? `${settings.bank_name} • ` : ''}
                    {settings?.account_name || modalVillageTitle} ({settings?.promptpay_id})
                  </div>
                </div>
              )}

              <div className="border-t-2 border-dashed border-slate-300 pt-3 text-center space-y-1">
                {modalIsReceipt ? (
                  <>
                    <div className="text-[11px] text-slate-500">ผู้รับเงิน / ผู้ออกใบเสร็จรับเงิน</div>
                    <div className="text-sm font-extrabold text-emerald-900">( {modalReceiverName} )</div>
                    <div className="text-[11px] text-slate-500">ผู้จดมิเตอร์: {modalReaderName} • {modalVillageTitle}</div>
                  </>
                ) : (
                  <>
                    <div className="text-[11px] text-slate-500">ผู้จดมิเตอร์ / ผู้ออกใบแจ้งหนี้</div>
                    <div className="text-sm font-extrabold text-slate-900">( {modalReaderName} )</div>
                    <div className="text-[11px] text-amber-700 font-semibold">*เอกสารนี้เป็นใบแจ้งหนี้ ยังไม่ใช่ใบเสร็จรับเงิน</div>
                  </>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t flex gap-2 no-print shrink-0">
              <button type="button" onClick={() => setDocModalBill(null)} className="flex-1 py-2.5 border rounded-xl text-xs font-bold text-slate-600">ปิด</button>
              <button type="button" onClick={() => window.print()} className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${modalIsReceipt ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                <Printer size={15} /> {modalIsReceipt ? 'พิมพ์ใบเสร็จรับเงิน' : 'พิมพ์ใบแจ้งหนี้'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal สแกนจ่าย QR + แนบสลิป */}
      {payModalBill && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center shrink-0">
              <span className="font-bold text-sm flex items-center gap-2">
                <CreditCard size={18} /> ชำระใบแจ้งหนี้รอบ {formatThaiMonth(payModalBill.billing_month, true)}
              </span>
              <button type="button" onClick={() => setPayModalBill(null)}><X size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto text-center space-y-3">
              <div className="text-2xl font-extrabold text-blue-700">฿{Number(payModalBill.total_amount).toLocaleString()}</div>
              {buildPromptPayQRUrl(settings?.promptpay_id, payModalBill.total_amount) ? (
                <img
                  src={buildPromptPayQRUrl(settings?.promptpay_id, payModalBill.total_amount)}
                  alt="PromptPay QR"
                  className="mx-auto w-52 h-52 rounded-xl border p-2 bg-white"
                />
              ) : (
                <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl">คณะกรรมการหมู่บ้านยังไม่ได้ตั้งค่าหมายเลขพร้อมเพย์</div>
              )}

              {settings && (
                <div className="text-xs bg-slate-50 p-3 rounded-xl border text-slate-700 space-y-0.5">
                  <div className="font-bold">{settings.bank_name}</div>
                  <div>ชื่อบัญชี: {settings.account_name}</div>
                  <div className="font-mono">เลขบัญชี: {settings.account_number || '-'}</div>
                  <div className="font-mono">พร้อมเพย์: {settings.promptpay_id || '-'}</div>
                </div>
              )}

              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:bg-blue-50 text-xs font-bold text-blue-700">
                <Camera size={16} /> แนบรูปสลิปการโอนเงิน
                <input type="file" accept="image/*" onChange={handleSlipUpload} className="hidden" />
              </label>
              {slipBase64 && <img src={slipBase64} alt="Slip" className="mx-auto h-36 rounded-xl border" />}
              <div className="text-[11px] text-slate-500">
                *เมื่อเจ้าหน้าที่ตรวจสอบยอดโอนแล้ว ระบบจะออก <strong>ใบเสร็จรับเงิน</strong> ให้อัตโนมัติ
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t flex gap-2 shrink-0">
              <button type="button" onClick={() => setPayModalBill(null)} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 text-sm">ปิด</button>
              <button type="button" disabled={sending} onClick={handleSubmitSlip} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-1.5">
                <Upload size={16} /> {sending ? 'กำลังส่ง...' : 'แจ้งชำระเงิน'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavbar />
    </div>
  );
};

export default MyWaterBills;