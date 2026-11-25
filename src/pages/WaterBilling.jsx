import React, { useState, useEffect } from 'react';
import {
  Droplets, Search, Camera, CheckCircle, AlertTriangle, Clock, UserX,
  Share2, Printer, Settings, QrCode, Banknote, X, Save, FileText, MapPin,
  Phone, Calendar, UserCheck, ShieldCheck, Download, Lock, Trash2, Ban,
  Receipt, ChevronLeft, ChevronRight, ArrowRight
} from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';
import WaterPricingModal from '../components/WaterPricingModal';
import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const formatThaiMonth = (ymStr, short = false) => {
  if (!ymStr || !ymStr.includes('-')) return ymStr || '-';
  const [y, m] = ymStr.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return ymStr;
  return `${short ? THAI_MONTHS_SHORT[m - 1] : THAI_MONTHS_FULL[m - 1]} ${y + 543}`;
};

const formatThaiDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const formatThaiDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543} เวลา ${pad(d.getHours())}:${pad(d.getMinutes())} น.`;
};

const computeScheduleDates = (ymStr, readingDay = 25, dueDay = 5, dueNextMonth = true) => {
  const [y, m] = (ymStr || new Date().toISOString().slice(0, 7)).split('-').map(Number);
  const daysInMonth = (yr, mo) => new Date(yr, mo, 0).getDate();

  const rDay = Math.min(Math.max(1, Number(readingDay || 25)), daysInMonth(y, m));
  let dueY = y;
  let dueM = m;
  if (dueNextMonth) {
    dueM += 1;
    if (dueM > 12) { dueM = 1; dueY += 1; }
  }
  const dDay = Math.min(Math.max(1, Number(dueDay || 5)), daysInMonth(dueY, dueM));

  const pad = (n) => String(n).padStart(2, '0');
  return {
    readingISO: `${y}-${pad(m)}-${pad(rDay)}`,
    dueISO: `${dueY}-${pad(dueM)}-${pad(dDay)}`,
    readingThai: `${rDay} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`,
    dueThai: `${dDay} ${THAI_MONTHS_SHORT[dueM - 1]} ${dueY + 543}`
  };
};

// ประทับลายน้ำทับบนภาพถ่ายมิเตอร์โดยตรง (ไม่มีแถบดำ)
const stampMeterPhoto = (file, { billingMonthLabel, houseNo, meterCode }) => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const MAX_SIDE = 1280;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > MAX_SIDE || height > MAX_SIDE) {
          const ratio = Math.min(MAX_SIDE / width, MAX_SIDE / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const thaiDateTime = `${now.getDate()} ${THAI_MONTHS_SHORT[now.getMonth()]} ${now.getFullYear() + 543} เวลา ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} น.`;

        const metaSuffix = [
          houseNo ? `บ้าน ${houseNo}` : '',
          meterCode ? `มิเตอร์ ${meterCode}` : ''
        ].filter(Boolean).join(' | ');

        const line1 = `ภาพมิเตอร์น้ำรอบเดือน ${billingMonthLabel}`;
        const line2 = metaSuffix ? `${metaSuffix} • ${thaiDateTime}` : `วันที่ถ่าย: ${thaiDateTime}`;

        const marginX = Math.max(16, Math.round(width * 0.035));
        const marginBottom = Math.max(16, Math.round(height * 0.035));
        let fontSize = Math.max(20, Math.round(width * 0.042));
        const maxTextWidth = width - marginX * 2;

        ctx.font = `bold ${fontSize}px Tahoma, "Noto Sans Thai", sans-serif`;
        while (
          (ctx.measureText(line1).width > maxTextWidth || ctx.measureText(line2).width > maxTextWidth) &&
          fontSize > 13
        ) {
          fontSize -= 1;
          ctx.font = `bold ${fontSize}px Tahoma, "Noto Sans Thai", sans-serif`;
        }

        const lineHeight = Math.round(fontSize * 1.42);
        const y2 = height - marginBottom;
        const y1 = y2 - lineHeight;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;

        ctx.font = `bold ${fontSize}px Tahoma, "Noto Sans Thai", sans-serif`;
        ctx.lineWidth = Math.max(4, Math.round(fontSize * 0.22));
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.strokeText(line1, marginX, y1);
        ctx.fillStyle = '#fde047';
        ctx.fillText(line1, marginX, y1);

        const fontSize2 = Math.max(12, Math.round(fontSize * 0.88));
        ctx.font = `bold ${fontSize2}px Tahoma, "Noto Sans Thai", sans-serif`;
        ctx.lineWidth = Math.max(3.5, Math.round(fontSize2 * 0.22));
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.strokeText(line2, marginX, y2);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(line2, marginX, y2);

        const stampedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        URL.revokeObjectURL(objectUrl);
        resolve(stampedDataUrl);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
};

// สร้าง QR PromptPay มาตรฐาน EMVCo
const crc16CCITT = (str) => {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

const buildPromptPayQRUrl = (promptpayId, amount) => {
  const clean = String(promptpayId || '').replace(/\D/g, '');
  if (!clean) return null;

  let targetTag = '';
  if (clean.length === 10 && clean.startsWith('0')) {
    const mobile = '0066' + clean.slice(1);
    targetTag = `01${String(mobile.length).padStart(2, '0')}${mobile}`;
  } else if (clean.length === 13) targetTag = `0213${clean}`;
  else if (clean.length === 15) targetTag = `0315${clean}`;
  else return null;

  const merchantInfo = `0016A000000677010111${targetTag}`;
  const tag29 = `29${String(merchantInfo.length).padStart(2, '0')}${merchantInfo}`;
  const numAmount = Number(amount || 0);
  const amountTag =
    numAmount > 0
      ? `54${String(numAmount.toFixed(2).length).padStart(2, '0')}${numAmount.toFixed(2)}`
      : '';

  const rawPayload = `0002010102${numAmount > 0 ? '12' : '11'}${tag29}5802TH5303764${amountTag}6304`;
  const fullPayload = rawPayload + crc16CCITT(rawPayload);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(fullPayload)}`;
};

