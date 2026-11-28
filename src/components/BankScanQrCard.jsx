// [QR-RECEIPT-FULL-01] แยกโหมด: รายการสั่งซื้อรอชำระ (สแกน QR ธนาคารได้จริง) vs ใบเสร็จรับเงิน/ใบกำกับภาษี (เมื่อ Admin ยืนยันแล้ว)
import React, { useState, useEffect } from 'react';
import { Receipt, ShieldCheck, Clock, CheckCircle2, Printer, Building2, User } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

// [BAHT-TEXT-01] แปลงตัวเลขเป็นตัวหนังสือบาทไทยมาตรฐาน (รองรับสตางค์และหลักล้าน)
export function toThaiBahtText(amountInput) {
    const num = Number(amountInput || 0);
    if (!Number.isFinite(num) || num === 0) return 'ศูนย์บาทถ้วน';

    const digits = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    const readInt = (intStr) => {
        let result = '';
        const len = intStr.length;
        for (let i = 0; i < len; i++) {
            const n = Number(intStr[i]);
            const pos = (len - i - 1) % 6;
            const isMillionMark = (len - i - 1) > 0 && pos === 0;

            if (n !== 0) {
                if (pos === 1 && n === 1) {
                    result += 'สิบ';
                } else if (pos === 1 && n === 2) {
                    result += 'ยี่สิบ';
                } else if (pos === 0 && n === 1 && len > 1 && Number(intStr[i - 1] || 0) !== 0) {
                    result += 'เอ็ด';
                } else {
                    result += digits[n] + positions[pos];
                }
            }
            if (isMillionMark) result += 'ล้าน';
        }
        return result;
    };

    const fixed = Math.abs(num).toFixed(2);
    const [bahtPart, satangPart] = fixed.split('.');
    const bahtText = Number(bahtPart) > 0 ? `${readInt(bahtPart)}บาท` : '';
    const satangText = Number(satangPart) > 0 ? `${readInt(satangPart)}สตางค์` : 'ถ้วน';
    const prefix = num < 0 ? 'ลบ' : '';

    return `${prefix}${bahtText || 'ศูนย์บาท'}${satangText}`;
}

// [VAT-CALC-01] คำนวณราคาก่อน VAT, VAT และยอดรวมสุทธิอย่างแม่นยำ
export function calculateVatSummary(totalAmountInput, vatRateInput = 7, vatMode = 'INCLUDED') {
    const raw = Number(totalAmountInput || 0);
    const rate = Number(vatRateInput || 0);
    const mode = String(vatMode || 'INCLUDED').toUpperCase();

    if (mode === 'NONE' || rate <= 0) {
        return { beforeVat: raw, vatAmount: 0, grandTotal: raw, vatRate: 0, vatMode: 'NONE' };
    }
    if (mode === 'EXCLUDED') {
        const beforeVat = Number(raw.toFixed(2));
        const vatAmount = Number((beforeVat * (rate / 100)).toFixed(2));
        const grandTotal = Number((beforeVat + vatAmount).toFixed(2));
        return { beforeVat, vatAmount, grandTotal, vatRate: rate, vatMode: 'EXCLUDED' };
    }
    // INCLUDED (ราคารวม VAT แล้ว — มาตรฐานแพ็กเกจ/สินค้าไทย)
    const grandTotal = Number(raw.toFixed(2));
    const beforeVat = Number((grandTotal / (1 + rate / 100)).toFixed(2));
    const vatAmount = Number((grandTotal - beforeVat).toFixed(2));
    return { beforeVat, vatAmount, grandTotal, vatRate: rate, vatMode: 'INCLUDED' };
}

// คง export ชื่อเดิมไว้เพื่อไม่ให้ import ในไฟล์อื่นพัง
export function buildBankScanQrString({ receiptNo = '', qrReference = '', totalAmount = 0 }) {
    return `BANRAO|REF:${qrReference || receiptNo}|AMT:${Number(totalAmount || 0).toFixed(2)}`;
}

function getBuyerFromLocalStorage() {
    try {
        const u = JSON.parse(localStorage.getItem('userData') || '{}') || {};
        return {
            name: u.full_name || u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'ผู้ใช้งานระบบ',
            account_id: u.account_id || u.id || '-',
            phone: u.phone || u.mobile || '-',
            email: u.email || '-',
            address: u.address || u.village_name || '-'
        };
    } catch {
        return { name: 'ผู้ใช้งานระบบ', account_id: '-', phone: '-', email: '-', address: '-' };
    }
}

