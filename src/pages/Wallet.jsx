import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import {
    Wallet as WalletIcon,
    ArrowDownLeft,
    ArrowUpRight,
    QrCode,
    Send,
    PlusCircle,
    History,
    Copy,
    Check,
    Upload,
    Search,
    RefreshCw,
    ArrowLeft,
    Loader2,
    Store,
    UserCheck,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function parseUserDataSafe() {
    try {
        return JSON.parse(localStorage.getItem('userData') || '{}') || {};
    } catch {
        return {};
    }
}

function getBangkokNowParts() {
    const now = new Date();
    const bkk = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    return {
        yearBE: String(bkk.getFullYear() + 543),
        month: String(bkk.getMonth() + 1).padStart(2, '0'),
        day: String(bkk.getDate()).padStart(2, '0'),
        hh: String(bkk.getHours()).padStart(2, '0'),
        mi: String(bkk.getMinutes()).padStart(2, '0'),
        ss: String(bkk.getSeconds()).padStart(2, '0')
    };
}

function formatThaiDateTime(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '-';
    const bkk = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const day = bkk.getDate();
    const month = THAI_MONTHS[bkk.getMonth()];
    const yearBE = bkk.getFullYear() + 543;
    const hh = String(bkk.getHours()).padStart(2, '0');
    const mm = String(bkk.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${yearBE} ${hh}:${mm} น.`;
}

export default function Wallet() {
    const navigate = useNavigate();
    const userData = parseUserDataSafe();
    const accountId = userData.account_id || userData.id || '';
    const payerName =
        userData.full_name ||
        userData.display_name ||
        `${userData.first_name || ''} ${userData.last_name || ''}`.trim() ||
        userData.username ||
        'ผู้ใช้งานระบบ';

    const [activeTab, setActiveTab] = useState('TOPUP'); // 'TOPUP' | 'TRANSFER' | 'RECEIVE' | 'HISTORY'
    const [loading, setLoading] = useState(true);
    const [wallets, setWallets] = useState([]);
    const [selectedWalletId, setSelectedWalletId] = useState('');
    const [paymentChannels, setPaymentChannels] = useState([]);
    const [selectedChannelId, setSelectedChannelId] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [myQrDataUrl, setMyQrDataUrl] = useState('');
    const [copiedCode, setCopiedCode] = useState(false);

    // State เติมเงิน (QR + แนบสลิป R2)
    const [topupAmount, setTopupAmount] = useState('100');
    const [topupRef, setTopupRef] = useState(`TOP-${Date.now().toString().slice(-6)}`);
    const [slipImageUrl, setSlipImageUrl] = useState('');
    const [slipPreviewUrl, setSlipPreviewUrl] = useState('');
    const [uploadingSlip, setUploadingSlip] = useState(false);
    const [submittingTopup, setSubmittingTopup] = useState(false);

    const nowBkkInit = getBangkokNowParts();
    const [transferDay, setTransferDay] = useState(nowBkkInit.day);
    const [transferMonth, setTransferMonth] = useState(nowBkkInit.month);
    const [transferYearBE, setTransferYearBE] = useState(nowBkkInit.yearBE);
    const [transferHour, setTransferHour] = useState(nowBkkInit.hh);
    const [transferMinute, setTransferMinute] = useState(nowBkkInit.mi);
    const [transferSecond, setTransferSecond] = useState(nowBkkInit.ss);

    // State โอนเงิน / จ่ายค่าสินค้าและบริการ
    const [payMode, setPayMode] = useState('TRANSFER_OUT'); // 'TRANSFER_OUT' | 'PAY_SERVICE'
    const [targetCode, setTargetCode] = useState('');
    const [targetInfo, setTargetInfo] = useState(null);
    const [lookingUp, setLookingUp] = useState(false);
    const [transferAmount, setTransferAmount] = useState('');
    const [transferNote, setTransferNote] = useState('');
    const [submittingTransfer, setSubmittingTransfer] = useState(false);

    const [feedback, setFeedback] = useState(null);

    const activeWallet =
        wallets.find((w) => String(w.wallet_id) === String(selectedWalletId)) || wallets[0] || null;
    const activeChannel =
        paymentChannels.find((c) => String(c.channel_id) === String(selectedChannelId)) ||
        paymentChannels[0] ||
        null;

    const syncNavbarBalance = (newBal) => {
        const current = parseUserDataSafe();
        const updated = { ...current, wallet_balance: Number(newBal || 0) };
        localStorage.setItem('userData', JSON.stringify(updated));
        window.dispatchEvent(new Event('userDataUpdated'));
    };

    const loadWalletData = useCallback(async () => {
        if (!accountId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [wRes, chRes, txRes] = await Promise.all([
                fetch(`${API_URL}/api/wallets/my?account_id=${encodeURIComponent(accountId)}`),
                fetch(`${API_URL}/api/payment-channels`),
                fetch(`${API_URL}/api/wallets/transactions?account_id=${encodeURIComponent(accountId)}`)
            ]);

            const wJson = await wRes.json().catch(() => ({}));
            if (wJson.success && Array.isArray(wJson.wallets)) {
                setWallets(wJson.wallets);
                if (wJson.wallets.length > 0) {
                    setSelectedWalletId((prev) => prev || wJson.wallets[0].wallet_id);
                    syncNavbarBalance(wJson.wallets[0].balance);
                }
            }

            const chJson = await chRes.json().catch(() => ({}));
            if (chJson.success && Array.isArray(chJson.channels)) {
                setPaymentChannels(chJson.channels);
                if (chJson.channels.length > 0) {
                    setSelectedChannelId((prev) => prev || chJson.channels[0].channel_id);
                }
            }

            const txJson = await txRes.json().catch(() => ({}));
            if (txJson.success && Array.isArray(txJson.transactions)) {
                setTransactions(txJson.transactions);
            }
        } catch (err) {
            console.error('Load wallet error:', err);
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        loadWalletData();
    }, [loadWalletData]);

    // สร้าง QR Code ประจำตัวจากรหัสมาตรฐานสากล (BR-XXXXXXXX)
    useEffect(() => {
        const code = activeWallet?.public_code;
        if (!code) {
            setMyQrDataUrl('');
            return;
        }
        QRCode.toDataURL(code, { width: 240, margin: 2 })
            .then((url) => setMyQrDataUrl(url))
            .catch(() => setMyQrDataUrl(''));
    }, [activeWallet?.public_code]);

    const handleCopyCode = () => {
        if (!activeWallet?.public_code) return;
        navigator.clipboard.writeText(activeWallet.public_code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 1800);
    };

    // อัปโหลดสลิปขึ้น Cloudflare R2 (ใช้เส้นเดียวกับ Parkgate)
    const handleSlipFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingSlip(true);
        setFeedback(null);
        setSlipImageUrl('');
        try {
            const rawDataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const compressedDataUrl = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const maxW = 1000;
                    const scale = img.width > maxW ? maxW / img.width : 1;
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                img.onerror = () => resolve(rawDataUrl);
                img.src = rawDataUrl;
            });

            setSlipPreviewUrl(compressedDataUrl);

            const res = await fetch(`${API_URL}/api/upload-slip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data_url: compressedDataUrl, file_name: file.name })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success || !data.url) {
                setFeedback({ type: 'error', text: data.message || `อัปโหลดสลิปไม่สำเร็จ (HTTP ${res.status})` });
            } else {
                setSlipImageUrl(data.url);
            }
        } catch (err) {
            setFeedback({ type: 'error', text: `อัปโหลดสลิปผิดพลาด: ${err.message}` });
        } finally {
            setUploadingSlip(false);
            e.target.value = '';
        }
    };

    // ส่งแจ้งโอนเติมเงินเข้ากระเป๋า (เข้าคิวหลังบ้านตรวจสลิป & กระทบยอดอัตโนมัติ)
    const handleSubmitTopup = async (e) => {
        e.preventDefault();
        const amt = Number(topupAmount);
        if (!Number.isFinite(amt) || amt <= 0) {
            setFeedback({ type: 'error', text: 'กรุณาระบุยอดเงินที่ต้องการเติมให้ถูกต้อง' });
            return;
        }
        if (!slipImageUrl) {
            setFeedback({ type: 'error', text: 'กรุณาแนบรูปสลิปโอนเงินก่อนกดยืนยัน' });
            return;
        }

        const yearCE = Number(transferYearBE) - 543;
        const transferDateISO = `${yearCE}-${String(transferMonth).padStart(2, '0')}-${String(transferDay).padStart(2, '0')}`;
        const timeHms = `${String(transferHour).padStart(2, '0')}:${String(transferMinute).padStart(2, '0')}:${String(transferSecond).padStart(2, '0')}`;

        setSubmittingTopup(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/payment-slips`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    qr_reference: topupRef,
                    tx_category: 'WALLET_TOPUP',
                    payer_account_id: accountId,
                    payer_name: payerName,
                    channel_id: activeChannel?.channel_id || null,
                    receiver_name: activeChannel?.receiver_name || 'บัญชีระบบกลาง',
                    receiver_bank_name: activeChannel?.bank_name_th || 'พร้อมเพย์',
                    receiver_account_number: activeChannel?.account_number || activeChannel?.promptpay_id || '-',
                    amount: amt,
                    transfer_date: transferDateISO,
                    transfer_time_hms: timeHms,
                    slip_image_url: slipImageUrl,
                    purpose_title: `เติมเงินเข้ากระเป๋า (${activeWallet?.public_code || 'Wallet'})`
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setFeedback({ type: 'error', text: data.message || `ส่งแจ้งโอนไม่สำเร็จ (HTTP ${res.status})` });
                return;
            }

            setFeedback({
                type: 'success',
                text: `ส่งสลิปเติมเงิน ฿${amt.toLocaleString()} (อ้างอิง ${topupRef}) เรียบร้อยแล้ว! เมื่อแอดมินกระทบยอดเงินจะเข้ากระเป๋าอัตโนมัติ`
            });
            setSlipImageUrl('');
            setSlipPreviewUrl('');
            setTopupRef(`TOP-${Date.now().toString().slice(-6)}`);
        } catch (err) {
            setFeedback({ type: 'error', text: `เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ: ${err.message}` });
        } finally {
            setSubmittingTopup(false);
        }
    };

    // ค้นหาปลายทางด้วยรหัสมาตรฐาน BR-XXXXXXXX
    const handleLookupTarget = async () => {
        const clean = targetCode.trim().toUpperCase();
        if (!clean) return;
        setLookingUp(true);
        setTargetInfo(null);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/wallets/lookup?code=${encodeURIComponent(clean)}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setFeedback({ type: 'error', text: data.message || 'ไม่พบรหัสบัญชีนี้ในระบบ' });
            } else {
                setTargetInfo(data.target);
            }
        } catch (err) {
            setFeedback({ type: 'error', text: `ค้นหาไม่สำเร็จ: ${err.message}` });
        } finally {
            setLookingUp(false);
        }
    };

    // ยืนยันโอนเงิน / จ่ายค่าสินค้าและบริการ
    const handleSubmitTransfer = async (e) => {
        e.preventDefault();
        if (!activeWallet) return;
        const amt = Number(transferAmount);
        if (!targetInfo?.public_code) {
            setFeedback({ type: 'error', text: 'กรุณากดค้นหาและตรวจสอบรหัสผู้รับก่อนโอน' });
            return;
        }
        if (!Number.isFinite(amt) || amt <= 0) {
            setFeedback({ type: 'error', text: 'กรุณาระบุจำนวนเงินให้ถูกต้อง' });
            return;
        }

        setSubmittingTransfer(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/wallets/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from_wallet_id: activeWallet.wallet_id,
                    from_account_id: accountId,
                    to_public_code: targetInfo.public_code,
                    amount: amt,
                    tx_type: payMode,
                    note: transferNote
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setFeedback({ type: 'error', text: data.message || 'ทำรายการไม่สำเร็จ' });
                return;
            }

            syncNavbarBalance(data.new_balance);
            setFeedback({
                type: 'success',
                text: `ทำรายการสำเร็จ! ตัดยอด ฿${amt.toLocaleString()} ไปยัง ${targetInfo.wallet_name} (${targetInfo.public_code}) เลขอ้างอิง ${data.tx_ref}`
            });
            setTransferAmount('');
            setTransferNote('');
            setTargetCode('');
            setTargetInfo(null);
            await loadWalletData();
        } catch (err) {
            setFeedback({ type: 'error', text: `เกิดข้อผิดพลาด: ${err.message}` });
        } finally {
            setSubmittingTransfer(false);
        }
    };

    const currentYearBE = new Date().getFullYear() + 543;
    const yearBEOptions = [String(currentYearBE - 1), String(currentYearBE), String(currentYearBE + 1)];
    const daysInMonth = new Date(Number(transferYearBE) - 543, Number(transferMonth), 0).getDate();
    const dayOptions = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
    const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minSecOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            <div className="sticky top-0 z-40 w-full">
                <TopNavbar />
            </div>

            <div className="flex-1 px-4 pt-[84px] pb-[100px] max-w-4xl w-full mx-auto space-y-5">
                {/* การ์ดยอดเงินหลัก (High-Contrast Dark Obsidian & Gold) */}
                <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 border border-amber-500/30">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <div className="text-xs text-amber-300 font-bold tracking-wide">
                                    BAN RAO DIGITAL WALLET
                                </div>
                                <div className="text-sm font-extrabold">
                                    {activeWallet?.wallet_name || 'กระเป๋าเงินของฉัน'}
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={loadWalletData}
                            disabled={loading}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-xs font-bold flex items-center gap-1.5"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> รีเฟรช
                        </button>
                    </div>

                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <div className="text-xs text-slate-300 mb-1">ยอดเงินคงเหลือที่ใช้ได้</div>
                            <div className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tight">
                                ฿{Number(activeWallet?.balance || 0).toLocaleString('th-TH', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </div>
                        </div>

                        {/* รหัสบัญชีมาตรฐานสากล (ใช้โอนเงิน & เพิ่มเพื่อน Chat) */}
                        <div className="bg-black/35 border border-white/15 rounded-xl px-3.5 py-2.5 flex items-center gap-3">
                            <div>
                                <div className="text-[10px] text-slate-300 uppercase tracking-wider">
                                    Banrao ID (Wallet & Chat)
                                </div>
                                <div className="text-sm font-mono font-extrabold text-white tracking-wider">
                                    {activeWallet?.public_code || 'กำลังสร้างรหัส...'}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyCode}
                                className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 transition"
                                title="คัดลอกรหัสบัญชี"
                            >
                                {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* แถบเมนูทำรายการ 4 โหมด */}
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { key: 'TOPUP', label: 'เติมเงิน', Icon: PlusCircle },
                        { key: 'TRANSFER', label: 'โอน / จ่าย', Icon: Send },
                        { key: 'RECEIVE', label: 'QR ของฉัน', Icon: QrCode },
                        { key: 'HISTORY', label: 'ประวัติ', Icon: History }
                    ].map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => {
                                setActiveTab(key);
                                setFeedback(null);
                            }}
                            className={`py-3 px-2 rounded-2xl border text-xs font-extrabold flex flex-col items-center justify-center gap-1.5 transition ${
                                activeTab === key
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <Icon size={18} />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>

                {/* กล่องแจ้งเตือนสถานะ */}
                {feedback && (
                    <div
                        className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
                            feedback.type === 'success'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                    >
                        {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span>{feedback.text}</span>
                    </div>
                )}

                {/* ================= TAB 1: เติมเงินเข้ากระเป๋า (QR + แนบสลิป R2) ================= */}
                {activeTab === 'TOPUP' && (
                    <form onSubmit={handleSubmitTopup} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                        <div className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                            <PlusCircle size={18} className="text-emerald-600" />
                            เติมเงินเข้ากระเป๋าผ่าน Thai QR PromptPay
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">ระบุจำนวนเงินที่ต้องการเติม (บาท) *</label>
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                required
                                value={topupAmount}
                                onChange={(e) => setTopupAmount(e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-300 text-lg font-black text-emerald-700"
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                                {[100, 300, 500, 1000, 3000].map((val) => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setTopupAmount(String(val))}
                                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-bold text-slate-700 border border-slate-200"
                                    >
                                        +฿{val.toLocaleString()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {paymentChannels.length > 1 && (
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">เลือกบัญชีรับเงินของระบบ</label>
                                <select
                                    value={selectedChannelId}
                                    onChange={(e) => setSelectedChannelId(e.target.value)}
                                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold"
                                >
                                    {paymentChannels.map((ch) => (
                                        <option key={ch.channel_id} value={ch.channel_id}>
                                            {ch.channel_name_th} • {ch.receiver_name} ({ch.bank_name_th})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* แสดง QR ของระบบ */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1.5">
                            {activeChannel?.qr_image_url ? (
                                <img
                                    src={activeChannel.qr_image_url}
                                    alt="System QR"
                                    className="w-44 max-h-52 object-contain mx-auto rounded-xl bg-white p-1.5 border border-slate-200"
                                />
                            ) : (
                                <div className="text-xs text-amber-700 font-bold py-4">ไม่พบรูป QR Code ของระบบ</div>
                            )}
                            <div className="text-xs font-extrabold text-slate-800">
                                {activeChannel?.receiver_name || 'บัญชีระบบกลาง'} ({activeChannel?.bank_name_th || 'พร้อมเพย์'})
                            </div>
                            <div className="text-[11px] text-slate-500">
                                รหัสอ้างอิง: <span className="font-mono font-bold text-slate-700">{topupRef}</span>
                            </div>
                        </div>

                        {/* แนบสลิป + วันเวลาโอน พ.ศ. */}
                        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                            <div className="text-xs font-extrabold text-amber-900">
                                แนบสลิปและระบุวันเวลาโอนตามสลิป (เพื่อให้แอดมินกระทบยอดเข้ากระเป๋าอัตโนมัติ)
                            </div>

                            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer hover:bg-slate-800">
                                <Upload size={14} />
                                {uploadingSlip ? 'กำลังอัปโหลดสลิป...' : slipImageUrl ? 'เปลี่ยนรูปสลิป' : 'แนบรูปสลิปโอนเงิน *'}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    onChange={handleSlipFileChange}
                                    className="hidden"
                                />
                            </label>

                            {(slipPreviewUrl || slipImageUrl) && (
                                <div className="p-2 rounded-xl bg-white border border-amber-200 text-center">
                                    <img
                                        src={slipPreviewUrl || slipImageUrl}
                                        alt="ตัวอย่างสลิป"
                                        className="max-h-52 mx-auto object-contain rounded-lg"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-12 gap-1.5">
                                <select value={transferDay} onChange={(e) => setTransferDay(e.target.value)} className="col-span-3 p-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-center">
                                    {dayOptions.map((d) => <option key={d} value={d}>{Number(d)}</option>)}
                                </select>
                                <select value={transferMonth} onChange={(e) => setTransferMonth(e.target.value)} className="col-span-5 p-2 rounded-lg border border-slate-300 bg-white text-xs font-bold">
                                    {THAI_MONTHS.map((m, idx) => <option key={m} value={String(idx + 1).padStart(2, '0')}>{m}</option>)}
                                </select>
                                <select value={transferYearBE} onChange={(e) => setTransferYearBE(e.target.value)} className="col-span-4 p-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-center">
                                    {yearBEOptions.map((y) => <option key={y} value={y}>พ.ศ. {y}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5">
                                <select value={transferHour} onChange={(e) => setTransferHour(e.target.value)} className="p-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-center">
                                    {hourOptions.map((h) => <option key={h} value={h}>{h} น.</option>)}
                                </select>
                                <select value={transferMinute} onChange={(e) => setTransferMinute(e.target.value)} className="p-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-center">
                                    {minSecOptions.map((m) => <option key={m} value={m}>{m} นาที</option>)}
                                </select>
                                <select value={transferSecond} onChange={(e) => setTransferSecond(e.target.value)} className="p-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-center">
                                    {minSecOptions.map((s) => <option key={s} value={s}>{s} วินาที</option>)}
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submittingTopup || uploadingSlip || !slipImageUrl}
                            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submittingTopup && <Loader2 size={16} className="animate-spin" />}
                            ยืนยันแจ้งโอนเติมเงิน ฿{Number(topupAmount || 0).toLocaleString()}
                        </button>
                    </form>
                )}

                {/* ================= TAB 2: โอนเงิน / จ่ายค่าสินค้าและบริการ ================= */}
                {activeTab === 'TRANSFER' && (
                    <form onSubmit={handleSubmitTransfer} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setPayMode('TRANSFER_OUT')}
                                className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 ${
                                    payMode === 'TRANSFER_OUT' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-white border-slate-200 text-slate-600'
                                }`}
                            >
                                <Send size={14} /> โอนเงินให้เพื่อน
                            </button>
                            <button
                                type="button"
                                onClick={() => setPayMode('PAY_SERVICE')}
                                className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 ${
                                    payMode === 'PAY_SERVICE' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-white border-slate-200 text-slate-600'
                                }`}
                            >
                                <Store size={14} /> จ่ายค่าสินค้า/บริการ
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                รหัสบัญชีปลายทาง (Banrao ID เช่น BR-12345678) *
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={targetCode}
                                    onChange={(e) => {
                                        setTargetCode(e.target.value.toUpperCase());
                                        setTargetInfo(null);
                                    }}
                                    placeholder="BR-XXXXXXXX"
                                    className="flex-1 p-2.5 rounded-xl border border-slate-300 font-mono text-sm font-bold uppercase"
                                />
                                <button
                                    type="button"
                                    onClick={handleLookupTarget}
                                    disabled={lookingUp || !targetCode.trim()}
                                    className="px-4 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {lookingUp ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                    ตรวจสอบ
                                </button>
                            </div>
                        </div>

                        {targetInfo && (
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900">
                                <UserCheck size={18} className="text-emerald-600 flex-shrink-0" />
                                <div>
                                    <div className="font-extrabold">{targetInfo.wallet_name}</div>
                                    <div className="text-[11px] font-mono text-emerald-700">
                                        {targetInfo.public_code} • {targetInfo.owner_type}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">จำนวนเงิน (บาท) *</label>
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                required
                                value={transferAmount}
                                onChange={(e) => setTransferAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full p-3 rounded-xl border border-slate-300 text-lg font-black text-slate-800"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">บันทึกช่วยจำ / รายละเอียดสินค้า</label>
                            <input
                                type="text"
                                value={transferNote}
                                onChange={(e) => setTransferNote(e.target.value)}
                                placeholder="เช่น ค่าอาหาร, ค่าบริการ..."
                                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submittingTransfer || !targetInfo}
                            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submittingTransfer && <Loader2 size={16} className="animate-spin" />}
                            ยืนยัน{payMode === 'PAY_SERVICE' ? 'ชำระเงิน' : 'โอนเงิน'}จากกระเป๋า
                        </button>
                    </form>
                )}

                {/* ================= TAB 3: QR รับเงิน & รหัสเพิ่มเพื่อน Chat ================= */}
                {activeTab === 'RECEIVE' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-4 shadow-xs">
                        <div className="text-sm font-extrabold text-slate-800">
                            QR Code ประจำตัว (รับเงิน & เพิ่มเพื่อนในระบบ Chat)
                        </div>
                        <div className="text-xs text-slate-500">
                            มาตรฐานสากล รองรับทั้งผู้ใช้งานชาวไทยและชาวต่างชาติ
                        </div>

                        {myQrDataUrl ? (
                            <img
                                src={myQrDataUrl}
                                alt="My Banrao QR"
                                className="w-56 h-56 mx-auto rounded-2xl border-4 border-slate-900 p-2 bg-white shadow-sm"
                            />
                        ) : (
                            <div className="py-10 text-xs text-slate-400">กำลังสร้าง QR Code...</div>
                        )}

                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200">
                            <span className="font-mono text-base font-black text-slate-900 tracking-wider">
                                {activeWallet?.public_code || '-'}
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyCode}
                                className="text-emerald-700 hover:text-emerald-800 text-xs font-bold flex items-center gap-1"
                            >
                                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                                {copiedCode ? 'คัดลอกแล้ว' : 'คัดลอก'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ================= TAB 4: ประวัติธุรกรรม (Append-Only Ledger) ================= */}
                {activeTab === 'HISTORY' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
                        <div className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                            <History size={18} className="text-emerald-600" />
                            ประวัติรายการเงินเข้า-ออก ({transactions.length})
                        </div>

                        {transactions.length === 0 ? (
                            <div className="py-10 text-center text-xs text-slate-400">
                                ยังไม่มีรายการธุรกรรมในกระเป๋าเงิน
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {transactions.map((tx) => {
                                    const isCredit = tx.direction === 'CREDIT';
                                    return (
                                        <div key={tx.tx_id} className="py-3 flex items-center justify-between gap-3">
                                            <div className="flex items-start gap-2.5 min-w-0">
                                                <div
                                                    className={`p-2 rounded-xl flex-shrink-0 ${
                                                        isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                                    }`}
                                                >
                                                    {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-extrabold text-slate-800 truncate">
                                                        {tx.note || tx.tx_type}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        {tx.counterparty_name || '-'}{' '}
                                                        {tx.counterparty_code ? `(${tx.counterparty_code})` : ''}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                                        {formatThaiDateTime(tx.created_at)} • อ้างอิง {tx.tx_ref}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right flex-shrink-0">
                                                <div
                                                    className={`text-sm font-black ${
                                                        isCredit ? 'text-emerald-600' : 'text-red-600'
                                                    }`}
                                                >
                                                    {isCredit ? '+' : '-'}฿
                                                    {Number(tx.amount || 0).toLocaleString('th-TH', {
                                                        minimumFractionDigits: 2
                                                    })}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    คงเหลือ ฿{Number(tx.balance_after || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 z-40 w-full">
                <BottomNavbar />
            </div>
        </div>
    );
}