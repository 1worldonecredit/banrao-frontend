// [PKG-UI-FULL-05] หน้าแพ็กเกจ Parkgate ฉบับสมบูรณ์: สแกน QR + แนบสลิปพร้อม Preview + เวลาโอน HH:mm:ss + กันเด้ง VIP ก่อนอนุมัติ
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    Crown,
    Diamond,
    Award,
    Sparkles,
    Wallet,
    QrCode,
    X,
    Clock,
    ShieldCheck,
    AlertTriangle,
    ArrowLeft,
    Loader2,
    Megaphone,
    Zap,
    Landmark,
    Upload
} from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';
import BankLogoBadge from '../components/BankLogoBadge';
import BankScanQrCard from '../components/BankScanQrCard';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const TIER_CONFIG = {
    FREE: {
        label: 'Free',
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-300',
        cardBorder: 'border-slate-200',
        headerGrad: 'from-slate-600 to-slate-700',
        Icon: Sparkles
    },
    SILVER: {
        label: 'Silver',
        badgeBg: 'bg-zinc-100 text-zinc-800 border-zinc-400',
        cardBorder: 'border-zinc-300',
        headerGrad: 'from-zinc-500 to-slate-600',
        Icon: Award
    },
    DIAMOND: {
        label: 'Diamond',
        badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-300',
        cardBorder: 'border-cyan-300',
        headerGrad: 'from-cyan-500 to-blue-600',
        Icon: Diamond
    },
    VIP: {
        label: 'VIP',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
        cardBorder: 'border-amber-300',
        headerGrad: 'from-amber-500 to-orange-600',
        Icon: Crown
    }
};

const OWNER_TYPE_LABEL = {
    USER: 'กระเป๋าส่วนตัว',
    VILLAGE: 'กระเป๋าหมู่บ้าน',
    SHOP: 'กระเป๋าร้านค้า',
    BUSINESS: 'กระเป๋าธุรกิจ',
    SYSTEM: 'บัญชีระบบกลาง'
};

const AUDIENCE_LABEL = {
    ALL: 'ทุกกลุ่ม (หมู่บ้าน & ผู้ใช้)',
    VILLAGE: 'สำหรับหมู่บ้าน',
    USER: 'สำหรับผู้ใช้งานทั่วไป',
    SHOP: 'สำหรับร้านค้า',
    BUSINESS: 'สำหรับธุรกิจ'
};

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
    const yyyy = bkk.getFullYear();
    const mm = String(bkk.getMonth() + 1).padStart(2, '0');
    const dd = String(bkk.getDate()).padStart(2, '0');
    const hh = String(bkk.getHours()).padStart(2, '0');
    const mi = String(bkk.getMinutes()).padStart(2, '0');
    const ss = String(bkk.getSeconds()).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, hh, mi, ss };
}

