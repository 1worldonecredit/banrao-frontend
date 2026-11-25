import React, { useState, useEffect } from 'react';
import { ShieldCheck, KeyRound, History, X, Save, Lock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const formatThaiDateTime = (dtStr) => {
  if (!dtStr) return '-';
  const d = new Date(dtStr);
  if (isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543} ${pad(d.getHours())}:${pad(d.getMinutes())} น.`;
};

const WaterPricingModal = ({ isOpen, onClose, villageId, staffName, onUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [rateInfo, setRateInfo] = useState({
    unit_rate: 7,
    meter_fee: 10,
    reader_fee: 5,
    has_president_pin: false,
    president_name: '',
    village_title: ''
  });
  const [logs, setLogs] = useState([]);

  // ฟอร์มปรับราคา
  const [form, setForm] = useState({
    unit_rate: 7,
    meter_fee: 10,
    reader_fee: 5,
    reason: '',
    approval_code: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // ฟอร์มตั้ง/เปลี่ยนรหัสอนุมัติประธาน
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinForm, setPinForm] = useState({ old_pin: '', new_pin: '', confirm_pin: '' });
  const [savingPin, setSavingPin] = useState(false);

  const fetchRateData = async () => {
    if (!villageId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/water/rates/${villageId}`);
      const result = await res.json();
      if (result.success && result.data) {
        setRateInfo(result.data);
        setForm({
          unit_rate: result.data.unit_rate,
          meter_fee: result.data.meter_fee,
          reader_fee: result.data.reader_fee,
          reason: '',
          approval_code: ''
        });
        setLogs(result.logs || []);
        setShowPinSetup(!result.data.has_president_pin);
      }
    } catch (err) {
      console.error('Fetch water rates error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchRateData();
  }, [isOpen, villageId]);

  if (!isOpen) return null;

  // บันทึกตั้ง/เปลี่ยนรหัสอนุมัติของประธาน
  const handleSetupPin = async (e) => {
    e.preventDefault();
    if (pinForm.new_pin.trim().length < 4) {
      return alert('กรุณากำหนดรหัสอนุมัติอย่างน้อย 4 ตัวอักษรหรือตัวเลข');
    }
    if (pinForm.new_pin !== pinForm.confirm_pin) {
      return alert('รหัสอนุมัติใหม่และยืนยันรหัสไม่ตรงกัน');
    }
    setSavingPin(true);
    try {
      const res = await fetch(`${API_URL}/api/water/rates/${villageId}/setup-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_pin: pinForm.old_pin,
          new_pin: pinForm.new_pin,
          updated_by: staffName
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setPinForm({ old_pin: '', new_pin: '', confirm_pin: '' });
        setShowPinSetup(false);
        fetchRateData();
      } else {
        alert(result.message || 'ตั้งรหัสอนุมัติไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingPin(false);
    }
  };

  // บันทึกปรับราคา (ต้องใช้รหัสอนุมัติของประธานทุกครั้ง)
  const handleSaveRates = async (e) => {
    e.preventDefault();
    if (!form.approval_code.trim()) {
      return alert('กรุณากรอกรหัสอนุมัติของประธานกรรมการก่อนบันทึกการเปลี่ยนแปลงราคา');
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/water/rates/${villageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_rate: Number(form.unit_rate),
          meter_fee: Number(form.meter_fee),
          reader_fee: Number(form.reader_fee),
          reason: form.reason,
          approval_code: form.approval_code,
          changed_by: staffName
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        await fetchRateData();
        onUpdated?.(result.data);
      } else {
        alert(result.message || 'อนุมัติการปรับราคาไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-3 sm:p-4 z-[9999]">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        {/* ส่วนหัว */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-bold text-base flex items-center gap-2">
              <ShieldCheck size={20} /> ตั้งราคาค่าน้ำประปา (อนุมัติโดยประธาน)
            </h2>
            <div className="text-xs text-amber-100 mt-0.5">
              ประธานกรรมการ: {rateInfo.president_name || 'ยังไม่ระบุในผัง'} • {rateInfo.village_title}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* เนื้อหา */}
        <div className="p-5 overflow-y-auto space-y-4">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">กำลังโหลดข้อมูลอัตราค่าน้ำ...</div>
          ) : (
            <>
              {/* สรุปราคาปัจจุบัน */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div>
                  <div className="text-[11px] text-slate-500 font-bold">ค่าน้ำปัจจุบัน</div>
                  <div className="text-base font-extrabold text-blue-700">฿{rateInfo.unit_rate}/หน่วย</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-bold">ค่ารักษามิเตอร์</div>
                  <div className="text-base font-extrabold text-slate-800">฿{rateInfo.meter_fee}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-bold">ค่าเก็บ/จดมิเตอร์</div>
                  <div className="text-base font-extrabold text-emerald-700">฿{rateInfo.reader_fee}</div>
                </div>
              </div>

              {/* กล่องตั้ง/เปลี่ยนรหัสอนุมัติของประธาน */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5">
                <div className="flex justify-between items-center gap-2">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <KeyRound size={15} />
                    {rateInfo.has_president_pin
                      ? 'ตั้งรหัสอนุมัติของประธานกรรมการแล้ว'
                      : 'ยังไม่ได้ตั้งรหัสอนุมัติของประธาน (ตั้งรหัสก่อนใช้งาน)'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPinSetup((v) => !v)}
                    className="text-xs font-bold text-amber-800 underline shrink-0"
                  >
                    {showPinSetup ? 'ซ่อน' : rateInfo.has_president_pin ? 'เปลี่ยนรหัสประธาน' : 'ตั้งรหัสประธาน'}
                  </button>
                </div>

                {showPinSetup && (
                  <form onSubmit={handleSetupPin} className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                    {rateInfo.has_president_pin && (
                      <input
                        type="password"
                        required
                        placeholder="รหัสอนุมัติเดิมของประธาน *"
                        value={pinForm.old_pin}
                        onChange={(e) => setPinForm({ ...pinForm, old_pin: e.target.value })}
                        className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-white"
                      />
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="password"
                        required
                        placeholder="รหัสอนุมัติใหม่ (4-6 หลัก) *"
                        value={pinForm.new_pin}
                        onChange={(e) => setPinForm({ ...pinForm, new_pin: e.target.value })}
                        className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-white"
                      />
                      <input
                        type="password"
                        required
                        placeholder="ยืนยันรหัสอนุมัติใหม่ *"
                        value={pinForm.confirm_pin}
                        onChange={(e) => setPinForm({ ...pinForm, confirm_pin: e.target.value })}
                        className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingPin}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
                    >
                      {savingPin ? 'กำลังบันทึก...' : 'บันทึกรหัสอนุมัติของประธาน'}
                    </button>
                  </form>
                )}
              </div>

              {/* ฟอร์มกำหนดราคาใหม่ */}
              <form id="waterRateApproveForm" onSubmit={handleSaveRates} className="space-y-3 border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-800">กำหนดอัตราค่าบริการใหม่</div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-blue-800 mb-1">ค่าน้ำ/หน่วย (บ.) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.unit_rate}
                      onChange={(e) => setForm({ ...form, unit_rate: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">รักษามิเตอร์ (บ.) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.meter_fee}
                      onChange={(e) => setForm({ ...form, meter_fee: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-800 mb-1">ค่าเก็บ/จดมิเตอร์ (บ.) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.reader_fee}
                      onChange={(e) => setForm({ ...form, reader_fee: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เหตุผลการเปลี่ยนแปลงราคา</label>
                  <input
                    type="text"
                    placeholder="เช่น มติที่ประชุมคณะกรรมการหมู่บ้านประจำเดือน..."
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                {/* ช่องกรอกรหัสอนุมัติของประธาน (บังคับทุกครั้ง) */}
                <div className="bg-red-50/70 p-3 rounded-xl border border-red-200">
                  <label className="block text-xs font-bold text-red-900 mb-1 flex items-center gap-1.5">
                    <Lock size={14} /> รหัสอนุมัติของประธานกรรมการ ({rateInfo.president_name || 'ประธาน'}) *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="กรอกรหัสอนุมัติของประธานเพื่อยืนยันการเปลี่ยนราคา..."
                    value={form.approval_code}
                    onChange={(e) => setForm({ ...form, approval_code: e.target.value })}
                    className="w-full p-2.5 border border-red-300 rounded-lg text-sm bg-white font-mono"
                  />
                  <div className="text-[11px] text-red-700 mt-1">
                    *ใช้รหัสอนุมัติที่ประธานตั้งไว้ หรือรหัสผ่านเข้าสู่ระบบของประธานกรรมการ
                  </div>
                </div>
              </form>

              {/* ประวัติการปรับราคา (Audit Log) */}
              <div>
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                  <History size={14} /> ประวัติการอนุมัติปรับราคา ({logs.length} รายการ)
                </div>
                {logs.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-xl border">
                    ยังไม่มีประวัติการปรับราคา
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {logs.map((lg) => (
                      <div key={lg.log_id} className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-0.5">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>อนุมัติโดย: {lg.approved_by_president}</span>
                          <span className="text-slate-500 font-normal">{formatThaiDateTime(lg.created_at)}</span>
                        </div>
                        <div className="text-slate-700">
                          ค่าน้ำ: {lg.old_unit_rate} → <strong className="text-blue-700">{lg.new_unit_rate} บ.</strong> |{' '}
                          มิเตอร์: {lg.old_meter_fee} → <strong>{lg.new_meter_fee} บ.</strong> |{' '}
                          ค่าเก็บ: {lg.old_reader_fee} → <strong className="text-emerald-700">{lg.new_reader_fee} บ.</strong>
                        </div>
                        {lg.reason && <div className="text-slate-500">หมายเหตุ: {lg.reason}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ปุ่มด้านล่าง */}
        <div className="p-3.5 bg-slate-50 border-t flex gap-2 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 text-sm">
            ปิด
          </button>
          <button
            type="submit"
            form="waterRateApproveForm"
            disabled={submitting || loading}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm flex items-center justify-center gap-1.5"
          >
            <Save size={16} /> {submitting ? 'กำลังตรวจสอบ...' : 'อนุมัติและเปลี่ยนราคา'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaterPricingModal;