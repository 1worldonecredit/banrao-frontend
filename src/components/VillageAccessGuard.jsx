import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, LogOut, ArrowLeft, UserCheck } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const VillageAccessGuard = ({ requiredPermission, pageTitle, children }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('CHECKING'); // CHECKING | ALLOWED | DENIED
  const [denyMessage, setDenyMessage] = useState('');
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    let active = true;

    const verify = async () => {
      try {
        const res = await authFetch(`${API_URL}/api/auth/verify-context`);
        const result = await res.json();

        if (!active) return;

        if (!res.ok || !result.success || !result.data) {
          setCtx(result.data || null);
          setDenyMessage(result.message || 'ไม่สามารถยืนยันตัวตนผู้ใช้งานได้ กรุณาเข้าสู่ระบบใหม่');
          setStatus('DENIED');
          return;
        }

        const verified = result.data;
        setCtx(verified);

        // อัปเดตข้อมูลสังกัดหมู่บ้านและตำแหน่งใน localStorage ให้ตรงกับฐานข้อมูลจริงเสมอ (กันการปลอมค่า)
        const stored = JSON.parse(localStorage.getItem('userData') || '{}');
        localStorage.setItem(
          'userData',
          JSON.stringify({
            ...stored,
            village_id: verified.village_id || stored.village_id,
            villageName: verified.village_name || stored.villageName,
            village_no: verified.village_no || stored.village_no,
            role: verified.role || stored.role,
            tier_code: verified.tier_code || stored.tier_code,
            position_name: verified.display_position_name || stored.position_name,
            role_templates: verified.role_templates || []
          })
        );

        // 1. เช็กสถานะ Active
        if (!verified.is_active) {
          setDenyMessage(`บัญชีของคุณไม่ Active (${verified.account_status}) ไม่สามารถใช้งานระบบได้`);
          setStatus('DENIED');
          return;
        }

        // 2. เช็กสิทธิ์การเข้าถึงหน้านี้ (Super Admin ผ่านได้ทุกหน้า)
        if (
          requiredPermission &&
          !verified.is_super_admin &&
          !verified.permissions?.[requiredPermission]
        ) {
          setDenyMessage(
            `ตำแหน่งของคุณ (${verified.display_position_name || verified.role}) ไม่มีสิทธิ์เข้าใช้งานหน้า "${pageTitle || 'นี้'}"`
          );
          setStatus('DENIED');
          return;
        }

        setStatus('ALLOWED');
      } catch (err) {
        if (!active) return;
        setDenyMessage('ไม่สามารถเชื่อมต่อระบบตรวจสอบสิทธิ์ได้ กรุณาลองใหม่อีกครั้ง');
        setStatus('DENIED');
      }
    };

    verify();
    return () => {
      active = false;
    };
  }, [requiredPermission, pageTitle]);

  const handleForceLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    localStorage.removeItem('menuPermissions');
    navigate('/login');
  };

  if (status === 'CHECKING') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <ShieldCheck size={40} className="text-blue-600 animate-pulse mb-3" />
        <div className="font-bold text-slate-700 text-sm">
          กำลังตรวจสอบตัวตน สิทธิ์ และสังกัดหมู่บ้าน...
        </div>
      </div>
    );
  }

  if (status === 'DENIED') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 max-w-md w-full overflow-hidden">
          <div className="bg-red-600 p-4 text-white flex items-center gap-2.5">
            <ShieldAlert size={24} />
            <div>
              <div className="font-bold text-base">ไม่อนุญาตให้เข้าถึงข้อมูล</div>
              <div className="text-xs text-red-100">ระบบตรวจสอบสิทธิ์และกั้นเขตหมู่บ้าน Ban Rao</div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs font-bold text-red-800">
              {denyMessage}
            </div>

            {ctx && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5 text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-1 border-b">
                  <UserCheck size={14} className="text-blue-600" /> ข้อมูลที่ตรวจสอบจากฐานข้อมูล
                </div>
                <div>
                  <strong>ผู้ใช้งาน:</strong> {ctx.full_name}
                </div>
                <div>
                  <strong>สถานะบัญชี:</strong>{' '}
                  <span className={ctx.is_active ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                    {ctx.account_status}
                  </span>
                </div>
                <div>
                  <strong>สังกัดหมู่บ้าน:</strong> {ctx.village_full_address || 'ไม่ระบุ'}
                </div>
                <div>
                  <strong>ตำแหน่งที่อนุมัติแล้ว:</strong> {ctx.display_position_name || ctx.role}
                  {ctx.positions?.length > 0
                    ? ` (${ctx.positions.map((p) => p.display_position_name || p.committee_name).join(', ')})`
                    : ''}
                </div>
                <div>
                  <strong>ผู้แนะนำ:</strong>{' '}
                  {ctx.referrer ? `${ctx.referrer.full_name} (${ctx.referrer.phone})` : 'ไม่มีข้อมูลผู้แนะนำ'}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={15} /> กลับหน้าหลัก
              </button>
              <button
                type="button"
                onClick={handleForceLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <LogOut size={15} /> ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default VillageAccessGuard;