export default function ParkgatePackages() {
    const navigate = useNavigate();
    const receiptSectionRef = useRef(null);

    const userData = parseUserDataSafe();
    const accountId = userData.account_id || userData.id || '';
    const villageId = userData.village_id || '';
    const payerName =
        userData.full_name ||
        userData.display_name ||
        `${userData.first_name || ''} ${userData.last_name || ''}`.trim() ||
        userData.username ||
        'ผู้ใช้งานระบบ';

    const [loading, setLoading] = useState(true);
    const [packages, setPackages] = useState([]);
    const [subscription, setSubscription] = useState(null);
    const [villageGrant, setVillageGrant] = useState(null);
    const [settings, setSettings] = useState(null);
    const [wallets, setWallets] = useState([]);

    const [userBankAccounts, setUserBankAccounts] = useState([]);
    const [bankMasterList, setBankMasterList] = useState([]);
    const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
    const [paymentChannels, setPaymentChannels] = useState([]);
    const [selectedChannelId, setSelectedChannelId] = useState('');

    const [freeUpsell, setFreeUpsell] = useState(null);
    const [audienceFilter, setAudienceFilter] = useState('ALL');

    // Modal ชำระเงิน
    const [selectedPkg, setSelectedPkg] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('WALLET');
    const [selectedWalletId, setSelectedWalletId] = useState('');
    const [qrReference, setQrReference] = useState('');
    const [qrImgFailed, setQrImgFailed] = useState(false);

    // ข้อมูลสลิป & เวลาโอน (HH:mm:ss)
    const [slipImageUrl, setSlipImageUrl] = useState('');
    const [slipPreviewUrl, setSlipPreviewUrl] = useState('');
    const [uploadingSlip, setUploadingSlip] = useState(false);
    const [transferDate, setTransferDate] = useState('');
    const [transferHour, setTransferHour] = useState('00');
    const [transferMinute, setTransferMinute] = useState('00');
    const [transferSecond, setTransferSecond] = useState('00');

    const [isPaying, setIsPaying] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState(null);

    // รายการสั่งซื้อรอชำระ (PENDING) หรือ ใบเสร็จรับเงิน/ใบกำกับภาษี (PAID)
    const [createdReceipt, setCreatedReceipt] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            if (accountId) query.set('account_id', accountId);
            if (villageId) query.set('village_id', villageId);

            const [pkgRes, walRes, pmRes, banksRes, chRes] = await Promise.all([
                fetch(`${API_URL}/api/packages/overview?${query.toString()}`),
                accountId
                    ? fetch(`${API_URL}/api/wallets/my?account_id=${encodeURIComponent(accountId)}`)
                    : Promise.resolve(null),
                accountId
                    ? fetch(`${API_URL}/api/payment-methods/my?account_id=${encodeURIComponent(accountId)}`)
                    : Promise.resolve(null),
                fetch(`${API_URL}/api/banks`),
                fetch(`${API_URL}/api/payment-channels`)
            ]);

            const pkgJson = await pkgRes.json();
            if (pkgJson.success) {
                setPackages(pkgJson.packages || []);
                setSubscription(pkgJson.subscription || null);
                setVillageGrant(pkgJson.village_grant || null);
                setSettings(pkgJson.settings || null);
                setFreeUpsell(pkgJson.free_upsell || null);
            }

            if (walRes) {
                const walJson = await walRes.json();
                if (walJson.success) {
                    const list = walJson.wallets || [];
                    setWallets(list);
                    if (list.length > 0) {
                        setSelectedWalletId((prev) => prev || list[0].wallet_id);
                    }
                }
            }

            if (pmRes) {
                const pmJson = await pmRes.json();
                if (pmJson.success) {
                    const bList = pmJson.bank_accounts || [];
                    setUserBankAccounts(bList);
                    if (bList.length > 0) {
                        setSelectedBankAccountId((prev) => prev || bList[0].bank_account_id);
                    }
                }
            }

            const banksJson = await banksRes.json();
            if (banksJson.success && Array.isArray(banksJson.banks)) {
                setBankMasterList(banksJson.banks);
            }

            if (chRes && chRes.ok) {
                const chJson = await chRes.json();
                if (chJson.success && Array.isArray(chJson.channels)) {
                    setPaymentChannels(chJson.channels);
                    if (chJson.channels.length > 0) {
                        setSelectedChannelId((prev) => prev || chJson.channels[0].channel_id);
                    }
                }
            }
        } catch (err) {
            console.error('Load Parkgate data error:', err);
        } finally {
            setLoading(false);
        }
    }, [accountId, villageId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        setQrImgFailed(false);
    }, [selectedChannelId, selectedPkg, paymentMethod]);

    const getReceiverInfoForPkg = useCallback(
        (pkg) => {
            const activeCh =
                paymentChannels.find((c) => String(c.channel_id) === String(selectedChannelId)) ||
                paymentChannels[0] ||
                null;

            const receiverAcc =
                userBankAccounts.find((b) => String(b.bank_account_id) === String(selectedBankAccountId)) ||
                userBankAccounts.find((b) =>
                    ['BUSINESS', 'VILLAGE', 'SHOP'].includes(String(b.owner_type || '').toUpperCase())
                ) ||
                userBankAccounts[0] ||
                null;

            const bankCodeFinal = activeCh?.bank_code || receiverAcc?.bank_code || '';
            const bankMeta = bankCodeFinal
                ? bankMasterList.find((m) => String(m.bank_code).toUpperCase() === String(bankCodeFinal).toUpperCase())
                : null;

            return {
                channel_id: activeCh?.channel_id || null,
                channel_name_th: activeCh?.channel_name_th || '',
                qr_image_url: activeCh?.qr_image_url || settings?.qr_image_url || '',
                receiver_account_id: receiverAcc?.account_id || null,
                receiver_owner_type: activeCh?.owner_type || receiverAcc?.owner_type || 'SYSTEM',
                receiver_name:
                    activeCh?.receiver_name ||
                    receiverAcc?.account_holder_name ||
                    settings?.receiver_name ||
                    'ระบบชุมชนบ้านเรา (BAN RAO)',
                receiver_bank_code: bankCodeFinal,
                receiver_bank_name:
                    activeCh?.bank_name_th ||
                    receiverAcc?.bank_name_th ||
                    bankMeta?.bank_name_th ||
                    settings?.receiver_bank_name ||
                    'พร้อมเพย์ / บัญชีระบบ',
                receiver_account_number:
                    activeCh?.account_number ||
                    activeCh?.promptpay_id ||
                    receiverAcc?.account_number ||
                    settings?.receiver_account_number ||
                    '-',
                bank_logo_url: bankMeta?.logo_url || '',
                bank_brand_color: bankMeta?.brand_color || '#059669',
                purpose_title: `ชำระค่าแพ็กเกจ: ${pkg?.name_th || 'แพ็กเกจระบบ'} (${pkg?.badge_tier || 'VIP'})`,
                line_items: [
                    {
                        name: `${pkg?.name_th || 'แพ็กเกจ'} (${
                            pkg?.billing_cycle === 'YEARLY' ? 'รายปี' : 'ตามรอบบิล'
                        })`,
                        qty: 1,
                        price: Number(pkg?.price_amount || 0)
                    }
                ]
            };
        },
        [paymentChannels, selectedChannelId, userBankAccounts, selectedBankAccountId, bankMasterList, settings]
    );

    const openPaymentModal = (pkg) => {
        const price = Number(pkg.price_amount || 0);
        const hasVillageFree = Boolean(villageGrant?.has_free_grant) && pkg.code === 'FREE';
        if (price === 0 || hasVillageFree) {
            handleConfirmSubscribe(pkg, 'FREE', null);
            return;
        }
        const nowBkk = getBangkokNowParts();
        setSelectedPkg(pkg);
        setPaymentMethod(wallets.length > 0 ? 'WALLET' : 'QR_CODE');
        setQrReference(`PK-${Date.now().toString().slice(-6)}`);
        setQrImgFailed(false);
        setSlipImageUrl('');
        setSlipPreviewUrl('');
        setTransferDate(nowBkk.date);
        setTransferHour(nowBkk.hh);
        setTransferMinute(nowBkk.mi);
        setTransferSecond(nowBkk.ss);
        setFeedbackMsg(null);
    };

    const handleSlipFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingSlip(true);
        setFeedbackMsg(null);
        setSlipImageUrl('');
        try {
            const rawDataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // ย่อขนาดรูปไม่เกิน 1000px (JPEG 82%) เพื่อให้ไฟล์เบา อัปโหลดไว และไม่ติดลิมิตเซิร์ฟเวอร์
            const compressedDataUrl = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const maxW = 1000;
                    const scale = img.width > maxW ? maxW / img.width : 1;
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                img.onerror = () => resolve(rawDataUrl);
                img.src = rawDataUrl;
            });

            // แสดง Preview ทันทีที่เลือกไฟล์
            setSlipPreviewUrl(compressedDataUrl);

            const res = await fetch(`${API_URL}/api/upload-slip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data_url: compressedDataUrl, file_name: file.name })
            });

            if (!res.ok) {
                const errText = await res.text();
                setFeedbackMsg({
                    type: 'error',
                    text: `อัปโหลดสลิปไม่สำเร็จ (HTTP ${res.status}) — ตรวจสอบว่า Push /api/upload-slip ขึ้น Railway แล้ว`
                });
                console.error('Upload slip failed:', res.status, errText);
                return;
            }

            const data = await res.json();
            if (!data.success || !data.url) {
                setFeedbackMsg({ type: 'error', text: data.message || 'อัปโหลดสลิปไม่สำเร็จ' });
            } else {
                setSlipImageUrl(data.url);
            }
        } catch (err) {
            console.error('Upload slip error:', err);
            setFeedbackMsg({ type: 'error', text: `เกิดข้อผิดพลาดในการอัปโหลดสลิป: ${err.message}` });
        } finally {
            setUploadingSlip(false);
            e.target.value = '';
        }
    };

    const handleConfirmSubscribe = async (pkgObj = selectedPkg, methodOverride = null, walletOverride = null) => {
        if (!pkgObj) return;
        if (!accountId) {
            alert('กรุณาเข้าสู่ระบบก่อนเลือกแพ็กเกจ');
            navigate('/login');
            return;
        }

        const method = methodOverride || paymentMethod;
        const walletId = walletOverride !== null ? walletOverride : selectedWalletId;
        const recv = getReceiverInfoForPkg(pkgObj);
        const amt = Number(pkgObj.price_amount || 0);

        const timeHms = `${String(transferHour || '00').padStart(2, '0')}:${String(transferMinute || '00').padStart(2, '0')}:${String(transferSecond || '00').padStart(2, '0')}`;
        if (method === 'QR_CODE') {
            if (!slipImageUrl) {
                setFeedbackMsg({ type: 'error', text: 'กรุณาอัปโหลดรูปสลิปโอนเงินก่อนกดยืนยัน' });
                return;
            }
            if (!transferDate) {
                setFeedbackMsg({ type: 'error', text: 'กรุณาระบุวันที่โอนเงินตามสลิป' });
                return;
            }
        }

        setIsPaying(true);
        setFeedbackMsg(null);
        try {
            const res = await fetch(`${API_URL}/api/packages/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_id: accountId,
                    village_id: villageId || null,
                    package_id: pkgObj.package_id,
                    payment_method: method,
                    wallet_id: method === 'WALLET' ? walletId : null,
                    bank_account_id: selectedBankAccountId || null,
                    qr_reference: method === 'QR_CODE' ? qrReference : null,
                    receiver_name: recv.receiver_name,
                    receiver_owner_type: recv.receiver_owner_type,
                    receiver_bank_name: recv.receiver_bank_name,
                    receiver_account_number: recv.receiver_account_number
                })
            });
            const data = await res.json();
            if (!data.success) {
                setFeedbackMsg({ type: 'error', text: data.message || 'ไม่สามารถดำเนินการได้' });
            } else {
                const receiptNo = data.receipt?.receipt_no || `BR-RCP-${Date.now()}`;
                const refCode = data.qr_reference || qrReference || `PK-${Date.now().toString().slice(-6)}`;
                const finalStatus =
                    data.subscription?.payment_status ||
                    (method === 'QR_CODE' ? 'PENDING' : 'PAID');

                if (method === 'QR_CODE') {
                    await fetch(`${API_URL}/api/payment-slips`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            qr_reference: refCode,
                            tx_category: 'PACKAGE',
                            payer_account_id: accountId,
                            payer_name: payerName,
                            channel_id: recv.channel_id,
                            receiver_name: recv.receiver_name,
                            receiver_bank_name: recv.receiver_bank_name,
                            receiver_account_number: recv.receiver_account_number,
                            amount: amt,
                            transfer_date: transferDate,
                            transfer_time_hms: timeHms,
                            slip_image_url: slipImageUrl,
                            purpose_title: recv.purpose_title
                        })
                    });
                }

                // ปรับยศ/Badge บน Navbar เฉพาะตอนที่จ่ายสำเร็จแล้ว (PAID หรือ FREE) เท่านั้น
                if (finalStatus === 'PAID' || method === 'FREE') {
                    const updatedUser = {
                        ...userData,
                        package_tier: data.subscription?.badge_tier || pkgObj.badge_tier || 'FREE',
                        package_name: data.subscription?.package_name_th || pkgObj.name_th
                    };
                    localStorage.setItem('userData', JSON.stringify(updatedUser));
                    window.dispatchEvent(new Event('userDataUpdated'));
                }

                setCreatedReceipt({
                    receipt_no: receiptNo,
                    qr_reference: refCode,
                    tx_category: 'PACKAGE',
                    payment_status: finalStatus,
                    created_at: new Date().toISOString(),
                    qr_image_url: recv.qr_image_url || '',
                    slip_image_url: method === 'QR_CODE' ? slipImageUrl : '',
                    transfer_date: method === 'QR_CODE' ? transferDate : '',
                    transfer_time_hms: method === 'QR_CODE' ? timeHms : '',
                    receiver_name: recv.receiver_name,
                    receiver_owner_type: recv.receiver_owner_type,
                    receiver_bank_code: recv.receiver_bank_code,
                    receiver_bank_name: recv.receiver_bank_name,
                    receiver_account_number: recv.receiver_account_number,
                    purpose_title: recv.purpose_title,
                    line_items: recv.line_items,
                    total_amount: amt
                });

                setSelectedPkg(null);
                await loadData();

                setTimeout(() => {
                    receiptSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 150);
            }
        } catch (err) {
            setFeedbackMsg({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
        } finally {
            setIsPaying(false);
        }
    };

    const isSubPaid = ['PAID', 'FREE', 'ACTIVE'].includes(String(subscription?.payment_status || '').toUpperCase());
    const activeTier = isSubPaid ? (subscription?.badge_tier || 'FREE') : 'FREE';
    const activeTierCfg = TIER_CONFIG[activeTier] || TIER_CONFIG.FREE;

    const visiblePackages = packages.filter((pkg) => {
        if (audienceFilter === 'ALL') return true;
        const aud = String(pkg.target_audience || 'ALL').toUpperCase();
        return aud === 'ALL' || aud === audienceFilter;
    });

    const paidUpgradePkg = packages.find((p) => Number(p.price_amount || 0) > 0) || null;
    const modalReceiver = selectedPkg ? getReceiverInfoForPkg(selectedPkg) : null;

    const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minSecOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            <div className="sticky top-0 z-40 w-full">
                <TopNavbar userData={userData} />
            </div>

            <div className="flex-1 px-4 pt-[88px] pb-[100px] max-w-5xl w-full mx-auto space-y-5">
                {/* หัวข้อหลัก */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-full bg-white/15 hover:bg-white/25 transition"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-extrabold m-0">แพ็กเกจการใช้งานระบบ (Parkgate)</h1>
                            <p className="text-xs sm:text-sm opacity-90 m-0 mt-0.5">
                                เลือกแพ็กเกจที่เหมาะกับหมู่บ้านหรือธุรกิจ ชำระผ่านกระเป๋าเงินหรือสแกน QR Code
                            </p>
                        </div>
                    </div>
                </div>

                {/* แบนเนอร์เชิญชวน User Free */}
                {freeUpsell?.should_show_upsell && (
                    <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border-2 border-amber-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-500 text-white flex-shrink-0">
                                <Megaphone size={20} />
                            </div>
                            <div>
                                <div className="text-xs font-extrabold text-amber-800">
                                    แคมเปญแนะนำสำหรับสาย Free (เชิญชวนทุก {freeUpsell.interval_days} วัน / ~{freeUpsell.interval_weeks} สัปดาห์)
                                </div>
                                <div className="text-sm font-black text-slate-900 mt-0.5">{freeUpsell.headline}</div>
                                <div className="text-xs text-slate-700 mt-0.5">{freeUpsell.message}</div>
                            </div>
                        </div>

                        {paidUpgradePkg && (
                            <button
                                type="button"
                                onClick={() => openPaymentModal(paidUpgradePkg)}
                                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-extrabold shadow-sm hover:opacity-95 transition flex items-center gap-1.5"
                            >
                                <Zap size={15} /> Update แพ็กเกจเลย
                            </button>
                        )}
                    </div>
                )}

                {/* สถานะแพ็กเกจปัจจุบัน */}
                {subscription && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${activeTierCfg.badgeBg}`}>
                                <activeTierCfg.Icon size={14} />
                                {activeTierCfg.label}
                            </span>
                            <div>
                                <div className="text-sm font-bold text-slate-800">
                                    แพ็กเกจปัจจุบัน: {subscription.package_name}
                                </div>
                                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                                    <span>สถานะการชำระเงิน: <strong>{subscription.payment_status}</strong></span>
                                    {subscription.expires_at_th && (
                                        <span className="inline-flex items-center gap-1">
                                            <Clock size={12} /> หมดอายุ: {subscription.expires_at_th}
                                            {typeof subscription.days_remaining === 'number' && (
                                                <span>(เหลือ {Math.max(0, subscription.days_remaining)} วัน)</span>
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {subscription.is_expiring_soon && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                                <AlertTriangle size={15} />
                                ใกล้หมดอายุภายใน {subscription.notify_days_before} วัน กรุณาต่ออายุล่วงหน้า
                            </div>
                        )}
                    </div>
                )}

                {villageGrant?.has_free_grant && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-900">
                        <ShieldCheck size={22} className="text-emerald-600 flex-shrink-0" />
                        <div className="text-xs sm:text-sm font-semibold">
                            หมู่บ้านของคุณได้รับสิทธิ์ใช้งานฟรี {villageGrant.free_years > 0 ? `${villageGrant.free_years} ปี` : 'ตามเงื่อนไขที่กำหนด'}
                        </div>
                    </div>
                )}

                {/* ปุ่มกรองกลุ่มเป้าหมาย */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: 'ALL', label: 'ทั้งหมด' },
                        { key: 'VILLAGE', label: 'หมู่บ้าน' },
                        { key: 'USER', label: 'ผู้ใช้งาน' },
                        { key: 'SHOP', label: 'ร้านค้า' },
                        { key: 'BUSINESS', label: 'ธุรกิจ' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setAudienceFilter(tab.key)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition ${
                                audienceFilter === tab.key
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* รายการแพ็กเกจ */}
                {loading ? (
                    <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-2">
                        <Loader2 className="animate-spin" size={28} />
                        <span className="text-sm font-medium">กำลังโหลดรายการแพ็กเกจ...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {visiblePackages.map((pkg) => {
                            const tier = TIER_CONFIG[pkg.badge_tier] || TIER_CONFIG.FREE;
                            const TierIcon = tier.Icon;
                            const priceNum = Number(pkg.price_amount || 0);
                            const isCurrent = subscription?.package_id === pkg.package_id;
                            const audKey = String(pkg.target_audience || 'ALL').toUpperCase();
                            const boostLv = Number(pkg.visibility_boost_level || 1);

                            return (
                                <div
                                    key={pkg.package_id}
                                    className={`bg-white rounded-2xl border-2 ${tier.cardBorder} overflow-hidden shadow-xs flex flex-col justify-between`}
                                >
                                    <div>
                                        <div className={`bg-gradient-to-r ${tier.headerGrad} p-5 text-white flex items-center justify-between`}>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
                                                        <TierIcon size={13} /> {tier.label}
                                                    </span>
                                                    <span className="text-[11px] font-bold bg-black/20 px-2.5 py-0.5 rounded-full">
                                                        {AUDIENCE_LABEL[audKey] || audKey}
                                                    </span>
                                                </div>
                                                <h2 className="text-lg font-extrabold m-0">{pkg.name_th}</h2>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-black">
                                                    {priceNum === 0 ? 'ฟรี' : `฿${priceNum.toLocaleString()}`}
                                                </div>
                                                <div className="text-xs opacity-90">
                                                    {priceNum === 0
                                                        ? 'เริ่มต้นใช้งาน'
                                                        : pkg.billing_cycle === 'YEARLY'
                                                        ? '/ ปี'
                                                        : '/ รอบบิล'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5">
                                            <div className="flex flex-wrap gap-2 mb-3 text-[11px] font-bold">
                                                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                                                    ดันการมองเห็นระดับ {boostLv}
                                                </span>
                                                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                                                    {pkg.max_shop_products
                                                        ? `ร้านค้าสูงสุด ${pkg.max_shop_products} รายการ`
                                                        : 'ร้านค้าไม่จำกัดรายการ'}
                                                </span>
                                            </div>

                                            <div className="text-xs font-bold text-slate-500 mb-3">
                                                บริการและสิทธิ์ที่ได้รับ:
                                            </div>
                                            <ul className="space-y-2.5 m-0 p-0 list-none">
                                                {(pkg.features || []).map((feat) => (
                                                    <li key={feat.feature_id} className="flex items-start gap-2.5 text-sm text-slate-700">
                                                        <CheckCircle2 size={17} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                                                        <div>
                                                            <div className="font-bold text-slate-800">{feat.title_th}</div>
                                                            {feat.description_th && (
                                                                <div className="text-xs text-slate-500">{feat.description_th}</div>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="p-5 pt-0">
                                        <button
                                            type="button"
                                            disabled={isPaying}
                                            onClick={() => openPaymentModal(pkg)}
                                            className={`w-full py-3.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
                                                isCurrent
                                                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                            }`}
                                        >
                                            {isPaying && selectedPkg?.package_id === pkg.package_id ? (
                                                <Loader2 className="animate-spin" size={18} />
                                            ) : null}
                                            {isCurrent ? 'ต่ออายุ / เลือกแพ็กเกจนี้อีกครั้ง' : 'เลือกแพ็กเกจนี้'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* รายการสั่งซื้อรอชำระ / ใบเสร็จรับเงินฉบับสมบูรณ์ */}
                <div ref={receiptSectionRef}>
                    {createdReceipt && <BankScanQrCard receipt={createdReceipt} />}
                </div>
            </div>

            {/* Modal ชำระเงิน (จบในหน้าเดียว: สแกน QR -> แนบสลิปพร้อม Preview -> ระบุเวลาโอน HH:mm:ss -> กดยืนยัน) */}
            {selectedPkg && modalReceiver && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 my-auto space-y-3.5 max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <h3 className="text-base font-extrabold text-slate-800 m-0">
                                ชำระเงิน: {selectedPkg.name_th}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSelectedPkg(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-slate-800 space-y-1">
                            <div className="font-extrabold text-emerald-900">
                                จ่ายค่าอะไร: {modalReceiver.purpose_title}
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <BankLogoBadge
                                    bankCode={modalReceiver.receiver_bank_code || 'QR'}
                                    logoUrl={modalReceiver.bank_logo_url}
                                    brandColor={modalReceiver.bank_brand_color}
                                    size={32}
                                />
                                <div>
                                    <div>
                                        <strong>ผู้รับเงิน:</strong> {modalReceiver.receiver_name} ({modalReceiver.receiver_owner_type})
                                    </div>
                                    <div className="text-[11px] text-slate-600">
                                        {modalReceiver.receiver_bank_name} • <span className="font-mono">{modalReceiver.receiver_account_number}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {paymentChannels.length > 1 && (
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">
                                    ช่องทางรับเงินของระบบ ({paymentChannels.length})
                                </label>
                                <select
                                    value={selectedChannelId}
                                    onChange={(e) => setSelectedChannelId(e.target.value)}
                                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
                                >
                                    {paymentChannels.map((ch) => (
                                        <option key={ch.channel_id} value={ch.channel_id}>
                                            {ch.channel_name_th} • {ch.receiver_name} ({ch.bank_name_th || ch.owner_type})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {userBankAccounts.length > 0 && (
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                                    <Landmark size={13} className="text-emerald-600" /> บัญชีธนาคารที่ผูกไว้ ({userBankAccounts.length})
                                </label>
                                <select
                                    value={selectedBankAccountId}
                                    onChange={(e) => setSelectedBankAccountId(e.target.value)}
                                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
                                >
                                    {userBankAccounts.map((b) => (
                                        <option key={b.bank_account_id} value={b.bank_account_id}>
                                            {b.bank_name_th} • {b.account_number} ({b.account_holder_name} - {b.owner_type})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600">ยอดที่ต้องชำระ</span>
                            <span className="text-lg font-black text-emerald-700">
                                ฿{Number(selectedPkg.price_amount || 0).toLocaleString()}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('WALLET')}
                                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                                    paymentMethod === 'WALLET'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                        : 'border-slate-200 bg-white text-slate-600'
                                }`}
                            >
                                <Wallet size={15} /> หักจากกระเป๋าเงิน
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('QR_CODE')}
                                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                                    paymentMethod === 'QR_CODE'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                        : 'border-slate-200 bg-white text-slate-600'
                                }`}
                            >
                                <QrCode size={15} /> Scan QR Code
                            </button>
                        </div>

                        {paymentMethod === 'WALLET' ? (
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                                    เลือกกระเป๋าเงินที่จะหักยอด
                                </label>
                                {wallets.length === 0 ? (
                                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                                        ไม่พบกระเป๋าเงิน แนะนำให้เลือกชำระผ่าน Scan QR Code
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-36 overflow-y-auto">
                                        {wallets.map((w) => (
                                            <label
                                                key={w.wallet_id}
                                                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                                                    selectedWalletId === w.wallet_id
                                                        ? 'border-emerald-500 bg-emerald-50/60'
                                                        : 'border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <input
                                                        type="radio"
                                                        name="walletChoice"
                                                        checked={selectedWalletId === w.wallet_id}
                                                        onChange={() => setSelectedWalletId(w.wallet_id)}
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-extrabold text-slate-800 truncate">
                                                            {w.wallet_name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">
                                                            {OWNER_TYPE_LABEL[w.owner_type] || w.owner_type}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-xs font-extrabold text-emerald-700 ml-2 flex-shrink-0">
                                                    ฿{Number(w.balance || 0).toLocaleString()}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* 1. สแกน QR โอนเงิน */}
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                                    {modalReceiver.qr_image_url && !qrImgFailed ? (
                                        <img
                                            src={modalReceiver.qr_image_url}
                                            alt="Thai QR PromptPay"
                                            loading="lazy"
                                            decoding="async"
                                            onError={() => setQrImgFailed(true)}
                                            className="w-44 max-h-52 object-contain mx-auto rounded-xl bg-white p-1.5 border border-slate-200"
                                        />
                                    ) : (
                                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                                            ไม่พบรูป QR Code กรุณาอัปโหลดใหม่ในหน้าหลังบ้าน
                                        </div>
                                    )}
                                    <div className="text-xs font-bold text-slate-800">
                                        1. สแกนโอนยอด ฿{Number(selectedPkg.price_amount || 0).toLocaleString()}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        อ้างอิง: <span className="font-mono font-bold">{qrReference}</span>
                                    </div>
                                </div>

                                {/* 2. แนบสลิปโอนเงิน + Preview + ระบุเวลาโอน HH:mm:ss */}
                                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                                    <div className="text-xs font-extrabold text-amber-900">
                                        2. แนบสลิปและระบุเวลาที่โอนตามสลิป (เพื่อให้แอดมินกระทบยอดได้แม่นยำ)
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer hover:bg-slate-800">
                                            <Upload size={14} />
                                            {uploadingSlip ? 'กำลังอัปโหลดสลิป...' : (slipPreviewUrl || slipImageUrl) ? 'เปลี่ยนรูปสลิป' : 'แนบรูปสลิปโอนเงิน *'}
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                                onChange={handleSlipFileChange}
                                                className="hidden"
                                            />
                                        </label>

                                        {(slipPreviewUrl || slipImageUrl) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSlipPreviewUrl('');
                                                    setSlipImageUrl('');
                                                }}
                                                className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 text-xs font-bold hover:bg-red-50"
                                            >
                                                ลบรูป
                                            </button>
                                        )}
                                    </div>

                                    {/* กล่อง Preview รูปสลิปแบบเห็นชัดเจน */}
                                    {(slipPreviewUrl || slipImageUrl) && (
                                        <div className="p-2 rounded-xl bg-white border border-amber-200 text-center space-y-1.5">
                                            <img
                                                src={slipPreviewUrl || slipImageUrl}
                                                alt="ตัวอย่างสลิปโอนเงิน"
                                                className="max-h-56 mx-auto object-contain rounded-lg border border-slate-200"
                                            />
                                            <div className="text-[11px] font-bold">
                                                {uploadingSlip ? (
                                                    <span className="text-amber-600">กำลังส่งรูปสลิปขึ้นระบบ...</span>
                                                ) : slipImageUrl ? (
                                                    <span className="text-emerald-700">✓ อัปโหลดสลิปเรียบร้อยแล้ว (ดูเวลาบนสลิปแล้วกรอกด้านล่างได้เลย)</span>
                                                ) : (
                                                    <span className="text-red-600">อัปโหลดไม่สำเร็จ กรุณาลองเลือกไฟล์ใหม่อีกครั้ง</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">วันที่โอน *</label>
                                            <input
                                                type="date"
                                                value={transferDate}
                                                onChange={(e) => setTransferDate(e.target.value)}
                                                className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">เวลาที่โอน (ชม : นาที : วินาที) *</label>
                                            <div className="grid grid-cols-3 gap-1">
                                                <select
                                                    value={transferHour}
                                                    onChange={(e) => setTransferHour(e.target.value)}
                                                    className="px-1 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-center"
                                                >
                                                    {hourOptions.map((h) => (
                                                        <option key={h} value={h}>{h}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={transferMinute}
                                                    onChange={(e) => setTransferMinute(e.target.value)}
                                                    className="px-1 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-center"
                                                >
                                                    {minSecOptions.map((m) => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={transferSecond}
                                                    onChange={(e) => setTransferSecond(e.target.value)}
                                                    className="px-1 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-center"
                                                >
                                                    {minSecOptions.map((s) => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {feedbackMsg && (
                            <div
                                className={`p-3 rounded-xl text-xs font-bold ${
                                    feedbackMsg.type === 'error'
                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                            >
                                {feedbackMsg.text}
                            </div>
                        )}

                        <div className="flex items-center gap-2.5 pt-1">
                            <button
                                type="button"
                                onClick={() => setSelectedPkg(null)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                disabled={
                                    isPaying ||
                                    uploadingSlip ||
                                    (paymentMethod === 'WALLET' && !selectedWalletId) ||
                                    (paymentMethod === 'QR_CODE' && !slipImageUrl)
                                }
                                onClick={() => handleConfirmSubscribe(selectedPkg)}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {isPaying && <Loader2 size={15} className="animate-spin" />}
                                {paymentMethod === 'WALLET' ? 'ยืนยันหักกระเป๋าเงิน' : 'ยืนยันแจ้งโอน & ส่งสลิป'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed bottom-0 z-40 w-full">
                <BottomNavbar />
            </div>
        </div>
    );
}