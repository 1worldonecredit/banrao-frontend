// [FE-BANK-FULL-01] หน้าฝั่งหน้าบ้าน: ผูกบัญชีธนาคาร (User/หมู่บ้าน/ร้านค้า/ธุรกิจ) + เติมเงิน & แนบสลิป R2 + PIN (123456) + ใบเสร็จ QR
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Landmark,
    KeyRound,
    QrCode,
    Plus,
    CheckCircle2,
    ShieldAlert,
    ArrowLeft,
    Wallet,
    Upload,
    Calendar
} from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';
import BankLogoBadge from '../components/BankLogoBadge';
import { uploadToR2 } from '../utils/uploadToR2';
import BankScanQrCard, { buildBankScanQrString } from '../components/BankScanQrCard';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

function parseUserDataSafe() {
    try {
        return JSON.parse(localStorage.getItem('userData') || '{}') || {};
    } catch {
        return {};
    }
}

export default function BankAccountsPage() {
    const navigate = useNavigate();
    const userData = parseUserDataSafe();
    const accountId = userData.account_id || userData.id || '';

    // [FE-BANK-FULL-02] Tab ย่อย: 'ACCOUNTS' (ผูกบัญชีรับเงิน) | 'TOPUP' (เติมเงิน & ส่งสลิป) | 'PIN' (รหัสยืนยัน 123456)
    const [activeSection, setActiveSection] = useState('ACCOUNTS');

    const [bankOptions, setBankOptions] = useState([]);
    const [accountInfo, setAccountInfo] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [summary, setSummary] = useState(null);
    const [defaultPinHint, setDefaultPinHint] = useState('123456');

    // [FE-BANK-FULL-03] ฟอร์มผูกบัญชีธนาคารรับเงิน (USER / VILLAGE / SHOP / BUSINESS)
    const [ownerType, setOwnerType] = useState('USER');
    const [bankCode, setBankCode] = useState('');
    const [bankNameTh, setBankNameTh] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [pinInput, setPinInput] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // [FE-BANK-FULL-04] ฟอร์มเติมเงินเข้ากระเป๋า & แนบสลิป (ส่งไปให้แอดมินกระทบยอดหน้า bank-reconciliation)
    const [systemBanks, setSystemBanks] = useState([]);
    const [selectedSystemBankId, setSelectedSystemBankId] = useState('');
    const [topupAmount, setTopupAmount] = useState('');
    const [transferDateTh, setTransferDateTh] = useState('');
    const [slipFile, setSlipFile] = useState(null);
    const [topupNote, setTopupNote] = useState('');
    const [activeReceipt, setActiveReceipt] = useState(null);

    // [FE-BANK-FULL-05] ฟอร์มเปลี่ยน PIN
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');

    const loadAllData = useCallback(async () => {
        try {
            const [bRes, pmRes, sumRes] = await Promise.all([
                fetch(`${API_URL}/api/banks`),
                accountId
                    ? fetch(`${API_URL}/api/payment-methods/my?account_id=${encodeURIComponent(accountId)}`)
                    : Promise.resolve(null),
                accountId
                    ? fetch(`${API_URL}/api/payment-methods/bank-summary?account_id=${encodeURIComponent(accountId)}`)
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
                    // ใช้บัญชีระบบ/หมู่บ้าน/ร้านค้า/กิจการที่ผูกไว้เป็นบัญชีรับโอนเติมเงิน
                    const bizBanks = (pmJson.bank_accounts || []).filter((x) =>
                        ['BUSINESS', 'VILLAGE', 'SHOP'].includes(String(x.owner_type || '').toUpperCase())
                    );
                    const targetList = bizBanks.length > 0 ? bizBanks : pmJson.bank_accounts || [];
                    setSystemBanks(targetList);
                    if (targetList.length > 0) {
                        setSelectedSystemBankId((prev) => prev || targetList[0].bank_account_id);
                    }
                }
            }

            if (sumRes) {
                const sumJson = await sumRes.json();
                if (sumJson.success) {
                    setSummary(sumJson.summary || null);
                }
            }
        } catch (err) {
            console.error('[FE-BANK-FULL-02] Load data error:', err);
        }
    }, [accountId]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

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
                await loadAllData();
                alert('ผูกบัญชีธนาคารรับเงินเรียบร้อยแล้วครับ');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // [FE-BANK-FULL-06] สร้างใบเสร็จ QR Code + แจ้งโอนเติมเงินพร้อมสลิป R2
    const handleSubmitTopup = async (e) => {
        e.preventDefault();
        if (!accountId) return alert('กรุณาเข้าสู่ระบบก่อนเติมเงิน');
        const amt = Number(topupAmount || 0);
        if (amt <= 0) return alert('กรุณากรอกจำนวนเงินที่ต้องการเติม');

        const targetBank =
            systemBanks.find((b) => String(b.bank_account_id) === String(selectedSystemBankId)) || bankAccounts[0];
        if (!targetBank) {
            return alert('กรุณาผูกบัญชีธนาคารรับเงินก่อนทำรายการเติมเงิน');
        }

        setSubmitting(true);
        try {
            let uploadedSlipUrl = '';
            if (slipFile) {
                uploadedSlipUrl = await uploadToR2(slipFile, 'payment-slips');
            }

            const purposeTitle = 'เติมเงินเข้ากระเป๋าเงิน Ban Rao';
            const lineItems = [{ name: 'เติมเงินเข้ากระเป๋าหลัก (Wallet Top-up)', qty: 1, price: amt }];

            // 1) สร้างใบเสร็จและ QR Payload (เก็บข้อมูลผู้รับเงิน + รายการที่จ่าย + รองรับ Scan จ่ายสินค้าในอนาคต)
            const rcpRes = await fetch(`${API_URL}/api/receipts/generate-qr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tx_category: 'TOPUP',
                    payer_account_id: accountId,
                    payer_name: accountInfo?.full_name || userData.full_name || 'ผู้ใช้งานระบบ',
                    receiver_account_id: targetBank.account_id,
                    receiver_owner_type: targetBank.owner_type || 'SYSTEM',
                    receiver_name: targetBank.account_holder_name,
                    receiver_bank_name: targetBank.bank_name_th,
                    receiver_account_number: targetBank.account_number,
                    purpose_title: purposeTitle,
                    line_items: lineItems,
                    total_amount: amt,
                    payment_method: 'QR_CODE',
                    payment_status: 'PENDING'
                })
            });
            const rcpJson = await rcpRes.json();
            const stamp = Date.now();
            const receiptNo = rcpJson.receipt?.receipt_no || `RCP-${stamp}`;
            const qrReference = rcpJson.receipt?.qr_reference || `QR-${String(stamp).slice(-8)}`;

            const qrText = buildBankScanQrString({
                receiptNo,
                qrReference,
                txCategory: 'TOPUP',
                receiverName: targetBank.account_holder_name,
                receiverOwnerType: targetBank.owner_type || 'SYSTEM',
                receiverBankCode: targetBank.bank_code,
                receiverBankName: targetBank.bank_name_th,
                receiverAccountNumber: targetBank.account_number,
                purposeTitle,
                lineItems,
                totalAmount: amt
            });

            setActiveReceipt({
                ...(rcpJson.receipt || {
                    receipt_no: receiptNo,
                    qr_reference: qrReference,
                    tx_category: 'TOPUP',
                    receiver_name: targetBank.account_holder_name,
                    receiver_owner_type: targetBank.owner_type || 'SYSTEM',
                    receiver_bank_name: targetBank.bank_name_th,
                    receiver_account_number: targetBank.account_number,
                    purpose_title: purposeTitle,
                    line_items: lineItems,
                    total_amount: amt
                }),
                receiver_bank_code: targetBank.bank_code,
                qr_text: qrText
            });

            // 2) ส่งรายการแจ้งโอน + สลิป ไปรอแอดมินตรวจและกระทบยอดในหน้า bank-reconciliation
            const verRes = await fetch(`${API_URL}/api/payment-methods/verifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bank_account_id: targetBank.bank_account_id,
                    target_account_id: accountId,
                    receipt_no: receiptNo,
                    tx_category: 'TOPUP',
                    claimed_amount: amt,
                    transfer_date_th:
                        transferDateTh.trim() ||
                        new Date().toLocaleString('th-TH', {
                            timeZone: 'Asia/Bangkok',
                            dateStyle: 'medium',
                            timeStyle: 'short'
                        }),
                    slip_url: uploadedSlipUrl,
                    slip_note: topupNote
                })
            });
            const verJson = await verRes.json();
            if (!verJson.success) {
                alert(verJson.message || 'ส่งแจ้งโอนไม่สำเร็จ');
            } else {
                setTopupAmount('');
                setSlipFile(null);
                setTopupNote('');
                await loadAllData();
                alert('สร้างใบเสร็จ QR และส่งสลิปตรวจสอบยอดเงินเข้าเรียบร้อยแล้วครับ รอแอดมินอนุมัติเข้ากระเป๋า');
            }
        } catch (err) {
            console.error('[FE-BANK-FULL-06] Topup error:', err);
            alert('เกิดข้อผิดพลาดในการส่งข้อมูลเติมเงิน');
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

    const selectedBankObj = bankOptions.find((b) => b.bank_code === bankCode) || null;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            <div className="sticky top-0 z-40 w-full">
                <TopNavbar userData={userData} />
            </div>

            <div className="flex-1 px-4 pt-[88px] pb-[105px] max-w-4xl w-full mx-auto space-y-4">
                {/* Header */}
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
                            <h1 className="text-base sm:text-lg font-extrabold m-0">
                                บัญชีธนาคารรับเงิน • เติมเงิน & รหัสยืนยัน (PIN)
                            </h1>
                            <p className="text-xs opacity-90 m-0 mt-0.5">
                                รองรับบัญชีผู้ใช้ หมู่บ้าน ร้านค้า และเจ้าของกิจการ (รหัสเริ่มต้น: {defaultPinHint})
                            </p>
                        </div>
                    </div>
                </div>

                {/* สรุปรายวัน/รายเดือนแบบไทย */}
                {summary && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
                            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                                <Calendar size={13} /> วันนี้ ({summary.today_label_th})
                            </div>
                            <div className="text-lg font-black text-emerald-600 mt-1">
                                ฿{Number(summary.daily_success_amount || 0).toLocaleString()}
                            </div>
                            <div className="text-[11px] text-slate-600">
                                สำเร็จ: <strong>{summary.daily_success_count}</strong> | ไม่สำเร็จ: <strong>{summary.daily_failed_count}</strong>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
                            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                                <Landmark size={13} /> เดือนนี้ ({summary.month_label_th})
                            </div>
                            <div className="text-lg font-black text-indigo-600 mt-1">
                                ฿{Number(summary.monthly_success_amount || 0).toLocaleString()}
                            </div>
                            <div className="text-[11px] text-slate-600">
                                สำเร็จ: <strong>{summary.monthly_success_count}</strong> | ไม่สำเร็จ: <strong>{summary.monthly_failed_count}</strong>
                            </div>
                        </div>
                    </div>
                )}

                {/* แท็บสลับโหมด */}
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveSection('ACCOUNTS')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition ${
                            activeSection === 'ACCOUNTS'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-slate-700 border-slate-200'
                        }`}
                    >
                        <Landmark size={14} /> ผูกบัญชีธนาคาร ({bankAccounts.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('TOPUP')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition ${
                            activeSection === 'TOPUP'
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-700 border-slate-200'
                        }`}
                    >
                        <Wallet size={14} /> เติมเงิน & ส่งสลิป / QR
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('PIN')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition ${
                            activeSection === 'PIN'
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-700 border-slate-200'
                        }`}
                    >
                        <KeyRound size={14} /> ตั้งรหัส PIN
                    </button>
                </div>

                {activeSection === 'ACCOUNTS' && (
                    <>
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
                                    <label className="block text-xs font-bold text-slate-600 mb-1">เลือกธนาคาร (จากฐานข้อมูล)</label>
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

                            {selectedBankObj && (
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 text-xs text-slate-700">
                                    <BankLogoBadge
                                        bankCode={selectedBankObj.bank_code}
                                        logoUrl={selectedBankObj.logo_url}
                                        brandColor={selectedBankObj.brand_color}
                                        size={36}
                                    />
                                    <div>
                                        ธนาคารที่เลือก: <strong>{selectedBankObj.bank_name_th}</strong> ({selectedBankObj.bank_code})
                                    </div>
                                </div>
                            )}

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

                        {/* รายการบัญชีที่ผูกแล้ว */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2.5">
                            <h2 className="text-sm font-extrabold text-slate-800 m-0">
                                บัญชีธนาคารที่ผูกไว้ ({bankAccounts.length})
                            </h2>
                            {bankAccounts.length === 0 ? (
                                <div className="text-xs text-slate-500">ยังไม่มีบัญชีธนาคารที่ผูกไว้</div>
                            ) : (
                                bankAccounts.map((b) => {
                                    const matched = bankOptions.find((x) => x.bank_code === b.bank_code);
                                    return (
                                        <div
                                            key={b.bank_account_id}
                                            className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2.5"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <BankLogoBadge
                                                    bankCode={b.bank_code}
                                                    logoUrl={matched?.logo_url || ''}
                                                    brandColor={matched?.brand_color || '#059669'}
                                                    size={38}
                                                />
                                                <div>
                                                    <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                                                        <span>{b.bank_name_th} • <span className="font-mono">{b.account_number}</span></span>
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                                                            ใช้อยู่
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-600">
                                                        ชื่อบัญชี: <strong>{b.account_holder_name}</strong> ({b.owner_type})
                                                    </div>
                                                </div>
                                            </div>
                                            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}

                {activeSection === 'TOPUP' && (
                    <form onSubmit={handleSubmitTopup} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
                        <h2 className="text-sm font-extrabold text-slate-800 m-0 flex items-center gap-2">
                            <Wallet size={17} className="text-indigo-600" /> เติมเงินเข้ากระเป๋า & แจ้งโอนเทียบสลิป (ออกใบเสร็จ QR)
                        </h2>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">เลือกบัญชีรับโอน</label>
                            <select
                                value={selectedSystemBankId}
                                onChange={(e) => setSelectedSystemBankId(e.target.value)}
                                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                            >
                                {systemBanks.length === 0 ? (
                                    <option value="">กรุณาผูกบัญชีธนาคารก่อน</option>
                                ) : (
                                    systemBanks.map((b) => (
                                        <option key={b.bank_account_id} value={b.bank_account_id}>
                                            {b.bank_name_th} — {b.account_number} ({b.account_holder_name})
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">จำนวนเงินที่เติม (บาท) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    required
                                    value={topupAmount}
                                    onChange={(e) => setTopupAmount(e.target.value)}
                                    placeholder="เช่น 500"
                                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">วันและเวลาที่โอน (ตามสลิป)</label>
                                <input
                                    type="text"
                                    value={transferDateTh}
                                    onChange={(e) => setTransferDateTh(e.target.value)}
                                    placeholder="เช่น 27 พ.ย. 2569 12:30"
                                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">แนบรูปสลิปการโอนเงิน (อัปโหลดขึ้น R2)</label>
                            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-700 cursor-pointer">
                                <Upload size={15} className="text-indigo-600" />
                                <span>{slipFile ? slipFile.name : 'เลือกไฟล์รูปภาพสลิปโอนเงิน...'}</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                                />
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                            <input
                                type="text"
                                value={topupNote}
                                onChange={(e) => setTopupNote(e.target.value)}
                                placeholder="เช่น โอนจากบัญชี KBank ลงท้าย 1234"
                                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold flex items-center justify-center gap-2 transition"
                        >
                            <QrCode size={16} /> สร้างใบเสร็จ QR & ส่งสลิปตรวจสอบยอดเงินเข้า
                        </button>
                    </form>
                )}

                {activeSection === 'PIN' && (
                    <form onSubmit={handleUpdatePin} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                        <h2 className="text-sm font-extrabold text-slate-800 m-0 flex items-center gap-2">
                            <KeyRound size={16} className="text-indigo-600" /> ตั้ง / เปลี่ยนรหัสยืนยัน (PIN) สำหรับผูกบัญชี / ถอนเงิน / ชำระเงิน
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
                )}

                {/* ใบเสร็จ & QR Code จริงสำหรับให้แอปธนาคารสแกน + แสดงผู้รับเงิน/รายการจ่าย */}
                <BankScanQrCard receipt={activeReceipt} />
            </div>

            <div className="fixed bottom-0 z-40 w-full">
                <BottomNavbar />
            </div>
        </div>
    );
}