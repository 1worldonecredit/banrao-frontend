// [QR-PAY-01] คอมโพเนนต์สร้าง QR Code จริงสำหรับให้แอปธนาคารสแกนจ่าย + แสดงผู้รับเงินและรายการที่จ่าย
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, CheckCircle2, Receipt, ShieldCheck } from 'lucide-react';

// [QR-PAY-02] สร้างสตริงข้อมูลสำหรับสแกนอ่านและรองรับการ Scan จ่ายสินค้า/ชำระเงินในอนาคต
export function buildBankScanQrString({
    receiptNo = '',
    qrReference = '',
    txCategory = 'PACKAGE', // 'PACKAGE' | 'SHOP_ORDER' | 'TOPUP'
    receiverName = 'ระบบชุมชนบ้านเรา (BAN RAO)',
    receiverOwnerType = 'SYSTEM', // 'USER' | 'VILLAGE' | 'SHOP' | 'BUSINESS' | 'SYSTEM'
    receiverBankCode = '',
    receiverBankName = '',
    receiverAccountNumber = '',
    purposeTitle = 'ชำระค่าบริการ',
    lineItems = [],
    totalAmount = 0
}) {
    const payload = {
        app: 'BANRAO_PAY',
        version: '1.0',
        scan_mode: txCategory === 'SHOP_ORDER' ? 'SHOP_CHECKOUT' : 'BILL_PAYMENT',
        receipt_no: receiptNo,
        ref: qrReference,
        amount: Number(totalAmount || 0),
        currency: 'THB',
        receiver: {
            name: receiverName,
            owner_type: receiverOwnerType,
            bank_code: receiverBankCode,
            bank_name: receiverBankName,
            account_no: receiverAccountNumber
        },
        purpose: purposeTitle,
        items: lineItems
    };

    // ใส่ข้อมูลผู้รับเงินและยอดเงินในรูปแบบที่อ่านง่ายเมื่อสแกนดู + ข้อมูล JSON สำหรับระบบสแกนจ่ายสินค้า
    return [
        `BANRAO PAY | REF:${qrReference || receiptNo}`,
        `ผู้รับเงิน: ${receiverName} (${receiverOwnerType})`,
        receiverAccountNumber ? `บัญชี/พร้อมเพย์: ${receiverAccountNumber} (${receiverBankName || receiverBankCode})` : '',
        `ค่าอะไร: ${purposeTitle}`,
        `ยอดชำระ: ${Number(totalAmount || 0).toLocaleString()} THB`,
        `DATA:${JSON.stringify(payload)}`
    ]
        .filter(Boolean)
        .join('\n');
}

export default function BankScanQrCard({
    receipt = null,
    onConfirmPaidByScan = null,
    confirming = false
}) {
    const [qrDataUrl, setQrDataUrl] = useState('');

    useEffect(() => {
        let active = true;
        if (!receipt) {
            setQrDataUrl('');
            return;
        }

        const rawQrText =
            receipt.qr_text ||
            buildBankScanQrString({
                receiptNo: receipt.receipt_no,
                qrReference: receipt.qr_reference,
                txCategory: receipt.tx_category,
                receiverName: receipt.receiver_name,
                receiverOwnerType: receipt.receiver_owner_type,
                receiverBankCode: receipt.receiver_bank_code,
                receiverBankName: receipt.receiver_bank_name,
                receiverAccountNumber: receipt.receiver_account_number,
                purposeTitle: receipt.purpose_title,
                lineItems: receipt.line_items || [],
                totalAmount: receipt.total_amount
            });

        QRCode.toDataURL(rawQrText, {
            width: 240,
            margin: 2,
            errorCorrectionLevel: 'M'
        })
            .then((url) => {
                if (active) setQrDataUrl(url);
            })
            .catch((err) => {
                console.error('[QR-PAY-02] Generate QR image error:', err);
            });

        return () => {
            active = false;
        };
    }, [receipt]);

    if (!receipt) return null;

    const items = Array.isArray(receipt.line_items) ? receipt.line_items : [];

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <Receipt size={18} className="text-emerald-600" />
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-800 m-0">
                        สแกน QR Code ชำระเงินผ่านแอปธนาคาร & ใบเสร็จอิเล็กทรอน Thorn
                    </h3>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                    เลขที่: {receipt.receipt_no || '-'} | อ้างอิง: {receipt.qr_reference || '-'}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                {/* ฝั่งซ้าย: รูป QR Code จริงสำหรับให้แอปธนาคารสแกน */}
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300">
                    {qrDataUrl ? (
                        <img
                            src={qrDataUrl}
                            alt="QR Code ชำระเงิน"
                            className="w-52 h-52 rounded-xl bg-white p-2 border border-slate-200 shadow-xs"
                        />
                    ) : (
                        <div className="w-52 h-52 flex flex-col items-center justify-center text-slate-400 text-xs">
                            <QrCode size={48} className="mb-2" />
                            กำลังสร้าง QR Code...
                        </div>
                    )}
                    <div className="text-xs font-extrabold text-slate-800 mt-2.5">
                        เปิดแอปธนาคารแล้วสแกน QR Code นี้
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                        รองรับการสแกนตรวจสอบผู้รับเงิน & จ่ายสินค้าในอนาคต
                    </div>
                </div>

                {/* ฝั่งขวา: รายละเอียดผู้รับเงิน + ค่าอะไร + รายการที่จ่าย */}
                <div className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                        <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                            <ShieldCheck size={14} /> ข้อมูลผู้รับเงิน (สืบกลับได้ชัดเจน)
                        </div>
                        <div className="font-extrabold text-slate-900">
                            ผู้รับเงิน: {receipt.receiver_name || 'ระบบชุมชนบ้านเรา'} ({receipt.receiver_owner_type || 'SYSTEM'})
                        </div>
                        {receipt.receiver_bank_name && (
                            <div className="text-xs text-slate-700">
                                ธนาคาร/ช่องทาง: <strong>{receipt.receiver_bank_name}</strong> ({receipt.receiver_account_number || '-'})
                            </div>
                        )}
                    </div>

                    <div>
                        <span className="font-bold text-slate-500">ค่าอะไร: </span>
                        <span className="font-extrabold text-slate-900">{receipt.purpose_title}</span>
                    </div>

                    <div>
                        <div className="font-bold text-slate-500 mb-1">รายการที่จ่าย:</div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200">
                            {items.map((it, idx) => (
                                <div key={idx} className="px-3 py-2 flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-800">
                                        {it.name} <span className="text-slate-500">x{it.qty || 1}</span>
                                    </span>
                                    <span className="font-bold text-slate-900">
                                        ฿{Number(it.price || 0).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                        <span className="font-bold text-slate-700">ยอดชำระสุทธิ</span>
                        <span className="text-lg font-black text-emerald-600">
                            ฿{Number(receipt.total_amount || 0).toLocaleString()}
                        </span>
                    </div>

                    {onConfirmPaidByScan && (
                        <button
                            type="button"
                            disabled={confirming}
                            onClick={onConfirmPaidByScan}
                            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                            <CheckCircle2 size={16} />
                            {confirming ? 'กำลังส่งข้อมูล...' : 'สแกนจ่ายผ่านแอปธนาคารแล้ว (ส่งแจ้งยอด/สลิป)'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}