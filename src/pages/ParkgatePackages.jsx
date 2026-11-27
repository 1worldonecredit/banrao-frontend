import React, { useState, useEffect, useCallback } from 'react';
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
    Loader2
} from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

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
    BUSINESS: 'กระเป๋าธุรกิจ'
};

export default function ParkgatePackages() {
    const navigate = useNavigate();
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const accountId = userData.account_id || userData.id || '';
    const villageId = userData.village_id || '';

    const [loading, setLoading] = useState(true);
    const [packages, setPackages] = useState([]);
    const [subscription, setSubscription] = useState(null);
    const [villageGrant, setVillageGrant] = useState(null);
    const [settings, setSettings] = useState(null);
    const [wallets, setWallets] = useState([]);

    // Modal ชำระเงิน
    const [selectedPkg, setSelectedPkg] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('WALLET'); // 'WALLET' | 'QR_CODE'
    const [selectedWalletId, setSelectedWalletId] = useState('');
    const [qrReference, setQrReference] = useState('');
    const [isPaying, setIsPaying] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            if (accountId) query.set('account_id', accountId);
            if (villageId) query.set('village_id', villageId);

            const [pkgRes, walRes] = await Promise.all([
                fetch(`${API_URL}/api/packages/overview?${query.toString()}`),
                accountId ? fetch(`${API_URL}/api/wallets/my?account_id=${encodeURIComponent(accountId)}`) : Promise.resolve(null)
            ]);

            const pkgJson = await pkgRes.json();
            if (pkgJson.success) {
                setPackages(pkgJson.packages || []);
                setSubscription(pkgJson.subscription || null);
                setVillageGrant(pkgJson.village_grant || null);
                setSettings(pkgJson.settings || null);
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
        } catch (err) {
            console.error('Load Parkgate data error:', err);
        } finally {
            setLoading(false);
        }
    }, [accountId, villageId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const openPaymentModal = (pkg) => {
        const price = Number(pkg.price_amount || 0);
        const hasVillageFree = Boolean(villageGrant?.has_free_grant) && pkg.code === 'FREE';
        if (price === 0 || hasVillageFree) {
            handleConfirmSubscribe(pkg, 'FREE', null);
            return;
        }
        setSelectedPkg(pkg);
        setPaymentMethod(wallets.length > 0 ? 'WALLET' : 'QR_CODE');
        setQrReference(`PK-${Date.now().toString().slice(-6)}`);
        setFeedbackMsg(null);
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
                    qr_reference: method === 'QR_CODE' ? qrReference : null
                })
            });
            const data = await res.json();
            if (!data.success) {
                setFeedbackMsg({ type: 'error', text: data.message || 'ไม่สามารถดำเนินการได้' });
            } else {
                // อัปเดต badge_tier ลง userData ใน localStorage เพื่อให้ TopNavbar แสดงผลทันที
                const updatedUser = {
                    ...userData,
                    package_tier: data.subscription?.badge_tier || pkgObj.badge_tier || 'FREE',
                    package_name: data.subscription?.package_name_th || pkgObj.name_th
                };
                localStorage.setItem('userData', JSON.stringify(updatedUser));
                window.dispatchEvent(new Event('userDataUpdated'));

                setSelectedPkg(null);
                await loadData();
                alert(
                    method === 'QR_CODE'
                        ? `สร้างรายการชำระเงิน QR Code เรียบร้อย (รหัสอ้างอิง: ${data.qr_reference})`
                        : `เปิดใช้งานแพ็กเกจ "${pkgObj.name_th}" เรียบร้อยแล้วครับ`
                );
            }
        } catch (err) {
            setFeedbackMsg({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
        } finally {
            setIsPaying(false);
        }
    };

    const activeTier = subscription?.badge_tier || 'FREE';
    const activeTierCfg = TIER_CONFIG[activeTier] || TIER_CONFIG.FREE;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            <div className="sticky top-0 z-40 w-full">
                <TopNavbar userData={userData} />
            </div>

            <div className="flex-1 px-4 pt-[88px] pb-[100px] max-w-5xl w-full mx-auto">
                {/* หัวข้อหลัก */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 text-white mb-5 shadow-sm flex items-center justify-between gap-3">
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
                                เลือกแพ็กเกจที่เหมาะกับการใช้งาน ชำระผ่านกระเป๋าเงินกลางหรือสแกน QR Code
                            </p>
                        </div>
                    </div>
                </div>

                {/* การ์ดสถานะแพ็กเกจปัจจุบันของผู้ใช้ */}
                {subscription && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
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

                {/* แจ้งเตือนสิทธิ์ฟรีหมู่บ้าน 1-5 ปี (ถ้ามี) */}
                {villageGrant?.has_free_grant && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 flex items-center gap-3 text-emerald-900">
                        <ShieldCheck size={22} className="text-emerald-600 flex-shrink-0" />
                        <div className="text-xs sm:text-sm font-semibold">
                            หมู่บ้านของคุณได้รับสิทธิ์ใช้งานฟรี {villageGrant.free_years > 0 ? `${villageGrant.free_years} ปี` : 'ตามเงื่อนไขที่กำหนด'}
                        </div>
                    </div>
                )}

                {/* รายการแพ็กเกจ */}
                {loading ? (
                    <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-2">
                        <Loader2 className="animate-spin" size={28} />
                        <span className="text-sm font-medium">กำลังโหลดรายการแพ็กเกจ...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {packages.map((pkg) => {
                            const tier = TIER_CONFIG[pkg.badge_tier] || TIER_CONFIG.FREE;
                            const TierIcon = tier.Icon;
                            const priceNum = Number(pkg.price_amount || 0);
                            const isCurrent = subscription?.package_id === pkg.package_id;

                            return (
                                <div
                                    key={pkg.package_id}
                                    className={`bg-white rounded-2xl border-2 ${tier.cardBorder} overflow-hidden shadow-xs flex flex-col justify-between`}
                                >
                                    <div>
                                        <div className={`bg-gradient-to-r ${tier.headerGrad} p-5 text-white flex items-center justify-between`}>
                                            <div>
                                                <span className="inline-flex items-center gap-1 text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full mb-2">
                                                    <TierIcon size={13} /> {tier.label}
                                                </span>
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
            </div>

            {/* Modal ชำระเงิน: หักจากกระเป๋าเงินกลาง หรือ Scan QR Code */}
            {selectedPkg && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-base font-extrabold text-slate-800 m-0">
                                ชำระเงินแพ็กเกจ: {selectedPkg.name_th}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSelectedPkg(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="my-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600">ยอดที่ต้องชำระ</span>
                            <span className="text-lg font-black text-emerald-700">
                                ฿{Number(selectedPkg.price_amount || 0).toLocaleString()}
                            </span>
                        </div>

                        {/* เลือกวิธีชำระเงิน */}
                        <div className="grid grid-cols-2 gap-2.5 mb-4">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('WALLET')}
                                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                                    paymentMethod === 'WALLET'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                        : 'border-slate-200 bg-white text-slate-600'
                                }`}
                            >
                                <Wallet size={16} /> หักจากกระเป๋าเงิน
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('QR_CODE')}
                                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                                    paymentMethod === 'QR_CODE'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                        : 'border-slate-200 bg-white text-slate-600'
                                }`}
                            >
                                <QrCode size={16} /> Scan QR Code
                            </button>
                        </div>

                        {paymentMethod === 'WALLET' ? (
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-600 mb-2">
                                    เลือกกระเป๋าเงินที่จะหักยอด (ชื่อตามเจ้าของกระเป๋า)
                                </label>
                                {wallets.length === 0 ? (
                                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                                        ไม่พบกระเป๋าเงินในบัญชี แนะนำให้เลือกชำระผ่าน Scan QR Code
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {wallets.map((w) => (
                                            <label
                                                key={w.wallet_id}
                                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                                                    selectedWalletId === w.wallet_id
                                                        ? 'border-emerald-500 bg-emerald-50/60'
                                                        : 'border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
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
                            <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                                <div className="inline-flex items-center justify-center w-28 h-28 rounded-2xl bg-white border-2 border-dashed border-slate-300 mb-2">
                                    <QrCode size={68} className="text-slate-700" />
                                </div>
                                <div className="text-xs font-bold text-slate-700">
                                    {settings?.qr_prompt_info || 'สแกน QR Code เพื่อชำระเงินค่าแพ็กเกจ'}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                    รหัสอ้างอิง: <span className="font-mono font-bold">{qrReference}</span>
                                </div>
                            </div>
                        )}

                        {feedbackMsg && (
                            <div
                                className={`mb-3 p-3 rounded-xl text-xs font-bold ${
                                    feedbackMsg.type === 'error'
                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                            >
                                {feedbackMsg.text}
                            </div>
                        )}

                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => setSelectedPkg(null)}
                                className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                disabled={isPaying || (paymentMethod === 'WALLET' && !selectedWalletId)}
                                onClick={() => handleConfirmSubscribe(selectedPkg)}
                                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {isPaying && <Loader2 size={15} className="animate-spin" />}
                                {paymentMethod === 'WALLET' ? 'ยืนยันหักกระเป๋าเงิน' : 'ยืนยันสร้างรายการ QR'}
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