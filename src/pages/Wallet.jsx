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
    AlertCircle,
    Crown,
    Shuffle,
    ShieldCheck,
    Users,
    Lock,
    KeyRound,
    Plus,
    X,
    FileImage,
    ThumbsUp,
    ThumbsDown,
    Building2
} from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const OWNER_TYPE_LABEL = {
    PERSONAL: 'ส่วนตัว',
    SHOP: 'ร้านค้า',
    BUSINESS: 'ธุรกิจ/บริษัท',
    COMMITTEE: 'คณะกรรมการ/กลุ่ม'
};

const ROLE_LABEL = {
    OWNER: 'เจ้าของ (อนุมัติได้)',
    APPROVER: 'กรรมการผู้อนุมัติ',
    MAKER: 'ผู้ทำรายการ (สร้างคำขอ)',
    VIEWER: 'ผู้ตรวจสอบ (ดูอย่างเดียว)'
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

// ฟังก์ชันกลางสำหรับบีบอัดรูปและอัปโหลดขึ้น Cloudflare R2
async function uploadImageToR2(file, maxW = 1000) {
    const rawDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const compressedDataUrl = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
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

    const res = await fetch(`${API_URL}/api/upload-slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_url: compressedDataUrl, file_name: file.name })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !data.url) {
        throw new Error(data.message || `อัปโหลดรูปไม่สำเร็จ (HTTP ${res.status})`);
    }
    return { url: data.url, preview: compressedDataUrl };
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

    const [activeTab, setActiveTab] = useState('TOPUP'); // TOPUP | TRANSFER | APPROVALS | NUMBERS | RECEIVE | HISTORY
    const [loading, setLoading] = useState(true);
    const [wallets, setWallets] = useState([]);
    const [selectedWalletId, setSelectedWalletId] = useState('');
    const [paymentChannels, setPaymentChannels] = useState([]);
    const [selectedChannelId, setSelectedChannelId] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [members, setMembers] = useState([]);
    const [myQrDataUrl, setMyQrDataUrl] = useState('');
    const [copiedCode, setCopiedCode] = useState(false);
    const [feedback, setFeedback] = useState(null);

    // PIN 6 หลัก
    const [hasPin, setHasPin] = useState(true);
    const [showPinModal, setShowPinModal] = useState(false);
    const [oldPinInput, setOldPinInput] = useState('');
    const [newPinInput, setNewPinInput] = useState('');
    const [savingPin, setSavingPin] = useState(false);


    // สถานะคำขอเปิดบัญชีทางกฎหมาย (เด้งครั้งแรกครั้งเดียวเมื่อกดเติมเงิน)
    const [hasOpeningConsent, setHasOpeningConsent] = useState(true);
    const [openingDoc, setOpeningDoc] = useState(null);
    const [showOpeningModal, setShowOpeningModal] = useState(false);
    const [openingChecked, setOpeningChecked] = useState(false);
    const [openingPin, setOpeningPin] = useState('');
    const [submittingOpening, setSubmittingOpening] = useState(false);

    // Modal สร้างกระเป๋าร้านค้า/กลุ่ม
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupType, setGroupType] = useState('SHOP');
    const [groupReqApprovals, setGroupReqApprovals] = useState(2);
    const [groupLogoUrl, setGroupLogoUrl] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [creatingGroup, setCreatingGroup] = useState(false);

    // เพิ่มกรรมการ
    const [newMemberCode, setNewMemberCode] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('APPROVER');
    const [addingMember, setAddingMember] = useState(false);

    // เติมเงิน (QR + R2 Slip)
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

    // โอนเงิน / จ่ายค่าสินค้าและบริการ
    const [payMode, setPayMode] = useState('TRANSFER_OUT');
    const [targetCode, setTargetCode] = useState('');
    const [targetInfo, setTargetInfo] = useState(null);
    const [lookingUp, setLookingUp] = useState(false);
    const [transferAmount, setTransferAmount] = useState('');
    const [transferNote, setTransferNote] = useState('');
    const [transferAttachUrl, setTransferAttachUrl] = useState('');
    const [uploadingAttach, setUploadingAttach] = useState(false);
    const [transferPin, setTransferPin] = useState('');
    const [submittingTransfer, setSubmittingTransfer] = useState(false);

    // อนุมัติรายการ (Multi-Sig)
    const [votePinMap, setVotePinMap] = useState({});
    const [votingId, setVotingId] = useState(null);

    // เลขสวย 10 หลัก
    const [premiumTier, setPremiumTier] = useState('ALL');
    const [premiumNumbers, setPremiumNumbers] = useState([]);
    const [loadingNumbers, setLoadingNumbers] = useState(false);
    const [changingNumber, setChangingNumber] = useState(false);

    const activeWallet =
        wallets.find((w) => String(w.wallet_id) === String(selectedWalletId)) || wallets[0] || null;
    const activeChannel =
        paymentChannels.find((c) => String(c.channel_id) === String(selectedChannelId)) ||
        paymentChannels[0] ||
        null;

    const availableBalance = Math.max(
        0,
        Number(activeWallet?.balance || 0) - Number(activeWallet?.locked_balance || 0)
    );
    const pendingCount = approvals.filter((r) => r.status === 'PENDING_APPROVAL').length;

    const syncNavbarBalance = (personalWallet) => {
        if (!personalWallet) return;
        const current = parseUserDataSafe();
        const updated = { ...current, wallet_balance: Number(personalWallet.balance || 0) };
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
            const [wRes, chRes, pinRes] = await Promise.all([
                fetch(`${API_URL}/api/wallets/my-all?account_id=${encodeURIComponent(accountId)}`),
                fetch(`${API_URL}/api/payment-channels`),
                fetch(`${API_URL}/api/security/pin-status?account_id=${encodeURIComponent(accountId)}`)
            ]);

                let wJson = await wRes.json().catch(() => ({}));
            // ถ้า /api/wallets/my-all ติดปัญหา ให้แจ้ง Error บนจอและดึงจาก /api/wallets/my มาแสดงทันที
            if (!wRes.ok || !wJson.success) {
                setFeedback({
                    type: 'error',
                    text: `โหลดกระเป๋ากลุ่มไม่สำเร็จ (HTTP ${wRes.status}): ${wJson.message || 'ตรวจสอบ API'}`
                });
                const fbRes = await fetch(`${API_URL}/api/wallets/my?account_id=${encodeURIComponent(accountId)}`);
                wJson = await fbRes.json().catch(() => ({}));
            }

            if (wJson.success && Array.isArray(wJson.wallets)) {
                setWallets(wJson.wallets);
                if (wJson.wallets.length > 0) {
                    setSelectedWalletId((prev) =>
                        wJson.wallets.some((x) => String(x.wallet_id) === String(prev))
                            ? prev
                            : wJson.wallets[0].wallet_id
                    );
                    const personal =
                        wJson.wallets.find((x) => x.owner_type === 'PERSONAL') || wJson.wallets[0];
                    syncNavbarBalance(personal);
                }
            }

            const chJson = await chRes.json().catch(() => ({}));
            if (chJson.success && Array.isArray(chJson.channels)) {
                setPaymentChannels(chJson.channels);
                if (chJson.channels.length > 0) {
                    setSelectedChannelId((prev) => prev || chJson.channels[0].channel_id);
                }
            }

            const pinJson = await pinRes.json().catch(() => ({}));
            if (pinJson.success) setHasPin(Boolean(pinJson.has_pin));

              const legalRes = await fetch(`${API_URL}/api/legal/wallet-opening-status?account_id=${encodeURIComponent(accountId)}`);
            const legalJson = await legalRes.json().catch(() => ({}));
            if (legalJson.success) {
                const consented = Boolean(legalJson.has_consented);
                setHasOpeningConsent(consented);
                setOpeningDoc(legalJson.document || null);
                // ถ้ายังไม่เคยยื่นคำขอเปิดบัญชี หรือยังไม่มีกระเป๋าเงินในระบบ -> แสดงคำขอเปิดบัญชีทันที
                if (!consented || !wJson.wallets || wJson.wallets.length === 0) {
                    setShowOpeningModal(true);
                }
            }


        } catch (err) {
            console.error('Load wallet error:', err);
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    const loadWalletDetails = useCallback(async (walletId) => {
        if (!walletId) return;
        try {
            const [txRes, appRes, memRes] = await Promise.all([
                fetch(`${API_URL}/api/wallets/transactions?wallet_id=${encodeURIComponent(walletId)}`),
                fetch(`${API_URL}/api/wallets/${encodeURIComponent(walletId)}/approvals`),
                fetch(`${API_URL}/api/wallets/${encodeURIComponent(walletId)}/members`)
            ]);
            const txJson = await txRes.json().catch(() => ({}));
            if (txJson.success) setTransactions(txJson.transactions || []);
            const appJson = await appRes.json().catch(() => ({}));
            if (appJson.success) setApprovals(appJson.requests || []);
            const memJson = await memRes.json().catch(() => ({}));
            if (memJson.success) setMembers(memJson.members || []);
        } catch (err) {
            console.error('Load wallet details error:', err);
        }
    }, []);

    useEffect(() => {
        loadWalletData();
    }, [loadWalletData]);

    useEffect(() => {
        if (activeWallet?.wallet_id) {
            loadWalletDetails(activeWallet.wallet_id);
        }
    }, [activeWallet?.wallet_id, loadWalletDetails]);

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

    const loadPremiumNumbers = useCallback(async (tier = 'ALL') => {
        setLoadingNumbers(true);
        try {
            const res = await fetch(`${API_URL}/api/premium-numbers?tier=${encodeURIComponent(tier)}&status=AVAILABLE`);
            const data = await res.json().catch(() => ({}));
            if (data.success && Array.isArray(data.numbers)) {
                setPremiumNumbers(data.numbers);
            }
        } catch (err) {
            console.error('Load premium numbers error:', err);
        } finally {
            setLoadingNumbers(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'NUMBERS') loadPremiumNumbers(premiumTier);
    }, [activeTab, premiumTier, loadPremiumNumbers]);

    const handleCopyCode = () => {
        if (!activeWallet?.public_code) return;
        navigator.clipboard.writeText(activeWallet.public_code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 1800);
    };

    // ตั้ง / เปลี่ยน PIN 6 หลัก
    const handleSavePin = async (e) => {
        e.preventDefault();
        if (!/^\d{6}$/.test(newPinInput)) {
            setFeedback({ type: 'error', text: 'กรุณากรอกรหัส PIN เป็นตัวเลข 6 หลักเท่านั้น' });
            return;
        }
        setSavingPin(true);
        try {
            const res = await fetch(`${API_URL}/api/security/pin-set`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_id: accountId, pin: newPinInput, old_pin: oldPinInput })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setFeedback({ type: 'error', text: data.message || 'ตั้งรหัส PIN ไม่สำเร็จ' });
                return;
            }
            setHasPin(true);
            setShowPinModal(false);
            setOldPinInput('');
            setNewPinInput('');
            setFeedback({ type: 'success', text: 'ตั้งรหัส PIN 6 หลักเรียบร้อยแล้ว' });
            window.alert('บันทึกรหัส PIN 6 หลักเรียบร้อยแล้ว!');
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setSavingPin(false);
        }
    };

    const handleSubmitOpeningConsent = async (e) => {
        e.preventDefault();
        if (!openingChecked) {
            setFeedback({ type: 'error', text: 'กรุณาติ๊กยอมรับข้อตกลงและเงื่อนไขการขอเปิดบัญชี' });
            return;
        }
        if (!/^\d{6}$/.test(openingPin)) {
            setFeedback({ type: 'error', text: 'กรุณากรอกรหัส PIN ตัวเลข 6 หลักเพื่อยืนยัน' });
            return;
        }
        setSubmittingOpening(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/legal/wallet-opening-consent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_id: accountId,
                    applicant_name: payerName,
                    accepted_terms: true,
                    pin: openingPin
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setFeedback({ type: 'error', text: data.message || 'ยื่นคำขอเปิดบัญชีไม่สำเร็จ' });
                return;
            }
            setHasOpeningConsent(true);
            setHasPin(true);
            setShowOpeningModal(false);
            setOpeningPin('');
            setFeedback({ type: 'success', text: data.message });
            await loadWalletData();
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setSubmittingOpening(false);
        }
    };

    // สร้างกระเป๋าร้านค้า / ธุรกิจ / คณะกรรมการ (โลโก้ขึ้น R2)
    const handleGroupLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const { url } = await uploadImageToR2(file, 500);
            setGroupLogoUrl(url);
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setUploadingLogo(false);
            e.target.value = '';
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!groupName.trim()) return;
        setCreatingGroup(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/wallets/create-group`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_id: accountId,
                    creator_name: payerName,
                    wallet_name: groupName.trim(),
                    owner_type: groupType,
                    required_approvals: groupReqApprovals,
                    logo_url: groupLogoUrl || null
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setFeedback({ type: 'error', text: data.message || 'สร้างกระเป๋าไม่สำเร็จ' });
                return;
            }
            setShowGroupModal(false);
            setGroupName('');
            setGroupLogoUrl('');
            await loadWalletData();
            if (data.wallet?.wallet_id) setSelectedWalletId(data.wallet.wallet_id);
            setFeedback({
                type: 'success',
                text: `สร้างกระเป๋า "${data.wallet.wallet_name}" (${data.wallet.public_code}) เรียบร้อยแล้ว!`
            });
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setCreatingGroup(false);
        }
    };

    // อัปโหลดสลิปเติมเงินขึ้น R2
    const handleSlipFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingSlip(true);
        setFeedback(null);
        setSlipImageUrl('');
        try {
            const { url, preview } = await uploadImageToR2(file, 1000);
            setSlipPreviewUrl(preview);
            setSlipImageUrl(url);
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setUploadingSlip(false);
            e.target.value = '';
        }
    };

    const handleSubmitTopup = async (e) => {
        e.preventDefault();
        if (!hasOpeningConsent) {
            setShowOpeningModal(true);
            return;
        }

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
                    purpose_title: `เติมเงินเข้ากระเป๋า ${activeWallet?.wallet_name || ''} (${activeWallet?.public_code || ''})`
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setFeedback({ type: 'error', text: data.message || 'ส่งแจ้งโอนไม่สำเร็จ' });
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
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setSubmittingTopup(false);
        }
    };

    // ค้นหาปลายทาง & แนบหลักฐานการโอนขึ้น R2
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
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setLookingUp(false);
        }
    };

    const handleAttachUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAttach(true);
        try {
            const { url } = await uploadImageToR2(file, 1000);
            setTransferAttachUrl(url);
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setUploadingAttach(false);
            e.target.value = '';
        }
    };

    const handleSubmitTransfer = async (e) => {
        e.preventDefault();
        if (!activeWallet) return;
        if (!hasPin) {
            setShowPinModal(true);
            return;
        }
        const amt = Number(transferAmount);
        if (!targetInfo?.public_code || !Number.isFinite(amt) || amt <= 0) {
            setFeedback({ type: 'error', text: 'กรุณาตรวจสอบบัญชีปลายทางและระบุยอดเงินให้ถูกต้อง' });
            return;
        }
        if (!/^\d{6}$/.test(transferPin)) {
            setFeedback({ type: 'error', text: 'กรุณากรอกรหัส PIN 6 หลักเพื่อยืนยัน' });
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
                    actor_account_id: accountId,
                    actor_name: payerName,
                    to_public_code: targetInfo.public_code,
                    amount: amt,
                    tx_type: payMode,
                    note: transferNote,
                    attachment_url: transferAttachUrl || null,
                    pin: transferPin
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                if (data.code === 'NO_PIN') setShowPinModal(true);
                setFeedback({ type: 'error', text: data.message || 'ทำรายการไม่สำเร็จ' });
                return;
            }

            setFeedback({
                type: 'success',
                text:
                    data.mode === 'PENDING_APPROVAL'
                        ? data.message
                        : `โอนเงินสำเร็จ ฿${amt.toLocaleString()} ไปยัง ${targetInfo.wallet_name} (อ้างอิง ${data.tx_ref})`
            });
            setTransferAmount('');
            setTransferNote('');
            setTransferAttachUrl('');
            setTransferPin('');
            setTargetCode('');
            setTargetInfo(null);
            await loadWalletData();
            await loadWalletDetails(activeWallet.wallet_id);
            if (data.mode === 'PENDING_APPROVAL') setActiveTab('APPROVALS');
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setSubmittingTransfer(false);
        }
    };

    // กรรมการกดอนุมัติ / ปฏิเสธ (ไม่พร้อมกันได้)
    const handleVote = async (requestId, decision) => {
        if (!hasPin) {
            setShowPinModal(true);
            return;
        }
        const pin = votePinMap[requestId] || '';
        if (!/^\d{6}$/.test(pin)) {
            setFeedback({ type: 'error', text: 'กรุณากรอกรหัส PIN 6 หลักในช่องของรายการนั้นก่อนกดยืนยัน' });
            return;
        }
        let rejectReason = '';
        if (decision === 'REJECT') {
            rejectReason = window.prompt('ระบุเหตุผลที่ไม่อนุมัติ (ถ้ามี):') || '';
        }

        setVotingId(requestId);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/wallets/approvals/${requestId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approver_account_id: accountId,
                    approver_name: payerName,
                    decision,
                    reject_reason: rejectReason,
                    pin
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setFeedback({ type: 'error', text: data.message || 'ดำเนินการไม่สำเร็จ' });
                return;
            }
            setFeedback({ type: 'success', text: data.message });
            setVotePinMap((prev) => ({ ...prev, [requestId]: '' }));
            await loadWalletData();
            await loadWalletDetails(activeWallet.wallet_id);
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setVotingId(null);
        }
    };

    // เพิ่มกรรมการเข้ากระเป๋ากลุ่ม
    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!activeWallet || !newMemberCode.trim()) return;
        setAddingMember(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/wallets/${activeWallet.wallet_id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    added_by: accountId,
                    member_public_code: newMemberCode.trim().toUpperCase(),
                    role: newMemberRole
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setFeedback({ type: 'error', text: data.message || 'เพิ่มกรรมการไม่สำเร็จ' });
                return;
            }
            setNewMemberCode('');
            setFeedback({ type: 'success', text: `เพิ่ม "${data.member.member_name}" เข้าเป็น ${ROLE_LABEL[data.member.role]} เรียบร้อยแล้ว` });
            await loadWalletDetails(activeWallet.wallet_id);
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setAddingMember(false);
        }
    };

    // สุ่มเลขฟรี & ซื้อเลขสวยตัดกระเป๋า
    const handleRerollFree = async () => {
        if (!activeWallet) return;
        if (!window.confirm('ยืนยันสุ่มเปลี่ยนเป็นรหัสบัญชี 10 หลักแบบฟรี? (ยอดเงินและประวัติเดิมไม่หาย)')) return;
        setChangingNumber(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/wallets/reroll-free`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet_id: activeWallet.wallet_id, account_id: accountId })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setFeedback({ type: 'error', text: data.message || 'สุ่มเลขไม่สำเร็จ' });
                return;
            }
            setFeedback({ type: 'success', text: `เปลี่ยนรหัสบัญชีใหม่เป็น ${data.new_code} เรียบร้อยแล้ว!` });
            await loadWalletData();
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setChangingNumber(false);
        }
    };

    const handleBuyPremiumNumber = async (numObj) => {
        if (!activeWallet) return;
        const price = Number(numObj.price || 0);
        if (availableBalance < price) {
            setFeedback({
                type: 'error',
                text: `ยอดเงินที่ใช้ได้ไม่พอ (ราคา ฿${price.toLocaleString()} • ใช้ได้ ฿${availableBalance.toLocaleString()}) กรุณาเติมเงินก่อน`
            });
            return;
        }
        if (!window.confirm(`ยืนยันซื้อเลขสวย ${numObj.public_code} (${numObj.tier_label_th})\nราคา ฿${price.toLocaleString()} (หักจากกระเป๋าเงินเท่านั้น)`)) {
            return;
        }
        setChangingNumber(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/wallets/buy-number`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet_id: activeWallet.wallet_id,
                    account_id: accountId,
                    number_id: numObj.number_id
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setFeedback({ type: 'error', text: data.message || 'ซื้อเลขสวยไม่สำเร็จ' });
                return;
            }
            setFeedback({ type: 'success', text: `ซื้อและเปลี่ยนเป็นเลขสวย ${data.new_code} สำเร็จ! (อ้างอิง ${data.tx_ref})` });
            await loadWalletData();
            await loadWalletDetails(activeWallet.wallet_id);
            await loadPremiumNumbers(premiumTier);
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setChangingNumber(false);
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

            <div className="flex-1 px-4 pt-[84px] pb-[100px] max-w-4xl w-full mx-auto space-y-4">
                {/* แถบสลับกระเป๋า (ส่วนตัว / ร้านค้า / ธุรกิจ / คณะกรรมการ) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {wallets.map((w) => {
                        const isSel = String(w.wallet_id) === String(activeWallet?.wallet_id);
                        return (
                            <button
                                key={w.wallet_id}
                                type="button"
                                onClick={() => {
                                    setSelectedWalletId(w.wallet_id);
                                    setFeedback(null);
                                }}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-extrabold whitespace-nowrap transition ${
                                    isSel
                                        ? 'bg-slate-900 text-amber-300 border-amber-500/60 shadow-sm'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {w.logo_url ? (
                                    <img src={w.logo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                    <WalletIcon size={14} />
                                )}
                                <span>{w.wallet_name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/15">
                                    {OWNER_TYPE_LABEL[w.owner_type] || w.owner_type}
                                </span>
                                {Number(w.pending_count || 0) > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">
                                        {w.pending_count}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() => setShowGroupModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-dashed border-emerald-500 bg-emerald-50/70 text-emerald-800 text-xs font-extrabold whitespace-nowrap hover:bg-emerald-100 transition"
                    >
                        <Plus size={14} /> สร้างกระเป๋าร้านค้า / กลุ่ม
                    </button>
                </div>

                {/* การ์ดยอดเงินหลัก (Dark Obsidian & Gold) */}
                <div className="rounded-3xl p-5 text-white shadow-xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 border border-amber-500/35 relative overflow-hidden">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            {activeWallet?.logo_url && (
                                <img
                                    src={activeWallet.logo_url}
                                    alt="Logo"
                                    className="w-10 h-10 rounded-xl object-cover border border-amber-400/50 bg-white"
                                />
                            )}
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-amber-300 font-bold tracking-wide">
                                        {OWNER_TYPE_LABEL[activeWallet?.owner_type] || 'BAN RAO WALLET'}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                                        อนุมัติ {activeWallet?.required_approvals || 1} คน
                                    </span>
                                </div>
                                <div className="text-base font-extrabold">
                                    {activeWallet?.wallet_name || 'กระเป๋าเงินของฉัน'}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setShowPinModal(true)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                                    hasPin
                                        ? 'bg-white/10 hover:bg-white/20 text-white'
                                        : 'bg-amber-500 text-slate-950 animate-pulse'
                                }`}
                            >
                                <KeyRound size={14} /> {hasPin ? 'PIN' : 'ตั้ง PIN'}
                            </button>
                            <button
                                type="button"
                                onClick={loadWalletData}
                                disabled={loading}
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                            >
                                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <div className="text-xs text-slate-300 mb-0.5">ยอดเงินที่ใช้ได้จริง</div>
                            <div className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tight">
                                ฿{availableBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {Number(activeWallet?.locked_balance || 0) > 0 && (
                                <div className="text-[11px] text-amber-200/90 mt-1 flex items-center gap-1">
                                    <Lock size={12} /> กันวงเงินรออนุมัติ: ฿{Number(activeWallet.locked_balance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </div>
                            )}
                        </div>

                        <div className="bg-black/40 border border-white/15 rounded-2xl px-3.5 py-2.5 flex items-center gap-3">
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
                                className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 transition"
                                title="คัดลอกรหัสบัญชี"
                            >
                                {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
                            {!loading && (!hasOpeningConsent || wallets.length === 0) && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs font-bold text-amber-950 flex items-center gap-2">
                            <ShieldCheck size={18} className="text-amber-600 flex-shrink-0" />
                            <span>คุณยังไม่ได้เปิดบัญชีกระเป๋าเงิน กรุณายื่นคำขอเปิดบัญชีเพื่อรับรหัส 10 หลักและเริ่มใช้งาน</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowOpeningModal(true)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold"
                        >
                            เปิดบัญชีตอนนี้ (อนุมัติอัตโนมัติ)
                        </button>
                    </div>
                )}
                
                {/* แถบเมนูทำรายการ 6 โหมด */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                        { key: 'TOPUP', label: 'เติมเงิน', Icon: PlusCircle },
                        { key: 'TRANSFER', label: 'โอน / จ่าย', Icon: Send },
                        { key: 'APPROVALS', label: 'รออนุมัติ', Icon: ShieldCheck, badge: pendingCount },
                        { key: 'NUMBERS', label: 'เลขสวย', Icon: Crown },
                        { key: 'RECEIVE', label: 'QR ของฉัน', Icon: QrCode },
                        { key: 'HISTORY', label: 'ประวัติ/กลุ่ม', Icon: History }
                    ].map(({ key, label, Icon, badge }) => (
                        <button
                            key={key}
                            type="button"
                           onClick={() => {
                                if (key === 'TOPUP' && !hasOpeningConsent) {
                                    setShowOpeningModal(true);
                                    return;
                                }
                                setActiveTab(key);
                                setFeedback(null);
                            }}
                            className={`relative py-3 px-2 rounded-2xl border text-xs font-extrabold flex flex-col items-center justify-center gap-1.5 transition ${
                                activeTab === key
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {badge > 0 && (
                                <span className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black">
                                    {badge}
                                </span>
                            )}
                            <Icon size={18} />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>

                {/* แจ้งเตือนสถานะ */}
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

                {/* ================= TAB 1: เติมเงิน (QR + R2 Slip) ================= */}
                {activeTab === 'TOPUP' && (
                    <form onSubmit={handleSubmitTopup} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                        <div className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                            <PlusCircle size={18} className="text-emerald-600" />
                            เติมเงินเข้ากระเป๋าผ่าน Thai QR PromptPay
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">จำนวนเงินที่ต้องการเติม (บาท) *</label>
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

                        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                            <div className="text-xs font-extrabold text-amber-900">
                                แนบสลิป (เก็บถาวรบน R2) และระบุวันเวลาโอนตามสลิป
                            </div>
                            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer hover:bg-slate-800">
                                <Upload size={14} />
                                {uploadingSlip ? 'กำลังอัปโหลดขึ้น R2...' : slipImageUrl ? 'เปลี่ยนรูปสลิป' : 'แนบรูปสลิปโอนเงิน *'}
                                <input type="file" accept="image/*" onChange={handleSlipFileChange} className="hidden" />
                            </label>

                            {(slipPreviewUrl || slipImageUrl) && (
                                <div className="p-2 rounded-xl bg-white border border-amber-200 text-center">
                                    <img src={slipPreviewUrl || slipImageUrl} alt="สลิป" className="max-h-52 mx-auto object-contain rounded-lg" />
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

                {/* ================= TAB 2: โอน / จ่าย (รองรับ Multi-Sig + แนบหลักฐาน R2) ================= */}
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
                                <Send size={14} /> โอนเงินในระบบ
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

                        {Number(activeWallet?.required_approvals || 1) > 1 && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-2">
                                <ShieldCheck size={16} className="text-amber-600 flex-shrink-0" />
                                กระเป๋านี้ต้องได้รับอนุมัติ {activeWallet.required_approvals} คน ระบบจะสร้างคำขอและกันวงเงินไว้จนกว่ากรรมการจะกดอนุมัติครบ
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">รหัสบัญชีปลายทาง (Banrao ID 10 หลัก) *</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={targetCode}
                                    onChange={(e) => {
                                        setTargetCode(e.target.value.toUpperCase());
                                        setTargetInfo(null);
                                    }}
                                    placeholder="BR-XXXXXXXXXX"
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
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900">
                                {targetInfo.logo_url ? (
                                    <img src={targetInfo.logo_url} alt="" className="w-9 h-9 rounded-full object-cover border border-emerald-300" />
                                ) : (
                                    <UserCheck size={20} className="text-emerald-600 flex-shrink-0" />
                                )}
                                <div>
                                    <div className="font-extrabold">{targetInfo.wallet_name}</div>
                                    <div className="text-[11px] font-mono text-emerald-700">
                                        {targetInfo.public_code} • {OWNER_TYPE_LABEL[targetInfo.owner_type] || targetInfo.owner_type}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                    className="w-full p-2.5 rounded-xl border border-slate-300 text-base font-black text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">รหัส PIN 6 หลัก (ยืนยันตัวตน) *</label>
                                <input
                                    type="password"
                                    maxLength={6}
                                    inputMode="numeric"
                                    required
                                    value={transferPin}
                                    onChange={(e) => setTransferPin(e.target.value.replace(/\D/g, ''))}
                                    placeholder="••••••"
                                    className="w-full p-2.5 rounded-xl border border-slate-300 text-base font-mono tracking-[0.4em] text-center"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">บันทึกช่วยจำ / รายละเอียด</label>
                            <input
                                type="text"
                                value={transferNote}
                                onChange={(e) => setTransferNote(e.target.value)}
                                placeholder="เช่น ค่าวัสดุ, ค่าบริการ, เงินปันผล..."
                                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                            />
                        </div>

                        {/* แนบรูปใบแจ้งหนี้ / หลักฐานขึ้น R2 */}
                        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="text-xs text-slate-600 flex items-center gap-2">
                                <FileImage size={16} className="text-slate-500" />
                                {transferAttachUrl ? 'แนบหลักฐานบน R2 เรียบร้อยแล้ว' : 'แนบใบแจ้งหนี้ / หลักฐาน (ไม่บังคับ)'}
                            </div>
                            <label className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold cursor-pointer">
                                {uploadingAttach ? 'กำลังอัปโหลด...' : transferAttachUrl ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}
                                <input type="file" accept="image/*" onChange={handleAttachUpload} className="hidden" />
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={submittingTransfer || !targetInfo}
                            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submittingTransfer && <Loader2 size={16} className="animate-spin" />}
                            {Number(activeWallet?.required_approvals || 1) > 1
                                ? 'สร้างคำขอโอน (ส่งให้คณะกรรมการอนุมัติ)'
                                : 'ยืนยันทำรายการทันที'}
                        </button>
                    </form>
                )}

                {/* ================= TAB 3: รออนุมัติ (Multi-Sig 1-3 คน ไม่พร้อมกัน) ================= */}
                {activeTab === 'APPROVALS' && (
                    <div className="space-y-3">
                        {approvals.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-400">
                                ไม่มีรายการคำขออนุมัติในกระเป๋านี้
                            </div>
                        ) : (
                            approvals.map((req) => {
                                const votes = Array.isArray(req.votes) ? req.votes : [];
                                const iAlreadyVoted = votes.some((v) => String(v.approver_account_id) === String(accountId));
                                const isPending = req.status === 'PENDING_APPROVAL';
                                return (
                                    <div key={req.request_id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-extrabold text-slate-700">{req.request_ref}</span>
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                                            req.status === 'EXECUTED'
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : req.status === 'REJECTED'
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-amber-100 text-amber-900'
                                                        }`}
                                                    >
                                                        {req.status === 'EXECUTED'
                                                            ? 'โอนสำเร็จแล้ว'
                                                            : req.status === 'REJECTED'
                                                            ? 'ไม่อนุมัติ'
                                                            : `รออนุมัติ (${req.approved_count}/${req.required_approvals} เสียง)`}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-bold text-slate-800 mt-1">
                                                    โอนไปยัง: {req.to_wallet_name} ({req.to_public_code})
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    ผู้สร้างคำขอ: {req.created_by_name} • {formatThaiDateTime(req.created_at)}
                                                </div>
                                                {req.note && <div className="text-xs text-slate-600 mt-1">หมายเหตุ: {req.note}</div>}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black text-slate-900">
                                                    ฿{Number(req.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                </div>
                                                {req.attachment_url && (
                                                    <a
                                                        href={req.attachment_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[11px] text-emerald-700 font-bold underline"
                                                    >
                                                        ดูหลักฐานแนบ (R2)
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* รายชื่อกรรมการที่ลงเสียงแล้ว */}
                                        {votes.length > 0 && (
                                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                                <div className="text-[10px] font-bold text-slate-500">ประวัติการลงเสียงกรรมการ:</div>
                                                {votes.map((v, i) => (
                                                    <div key={i} className="text-xs flex items-center justify-between">
                                                        <span className="font-bold text-slate-700">{v.approver_name}</span>
                                                        <span className={v.decision === 'APPROVE' ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                                                            {v.decision === 'APPROVE' ? '✓ อนุมัติแล้ว' : `✕ ปฏิเสธ (${v.reject_reason || '-'})`}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* ช่องกรอก PIN และปุ่มอนุมัติ/ปฏิเสธ */}
                                        {isPending && !iAlreadyVoted && (
                                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                                                <input
                                                    type="password"
                                                    maxLength={6}
                                                    inputMode="numeric"
                                                    placeholder="PIN 6 หลัก"
                                                    value={votePinMap[req.request_id] || ''}
                                                    onChange={(e) =>
                                                        setVotePinMap((prev) => ({
                                                            ...prev,
                                                            [req.request_id]: e.target.value.replace(/\D/g, '')
                                                        }))
                                                    }
                                                    className="w-32 p-2 rounded-xl border border-slate-300 text-xs font-mono text-center tracking-widest"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={votingId === req.request_id}
                                                    onClick={() => handleVote(req.request_id, 'APPROVE')}
                                                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5"
                                                >
                                                    <ThumbsUp size={14} /> อนุมัติรายการ
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={votingId === req.request_id}
                                                    onClick={() => handleVote(req.request_id, 'REJECT')}
                                                    className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-extrabold flex items-center gap-1.5"
                                                >
                                                    <ThumbsDown size={14} /> ปฏิเสธ
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* ================= TAB 4: เลขสวย 10 หลัก (สุ่มฟรี / ซื้อตัดกระเป๋า) ================= */}
                {activeTab === 'NUMBERS' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                            <div>
                                <div className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                    <Shuffle size={16} className="text-emerald-600" />
                                    สุ่มเปลี่ยนรหัสบัญชีฟรี (เลขทั่วไป 10 หลัก)
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    รหัสปัจจุบัน: <span className="font-mono font-bold text-slate-800">{activeWallet?.public_code || '-'}</span> • เปลี่ยนได้ตลอดโดยไม่กระทบยอดเงินและประวัติเดิม
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={changingNumber}
                                onClick={handleRerollFree}
                                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <Shuffle size={14} /> สุ่มเลขใหม่ฟรี
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-amber-200 p-5 space-y-4 shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                                        <Crown size={18} className="text-amber-500" />
                                        เลือกซื้อ / เปลี่ยนเป็นเลขสวย (Banrao ID)
                                    </div>
                                    <div className="text-[11px] text-amber-800 font-semibold mt-0.5">
                                        ชำระด้วยยอดเงินในกระเป๋าเงินเท่านั้น • เปลี่ยนรหัสให้ทันทีหลังชำระ
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('TOPUP')}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold"
                                >
                                    + เติมเงินเข้ากระเป๋า
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { key: 'ALL', label: 'ทั้งหมด' },
                                    { key: 'VIP', label: 'เลข VIP' },
                                    { key: 'SUPER_NICE', label: 'สวยมาก' },
                                    { key: 'NICE_TIER_2', label: 'สวยรอง' },
                                    { key: 'NICE', label: 'สวย' },
                                    { key: 'LUCKY', label: 'เลขมงคล' }
                                ].map((t) => (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() => setPremiumTier(t.key)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                                            premiumTier === t.key
                                                ? 'bg-amber-500 text-white border-amber-500'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {loadingNumbers ? (
                                <div className="py-10 text-center text-xs text-slate-400">กำลังโหลดคลังเลขสวย...</div>
                            ) : premiumNumbers.length === 0 ? (
                                <div className="py-10 text-center text-xs text-slate-400">ยังไม่มีเลขสวยในหมวดหมู่นี้</div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {premiumNumbers.map((num) => {
                                        const canAfford = availableBalance >= Number(num.price || 0);
                                        return (
                                            <div
                                                key={num.number_id}
                                                className="p-3.5 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-amber-50/40 flex items-center justify-between gap-3"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-extrabold">
                                                            {num.tier_label_th}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 truncate">{num.pattern_note || ''}</span>
                                                    </div>
                                                    <div className="font-mono text-base font-black text-slate-900 tracking-wide">
                                                        {num.public_code}
                                                    </div>
                                                    <div className="text-xs font-extrabold text-emerald-700 mt-0.5">
                                                        ฿{Number(num.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={changingNumber}
                                                    onClick={() => handleBuyPremiumNumber(num)}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex-shrink-0 transition ${
                                                        canAfford
                                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                                    }`}
                                                >
                                                    {canAfford ? 'ซื้อและเปลี่ยน' : 'ยอดไม่พอ'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ================= TAB 5: QR รับเงิน & แชท ================= */}
                {activeTab === 'RECEIVE' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-4 shadow-xs">
                        <div className="text-sm font-extrabold text-slate-800">
                            QR Code ประจำกระเป๋า ({activeWallet?.wallet_name})
                        </div>
                        <div className="text-xs text-slate-500">
                            ใช้สแกนรับเงิน โอนจ่าย และเพิ่มเพื่อนในระบบ Chat (รองรับทั้งคนไทยและชาวต่างชาติ)
                        </div>
                        {myQrDataUrl ? (
                            <img src={myQrDataUrl} alt="My QR" className="w-56 h-56 mx-auto rounded-2xl border-4 border-slate-900 p-2 bg-white shadow-sm" />
                        ) : (
                            <div className="py-10 text-xs text-slate-400">กำลังสร้าง QR Code...</div>
                        )}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200">
                            <span className="font-mono text-base font-black text-slate-900 tracking-wider">
                                {activeWallet?.public_code || '-'}
                            </span>
                            <button type="button" onClick={handleCopyCode} className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                                {copiedCode ? 'คัดลอกแล้ว' : 'คัดลอก'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ================= TAB 6: ประวัติธุรกรรม & คณะกรรมการ ================= */}
                {activeTab === 'HISTORY' && (
                    <div className="space-y-4">
                        {/* จัดการคณะกรรมการ (แสดงเมื่อไม่ใช่กระเป๋าส่วนตัว หรือมีสมาชิก) */}
                        {activeWallet?.owner_type !== 'PERSONAL' && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
                                <div className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                                    <Users size={18} className="text-emerald-600" />
                                    คณะกรรมการและผู้มีสิทธิ์ในกระเป๋านี้ ({members.length} คน)
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {members.map((m) => (
                                        <div key={m.member_id} className="py-2 flex items-center justify-between text-xs">
                                            <div className="font-bold text-slate-800">{m.member_name || m.account_id}</div>
                                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                                                {ROLE_LABEL[m.role] || m.role}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {activeWallet?.my_role === 'OWNER' && (
                                    <form onSubmit={handleAddMember} className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                                        <input
                                            type="text"
                                            value={newMemberCode}
                                            onChange={(e) => setNewMemberCode(e.target.value.toUpperCase())}
                                            placeholder="รหัส Banrao ID กรรมการ (BR-XXXXXXXXXX)"
                                            className="flex-1 min-w-[180px] p-2 rounded-xl border border-slate-300 text-xs font-mono uppercase"
                                        />
                                        <select
                                            value={newMemberRole}
                                            onChange={(e) => setNewMemberRole(e.target.value)}
                                            className="p-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                                        >
                                            <option value="APPROVER">กรรมการผู้อนุมัติ</option>
                                            <option value="MAKER">ผู้ทำรายการ (สร้างคำขอ)</option>
                                            <option value="VIEWER">ผู้ตรวจสอบ</option>
                                        </select>
                                        <button
                                            type="submit"
                                            disabled={addingMember}
                                            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-extrabold"
                                        >
                                            + เพิ่มกรรมการ
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}

                        {/* ประวัติธุรกรรม Append-Only */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
                            <div className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                                <History size={18} className="text-emerald-600" />
                                ประวัติรายการเงินเข้า-ออก ({transactions.length})
                            </div>
                            {transactions.length === 0 ? (
                                <div className="py-10 text-center text-xs text-slate-400">ยังไม่มีรายการธุรกรรม</div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {transactions.map((tx) => {
                                        const isCredit = tx.direction === 'CREDIT';
                                        return (
                                            <div key={tx.tx_id} className="py-3 flex items-center justify-between gap-3">
                                                <div className="flex items-start gap-2.5 min-w-0">
                                                    <div className={`p-2 rounded-xl flex-shrink-0 ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                        {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-extrabold text-slate-800 truncate">{tx.note || tx.tx_type}</div>
                                                        <div className="text-[11px] text-slate-500">
                                                            {tx.counterparty_name || '-'} {tx.counterparty_code ? `(${tx.counterparty_code})` : ''}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                                            {formatThaiDateTime(tx.created_at)} • อ้างอิง {tx.tx_ref}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <div className={`text-sm font-black ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {isCredit ? '+' : '-'}฿{Number(tx.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
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
                    </div>
                )}
            </div>

            {/* ================= MODAL ตั้ง/เปลี่ยน PIN 6 หลัก ================= */}
            {showPinModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <form onSubmit={handleSavePin} className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div className="font-extrabold text-slate-900 flex items-center gap-2">
                                <KeyRound size={18} className="text-amber-500" />
                                {hasPin ? 'เปลี่ยนรหัส PIN 6 หลัก' : 'ตั้งรหัส PIN 6 หลัก'}
                            </div>
                            <button type="button" onClick={() => setShowPinModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                                <X size={18} />
                            </button>
                        </div>
                              {feedback?.type === 'error' && (
                            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                                {feedback.text}
                            </div>
                        )}
                        {hasPin && (
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">รหัส PIN เดิม (6 หลัก)</label>
                                <input
                                    type="password"
                                    maxLength={6}
                                    inputMode="numeric"
                                    required
                                    value={oldPinInput}
                                    onChange={(e) => setOldPinInput(e.target.value.replace(/\D/g, ''))}
                                    className="w-full p-2.5 rounded-xl border border-slate-300 text-center font-mono text-lg tracking-[0.5em]"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">รหัส PIN ใหม่ (ตัวเลข 6 หลัก)</label>
                            <input
                                type="password"
                                maxLength={6}
                                inputMode="numeric"
                                required
                                value={newPinInput}
                                onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                                className="w-full p-2.5 rounded-xl border border-slate-300 text-center font-mono text-lg tracking-[0.5em]"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={savingPin}
                            className="w-full py-3 rounded-xl bg-slate-900 text-amber-300 text-sm font-extrabold"
                        >
                            {savingPin ? 'กำลังบันทึก...' : 'บันทึกรหัส PIN'}
                        </button>
                    </form>
                </div>
            )}

            {/* ================= MODAL สร้างกระเป๋าร้านค้า / ธุรกิจ / คณะกรรมการ ================= */}
            {showGroupModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
                    <form onSubmit={handleCreateGroup} className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl my-auto">
                        <div className="flex items-center justify-between">
                            <div className="font-extrabold text-slate-900 flex items-center gap-2">
                                <Building2 size={18} className="text-emerald-600" />
                                สร้างกระเป๋าร้านค้า / ธุรกิจ / คณะกรรมการ
                            </div>
                            <button type="button" onClick={() => setShowGroupModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                                <X size={18} />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อกระเป๋า / ชื่อร้านค้า / ชื่อคณะกรรมการ *</label>
                            <input
                                type="text"
                                required
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="เช่น กองทุนหมู่บ้านหมู่ 1, ร้านกาแฟบ้านเรา"
                                className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">ประเภทบัญชี</label>
                                <select
                                    value={groupType}
                                    onChange={(e) => setGroupType(e.target.value)}
                                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                                >
                                    <option value="SHOP">ร้านค้า</option>
                                    <option value="BUSINESS">ธุรกิจ / บริษัท</option>
                                    <option value="COMMITTEE">คณะกรรมการ / กลุ่ม</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">จำนวนผู้อนุมัติโอน</label>
                                <select
                                    value={groupReqApprovals}
                                    onChange={(e) => setGroupReqApprovals(Number(e.target.value))}
                                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                                >
                                    <option value={1}>1 คน (โอนทันที)</option>
                                    <option value={2}>2 คน (อนุมัติไม่พร้อมกัน)</option>
                                    <option value={3}>3 คน (อนุมัติไม่พร้อมกัน)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center gap-2.5">
                                {groupLogoUrl ? (
                                    <img src={groupLogoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover border border-slate-300" />
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                                        <Store size={18} />
                                    </div>
                                )}
                                <div className="text-xs text-slate-600 font-bold">โลโก้ร้าน / กลุ่ม (เก็บ R2)</div>
                            </div>
                            <label className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer">
                                {uploadingLogo ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป'}
                                <input type="file" accept="image/*" onChange={handleGroupLogoUpload} className="hidden" />
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={creatingGroup || uploadingLogo}
                            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold"
                        >
                            {creatingGroup ? 'กำลังสร้างกระเป๋า...' : 'สร้างกระเป๋าและออกรหัส 10 หลัก'}
                        </button>
                    </form>
                </div>
            )}

            <div className="fixed bottom-0 z-40 w-full">
                <BottomNavbar />
            </div>
        </div>
    );
}