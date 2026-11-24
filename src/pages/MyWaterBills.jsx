import React, { useState, useEffect } from 'react';
import {
  Droplets, QrCode, CheckCircle, AlertTriangle, Clock, Camera,
  Share2, X, Upload, CreditCard
} from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

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
  const [loading, setLoading] = useState(true);

  const [payModalBill, setPayModalBill] = useState(null);
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

  const totalUnpaid = bills
    .filter((b) => b.payment_status !== 'PAID')
    .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans">
      <TopNavbar userData={userData} />

      <div className="max-w-3xl mx-auto p-4 pt-20">
        {/* ส่วนหัวสรุปยอดค่าน้ำของบ้าน */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-5 rounded-2xl shadow-md mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl"><Droplets size={24} /></div>
            <div>
              <h1 className="text-lg font-bold">ค่าน้ำประปาของฉัน</h1>
              <p className="text-xs text-blue-100">ตรวจสอบยอดใช้น้ำ หลักฐานหน้าปัดมิเตอร์ และสแกนจ่ายค่าน้ำ</p>
            </div>
          </div>
          <div className="bg-white/15 rounded-xl p-3 flex justify-between items-center">
            <span className="text-xs font-semibold">ยอดค้างชำระทั้งหมด</span>
            <span className="text-2xl font-extrabold">฿{totalUnpaid.toLocaleString()}</span>
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
                      <div className="text-xs font-mono text-slate-500">{b.bill_no} • รอบเดือน {b.billing_month}</div>
                      <div className="font-bold text-slate-800">บ้านเลขที่ {b.house_no} (มิเตอร์ {b.meter_code})</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
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
                      <span className="text-slate-500">อัตรา {b.unit_rate} บ./หน่วย + ค่ารักษามิเตอร์ {b.meter_fee} บ.</span>
                      <strong className="text-base text-blue-700">฿{Number(b.total_amount).toLocaleString()}</strong>
                    </div>
                  </div>

                  {b.reading_photo_url && (
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 mb-1">รูปถ่ายหน้าปัดมิเตอร์:</div>
                      <img src={b.reading_photo_url} alt="Meter" className="w-full h-36 object-cover rounded-xl border" />
                    </div>
                  )}

                  {!isPaid && !isPending && (
                    <button
                      type="button"
                      onClick={() => { setPayModalBill(b); setSlipBase64(''); }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <QrCode size={18} /> สแกน QR ชำระค่าน้ำ (฿{Number(b.total_amount).toLocaleString()})
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal สแกนจ่าย QR + แนบสลิป */}
      {payModalBill && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <span className="font-bold text-sm flex items-center gap-2"><CreditCard size={18} /> ชำระค่าน้ำบิล {payModalBill.bill_no}</span>
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