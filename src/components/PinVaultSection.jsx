import React, { useState, useEffect, useCallback } from 'react';
import { KeyRound, Eye, EyeOff, RefreshCw, ShieldCheck, CheckCircle2, AlertCircle, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

export default function PinVaultSection({ accountId }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [revealedMap, setRevealedMap] = useState(null);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [unlockPin, setUnlockPin] = useState('');
    const [unlocking, setUnlocking] = useState(false);

    // ฟอร์มตั้งเป็นรหัสเดียวกันทุกตาราง
    const [showSyncForm, setShowSyncForm] = useState(false);
    const [currentFinPin, setCurrentFinPin] = useState('');
    const [newUnifiedPin, setNewUnifiedPin] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const loadSummary = useCallback(async () => {
        if (!accountId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/profile/pins/summary?account_id=${encodeURIComponent(accountId)}`);
            const data = await res.json().catch(() => ({}));
            if (data.success) setItems(data.items || []);
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    const hasFinancePin = items.find((i) => i.key === 'FINANCE')?.is_set;

    const handleUnlockReveal = async (e) => {
        e.preventDefault();
        setUnlocking(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/profile/pins/reveal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_id: accountId, finance_pin: unlockPin })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setFeedback({ type: 'error', text: data.message || 'รหัสการเงินไม่ถูกต้อง' });
                return;
            }
            setRevealedMap(data.revealed);
            setShowUnlockModal(false);
            setUnlockPin('');
        } finally {
            setUnlocking(false);
        }
    };

    const handleSyncAllPins = async (e) => {
        e.preventDefault();
        if (!/^\d{6}$/.test(newUnifiedPin)) {
            setFeedback({ type: 'error', text: 'กรุณากรอกรหัส PIN ใหม่เป็นตัวเลข 6 หลัก' });
            return;
        }
        setSyncing(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/profile/pins/sync-all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_id: accountId,
                    current_finance_pin: currentFinPin,
                    new_pin: newUnifiedPin
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setFeedback({ type: 'error', text: data.message || 'อัปเดตรหัสไม่สำเร็จ' });
                return;
            }
            setFeedback({ type: 'success', text: data.message });
            setShowSyncForm(false);
            setCurrentFinPin('');
            setNewUnifiedPin('');
            setRevealedMap(null);
            await loadSummary();
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <KeyRound size={18} className="text-amber-500" />
                    ศูนย์รวมรหัส PIN ความปลอดภัยของฉัน
                </div>
                <div className="flex items-center gap-2">
                    {revealedMap ? (
                        <button
                            type="button"
                            onClick={() => setRevealedMap(null)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                        >
                            <EyeOff size={14} /> ซ่อนรหัส
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowUnlockModal(true)}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5"
                        >
                            <Eye size={14} /> ดูรหัส PIN
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowSyncForm((v) => !v)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 text-amber-300 text-xs font-extrabold flex items-center gap-1.5"
                    >
                        <RefreshCw size={13} /> ตั้งเป็นรหัสเดียวกันทุกจุด
                    </button>
                </div>
            </div>

            {feedback && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{feedback.text}</span>
                </div>
            )}

            {/* รายการรหัส PIN ทุกจุด */}
            {loading ? (
                <div className="text-xs text-slate-400 py-4 text-center">กำลังโหลดข้อมูลรหัส PIN...</div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {items.map((it) => (
                        <div key={it.key} className="py-2.5 flex items-center justify-between gap-3">
                            <div>
                                <div className="text-xs font-extrabold text-slate-800">{it.label}</div>
                                <div className="text-[11px] text-slate-500">
                                    สถานะ: {it.is_set ? 'ตั้งรหัสแล้ว' : 'ยังไม่ได้ตั้งรหัส'}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-black tracking-widest px-3 py-1 rounded-lg bg-slate-100 text-slate-800">
                                    {!it.is_set ? '------' : revealedMap ? revealedMap[it.key] || '••••••' : '••••••'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => (revealedMap ? setRevealedMap(null) : setShowUnlockModal(true))}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                                    title="ดู/ซ่อนรหัส"
                                >
                                    {revealedMap ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ฟอร์มตั้ง PIN เป็นรหัสเดียวกันทุกตาราง */}
            {showSyncForm && (
                <form onSubmit={handleSyncAllPins} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck size={16} className="text-emerald-600" />
                        ตั้งรหัส PIN 6 หลักเป็นชุดเดียวกันทั้งหมด (อัปเดตทุกตารางอัตโนมัติ)
                    </div>
                    {hasFinancePin && (
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">รหัสการเงินเดิม (6 หลัก) *</label>
                            <input
                                type="password"
                                maxLength={6}
                                inputMode="numeric"
                                required
                                value={currentFinPin}
                                onChange={(e) => setCurrentFinPin(e.target.value.replace(/\D/g, ''))}
                                placeholder="••••••"
                                className="w-full p-2.5 rounded-xl border border-slate-300 text-center font-mono tracking-[0.4em]"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">รหัส PIN ใหม่ที่ต้องการใช้เหมือนกันทุกจุด (6 หลัก) *</label>
                        <input
                            type="password"
                            maxLength={6}
                            inputMode="numeric"
                            required
                            value={newUnifiedPin}
                            onChange={(e) => setNewUnifiedPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••••"
                            className="w-full p-2.5 rounded-xl border border-slate-300 text-center font-mono tracking-[0.4em]"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={syncing}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold"
                    >
                        {syncing ? 'กำลังอัปเดตทุกตาราง...' : 'ยืนยันตั้งเป็นรหัสเดียวกันทั้งหมด'}
                    </button>
                </form>
            )}

            {/* Modal กรอกรหัสการเงินเพื่อกดรูปดวงตาดู */}
            {showUnlockModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <form onSubmit={handleUnlockReveal} className="bg-white rounded-2xl max-w-xs w-full p-5 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-extrabold text-slate-900">ยืนยันรหัสการเงินเพื่อดู PIN</div>
                            <button type="button" onClick={() => setShowUnlockModal(false)} className="text-slate-400">
                                <X size={18} />
                            </button>
                        </div>
                        <input
                            type="password"
                            maxLength={6}
                            inputMode="numeric"
                            required
                            autoFocus
                            value={unlockPin}
                            onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••••"
                            className="w-full p-2.5 rounded-xl border border-slate-300 text-center font-mono text-lg tracking-[0.5em]"
                        />
                        <button
                            type="submit"
                            disabled={unlocking}
                            className="w-full py-2.5 rounded-xl bg-slate-900 text-amber-300 text-xs font-extrabold"
                        >
                            {unlocking ? 'กำลังตรวจสอบ...' : 'ปลดล็อกดูรหัส'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}