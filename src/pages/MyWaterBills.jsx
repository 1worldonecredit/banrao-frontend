import React, { useState, useEffect } from 'react';
import {
  Droplets, QrCode, CheckCircle, AlertTriangle, Clock, Camera,
  X, Upload, CreditCard, Calendar, FileText, Printer
} from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

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
  const [slipModalBill, setSlipModalBill] = useState(null);
  const [slipBase64, setSlipBase64] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMyBills = async () => {
    if (!accountId) return setLoading(false);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/water/my-bills/${accountId}`);
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
      const res = await fetch(`${API_URL}/api/water/bills/${payModalBill.bill_id}/pay`, {
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
      }
    } catch (err) {
      alert('ส่งสลิปไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  };

  const unpaidBills = bills.filter((b) => b.payment_status !== 'PAID');
  const totalUnpaid = unpaidBills.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const displayPresidentName = settings?.president_name || villageInfo?.president_name || '-';

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
        {/* ส่วนหัวสรุปค่าน้ำของบ้าน */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-5 rounded-2xl shadow-md mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl"><Droplets size={24} /></div>
            <div>
              <h1 className="text-lg font-bold">ค่าน้ำประปา • {villageInfo.village_title}</h1>
              <p className="text-xs text-blue-100">
                {villageInfo.village_full_address || 'ตรวจสอบยอดใช้น้ำ หลักฐานหน้าปัดมิเตอร์ และสแกนจ่ายค่าน้ำ'}
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
              <span className="text-xs font-semibold">ยอดค้างชำระรวมทั้งหมด</span>
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
        ) : bills.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
            ยังไม่มีรายการบิลค่าน้ำประปาสำหรับบ้านของคุณ
          </div>
        ) : (
          <div className="space-y-4">
            {bills.map((b) => {
              const isPaid = b.payment_status === 'PAID';
              const isPending = b.payment_status === 'PENDING_VERIFY';
              return (
                <div key={b.bill_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="text-xs font-mono text-slate-500">
                        {b.bill_no} • รอบเดือน {formatThaiMonth(b.billing_month)}
                      </div>
                      <div className="font-bold text-slate-800">บ้านเลขที่ {b.house_no} (มิเตอร์ {b.meter_code})</div>
                      {(b.reading_date || b.due_date) && (
                        <div className="text-[11px] text-slate-500 flex flex-wrap gap-2 mt-1">
                          {b.reading_date && <span className="inline-flex items-center gap-1"><Calendar size={11} /> จดวันที่ {formatThaiDate(b.reading_date)}</span>}
                          {b.due_date && <span className="text-amber-700 font-semibold">• ชำระภายใน {formatThaiDate(b.due_date)}</span>}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 ${
                      isPaid ? 'bg-emerald-100 text-emerald-700' : isPending ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isPaid ? <><CheckCircle size={13} /> ชำระแล้ว</> : isPending ? <><Clock size={13} /> รอตรวจสลิป</> : <><AlertTriangle size={13} /> รอชำระ</>}
                    </span>
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
                    <div className="flex justify-between border-t pt-1.5 text-base font-extrabold text-blue-700">
                      <span>ยอดรวมบิลนี้</span>
                      <span>฿{Number(b.total_amount).toLocaleString()}</span>
                    </div>
                  </div>

                  {b.reading_photo_url && (
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 mb-1">รูปถ่ายหน้าปัดมิเตอร์:</div>
                        <img
                        src={b.reading_photo_url}
                         alt="Meter"
                        className="mx-auto block max-h-72 w-auto max-w-full rounded-xl border border-slate-200 shadow-sm"
                        />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSlipModalBill(b)}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <FileText size={15} /> ดูสลิปทางการ
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
          </div>
        )}
      </div>

      {/* Modal ดูสลิปบิลค่าน้ำประปาทางการ (หัวหมู่บ้าน + ที่อยู่เต็ม + ประธาน + ผู้จดมิเตอร์) */}
      {slipModalBill && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-3.5 text-white flex justify-between items-center no-print">
              <span className="font-bold text-sm flex items-center gap-2">
                <FileText size={16} />
                {slipModalBill.payment_status === 'PAID' ? 'สลิปใบเสร็จรับเงินค่าน้ำประปา' : 'สลิปใบแจ้งหนี้ค่าน้ำประปา'}
              </span>
              <button type="button" onClick={() => setSlipModalBill(null)}><X size={20} /></button>
            </div>

            <div id="my-water-slip-printable" className="p-5 overflow-y-auto space-y-3.5 text-sm bg-white">
              <div className="bg-gradient-to-b from-blue-50/90 to-white border border-blue-200 rounded-2xl p-4 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600" />
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white shadow-sm mb-2">
                  <Droplets size={20} />
                </div>
                <div className="font-extrabold text-[15px] text-slate-900">
                  สลิปบิลค่าน้ำประปา {villageInfo.village_title}
                </div>
                {villageInfo.village_full_address && (
                  <div className="text-[11.5px] text-slate-600 mt-1">{villageInfo.village_full_address}</div>
                )}
                <div className="text-xs font-bold text-blue-900 mt-1.5 pt-1.5 border-t border-blue-100">
                  ประธานกรรมการ: <span className="text-slate-900">{displayPresidentName}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-dashed border-slate-300 text-[11px] text-slate-600 space-y-0.5">
                  <div>เลขที่บิล: <strong className="font-mono text-slate-900">{slipModalBill.bill_no}</strong> • รอบ {formatThaiMonth(slipModalBill.billing_month)}</div>
                  <div>
                    วันที่จด: <strong>{formatThaiDate(slipModalBill.reading_date)}</strong> • ชำระภายใน: <strong className="text-amber-700">{formatThaiDate(slipModalBill.due_date)}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border rounded-xl p-3 text-xs space-y-1 text-slate-700">
                <div className="flex justify-between"><span className="text-slate-500">ผู้ใช้น้ำ:</span><strong>{slipModalBill.full_name}</strong></div>
                <div className="flex justify-between gap-2"><span className="text-slate-500 shrink-0">ที่อยู่:</span><span className="text-right">{slipModalBill.full_address}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">เลขมิเตอร์:</span><strong className="font-mono text-blue-800">{slipModalBill.meter_code}</strong></div>
              </div>

              <div className="bg-white border rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between"><span>เลขมิเตอร์ครั้งก่อน</span><span className="font-mono">{slipModalBill.previous_reading}</span></div>
                <div className="flex justify-between"><span>เลขมิเตอร์ครั้งนี้</span><span className="font-mono font-bold">{slipModalBill.current_reading}</span></div>
                <div className="flex justify-between border-t border-dashed pt-1.5"><span>จำนวนน้ำที่ใช้</span><strong>{slipModalBill.units_used} หน่วย</strong></div>
                <div className="flex justify-between"><span>ค่าน้ำ ({slipModalBill.units_used} × {slipModalBill.unit_rate} บ.)</span><span>฿{(Number(slipModalBill.units_used) * Number(slipModalBill.unit_rate)).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>ค่ารักษามิเตอร์</span><span>฿{Number(slipModalBill.meter_fee || 0).toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-emerald-800"><span>ค่าจ้างคนจดมิเตอร์</span><span>฿{Number(slipModalBill.reader_fee || 0).toLocaleString()}</span></div>
                <div className="flex justify-between border-t pt-2 text-sm font-extrabold text-blue-700">
                  <span>ยอดรวมสุทธิ</span><span>฿{Number(slipModalBill.total_amount).toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-slate-300 pt-3 text-center space-y-1">
                <div className="text-[11px] text-slate-500">ลงชื่อผู้จดมิเตอร์ / ผู้ออกเอกสาร</div>
                <div className="text-sm font-extrabold text-slate-900">
                  ( {slipModalBill.recorded_by || '-'} )
                </div>
                <div className="text-[11px] text-slate-500">
                  ผู้จดมิเตอร์น้ำประปา • {villageInfo.village_title}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t flex gap-2 no-print">
              <button type="button" onClick={() => setSlipModalBill(null)} className="flex-1 py-2.5 border rounded-xl text-xs font-bold text-slate-600">ปิด</button>
              <button type="button" onClick={() => window.print()} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                <Printer size={15} /> พิมพ์สลิป
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal สแกนจ่าย QR + แนบสลิป */}
      {payModalBill && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <span className="font-bold text-sm flex items-center gap-2">
                <CreditCard size={18} /> ชำระค่าน้ำรอบ {formatThaiMonth(payModalBill.billing_month, true)}
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
            </div>
            <div className="p-4 bg-slate-50 border-t flex gap-2">
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