export default function BankScanQrCard({ receipt = null }) {
    const [company, setCompany] = useState({
        company_name_th: 'ระบบชุมชนบ้านเรา (BAN RAO)',
        branch_name_th: 'สำนักงานใหญ่',
        tax_id: '0-1055-69000-00-0',
        address_th: 'กำลังโหลดข้อมูลที่อยู่ระบบ...',
        phone: '-',
        email: 'support@banrao.life',
        vat_rate: 7,
        vat_mode: 'INCLUDED'
    });

    useEffect(() => {
        let active = true;
        fetch(`${API_URL}/api/company-profile`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (active && data?.success && data.profile) {
                    setCompany(data.profile);
                }
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    if (!receipt) return null;

    const paymentStatus = String(receipt.payment_status || 'PENDING').toUpperCase();
    const isPaid = paymentStatus === 'PAID' || paymentStatus === 'APPROVED';
    const items = Array.isArray(receipt.line_items) ? receipt.line_items : [];
    const buyer = receipt.buyer || getBuyerFromLocalStorage();

    const vatSummary = calculateVatSummary(
        receipt.total_amount,
        company.vat_rate ?? 7,
        company.vat_mode || 'INCLUDED'
    );
    const thaiBahtText = toThaiBahtText(vatSummary.grandTotal);
    const issuedDateTh = new Date(receipt.created_at || Date.now()).toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // =========================================================================
    // โหมดที่ 1: รายการสั่งซื้อรอชำระ / รอ Admin ยืนยัน (แสดงรูป QR ธนาคารจริงที่สแกนได้)
    // =========================================================================
    if (!isPaid) {
        return (
            <div className="bg-white rounded-2xl border-2 border-amber-300 p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-amber-100">
                    <div className="flex items-center gap-2">
                        <Clock size={18} className="text-amber-600" />
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 m-0">
                            รายการสั่งซื้อรอชำระเงิน (รอแอดมินตรวจสอบยืนยัน)
                        </h3>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                        อ้างอิง: {receipt.qr_reference || receipt.receipt_no || '-'}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                    {/* รูป QR พร้อมเพย์จริงจากตาราง system_payment_channels */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        {receipt.qr_image_url ? (
                            <img
                                src={receipt.qr_image_url}
                                alt="Thai QR PromptPay"
                                loading="lazy"
                                decoding="async"
                                className="w-60 max-h-72 object-contain rounded-xl bg-white p-2 border border-slate-200 shadow-xs"
                            />
                        ) : (
                            <div className="w-56 h-56 flex items-center justify-center text-center text-xs text-red-600 font-bold p-4">
                                ยังไม่พบรูป QR Code ของระบบ กรุณาอัปโหลดรูป QR ในหน้าหลังบ้าน (เพิ่มบัญชีรับเงินระบบ)
                            </div>
                        )}
                        <div className="text-xs font-extrabold text-slate-800 mt-2.5 text-center">
                            สแกนผ่านแอปธนาคารและกรอกยอดชำระ ฿{vatSummary.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-amber-700 font-semibold mt-1 text-center">
                            * เมื่อแอดมินตรวจสอบยอดเงินและอนุมัติแล้ว ระบบจะออกใบเสร็จรับเงิน/ใบกำกับภาษีฉบับสมบูรณ์ให้ทันที
                        </div>
                    </div>

                    {/* สรุปรายการสั่งซื้อรอชำระ */}
                    <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                            <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                                <ShieldCheck size={14} /> บัญชีผู้รับเงินของระบบ
                            </div>
                            <div className="font-extrabold text-slate-900">
                                {receipt.receiver_name || company.company_name_th} ({receipt.receiver_owner_type || 'SYSTEM'})
                            </div>
                            <div className="text-xs text-slate-700">
                                {receipt.receiver_bank_name || '-'} • <span className="font-mono font-bold">{receipt.receiver_account_number || '-'}</span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200">
                            {items.map((it, idx) => (
                                <div key={idx} className="px-3 py-2 flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-800">
                                        {it.name} <span className="text-slate-500">x{it.qty || 1}</span>
                                    </span>
                                    <span className="font-bold text-slate-900">
                                        ฿{Number(it.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">มูลค่าก่อนภาษีมูลค่าเพิ่ม</span>
                                <span className="font-semibold">฿{vatSummary.beforeVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">ภาษีมูลค่าเพิ่ม (VAT {vatSummary.vatRate}%)</span>
                                <span className="font-semibold">฿{vatSummary.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-black text-emerald-700">
                                <span>ยอดที่ต้องชำระสุทธิ</span>
                                <span>฿{vatSummary.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="text-[11px] font-bold text-slate-600 text-right">
                                ({thaiBahtText})
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // โหมดที่ 2: ใบเสร็จรับเงิน / ใบกำกับภาษีฉบับสมบูรณ์ (ออกเมื่อ Admin ยืนยัน / ชำระสำเร็จแล้ว)
    // =========================================================================
    return (
        <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                        <CheckCircle2 size={14} /> ชำระเงินเรียบร้อยแล้ว (ยืนยันแล้ว)
                    </div>
                    <h3 className="text-lg font-black text-slate-900 m-0 flex items-center gap-2">
                        <Receipt size={20} className="text-emerald-600" /> ใบเสร็จรับเงิน / ใบกำกับภาษี
                    </h3>
                    <div className="text-xs text-slate-500">
                        เลขที่เอกสาร: <strong className="font-mono text-slate-800">{receipt.receipt_no || '-'}</strong> • วันที่ออก: {issuedDateTh}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                    <Printer size={14} /> พิมพ์ใบเสร็จ
                </button>
            </div>

            {/* ข้อมูลผู้ออกใบเสร็จ (ระบบบ้านเรา) และ ข้อมูลผู้ซื้อละเอียด */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Building2 size={14} className="text-emerald-600" /> ผู้ออกใบเสร็จ: {company.company_name_th} ({company.branch_name_th})
                    </div>
                    <div className="text-slate-600">ที่อยู่: {company.address_th}</div>
                    <div className="text-slate-700 font-semibold">
                        เลขประจำตัวผู้เสียภาษี: <span className="font-mono">{company.tax_id}</span>
                    </div>
                    <div className="text-slate-600">
                        โทร: {company.phone || '-'} • อีเมล: {company.email || '-'}
                    </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <User size={14} className="text-emerald-600" /> ข้อมูลผู้ซื้อ / ลูกค้า
                    </div>
                    <div className="font-bold text-slate-800">ชื่อผู้ซื้อ: {buyer.name}</div>
                    <div className="text-slate-600">รหัสบัญชี: <span className="font-mono">{buyer.account_id}</span></div>
                    <div className="text-slate-600">ที่อยู่: {buyer.address}</div>
                    <div className="text-slate-600">โทร: {buyer.phone} • อีเมล: {buyer.email}</div>
                </div>
            </div>

            {/* ตารางรายการที่ซื้อ */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold">
                        <tr>
                            <th className="py-2.5 px-3">ลำดับ</th>
                            <th className="py-2.5 px-3">รายการสินค้า / บริการ</th>
                            <th className="py-2.5 px-3 text-center">จำนวน</th>
                            <th className="py-2.5 px-3 text-right">ราคา/หน่วย</th>
                            <th className="py-2.5 px-3 text-right">จำนวนเงิน (บาท)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {items.map((it, idx) => {
                            const qty = Number(it.qty || 1);
                            const price = Number(it.price || 0);
                            return (
                                <tr key={idx}>
                                    <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                                            <td className="py-2.5 px-3 align-top">
                                     <div className="font-bold text-slate-800">{it.name}</div>
                                    {Array.isArray(it.details) && it.details.length > 0 && (
                                    <ul className="mt-1.5 mb-0 pl-4 space-y-0.5 text-[11px] text-slate-600 list-disc">
                                    {it.details.map((detailText, dIdx) => (
                                    <li key={dIdx} className="leading-relaxed">
                                    {detailText}
                                    </li>
                                    ))}
                                    </ul>
                                    )}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">{qty}</td>
                                    <td className="py-2.5 px-3 text-right">{price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="py-2.5 px-3 text-right font-bold">{(qty * price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* สรุปยอดเงินรวม VAT และตัวหนังสือ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <div className="text-slate-500 font-bold mb-0.5">จำนวนเงินรวมสุทธิ (ตัวหนังสือ)</div>
                    <div className="text-sm font-black text-emerald-900">({thaiBahtText})</div>
                </div>

                <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-600">มูลค่าสินค้า/บริการก่อน VAT</span>
                        <span className="font-bold">฿{vatSummary.beforeVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-600">ภาษีมูลค่าเพิ่ม (VAT {vatSummary.vatRate}%)</span>
                        <span className="font-bold">฿{vatSummary.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-black text-emerald-700">
                        <span>ยอดชำระสุทธิรวม VAT</span>
                        <span>฿{vatSummary.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}