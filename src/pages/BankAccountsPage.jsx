// [FE-BANK-01] หน้าผูกบัญชีธนาคารรับเงิน + รหัสยืนยัน PIN + ใบเสร็จ/QR สำหรับฝั่งหน้าบ้าน (banrao_frontend)
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Landmark,
    KeyRound,
    QrCode,
    Plus,
    CheckCircle2,
    ShieldAlert,
    Receipt,
    ArrowLeft
} from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

export default function BankAccountsPage() {
    const navigate = useNavigate();
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const accountId = userData.account_id || userData.id || '';

    // [FE-BANK-02] รายชื่อธนาคารดึงจาก Database (/api/banks -> bank_master) ไม่ฝังในโค้ด
    const [bankOptions, setBankOptions] = useState([]);
    const [accountInfo, setAccountInfo] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [defaultPinHint, setDefaultPinHint] = useState('123456');

    const [ownerType, setOwnerType] = useState('USER');
    const [bankCode, setBankCode] = useState('');
    const [bankNameTh, setBankNameTh] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [pinInput, setPinInput] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [activeReceipt, setActiveReceipt] = useState(null);

    const loadData = useCallback(async () => {
        try {
            const [bRes, pmRes] = await Promise.all([
                fetch(`${API_URL}/api/banks`),
                accountId
                    ? fetch(`${API_URL}/api/payment-methods/my?account_id=${encodeURIComponent(accountId)}`)
                    : Promise.resolve(null)
            ]);

            const bJson = await bRes.json();
            if (bJson.success && Array.isArray(bJson.banks)) {
                setBankOptions(bJson.banks);
                if (bJson.banks.length > 0) {
                    setBankCode((prev) => prev || bJson.banks[0].bank_code);
                    setBankNameTh((prev) => prev || bJson.banks[0].bank_name_th);
                }
            }

            if (pmRes) {
                const pmJson = await pmRes.json();
                if (pmJson.success) {
                    setAccountInfo(pmJson.account_info || null);
                    setBankAccounts(pmJson.bank_accounts || []);
                    setDefaultPinHint(pmJson.pin_status?.default_pin_hint || '123456');
                    if (pmJson.account_info?.full_name) {
                        setAccountHolderName((prev) => prev || pmJson.account_info.full_name);
                    }
                }
            }
        } catch (err) {
            console.error('[FE-BANK-02] Load bank & payment data error:', err);
        }
    }, [accountId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSelectBank = (code) => {
        setBankCode(code);
        const found = bankOptions.find((b) => b.bank_code === code);
        setBankNameTh(found ? found.bank_name_th : code);
    };

    const handleAddBankAccount = async (e) => {
        e.preventDefault();
        if (!accountId) return alert('กรุณาเข้าสู่ระบบก่อนผูกบัญชีธนาคาร');
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/api/payment-methods/bank-accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_id: accountId,
                    created_by: accountId,
                    owner_type: ownerType,
                    bank_code: bankCode,
                    bank_name_th: bankNameTh,
                    account_number: accountNumber,
                    account_holder_name: accountHolderName,
                    pin: pinInput,
                    is_default: bankAccounts.length === 0
                })
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'ผูกบัญชีธนาคารไม่สำเร็จ');
            } else {
                setAccountNumber('');
                setPinInput('');
                await loadData();
                alert('ผูกบัญชีธนาคารรับเงินเรียบร้อยแล้วครับ');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdatePin = async (e) => {
        e.preventDefault();
        if (!accountId) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/api/payment-methods/pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_id: accountId,
                    current_pin: currentPin,
                    new_pin: newPin
                })
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'เปลี่ยนรหัสยืนยันไม่สำเร็จ');
            } else {
                setCurrentPin('');
                setNewPin('');
                alert('บันทึกรหัสยืนยัน (PIN) ใหม่เรียบร้อยแล้วครับ');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            <div className="sticky top-0 z-40 w-full">
                <TopNavbar userData={userData} />
            </div>

            <div className="flex-1 px-4 pt-[88px] pb-[100px] max-w-4xl w-full mx-auto space-y-5">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 text-white flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-full bg-white/15 hover:bg-white/25 transition"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-lg font-extrabold m-0">ผูกบัญชีธนาคารรับเงิน & รหัสยืนยัน (PIN)</h1>
                            <p className="text-xs opacity-90 m-0 mt-0.5">
                                ใช้ยืนยันการผูกบัญชี ถอนเงิน และชำระเงิน (รหัสเริ่มต้น: {defaultPinHint})
                            </p>
                        </div>
                    </div>
                </div>

                {/* ฟอร์มผูกบัญชีธนาคาร */}
                <form onSubmit={handleAddBankAccount} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-extrabold text-slate-800 m-0 flex items-center gap-2">
                            <Landmark size={17} className="text-emerald-600" /> เพิ่มบัญชีธนาคารรับเงิน
                        </h2>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            PIN เริ่มต้น: {defaultPinHint}
                        </span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                        <ShieldAlert size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                            บัญชีผู้ใช้งาน (USER) ต้องใช้ชื่อเดียวกับชื่อผู้ใช้งาน (<strong>{accountInfo?.full_name || '-'}</strong>) ยกเว้นบัญชี <strong>หมู่บ้าน</strong>, <strong>ร้านค้า</strong> หรือ <strong>เจ้าของกิจการ</strong> ที่ใช้ชื่อเจ้าของ Account / กิจการได้
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">ประเภทบัญชีรับเงิน</label>
                        <select
                            value={ownerType}
                            onChange={(e) => {
                                const val = e.target.value;
                                setOwnerType(val);
                                if (val === 'USER' && accountInfo?.full_name) {
                                    setAccountHolderName(accountInfo.full_name);
                                }
                            }}
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                        >
                            <option value="USER">บัญชีผู้ใช้งาน (ชื่อต้องตรงกับชื่อผู้ใช้งาน)</option>
                            <option value="VILLAGE">บัญชีหมู่บ้าน (ชื่อหมู่บ้าน / เจ้าของ Account ได้)</option>
                            <option value="SHOP">บัญชีร้านค้า (ชื่อร้าน / เจ้าของ Account ได้)</option>
                            <option value="BUSINESS">บัญชีเจ้าของกิจการ/ธุรกิจ (ชื่อกิจการ / เจ้าของ Account ได้)</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">เลือกธนาคาร (จากระบบฐานข้อมูล)</label>
                            <select
                                value={bankCode}
                                onChange={(e) => handleSelectBank(e.target.value)}
                                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                            >
                                {bankOptions.map((b) => (
                                    <option key={b.bank_code} value={b.bank_code}>
                                        {b.short_label || `${b.bank_code} — ${b.bank_name_th}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">เลขที่บัญชี / พร้อมเพย์ *</label>
                            <input
                                type="text"
                                required
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                placeholder="เช่น 123-4-56789-0"
                                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อบัญชีธนาคาร *</label>
                        <input
                            type="text"
                            required
                            value={accountHolderName}
                            onChange={(e) => setAccountHolderName(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                            รหัสยืนยัน (PIN) * (เริ่มต้น {defaultPinHint})
                        </label>
                        <input
                            type="password"
                            required
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            placeholder={`กรอกรหัสยืนยัน (เริ่มต้น ${defaultPinHint})`}
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold flex items-center justify-center gap-2 transition"
                    >
                        <Plus size={16} /> ยืนยันผูกบัญชีธนาคารรับเงิน
                    </button>
                </form>

                {/* รายการบัญชีธนาคารที่ผูกแล้ว */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2.5">
                    <h2 className="text-sm font-extrabold text-slate-800 m-0">
                        บัญชีธนาคารที่ผูกไว้ ({bankAccounts.length})
                    </h2>
                    {bankAccounts.length === 0 ? (
                        <div className="text-xs text-slate-500">ยังไม่มีบัญชีธนาคารที่ผูกไว้</div>
                    ) : (
                        bankAccounts.map((b) => (
                            <div
                                key={b.bank_account_id}
                                className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                            >
                                <div>
                                    <div className="text-xs font-extrabold text-slate-800">
                                        {b.bank_name_th} • <span className="font-mono">{b.account_number}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-600">
                                        ชื่อบัญชี: <strong>{b.account_holder_name}</strong> ({b.owner_type})
                                    </div>
                                </div>
                                <CheckCircle2 size={16} className="text-emerald-600" />
                            </div>
                        ))
                    )}
                </div>

                {/* ตั้ง / เปลี่ยนรหัสยืนยัน PIN */}
                <form onSubmit={handleUpdatePin} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                    <h2 className="text-sm font-extrabold text-slate-800 m-0 flex items-center gap-2">
                        <KeyRound size={16} className="text-indigo-600" /> ตั้ง / เปลี่ยนรหัสยืนยัน (PIN)
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                            type="password"
                            value={currentPin}
                            onChange={(e) => setCurrentPin(e.target.value)}
                            placeholder={`รหัสเดิม (เริ่มต้น ${defaultPinHint})`}
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                        />
                        <input
                            type="password"
                            required
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            placeholder="รหัส PIN ใหม่ (4-8 หลัก)"
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition"
                    >
                        บันทึกรหัส PIN ใหม่
                    </button>
                </form>

                {activeReceipt && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
                        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                            <Receipt size={17} /> ใบเสร็จ & QR Code ({activeReceipt.receipt_no})
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-2">
                            <QrCode size={42} className="text-slate-800 flex-shrink-0" />
                            <div>
                                <div><strong>ผู้รับเงิน:</strong> {activeReceipt.receiver_name} ({activeReceipt.receiver_owner_type})</div>
                                <div><strong>ค่าอะไร:</strong> {activeReceipt.purpose_title} — <strong>฿{Number(activeReceipt.total_amount || 0).toLocaleString()}</strong></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 z-40 w-full">
                <BottomNavbar />
            </div>
        </div>
    );
}