const loadImageForCanvas = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const wrapCanvasText = (ctx, text, maxWidth) => {
  const words = String(text || '').split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const testLine = current ? `${current} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      current = testLine;
    } else {
      if (current) lines.push(current);
      if (ctx.measureText(word).width > maxWidth) {
        let chunk = '';
        for (const ch of word) {
          if (ctx.measureText(chunk + ch).width > maxWidth) {
            if (chunk) lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

const drawRoundedRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// สร้างไฟล์รูปเอกสาร (.JPG): ใบแจ้งหนี้มีภาพมิเตอร์ลายน้ำ+QR / ใบเสร็จรับเงินสะอาดไม่มีภาพ
const generateWaterDocumentJpgFile = async ({ bill, villageInfo, settings, schedule, staffFullName }) => {
  const W = 800;
  const PAD = 36;
  const CONTENT_W = W - PAD * 2;
  const FONT = 'Tahoma, "Noto Sans Thai", sans-serif';

  const isReceipt = bill.bill_payment_status === 'PAID' || bill.document_stage === 'RECEIPT';

  const docVillageTitle = bill.snapshot_village_name || villageInfo.village_title || 'หมู่บ้านประปาชุมชน';
  const docVillageAddr = bill.snapshot_village_address || villageInfo.village_full_address || '';
  const docPresidentName = bill.snapshot_president_name || settings.president_name || villageInfo.president_name || '-';
  const docReaderName = bill.snapshot_reader_name || bill.recorded_by || staffFullName;
  const docReceiverName = bill.snapshot_receiver_name || docReaderName;

  const docTitle = isReceipt
    ? `ใบเสร็จรับเงินค่าน้ำประปา ${docVillageTitle}`
    : `ใบแจ้งหนี้ค่าน้ำประปา ${docVillageTitle}`;

  const statusText = isReceipt
    ? `ชำระเงินเรียบร้อยแล้ว (${bill.payment_method === 'CASH' ? 'เงินสด' : 'โอน/QR'})`
    : bill.visit_status === 'NOT_FOUND'
    ? 'ใบแจ้งหนี้รอชำระ (ไม่พบผู้ใช้น้ำ)'
    : 'ใบแจ้งหนี้รอชำระเงิน';

  const readingDisplay = bill.reading_date ? formatThaiDate(bill.reading_date) : schedule.readingThai;
  const dueDisplay = bill.due_date ? formatThaiDate(bill.due_date) : schedule.dueThai;
  const paidDisplay = formatThaiDateTime(bill.receipt_issued_at || bill.paid_at);

  const arrearsList = !isReceipt && Array.isArray(bill.arrears_list) ? bill.arrears_list : [];
  const arrearsTotal = !isReceipt ? Number(bill.arrears_total || 0) : 0;
  const currentTotal = Number(bill.total_amount || 0);
  const grandTotal = currentTotal + arrearsTotal;

  // แสดงภาพถ่ายมิเตอร์พร้อมลายน้ำ + QR เฉพาะ "ใบแจ้งหนี้" — ใบเสร็จรับเงินไม่ต้องมีภาพ
  const meterImg = !isReceipt ? await loadImageForCanvas(bill.reading_photo_url) : null;
  const qrUrl = !isReceipt ? buildPromptPayQRUrl(settings.promptpay_id, grandTotal) : null;
  const qrImg = qrUrl ? await loadImageForCanvas(qrUrl) : null;

  let meterDrawW = 0;
  let meterDrawH = 0;
  if (meterImg) {
    const maxW = CONTENT_W - 24;
    const maxH = 420;
    const ratio = Math.min(maxW / meterImg.width, maxH / meterImg.height, 1);
    meterDrawW = Math.round(meterImg.width * ratio);
    meterDrawH = Math.round(meterImg.height * ratio);
  }

  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');
  mCtx.font = `600 19px ${FONT}`;
  const villageAddrLines = docVillageAddr ? wrapCanvasText(mCtx, docVillageAddr, CONTENT_W - 48) : [];
  mCtx.font = `normal 19px ${FONT}`;
  const userAddrLines = wrapCanvasText(mCtx, bill.full_address || '-', CONTENT_W - 160);

  const headerH = (isReceipt ? 275 : 245) + villageAddrLines.length * 27;
  const userBoxH = 104 + userAddrLines.length * 27;
  const tableBaseH = 305;
  const arrearsH = arrearsList.length > 0 ? 115 + arrearsList.length * 30 : 0;
  const tableBoxH = tableBaseH + arrearsH;
  const photoSectionH = meterImg ? meterDrawH + 54 : 0;
  const qrSectionH = qrImg ? 290 : 0;
  const footerH = isReceipt ? 165 : 140;

  const totalH =
    PAD + headerH + 18 + userBoxH + 18 + tableBoxH +
    (photoSectionH ? 18 + photoSectionH : 0) +
    (qrSectionH ? 18 + qrSectionH : 0) +
    22 + footerH + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, totalH);

  ctx.strokeStyle = isReceipt ? '#a7f3d0' : '#cbd5e1';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 12, 12, W - 24, totalH - 24, 24);
  ctx.stroke();

  let y = PAD;

  const grad = ctx.createLinearGradient(PAD, y, PAD, y + headerH);
  grad.addColorStop(0, isReceipt ? '#ecfdf5' : '#eff6ff');
  grad.addColorStop(1, '#ffffff');
  drawRoundedRect(ctx, PAD, y, CONTENT_W, headerH, 20);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = isReceipt ? '#6ee7b7' : '#bfdbfe';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  drawRoundedRect(ctx, PAD, y, CONTENT_W, headerH, 20);
  ctx.clip();
  const topBarGrad = ctx.createLinearGradient(PAD, y, PAD + CONTENT_W, y);
  if (isReceipt) {
    topBarGrad.addColorStop(0, '#059669');
    topBarGrad.addColorStop(0.5, '#10b981');
    topBarGrad.addColorStop(1, '#0d9488');
  } else {
    topBarGrad.addColorStop(0, '#d97706');
    topBarGrad.addColorStop(0.5, '#2563eb');
    topBarGrad.addColorStop(1, '#4f46e5');
  }
  ctx.fillStyle = topBarGrad;
  ctx.fillRect(PAD, y, CONTENT_W, 12);
  ctx.restore();

  let hy = y + 48;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `bold 26px ${FONT}`;
  ctx.fillStyle = isReceipt ? '#065f46' : '#0f172a';
  ctx.fillText(docTitle, W / 2, hy);
  hy += 34;

  ctx.font = `normal 19px ${FONT}`;
  ctx.fillStyle = '#475569';
  for (const line of villageAddrLines) {
    ctx.fillText(line, W / 2, hy);
    hy += 27;
  }

  hy += 8;
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillStyle = isReceipt ? '#047857' : '#1e3a8a';
  ctx.fillText(`ประธานกรรมการ: ${docPresidentName}`, W / 2, hy);
  hy += 24;

  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD + 28, hy);
  ctx.lineTo(W - PAD - 28, hy);
  ctx.stroke();
  ctx.restore();
  hy += 26;

  if (isReceipt) {
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillStyle = '#065f46';
    ctx.fillText(`เลขที่ใบเสร็จ: ${bill.receipt_no || bill.bill_no}  •  รอบเดือน ${formatThaiMonth(bill.billing_month)}`, W / 2, hy);
    hy += 28;
    ctx.font = `normal 17px ${FONT}`;
    ctx.fillStyle = '#475569';
    ctx.fillText(`อ้างอิงใบแจ้งหนี้: ${bill.bill_no}  •  รับชำระเมื่อ: ${paidDisplay}`, W / 2, hy);
    hy += 30;
  } else {
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText(`เลขที่ใบแจ้งหนี้: ${bill.bill_no}  •  รอบเดือน ${formatThaiMonth(bill.billing_month)}`, W / 2, hy);
    hy += 28;
    ctx.font = `normal 18px ${FONT}`;
    ctx.fillStyle = '#475569';
    ctx.fillText(`วันที่จดมิเตอร์: ${readingDisplay}   •   กำหนดชำระภายใน: ${dueDisplay}`, W / 2, hy);
    hy += 30;
  }

  hy += 6;
  ctx.font = `bold 19px ${FONT}`;
  const pillW = Math.max(240, ctx.measureText(statusText).width + 48);
  drawRoundedRect(ctx, W / 2 - pillW / 2, hy - 18, pillW, 36, 18);
  ctx.fillStyle = isReceipt ? '#d1fae5' : '#fef3c7';
  ctx.fill();
  ctx.strokeStyle = isReceipt ? '#34d399' : '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = isReceipt ? '#065f46' : '#92400e';
  ctx.fillText(statusText, W / 2, hy + 1);

  y += headerH + 18;

  drawRoundedRect(ctx, PAD, y, CONTENT_W, userBoxH, 16);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  let uy = y + 32;
  const leftX = PAD + 22;
  const rightX = W - PAD - 22;

  const drawKeyVal = (label, val, rowY, valColor = '#0f172a', valBold = true) => {
    ctx.textAlign = 'left';
    ctx.font = `normal 19px ${FONT}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText(label, leftX, rowY);

    ctx.textAlign = 'right';
    ctx.font = `${valBold ? 'bold' : 'normal'} 20px ${FONT}`;
    ctx.fillStyle = valColor;
    ctx.fillText(String(val), rightX, rowY);
  };

  drawKeyVal('ผู้ใช้น้ำ:', bill.full_name || '-', uy);
  uy += 32;

  ctx.textAlign = 'left';
  ctx.font = `normal 19px ${FONT}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText('ที่อยู่:', leftX, uy);

  ctx.textAlign = 'right';
  ctx.font = `normal 19px ${FONT}`;
  ctx.fillStyle = '#1e293b';
  for (const line of userAddrLines) {
    ctx.fillText(line, rightX, uy);
    uy += 27;
  }

  uy += 6;
  drawKeyVal('เลขมิเตอร์:', bill.snapshot_meter_no || bill.meter_code || '-', uy, '#1d4ed8', true);

  y += userBoxH + 18;

  drawRoundedRect(ctx, PAD, y, CONTENT_W, tableBoxH, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  let ty = y + 34;
  drawKeyVal('เลขมิเตอร์ครั้งก่อน', Number(bill.previous_reading || 0).toFixed(2), ty, '#334155', false);
  ty += 34;
  drawKeyVal('เลขมิเตอร์ครั้งนี้', Number(bill.current_reading || 0).toFixed(2), ty, '#0f172a', true);
  ty += 22;

  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(leftX, ty);
  ctx.lineTo(rightX, ty);
  ctx.stroke();
  ctx.restore();
  ty += 28;

  drawKeyVal('จำนวนน้ำที่ใช้', `${Number(bill.units_used || 0).toFixed(2)} หน่วย`, ty, '#0f172a', true);
  ty += 34;
  drawKeyVal(
    `ค่าน้ำ (${Number(bill.units_used || 0).toFixed(2)} × ${Number(bill.unit_rate || 0).toFixed(2)} บ.)`,
    `฿${(Number(bill.units_used || 0) * Number(bill.unit_rate || 0)).toLocaleString()}`,
    ty,
    '#334155',
    false
  );
  ty += 34;
  drawKeyVal('ค่ารักษามิเตอร์', `฿${Number(bill.meter_fee || 0).toLocaleString()}`, ty, '#334155', false);
  ty += 34;
  drawKeyVal('ค่าจ้างคนจดมิเตอร์', `฿${Number(bill.reader_fee || 0).toLocaleString()}`, ty, '#047857', true);
  ty += 24;

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftX, ty);
  ctx.lineTo(rightX, ty);
  ctx.stroke();
  ty += 34;

  ctx.textAlign = 'left';
  ctx.font = `bold 23px ${FONT}`;
  ctx.fillStyle = isReceipt ? '#047857' : '#1d4ed8';
  ctx.fillText(isReceipt ? 'ยอดที่รับชำระสุทธิ' : 'ยอดแจ้งหนี้รอบเดือนนี้', leftX, ty);
  ctx.textAlign = 'right';
  ctx.fillText(`฿${currentTotal.toLocaleString()}`, rightX, ty);

  if (arrearsList.length > 0) {
    ty += 26;
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(leftX, ty);
    ctx.lineTo(rightX, ty);
    ctx.stroke();
    ctx.restore();
    ty += 26;

    ctx.textAlign = 'left';
    ctx.font = `bold 19px ${FONT}`;
    ctx.fillStyle = '#92400e';
    ctx.fillText('รายการค้างชำระรอบเดือนก่อน:', leftX, ty);
    ty += 28;

    for (const a of arrearsList) {
      drawKeyVal(`  • รอบเดือน ${formatThaiMonth(a.billing_month, true)}`, `฿${Number(a.total_amount).toLocaleString()}`, ty, '#92400e', false);
      ty += 28;
    }

    drawKeyVal('ยอดค้างชำระรวม', `฿${arrearsTotal.toLocaleString()}`, ty, '#92400e', true);
    ty += 34;

    ctx.textAlign = 'left';
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillStyle = '#b91c1c';
    ctx.fillText('ยอดรวมสุทธิที่ต้องชำระทั้งสิ้น', leftX, ty);
    ctx.textAlign = 'right';
    ctx.fillText(`฿${grandTotal.toLocaleString()}`, rightX, ty);
  }

  y += tableBoxH + 18;

  if (meterImg) {
    ctx.textAlign = 'left';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillStyle = '#475569';
    ctx.fillText('ภาพถ่ายหน้าปัดมิเตอร์หลักฐาน:', PAD + 4, y + 14);

    const imgX = Math.round((W - meterDrawW) / 2);
    const imgY = y + 34;

    ctx.save();
    drawRoundedRect(ctx, imgX, imgY, meterDrawW, meterDrawH, 16);
    ctx.clip();
    ctx.drawImage(meterImg, imgX, imgY, meterDrawW, meterDrawH);
    ctx.restore();

    drawRoundedRect(ctx, imgX, imgY, meterDrawW, meterDrawH, 16);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    y += photoSectionH + 18;
  }

  if (qrImg) {
    drawRoundedRect(ctx, PAD, y, CONTENT_W, qrSectionH, 16);
    ctx.fillStyle = '#eff6ff';
    ctx.fill();
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = `bold 19px ${FONT}`;
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText(`สแกน QR พร้อมเพย์เพื่อชำระค่าน้ำ (฿${grandTotal.toLocaleString()})`, W / 2, y + 30);

    const qrSize = 190;
    const qrX = Math.round(W / 2 - qrSize / 2);
    const qrY = y + 50;
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12);
    ctx.fill();
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    ctx.font = `normal 17px ${FONT}`;
    ctx.fillStyle = '#475569';
    const bankLine = `${settings.bank_name ? `${settings.bank_name} • ` : ''}${settings.account_name || docVillageTitle} (${settings.promptpay_id})`;
    ctx.fillText(bankLine, W / 2, y + 266);

    y += qrSectionH + 18;
  }

  y += 6;
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'center';
  if (isReceipt) {
    ctx.font = `normal 18px ${FONT}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText('ผู้รับเงิน / ผู้ออกใบเสร็จรับเงิน', W / 2, y + 34);
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillStyle = '#065f46';
    ctx.fillText(`( ${docReceiverName} )`, W / 2, y + 70);
    ctx.font = `normal 17px ${FONT}`;
    ctx.fillStyle = '#475569';
    ctx.fillText(`ผู้จดมิเตอร์: ${docReaderName}  •  ${docVillageTitle}`, W / 2, y + 106);
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillStyle = '#047857';
    ctx.fillText('เอกสารฉบับนี้บันทึกและล็อกข้อมูลทางบัญชีเรียบร้อยแล้ว', W / 2, y + 138);
  } else {
    ctx.font = `normal 18px ${FONT}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText('ผู้จดมิเตอร์ / ผู้ออกใบแจ้งหนี้', W / 2, y + 34);
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`( ${docReaderName} )`, W / 2, y + 72);
    ctx.font = `normal 17px ${FONT}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText(`เอกสารนี้เป็นใบแจ้งหนี้ ยังไม่ใช่ใบเสร็จรับเงิน • ${docVillageTitle}`, W / 2, y + 108);
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  const prefix = isReceipt ? 'receipt' : 'invoice';
  const docCode = isReceipt ? (bill.receipt_no || bill.bill_no) : bill.bill_no;
  const fileName = `${prefix}-${docCode || 'water'}.jpg`;
  return {
    file: new File([blob], fileName, { type: 'image/jpeg' }),
    blob,
    fileName
  };
};

const WaterBilling = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const villageId = userData.village_id || 1;
  const accountId = userData.account_id || userData.id;

  const roleTemplates = Array.isArray(userData.role_templates) ? userData.role_templates : [];
  const roleUpper = String(userData.role || '').toUpperCase();
  const isSuperAdmin = Boolean(userData.isSuperAdmin || userData.is_super_admin || roleUpper === 'SUPER_ADMIN');
  const isHeadman = Boolean(userData.is_headman || roleUpper === 'HEADMAN' || roleTemplates.includes('VILLAGE_HEADMAN'));
  const canApproveRates = isSuperAdmin || isHeadman || roleTemplates.includes('WATER_PRESIDENT');
  const canManageSettings = isSuperAdmin || isHeadman || roleTemplates.includes('WATER_PRESIDENT') || roleTemplates.includes('WATER_TREASURER');
  const canVoidReceipt = isSuperAdmin || isHeadman || roleTemplates.includes('WATER_PRESIDENT') || roleTemplates.includes('WATER_TREASURER');

  const [staffFullName, setStaffFullName] = useState(() => {
    const f = userData.first_name || userData.firstName || '';
    const l = userData.last_name || userData.lastName || '';
    return `${f} ${l}`.trim() || userData.full_name || userData.username || 'เจ้าหน้าที่จดมิเตอร์';
  });

  useEffect(() => {
    if (!accountId) return;
    authFetch(`${API_URL}/api/user/profile/${accountId}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          const d = result.data;
          const realName = `${d.first_name || ''} ${d.last_name || ''}`.trim();
          if (realName) setStaffFullName(realName);
        }
      })
      .catch(() => {});
  }, [accountId]);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const billingMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const yearOptions = Array.from(
    new Set([now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2, selectedYear])
  ).sort((a, b) => a - b);

  const nextY = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
  const nextM = selectedMonth === 12 ? 1 : selectedMonth + 1;
  const nextMonthLabel = `${THAI_MONTHS_SHORT[nextM - 1]} ${nextY + 543}`;

  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
    setTabFilter('ALL');
  };

  const [items, setItems] = useState([]);
  const [voidedBills, setVoidedBills] = useState([]);
  const [apiError, setApiError] = useState('');
  const [villageInfo, setVillageInfo] = useState({
    village_title: 'หมู่บ้านประปาชุมชน',
    village_full_address: '',
    president_name: '',
    president_position: 'ประธานกรรมการน้ำประปาหมู่บ้าน'
  });
  const [settings, setSettings] = useState({
    unit_rate: 7,
    meter_fee: 10,
    reader_fee: 5,
    reading_day: 25,
    due_day: 5,
    due_next_month: true,
    bank_name: '',
    account_name: '',
    account_number: '',
    promptpay_id: '',
    president_name: ''
  });
  const [summary, setSummary] = useState({
    total_meters: 0, recorded_count: 0, unrecorded_count: 0,
    paid_count: 0, unpaid_count: 0, not_found_count: 0,
    collected_total: 0, collected_cash: 0, collected_qr: 0,
    unpaid_amount: 0, total_arrears_previous: 0, total_reader_fee: 0, voided_count: 0
  });
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [tabFilter, setTabFilter] = useState('ALL');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ ...settings });

  const [readingTarget, setReadingTarget] = useState(null);
  const [readingForm, setReadingForm] = useState({
    previous_reading: 0,
    current_reading: '',
    reader_fee: 5,
    recorded_by: '',
    reading_photo_url: '',
    action_type: 'UNPAID',
    slip_url: '',
    note: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const [docModalItem, setDocModalItem] = useState(null);
  const [sharingImage, setSharingImage] = useState(false);

  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidPin, setVoidPin] = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  const schedule = computeScheduleDates(
    billingMonth,
    settings.reading_day,
    settings.due_day,
    settings.due_next_month
  );

  const fetchBillingData = async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await authFetch(`${API_URL}/api/water/bills/${villageId}?month=${billingMonth}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setApiError('ไม่พบ API /api/water/bills ในเซิร์ฟเวอร์');
        setLoading(false);
        return;
      }
      const result = await res.json();
      if (!res.ok || !result.success) {
        setApiError(`เซิร์ฟเวอร์แจ้ง Error: ${result.message || res.status}`);
        setLoading(false);
        return;
      }
      setItems(result.data || []);
      setVoidedBills(result.voided_bills || []);
      setSummary(result.summary || summary);
      if (result.settings) {
        setSettings(result.settings);
        setSettingsForm(result.settings);
      }
      if (result.village_info) {
        setVillageInfo(result.village_info);
      }
    } catch (err) {
      setApiError(`เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBillingData(); }, [villageId, billingMonth]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch(`${API_URL}/api/water/settings/${villageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settingsForm, updated_by: staffFullName })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setSettings(result.data);
        if (result.village_info) setVillageInfo(result.village_info);
        setIsSettingsOpen(false);
      } else {
        alert(result.message || 'บันทึกไม่สำเร็จ');
      }
    } catch (err) {
      alert('บันทึกตั้งค่าไม่สำเร็จ');
    }
  };

  const openReadingModal = (item) => {
    const isLocked = Boolean(item.is_locked || item.bill_payment_status === 'PAID' || item.receipt_no);
    if (isLocked) {
      alert(`เอกสารใบเสร็จเลขที่ ${item.receipt_no || item.bill_no} ชำระเงินและถูกล็อกห้ามแก้ไขแล้ว หากต้องการแก้ไขกรุณาใช้ปุ่ม "ยกเลิกเอกสาร" พร้อมระบุเหตุผล`);
      return;
    }

    setReadingTarget(item);
    const prevVal = item.bill_id ? Number(item.previous_reading || 0) : Number(item.last_meter_reading || 0);
    const currVal = item.bill_id ? String(item.current_reading || '') : '';
    const rFeeVal = item.bill_id ? Number(item.reader_fee ?? settings.reader_fee ?? 0) : Number(settings.reader_fee ?? 0);

    let defaultAction = 'UNPAID';
    if (item.bill_id && item.visit_status === 'NOT_FOUND') {
      defaultAction = 'NOT_FOUND';
    }

    setReadingForm({
      previous_reading: prevVal,
      current_reading: currVal,
      reader_fee: rFeeVal,
      recorded_by: item.recorded_by || staffFullName,
      reading_photo_url: item.reading_photo_url || '',
      action_type: defaultAction,
      slip_url: item.slip_url || '',
      note: item.bill_note || ''
    });
  };

  const handleFileBase64 = (field) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === 'reading_photo_url') {
      try {
        const stampedUrl = await stampMeterPhoto(file, {
          billingMonthLabel: formatThaiMonth(billingMonth),
          houseNo: readingTarget?.house_no,
          meterCode: readingTarget?.meter_code
        });
        setReadingForm((prev) => ({ ...prev, reading_photo_url: stampedUrl }));
      } catch (err) {
        alert('ไม่สามารถประมวลผลภาพถ่ายมิเตอร์ได้ กรุณาลองใหม่อีกครั้ง');
      }
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setReadingForm((prev) => ({ ...prev, [field]: reader.result }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const calcPrev = Number(readingForm.previous_reading || 0);
  const calcCurr = readingForm.current_reading === '' ? calcPrev : Number(readingForm.current_reading);
  const calcUnits = Math.max(0, Number((calcCurr - calcPrev).toFixed(2)));
  const calcWaterPrice = Number((calcUnits * Number(settings.unit_rate || 0)).toFixed(2));
  const calcMeterFee = Number(settings.meter_fee || 0);
  const calcReaderFee = Number(settings.reader_fee || 0);
  const calcCurrentTotal = Number((calcWaterPrice + calcMeterFee + calcReaderFee).toFixed(2));
  const calcArrearsTotal = Number(readingTarget?.arrears_total || 0);
  const calcGrandTotal = Number((calcCurrentTotal + calcArrearsTotal).toFixed(2));
  const modalQrUrl = buildPromptPayQRUrl(settings.promptpay_id, calcCurrentTotal);

  const handleSaveReading = async (e) => {
    e.preventDefault();
    if (readingForm.current_reading === '' || Number(readingForm.current_reading) < calcPrev) {
      return alert('กรุณากรอกเลขมิเตอร์ปัจจุบันให้ถูกต้อง (ต้องไม่น้อยกว่าเดือนก่อน)');
    }

    let visit_status = 'NORMAL';
    let payment_status = 'UNPAID';
    let payment_method = 'NONE';

    if (readingForm.action_type === 'CASH') {
      payment_status = 'PAID';
      payment_method = 'CASH';
    } else if (readingForm.action_type === 'QR_PAID') {
      payment_status = 'PAID';
      payment_method = 'QR_TRANSFER';
    } else if (readingForm.action_type === 'NOT_FOUND') {
      visit_status = 'NOT_FOUND';
      payment_status = 'UNPAID';
    } else {
      visit_status = 'DEFERRED';
      payment_status = 'UNPAID';
    }

    setSubmitting(true);
    try {
      const res = await authFetch(`${API_URL}/api/water/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          village_id: villageId,
          meter_id: readingTarget.meter_id,
          household_id: readingTarget.household_id,
          member_id: readingTarget.member_id,
          billing_month: billingMonth,
          previous_reading: calcPrev,
          current_reading: Number(readingForm.current_reading),
          unit_rate: Number(settings.unit_rate || 0),
          meter_fee: calcMeterFee,
          reader_fee: calcReaderFee,
          reading_date: schedule.readingISO,
          due_date: schedule.dueISO,
          reading_photo_url: readingForm.reading_photo_url,
          visit_status,
          payment_status,
          payment_method,
          slip_url: readingForm.slip_url,
          note: readingForm.note,
          recorded_by: readingForm.recorded_by?.trim() || staffFullName
        })
      });
      const result = await res.json();
      if (result.success) {
        const savedBill = result.data;
        const mergedDoc = {
          ...readingTarget,
          ...savedBill,
          bill_payment_status: savedBill.payment_status,
          grand_total_with_arrears: Number(savedBill.total_amount || 0) + Number(readingTarget.arrears_total || 0)
        };
        setReadingTarget(null);
        await fetchBillingData();
        setDocModalItem(mergedDoc);
      } else {
        alert(result.message || 'บันทึกไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (bill, method) => {
    if (
      !window.confirm(
        `ยืนยันรับชำระใบแจ้งหนี้ ${bill.bill_no} ยอด ฿${Number(bill.total_amount).toLocaleString()} (${method === 'CASH' ? 'เงินสด' : 'โอน/QR'})?\n\n*เมื่อยืนยันแล้วระบบจะออก "ใบเสร็จรับเงิน" และล็อกเอกสารห้ามลบอัตโนมัติ`
      )
    ) {
      return;
    }
    try {
      const res = await authFetch(`${API_URL}/api/water/bills/${bill.bill_id}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: method, payment_status: 'PAID', changed_by: staffFullName })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        const updated = result.data || {};
        setDocModalItem({
          ...bill,
          ...updated,
          bill_payment_status: 'PAID',
          payment_method: method,
          document_stage: 'RECEIPT',
          is_locked: true
        });
        fetchBillingData();
      } else {
        alert(result.message || 'บันทึกการชำระไม่สำเร็จ');
      }
    } catch (err) {
      alert('บันทึกการชำระไม่สำเร็จ');
    }
  };

  const handleDeleteUnpaidInvoice = async (item) => {
    if (item.is_locked || item.bill_payment_status === 'PAID' || item.receipt_no) {
      return alert('ใบเสร็จรับเงินที่ชำระแล้วถูกล็อกห้ามลบ กรุณาใช้การยกเลิกเอกสารพร้อมระบุเหตุผลแทน');
    }
    if (!window.confirm(`ยืนยันลบใบแจ้งหนี้ที่ยังไม่ชำระ ${item.bill_no} (บ้านเลขที่ ${item.house_no}) ใช่หรือไม่?`)) return;
    try {
      const res = await authFetch(`${API_URL}/api/water/bills/${item.bill_id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        fetchBillingData();
      } else {
        alert(result.message || 'ลบใบแจ้งหนี้ไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบใบแจ้งหนี้');
    }
  };

  const handleSubmitVoid = async (e) => {
    e.preventDefault();
    if (!voidReason.trim() || voidReason.trim().length < 3) {
      return alert('กรุณาระบุเหตุผลในการยกเลิกเอกสาร');
    }
    const needPin = !isSuperAdmin && (voidTarget?.bill_payment_status === 'PAID' || Boolean(voidTarget?.receipt_no));
    if (needPin && !voidPin.trim()) {
      return alert('กรุณากรอกรหัส PIN อนุมัติของผู้ใหญ่บ้านเพื่อยืนยันการยกเลิกใบเสร็จ');
    }

    setVoidSubmitting(true);
    try {
      const res = await authFetch(`${API_URL}/api/water/bills/${voidTarget.bill_id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          void_reason: voidReason.trim(),
          pin_code: voidPin.trim()
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setVoidTarget(null);
        setVoidReason('');
        setVoidPin('');
        setDocModalItem(null);
        fetchBillingData();
      } else {
        alert(result.message || 'ยกเลิกเอกสารไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการยกเลิกเอกสาร');
    } finally {
      setVoidSubmitting(false);
    }
  };

  const handleShareDocImage = async (bill, downloadOnly = false) => {
    setSharingImage(true);
    try {
      const { file, blob, fileName } = await generateWaterDocumentJpgFile({
        bill,
        villageInfo,
        settings,
        schedule,
        staffFullName
      });

      const isReceipt = bill.bill_payment_status === 'PAID' || bill.document_stage === 'RECEIPT';
      if (!downloadOnly && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: isReceipt ? `ใบเสร็จรับเงินค่าน้ำประปา ${bill.receipt_no || bill.bill_no}` : `ใบแจ้งหนี้ค่าน้ำประปา ${bill.bill_no}`
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      if (!downloadOnly) {
        alert(`บันทึกรูป${isReceipt ? 'ใบเสร็จรับเงิน' : 'ใบแจ้งหนี้'} (.JPG) ลงเครื่องเรียบร้อยแล้ว สามารถส่งให้เจ้าของบ้านได้เลยครับ`);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        alert('ไม่สามารถสร้างรูปภาพเอกสารได้ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setSharingImage(false);
    }
  };

  const filteredItems = items.filter((it) => {
    const q = searchText.trim().toLowerCase();
    const matchText =
      !q ||
      (it.house_no || '').toLowerCase().includes(q) ||
      (it.meter_code || '').toLowerCase().includes(q) ||
      (it.full_name || '').toLowerCase().includes(q);

    const matchTab =
      tabFilter === 'ALL' ||
      (tabFilter === 'UNRECORDED' && !it.bill_id) ||
      (tabFilter === 'PAID' && it.bill_payment_status === 'PAID') ||
      (tabFilter === 'UNPAID' && ((it.bill_id && it.bill_payment_status !== 'PAID') || Number(it.arrears_total || 0) > 0));

    return matchText && matchTab;
  });

  const unpaidHouses = items.filter(
    (it) => (it.bill_id && it.bill_payment_status !== 'PAID') || Number(it.arrears_total || 0) > 0
  );

  const modalIsReceipt = Boolean(docModalItem && (docModalItem.bill_payment_status === 'PAID' || docModalItem.document_stage === 'RECEIPT'));
  const modalVillageTitle = docModalItem?.snapshot_village_name || villageInfo.village_title;
  const modalVillageAddr = docModalItem?.snapshot_village_address || villageInfo.village_full_address;
  const modalPresidentName = docModalItem?.snapshot_president_name || settings.president_name || villageInfo.president_name || '-';
  const modalReaderName = docModalItem?.snapshot_reader_name || docModalItem?.recorded_by || staffFullName;
  const modalReceiverName = docModalItem?.snapshot_receiver_name || modalReaderName;

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #water-slip-printable, #water-slip-printable * { visibility: visible; }
          #water-slip-printable {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            padding: 16px;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <TopNavbar userData={userData} />

      <div className="max-w-7xl mx-auto p-4 pt-20">
        {apiError && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-300 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* ส่วนหัว + ตัวเลือกเดือนแบบมีปุ่มกดสลับรอบเดือนก่อน/ถัดไปได้ทันที */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Droplets size={24} /></div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800">
                จดมิเตอร์และออกเอกสารค่าน้ำประปา • {villageInfo.village_title}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                ค่าน้ำ <strong>{settings.unit_rate}</strong> บ./หน่วย • รักษามิเตอร์ <strong>{settings.meter_fee}</strong> บ. • ค่าเก็บ <strong>{settings.reader_fee || 0}</strong> บ.
              </p>
              <div className="text-xs text-blue-700 font-semibold mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md">
                  <Calendar size={12} /> เก็บทุกวันที่ {settings.reading_day || 25} ({schedule.readingThai})
                </span>
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md">
                  ครบกำหนดชำระภายใน: {schedule.dueThai}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={goToPrevMonth}
                className="p-2 hover:bg-white rounded-lg text-slate-600"
                title="รอบเดือนก่อนหน้า"
              >
                <ChevronLeft size={16} />
              </button>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 bg-white"
              >
                {THAI_MONTHS_FULL.map((name, idx) => (
                  <option key={name} value={idx + 1}>{name}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 bg-white"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>พ.ศ. {y + 543}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={goToNextMonth}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                title={`ไปจดรอบเดือน ${nextMonthLabel}`}
              >
                <span>รอบ {nextMonthLabel}</span>
                <ChevronRight size={15} />
              </button>
            </div>

            {canApproveRates && (
              <button
                type="button"
                onClick={() => setIsPricingOpen(true)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <ShieldCheck size={16} /> ตั้งราคาค่าน้ำ (รหัสประธาน)
              </button>
            )}

            {canManageSettings && (
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Settings size={16} /> รอบวันเก็บ / บัญชี
              </button>
            )}
          </div>
        </div>

        {/* แถบอธิบายกติกาเอกสารและสิทธิ์การลบในรายงาน */}
        <div className="bg-slate-900 text-slate-100 rounded-2xl px-4 py-2.5 mb-5 text-[11.5px] flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="font-bold text-amber-300 flex items-center gap-1">
            <FileText size={13} /> ค้างชำระ = ออกใบแจ้งหนี้ (มีภาพมิเตอร์ลายน้ำ • แก้ไข/ลบได้)
          </span>
          <span className="font-bold text-emerald-300 flex items-center gap-1">
            <Lock size={13} /> ชำระแล้ว = ออกใบเสร็จรับเงิน (ล็อกห้ามลบเด็ดขาด • ยกเลิกพร้อมเหตุผลเท่านั้น)
          </span>
        </div>

        {/* แดชบอร์ดสรุปการทำงาน */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm">
            <div className="text-xs font-bold text-emerald-700">ออกใบเสร็จรับเงินแล้ว ({formatThaiMonth(billingMonth, true)})</div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">฿{summary.collected_total.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              เงินสด ฿{summary.collected_cash.toLocaleString()} • โอน/QR ฿{summary.collected_qr.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
            <div className="text-xs font-bold text-amber-700">ใบแจ้งหนี้ค้างชำระ ({summary.unpaid_count} หลังรอบนี้)</div>
            <div className="text-2xl font-extrabold text-amber-700 mt-1">
              ฿{(Number(summary.unpaid_amount || 0) + Number(summary.total_arrears_previous || 0)).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              รอบนี้ ฿{summary.unpaid_amount.toLocaleString()} • ค้างเดือนก่อน ฿{(summary.total_arrears_previous || 0).toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-blue-700">ความคืบหน้า & ค่าจ้างจดมิเตอร์</div>
              <div className="text-2xl font-extrabold text-blue-700 mt-1">
                {summary.recorded_count} / {summary.total_meters} หลัง
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                ค่าจ้างจดมิเตอร์รวม: <strong className="text-blue-700">฿{(summary.total_reader_fee || 0).toLocaleString()}</strong>
              </div>
            </div>
            {summary.total_meters > 0 && summary.unrecorded_count === 0 && (
              <button
                type="button"
                onClick={goToNextMonth}
                className="mt-2 w-full py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1"
              >
                <span>จดครบแล้ว • ไปจดรอบ {nextMonthLabel}</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-600">บ้านค้างชำระ / เอกสารยกเลิก</div>
            {unpaidHouses.length === 0 ? (
              <div className="text-xs text-emerald-600 font-bold mt-2">ไม่มีบ้านค้างจ่าย</div>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1 max-h-14 overflow-y-auto">
                {unpaidHouses.map((u) => {
                  const dueSum =
                    (u.bill_id && u.bill_payment_status !== 'PAID' ? Number(u.total_amount || 0) : 0) +
                    Number(u.arrears_total || 0);
                  return (
                    <button
                      key={u.meter_id}
                      type="button"
                      onClick={() => (u.bill_id ? setDocModalItem(u) : openReadingModal(u))}
                      className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full hover:bg-amber-200"
                    >
                      บ้าน {u.house_no} (฿{dueSum.toLocaleString()})
                    </button>
                  );
                })}
              </div>
            )}
            {voidedBills.length > 0 && (
              <div className="text-[11px] text-red-600 font-bold mt-1.5">
                • มีเอกสารยกเลิก (Void) {voidedBills.length} ฉบับในรอบนี้
              </div>
            )}
          </div>
        </div>

        {/* แถบค้นหาและตัวกรอง */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm mb-5 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา บ้านเลขที่ / เลขมิเตอร์ / ชื่อผู้ใช้น้ำ..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {[
              { code: 'ALL', label: `ทั้งหมด (${summary.total_meters})` },
              { code: 'UNRECORDED', label: `ยังไม่จด (${summary.unrecorded_count})` },
              { code: 'UNPAID', label: `ใบแจ้งหนี้ค้างจ่าย (${unpaidHouses.length})` },
              { code: 'PAID', label: `ใบเสร็จรับเงิน (${summary.paid_count})` },
              { code: 'VOIDED', label: `เอกสารยกเลิก (${voidedBills.length})` }
            ].map((t) => (
              <button
                key={t.code}
                onClick={() => setTabFilter(t.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                  tabFilter === t.code
                    ? t.code === 'VOIDED'
                      ? 'bg-red-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* รายการเดินจดมิเตอร์ หรือ เอกสารยกเลิก */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">กำลังโหลดข้อมูลการจดมิเตอร์...</div>
        ) : tabFilter === 'VOIDED' ? (
          voidedBills.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
              ไม่มีเอกสารที่ถูกยกเลิกในรอบเดือน {formatThaiMonth(billingMonth)}
            </div>
          ) : (
            <div className="space-y-3">
              {voidedBills.map((vb) => (
                <div key={vb.bill_id} className="bg-white rounded-2xl border-2 border-red-200 p-4 flex flex-col md:flex-row justify-between gap-3">
                  <div className="space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold flex items-center gap-1">
                        <Ban size={12} /> ยกเลิกเอกสารแล้ว (VOIDED)
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center gap-1">
                        <Lock size={11} /> ห้ามลบ (หลักฐานบัญชีถาวร)
                      </span>
                    </div>
                    <div className="font-bold text-slate-800 text-sm">
                      บ้านเลขที่ {vb.house_no} • {vb.full_name} (มิเตอร์ {vb.meter_code})
                    </div>
                    <div className="text-slate-600 font-mono">
                      ใบแจ้งหนี้: {vb.bill_no} {vb.receipt_no ? `• ใบเสร็จเดิม: ${vb.receipt_no}` : ''}
                    </div>
                    <div className="text-slate-600">
                      เลขมิเตอร์เดิม: {vb.previous_reading} → {vb.current_reading} ({vb.units_used} หน่วย) • ยอดเดิม ฿{Number(vb.total_amount || 0).toLocaleString()}
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-800 font-semibold">
                      เหตุผลที่ยกเลิก: {vb.void_reason || '-'}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 md:text-right shrink-0 space-y-1">
                    <div>ผู้ยกเลิก: <strong className="text-slate-800">{vb.voided_by_name || '-'}</strong></div>
                    <div>เมื่อ: {formatThaiDateTime(vb.voided_at)}</div>
                    <div>ผู้จดเดิม: {vb.reader_name || '-'}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
            ไม่พบรายการผู้ใช้น้ำในเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((it) => {
              const isRecorded = Boolean(it.bill_id);
              const isPaid = it.bill_payment_status === 'PAID' || it.document_stage === 'RECEIPT';
              const isLocked = Boolean(it.is_locked || isPaid || it.receipt_no);
              const isNotFound = it.visit_status === 'NOT_FOUND';
              const isPendingVerify = it.bill_payment_status === 'PENDING_VERIFY';
              const hasArrears = !isPaid && Array.isArray(it.arrears_list) && it.arrears_list.length > 0;

              return (
                <div
                  key={it.meter_id}
                  className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col justify-between ${
                    isPaid ? 'border-emerald-200' : isRecorded ? 'border-amber-200' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <span className="text-xs font-mono font-extrabold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                        บ้าน {it.house_no} • {it.meter_code}
                      </span>
                      {!isRecorded ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                          <Clock size={12} /> รอจดมิเตอร์
                        </span>
                      ) : isPaid ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <Receipt size={12} /> ใบเสร็จรับเงิน ({it.payment_method === 'CASH' ? 'เงินสด' : 'QR/โอน'})
                        </span>
                      ) : isPendingVerify ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                          <Clock size={12} /> ใบแจ้งหนี้ • รอตรวจสลิป
                        </span>
                      ) : isNotFound ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                          <UserX size={12} /> ใบแจ้งหนี้ (ไม่พบผู้ใช้น้ำ)
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle size={12} /> ใบแจ้งหนี้ (ค้างชำระ)
                        </span>
                      )}
                    </div>

                    {isRecorded && (
                      <div className="mb-2.5 flex items-center justify-between text-[10.5px]">
                        <span className="font-mono text-slate-500">
                          {isPaid ? `ใบเสร็จ: ${it.receipt_no || it.bill_no}` : `ใบแจ้งหนี้: ${it.bill_no}`}
                        </span>
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                            <Lock size={10} /> ล็อกห้ามลบ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                            แก้ไข/ลบได้
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3 items-center mb-3">
                      <img src={it.member_image} alt="" className="w-12 h-12 rounded-xl object-cover border" />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">{it.full_name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1"><Phone size={11} /> {it.phone || '-'}</div>
                        <div className="text-xs text-slate-500">เลขมิเตอร์ล่าสุด: <strong className="text-slate-800">{it.last_meter_reading}</strong></div>
                      </div>
                    </div>

                    {hasArrears && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs mb-3">
                        <div className="font-bold text-amber-900">
                          ยอดค้างเดิมรวม: ฿{Number(it.arrears_total).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-amber-800 mt-0.5">
                          ค้างรอบ:{' '}
                          {it.arrears_list
                            .map((a) => `${formatThaiMonth(a.billing_month, true)} (฿${Number(a.total_amount).toLocaleString()})`)
                            .join(', ')}
                        </div>
                      </div>
                    )}

                    {isRecorded && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500">เลขจด ({it.previous_reading} → {it.current_reading}):</span>
                          <span className="font-bold text-slate-800">{it.units_used} หน่วย</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ค่าจ้างคนจดมิเตอร์:</span>
                          <span className="font-semibold text-slate-700">฿{Number(it.reader_fee || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">{isPaid ? 'ยอดรับชำระ:' : 'ยอดแจ้งหนี้รอบนี้:'}</span>
                          <span className={`font-extrabold text-sm ${isPaid ? 'text-emerald-700' : 'text-blue-700'}`}>
                            ฿{Number(it.total_amount).toLocaleString()}
                          </span>
                        </div>
                        {isPaid && it.snapshot_receiver_name && (
                          <div className="text-[11px] text-emerald-700 pt-0.5 border-t border-slate-200">
                            รับเงินโดย: <strong>{it.snapshot_receiver_name}</strong>
                          </div>
                        )}
                        {hasArrears && (
                          <div className="flex justify-between border-t pt-1 text-amber-800 font-extrabold">
                            <span>รวมยอดค้างทั้งสิ้น:</span>
                            <span>฿{Number(it.grand_total_with_arrears).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {!isRecorded ? (
                      <button
                        type="button"
                        onClick={() => openReadingModal(it)}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                      >
                        จดเลขมิเตอร์ / ออกใบแจ้งหนี้
                      </button>
                    ) : !isLocked ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openReadingModal(it)}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                        >
                          แก้ไข / รับชำระ
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocModalItem(it)}
                          className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl flex items-center gap-1"
                        >
                          <FileText size={14} /> ใบแจ้งหนี้
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUnpaidInvoice(it)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl"
                          title="ลบใบแจ้งหนี้ที่ยังไม่ชำระ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setDocModalItem(it)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <Receipt size={14} /> ดูใบเสร็จรับเงิน / แชร์
                        </button>
                        {canVoidReceipt && (
                          <button
                            type="button"
                            onClick={() => { setVoidTarget(it); setVoidReason(''); setVoidPin(''); }}
                            className="px-2.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1"
                            title="ยกเลิกเอกสารพร้อมเหตุผล (แทนการลบ)"
                          >
                            <Ban size={13} /> ยกเลิก
                          </button>
                        )}
                      </>
                    )}

                    {it.latitude && it.longitude && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${it.latitude},${it.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                        title="นำทางไปที่มิเตอร์"
                      >
                        <MapPin size={15} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal 1: ตั้งค่ารอบวันเก็บ / ประธานหัวเอกสาร / บัญชีรับเงิน */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-3 sm:p-4 z-[9999]">
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-slate-800 p-4 text-white flex justify-between items-center shrink-0">
              <h2 className="font-bold text-base flex items-center gap-2"><Settings size={18} /> ตั้งค่ารอบวันเก็บ / หัวเอกสาร / บัญชี</h2>
              <button type="button" onClick={() => setIsSettingsOpen(false)}><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex justify-between items-center gap-2">
                <div className="text-xs text-amber-900">
                  <div className="font-bold">อัตราปัจจุบัน: {settings.unit_rate} บ./หน่วย • มิเตอร์ {settings.meter_fee} บ. • ค่าเก็บ {settings.reader_fee} บ.</div>
                  <div className="text-[11px] text-amber-700">การปรับราคาต้องใช้รหัสอนุมัติของประธาน</div>
                </div>
                {canApproveRates && (
                  <button
                    type="button"
                    onClick={() => { setIsSettingsOpen(false); setIsPricingOpen(true); }}
                    className="px-2.5 py-1.5 bg-amber-600 text-white rounded-lg text-[11px] font-bold shrink-0"
                  >
                    เปลี่ยนราคา
                  </button>
                )}
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <label className="block text-xs font-bold text-emerald-900 mb-1">
                  ชื่อประธานกรรมการ (แสดงบนหัวใบแจ้งหนี้และใบเสร็จรอบใหม่)
                </label>
                <input
                  type="text"
                  placeholder={villageInfo.president_name ? `ดึงอัตโนมัติจากผัง: ${villageInfo.president_name}` : 'เช่น นายอานนท์ ใจดี'}
                  value={settingsForm.president_name || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, president_name: e.target.value })}
                  className="w-full p-2.5 border border-emerald-200 rounded-lg text-sm bg-white"
                />
                <div className="text-[11px] text-emerald-800 mt-1">
                  *บิลเก่าที่ออกไปแล้วจะเก็บชื่อประธานเดิมแบบ Snapshot ไม่เปลี่ยนตาม
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-800">รอบวันที่จดมิเตอร์และกำหนดชำระเงิน</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">เก็บทุกวันที่ (1-31)</label>
                    <input type="number" min="1" max="31" required value={settingsForm.reading_day ?? 25} onChange={(e) => setSettingsForm({ ...settingsForm, reading_day: e.target.value })} className="w-full p-2 border rounded-lg text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ต้องจ่ายภายในวันที่ (1-31)</label>
                    <input type="number" min="1" max="31" required value={settingsForm.due_day ?? 5} onChange={(e) => setSettingsForm({ ...settingsForm, due_day: e.target.value })} className="w-full p-2 border rounded-lg text-sm bg-white" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={Boolean(settingsForm.due_next_month)}
                    onChange={(e) => setSettingsForm({ ...settingsForm, due_next_month: e.target.checked })}
                  />
                  <span>กำหนดชำระใน <strong>เดือนถัดไป</strong> (เช่น จด 25 พ.ย. → จ่ายภายใน 5 ธ.ค.)</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อธนาคาร</label>
                <input type="text" placeholder="เช่น ธ.ก.ส. / กรุงไทย / กสิกรไทย" value={settingsForm.bank_name || ''} onChange={(e) => setSettingsForm({ ...settingsForm, bank_name: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อบัญชีรับเงิน</label>
                <input type="text" placeholder="เช่น คณะกรรมการประปาหมู่บ้าน หมู่ 6" value={settingsForm.account_name || ''} onChange={(e) => setSettingsForm({ ...settingsForm, account_name: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่บัญชีธนาคาร</label>
                <input type="text" placeholder="XXX-X-XXXXX-X" value={settingsForm.account_number || ''} onChange={(e) => setSettingsForm({ ...settingsForm, account_number: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm font-mono" />
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <label className="block text-xs font-bold text-blue-900 mb-1">หมายเลขพร้อมเพย์ (เบอร์โทร 10 หลัก หรือเลข 13 หลัก)</label>
                <input type="text" placeholder="ใช้สร้าง QR Code บนใบแจ้งหนี้อัตโนมัติ" value={settingsForm.promptpay_id || ''} onChange={(e) => setSettingsForm({ ...settingsForm, promptpay_id: e.target.value })} className="w-full p-2.5 border border-blue-200 rounded-lg text-sm font-mono bg-white" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex gap-2 shrink-0">
              <button type="button" onClick={() => setIsSettingsOpen(false)} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 text-sm">ยกเลิก</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-1.5"><Save size={16} /> บันทึกตั้งค่า</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: จดมิเตอร์ -> ออกใบแจ้งหนี้ หรือ ออกใบเสร็จรับเงิน */}
      {readingTarget && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-3 sm:p-4 z-[9999]">
          <form onSubmit={handleSaveReading} className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="font-bold text-base">จดมิเตอร์: บ้านเลขที่ {readingTarget.house_no}</h2>
                <div className="text-xs text-blue-100">
                  {readingTarget.full_name} • มิเตอร์ {readingTarget.meter_code} • รอบ {formatThaiMonth(billingMonth)}
                </div>
              </div>
              <button type="button" onClick={() => setReadingTarget(null)}><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between text-slate-600">
                <span>วันที่จด: <strong>{schedule.readingThai}</strong></span>
                <span>จ่ายภายใน: <strong className="text-amber-700">{schedule.dueThai}</strong></span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">เลขมิเตอร์เดือนก่อน</label>
                  <input type="number" step="0.01" value={readingForm.previous_reading} onChange={(e) => setReadingForm({ ...readingForm, previous_reading: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm bg-slate-100 font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-blue-800 mb-1">เลขมิเตอร์ที่จดวันนี้ *</label>
                  <input required type="number" step="0.01" min={calcPrev} placeholder="กรอกเลข..." value={readingForm.current_reading} onChange={(e) => setReadingForm({ ...readingForm, current_reading: e.target.value })} className="w-full p-2.5 border-2 border-blue-400 rounded-lg text-base font-extrabold font-mono" />
                </div>
              </div>

              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-blue-900">
                  <span>ค่าน้ำ ({calcUnits} หน่วย × {settings.unit_rate} บ.)</span>
                  <strong>฿{calcWaterPrice.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between text-blue-900">
                  <span>ค่ารักษามิเตอร์ (อนุมัติโดยประธาน)</span>
                  <span>฿{calcMeterFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>ค่าจ้างคนจดมิเตอร์ (อนุมัติโดยประธาน)</span>
                  <span>฿{calcReaderFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-blue-200 pt-1.5 text-sm font-extrabold text-blue-800">
                  <span>รวมยอดบิลรอบเดือนนี้</span>
                  <span>฿{calcCurrentTotal.toLocaleString()}</span>
                </div>
                {calcArrearsTotal > 0 && (
                  <>
                    <div className="flex justify-between text-amber-800 font-bold pt-1">
                      <span>ยอดค้างเดือนก่อน ({readingTarget.arrears_list.map((a) => formatThaiMonth(a.billing_month, true)).join(', ')})</span>
                      <span>฿{calcArrearsTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-300 pt-1.5 text-base font-extrabold text-red-700">
                      <span>ยอดรวมสุทธิทั้งหมด (รวมค้าง)</span>
                      <span>฿{calcGrandTotal.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <UserCheck size={14} className="text-blue-600" /> ชื่อ-นามสกุล ผู้จดมิเตอร์ (บันทึก Snapshot ถาวร) *
                </label>
                <input
                  type="text"
                  required
                  value={readingForm.recorded_by}
                  onChange={(e) => setReadingForm({ ...readingForm, recorded_by: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ภาพถ่ายหน้าปัดมิเตอร์ (ประทับลายน้ำวัน-เวลาไทยและรอบเดือนทับบนภาพ)
                </label>
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-blue-300 bg-blue-50/30 rounded-xl cursor-pointer hover:bg-blue-50 text-sm font-semibold text-blue-700">
                  <Camera size={18} /> ถ่ายรูปหน้าปัดมิเตอร์
                  <input type="file" accept="image/*" capture="environment" onChange={handleFileBase64('reading_photo_url')} className="hidden" />
                </label>
                {readingForm.reading_photo_url && (
                  <img
                    src={readingForm.reading_photo_url}
                    alt="Meter Evidence"
                    className="mt-2.5 mx-auto block max-h-72 w-auto max-w-full rounded-xl border border-slate-200 shadow-sm"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">ประเภทเอกสารที่จะออก *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { code: 'UNPAID', label: 'ออกใบแจ้งหนี้ (รอชำระ)', icon: FileText, activeCls: 'border-amber-600 bg-amber-50 text-amber-800' },
                    { code: 'NOT_FOUND', label: 'ออกใบแจ้งหนี้ (ไม่พบผู้ใช้น้ำ)', icon: UserX, activeCls: 'border-orange-600 bg-orange-50 text-orange-800' },
                    { code: 'CASH', label: 'รับเงินสด -> ออกใบเสร็จ', icon: Banknote, activeCls: 'border-emerald-600 bg-emerald-50 text-emerald-800' },
                    { code: 'QR_PAID', label: 'โอน/QR แล้ว -> ออกใบเสร็จ', icon: QrCode, activeCls: 'border-blue-600 bg-blue-50 text-blue-800' }
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = readingForm.action_type === opt.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => setReadingForm({ ...readingForm, action_type: opt.code })}
                        className={`p-2.5 rounded-xl border-2 text-xs font-bold flex items-center gap-2 ${active ? opt.activeCls : 'border-slate-200 text-slate-600 bg-white'}`}
                      >
                        <Icon size={16} /> {opt.label}
                      </button>
                    );
                  })}
                </div>
                {(readingForm.action_type === 'CASH' || readingForm.action_type === 'QR_PAID') && (
                  <div className="mt-2 text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-2 font-semibold">
                    *เมื่อบันทึกแบบรับชำระแล้ว ระบบจะออก <strong>ใบเสร็จรับเงิน</strong> และล็อกเอกสารห้ามลบ/ห้ามแก้ตัวเลขทันที
                  </div>
                )}
              </div>

              {readingForm.action_type === 'QR_PAID' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2">
                  {modalQrUrl ? (
                    <>
                      <div className="text-xs font-bold text-blue-800">สแกน QR พร้อมเพย์ ยอด ฿{calcCurrentTotal.toLocaleString()}</div>
                      <img src={modalQrUrl} alt="PromptPay QR" className="mx-auto w-48 h-48 rounded-xl border bg-white p-2" />
                      <div className="text-xs text-slate-600">{settings.bank_name} • {settings.account_name} ({settings.promptpay_id})</div>
                    </>
                  ) : (
                    <div className="text-xs text-red-600 font-bold">กรุณาตั้งค่าหมายเลขพร้อมเพย์ที่ปุ่มตั้งค่าด้านบนก่อนครับ</div>
                  )}
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 cursor-pointer pt-1">
                    <Camera size={14} /> แนบรูปสลิปการโอน (ถ้ามี)
                    <input type="file" accept="image/*" onChange={handleFileBase64('slip_url')} className="hidden" />
                  </label>
                  {readingForm.slip_url && <img src={readingForm.slip_url} alt="Slip" className="mx-auto max-h-40 w-auto rounded-lg border" />}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                <input type="text" placeholder="เช่น ฝากใบแจ้งหนี้ไว้หน้าบ้าน" value={readingForm.note} onChange={(e) => setReadingForm({ ...readingForm, note: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex gap-2 shrink-0">
              <button type="button" onClick={() => setReadingTarget(null)} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 text-sm">ยกเลิก</button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-1.5 ${
                  readingForm.action_type === 'CASH' || readingForm.action_type === 'QR_PAID'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Save size={16} />
                {submitting
                  ? 'กำลังบันทึก...'
                  : readingForm.action_type === 'CASH' || readingForm.action_type === 'QR_PAID'
                  ? 'รับชำระและออกใบเสร็จรับเงิน'
                  : 'บันทึกและออกใบแจ้งหนี้'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 3: เอกสารทางการ (ใบแจ้งหนี้มีภาพมิเตอร์+QR / ใบเสร็จรับเงินสะอาดไม่มีภาพ) */}
      {docModalItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-3 sm:p-4 z-[9999]">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className={`p-3.5 text-white flex justify-between items-center shrink-0 no-print ${modalIsReceipt ? 'bg-gradient-to-r from-emerald-800 to-teal-900' : 'bg-gradient-to-r from-slate-900 to-blue-950'}`}>
              <span className="font-bold text-sm flex items-center gap-2">
                {modalIsReceipt ? <Receipt size={17} /> : <FileText size={17} />}
                {modalIsReceipt ? 'ใบเสร็จรับเงินค่าน้ำประปา (ฉบับสมบูรณ์)' : 'ใบแจ้งหนี้ค่าน้ำประปา (ยังไม่ใช่ใบเสร็จ)'}
              </span>
              <button type="button" onClick={() => setDocModalItem(null)} className="p-1 hover:bg-white/20 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div id="water-slip-printable" className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-sm bg-white flex-1">
              <div className={`border rounded-2xl p-4 text-center relative overflow-hidden ${modalIsReceipt ? 'bg-gradient-to-b from-emerald-50/90 to-white border-emerald-200' : 'bg-gradient-to-b from-blue-50/90 to-white border-blue-200'}`}>
                <div className={`absolute top-0 left-0 w-full h-1.5 ${modalIsReceipt ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600' : 'bg-gradient-to-r from-amber-500 via-blue-600 to-indigo-600'}`} />
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-white shadow-sm mb-2 ${modalIsReceipt ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                  {modalIsReceipt ? <Receipt size={20} /> : <Droplets size={20} />}
                </div>
                <div className={`font-extrabold text-[15px] leading-snug ${modalIsReceipt ? 'text-emerald-950' : 'text-slate-900'}`}>
                  {modalIsReceipt ? `ใบเสร็จรับเงินค่าน้ำประปา ${modalVillageTitle}` : `ใบแจ้งหนี้ค่าน้ำประปา ${modalVillageTitle}`}
                </div>
                {modalVillageAddr && (
                  <div className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">{modalVillageAddr}</div>
                )}
                <div className="text-xs font-bold text-blue-900 mt-1.5 pt-1.5 border-t border-slate-200/70">
                  ประธานกรรมการ: <span className="text-slate-900">{modalPresidentName}</span>
                </div>

                <div className="mt-2.5 pt-2 border-t border-dashed border-slate-300 space-y-1">
                  {modalIsReceipt ? (
                    <>
                      <div className="text-xs font-bold text-emerald-800">
                        เลขที่ใบเสร็จ: <span className="font-mono text-emerald-950">{docModalItem.receipt_no || docModalItem.bill_no}</span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        อ้างอิงใบแจ้งหนี้: <span className="font-mono">{docModalItem.bill_no}</span> • รอบเดือน {formatThaiMonth(docModalItem.billing_month)}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        วันที่รับชำระ: <strong>{formatThaiDateTime(docModalItem.receipt_issued_at || docModalItem.paid_at)}</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-blue-900">
                        เลขที่ใบแจ้งหนี้: <span className="font-mono text-slate-900">{docModalItem.bill_no}</span> • รอบเดือน {formatThaiMonth(docModalItem.billing_month)}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        วันที่จดมิเตอร์: <strong>{docModalItem.reading_date ? formatThaiDate(docModalItem.reading_date) : schedule.readingThai}</strong> •{' '}
                        ชำระภายใน: <strong className="text-amber-700">{docModalItem.due_date ? formatThaiDate(docModalItem.due_date) : schedule.dueThai}</strong>
                      </div>
                    </>
                  )}

                  <div className="pt-1 flex justify-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${modalIsReceipt ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                      {modalIsReceipt
                        ? <><CheckCircle size={13} /> ชำระเงินแล้ว ({docModalItem.payment_method === 'CASH' ? 'เงินสด' : 'โอน/QR'})</>
                        : docModalItem.visit_status === 'NOT_FOUND'
                        ? 'ใบแจ้งหนี้รอชำระ (ไม่พบผู้ใช้น้ำ)'
                        : 'ใบแจ้งหนี้รอชำระเงิน'}
                    </span>
                    {modalIsReceipt && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        <Lock size={11} /> ล็อกห้ามลบ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-xs space-y-1 text-slate-700">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">ผู้ใช้น้ำ:</span>
                  <strong className="text-slate-900 text-right">{docModalItem.full_name}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 shrink-0">ที่อยู่:</span>
                  <span className="text-right text-slate-800">{docModalItem.full_address}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">เลขมิเตอร์:</span>
                  <strong className="font-mono text-blue-800">{docModalItem.snapshot_meter_no || docModalItem.meter_code}</strong>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-600">เลขมิเตอร์ครั้งก่อน</span><span className="font-mono">{docModalItem.previous_reading}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">เลขมิเตอร์ครั้งนี้</span><span className="font-mono font-bold text-slate-900">{docModalItem.current_reading}</span></div>
                <div className="flex justify-between border-t border-dashed pt-1.5"><span className="text-slate-600">จำนวนน้ำที่ใช้</span><strong>{docModalItem.units_used} หน่วย</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">ค่าน้ำ ({docModalItem.units_used} × {docModalItem.unit_rate} บ.)</span><span>฿{(Number(docModalItem.units_used) * Number(docModalItem.unit_rate)).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">ค่ารักษามิเตอร์</span><span>฿{Number(docModalItem.meter_fee || 0).toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-emerald-800"><span>ค่าจ้างคนจดมิเตอร์</span><span>฿{Number(docModalItem.reader_fee || 0).toLocaleString()}</span></div>
                <div className={`flex justify-between border-t pt-2 text-sm font-extrabold ${modalIsReceipt ? 'text-emerald-700' : 'text-blue-700'}`}>
                  <span>{modalIsReceipt ? 'ยอดที่รับชำระสุทธิ' : 'ยอดแจ้งหนี้รอบเดือนนี้'}</span>
                  <span>฿{Number(docModalItem.total_amount).toLocaleString()}</span>
                </div>

                {!modalIsReceipt && Array.isArray(docModalItem.arrears_list) && docModalItem.arrears_list.length > 0 && (
                  <div className="border-t border-dashed border-amber-300 pt-2 mt-2 space-y-1">
                    <div className="font-bold text-amber-800">รายการค้างชำระรอบเดือนก่อน:</div>
                    {docModalItem.arrears_list.map((a) => (
                      <div key={a.bill_id} className="flex justify-between text-amber-900 pl-2">
                        <span>• รอบเดือน {formatThaiMonth(a.billing_month, true)}</span>
                        <span>฿{Number(a.total_amount).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-amber-900 pt-1">
                      <span>ยอดค้างชำระรวม</span>
                      <span>฿{Number(docModalItem.arrears_total || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-base font-extrabold text-red-700">
                      <span>ยอดรวมสุทธิที่ต้องชำระ</span>
                      <span>฿{(Number(docModalItem.total_amount || 0) + Number(docModalItem.arrears_total || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* แสดงสลิปโอนเงินที่แนบมา เฉพาะตอนรอตรวจบนใบแจ้งหนี้ */}
              {!modalIsReceipt && docModalItem.slip_url && (
                <div>
                  <div className="text-[11px] font-bold text-blue-700 mb-1">หลักฐานสลิปโอนเงินที่แนบมา:</div>
                  <img src={docModalItem.slip_url} alt="Transfer Slip" className="mx-auto block max-h-56 w-auto rounded-xl border border-blue-200" />
                </div>
              )}

              {/* แสดงภาพถ่ายหน้าปัดมิเตอร์พร้อมลายน้ำ เฉพาะ "ใบแจ้งหนี้" — ใบเสร็จรับเงินไม่ต้องมีภาพ */}
              {!modalIsReceipt && docModalItem.reading_photo_url && (
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1.5">ภาพถ่ายหน้าปัดมิเตอร์หลักฐาน:</div>
                  <img
                    src={docModalItem.reading_photo_url}
                    alt="Evidence"
                    className="mx-auto block max-h-72 w-auto max-w-full rounded-xl border border-slate-200 shadow-sm"
                  />
                </div>
              )}

              {/* แสดง QR พร้อมเพย์เฉพาะบนใบแจ้งหนี้ */}
              {!modalIsReceipt &&
                buildPromptPayQRUrl(
                  settings.promptpay_id,
                  Number(docModalItem.total_amount || 0) + Number(docModalItem.arrears_total || 0)
                ) && (
                  <div className="text-center bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                    <div className="text-xs font-bold text-blue-900 mb-1">สแกน QR พร้อมเพย์เพื่อชำระค่าน้ำ</div>
                    <img
                      src={buildPromptPayQRUrl(
                        settings.promptpay_id,
                        Number(docModalItem.total_amount || 0) + Number(docModalItem.arrears_total || 0)
                      )}
                      alt="QR"
                      className="mx-auto w-40 h-40 rounded-lg bg-white p-1.5 border"
                    />
                    <div className="text-[11px] text-slate-600 mt-1">
                      {settings.bank_name ? `${settings.bank_name} • ` : ''}
                      {settings.account_name || modalVillageTitle} ({settings.promptpay_id})
                    </div>
                  </div>
                )}

              <div className="border-t-2 border-dashed border-slate-300 pt-3 mt-2 text-center space-y-1">
                {modalIsReceipt ? (
                  <>
                    <div className="text-[11px] text-slate-500">ลงชื่อผู้รับเงิน / ผู้ออกใบเสร็จรับเงิน</div>
                    <div className="text-sm font-extrabold text-emerald-900">( {modalReceiverName} )</div>
                    <div className="text-[11px] text-slate-500">
                      ผู้จดมิเตอร์: {modalReaderName} • {modalVillageTitle}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[11px] text-slate-500">ลงชื่อผู้จดมิเตอร์ / ผู้ออกใบแจ้งหนี้</div>
                    <div className="text-sm font-extrabold text-slate-900">( {modalReaderName} )</div>
                    <div className="text-[11px] text-amber-700 font-semibold">
                      *เอกสารนี้เป็นใบแจ้งหนี้ ยังไม่ใช่ใบเสร็จรับเงิน
                    </div>
                  </>
                )}
              </div>

              {!modalIsReceipt && (
                <div className="grid grid-cols-2 gap-2 pt-1 no-print">
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(docModalItem, 'CASH')}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    รับเงินสด → ออกใบเสร็จ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(docModalItem, 'QR_TRANSFER')}
                    className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                  >
                    ยืนยันโอน/QR → ออกใบเสร็จ
                  </button>
                </div>
              )}

              {modalIsReceipt && canVoidReceipt && (
                <div className="pt-1 no-print">
                  <button
                    type="button"
                    onClick={() => { setVoidTarget(docModalItem); setVoidReason(''); setVoidPin(''); }}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Ban size={14} /> ยกเลิกใบเสร็จรับเงินฉบับนี้ (ใช้ PIN ผู้ใหญ่บ้าน + ระบุเหตุผล)
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t flex gap-2 shrink-0 no-print">
              <button
                type="button"
                disabled={sharingImage}
                onClick={() => handleShareDocImage(docModalItem, false)}
                className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60 ${modalIsReceipt ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <Share2 size={15} />
                {sharingImage ? 'กำลังสร้างรูป...' : modalIsReceipt ? 'แชร์ใบเสร็จ (.JPG)' : 'แชร์ใบแจ้งหนี้ (.JPG)'}
              </button>
              <button
                type="button"
                disabled={sharingImage}
                onClick={() => handleShareDocImage(docModalItem, true)}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-60"
              >
                <Download size={15} /> บันทึก
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <Printer size={15} /> พิมพ์
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: ยกเลิกเอกสารพร้อมเหตุผล (Void) */}
      {voidTarget && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[10000]">
          <form onSubmit={handleSubmitVoid} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-red-600 p-4 text-white flex justify-between items-center">
              <h2 className="font-bold text-base flex items-center gap-2"><Ban size={18} /> ยกเลิกเอกสาร (Void) แทนการลบ</h2>
              <button type="button" onClick={() => setVoidTarget(null)}><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-900 space-y-1">
                <div className="font-bold">เอกสาร: {voidTarget.receipt_no || voidTarget.bill_no}</div>
                <div>บ้านเลขที่ {voidTarget.house_no} • {voidTarget.full_name} • ยอด ฿{Number(voidTarget.total_amount || 0).toLocaleString()}</div>
                <div className="text-[11px] text-red-700 pt-1">
                  *ระบบจะไม่ลบข้อมูลออกจากฐานข้อมูล แต่จะประทับสถานะ <strong>VOIDED</strong> เก็บเป็นหลักฐานทางบัญชีถาวร จากนั้นสามารถจดออกใบแจ้งหนี้ใหม่ในรอบเดือนนี้ได้
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เหตุผลในการยกเลิกเอกสาร *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="เช่น จดเลขมิเตอร์ผิดจาก 2450 เป็น 2540 / ออกใบเสร็จผิดบ้าน..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm resize-none"
                />
              </div>

              {!isSuperAdmin && (voidTarget.bill_payment_status === 'PAID' || voidTarget.receipt_no) && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-300">
                  <label className="block font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Lock size={14} className="text-red-600" /> กรอกรหัส PIN อนุมัติของผู้ใหญ่บ้าน *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="กรอกรหัส PIN ยืนยันการยกเลิกใบเสร็จ..."
                    value={voidPin}
                    onChange={(e) => setVoidPin(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-mono bg-white"
                  />
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t flex gap-2">
              <button type="button" onClick={() => setVoidTarget(null)} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 text-sm">ยกเลิก</button>
              <button type="submit" disabled={voidSubmitting} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm">
                {voidSubmitting ? 'กำลังบันทึก...' : 'ยืนยันยกเลิกเอกสาร'}
              </button>
            </div>
          </form>
        </div>
      )}

      {canApproveRates && (
        <WaterPricingModal
          isOpen={isPricingOpen}
          onClose={() => setIsPricingOpen(false)}
          villageId={villageId}
          staffName={staffFullName}
          onUpdated={() => fetchBillingData()}
        />
      )}

      <BottomNavbar />
    </div>
  );
};

export default WaterBilling;