import React, { useState, useEffect } from 'react';
import {
  Droplets, Plus, Search, MapPin, Phone, Camera, Edit, Trash2,
  X, Save, Navigation, CheckCircle, AlertTriangle, PowerOff, List, Map as MapIcon
} from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';
import WaterMeterMap from '../components/WaterMeterMap';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const METER_STATUS_MAP = {
  ACTIVE: { label: 'ใช้งาน', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  INACTIVE: { label: 'ไม่ใช้งาน', bg: 'bg-slate-200', text: 'text-slate-600' },
  CUT_OFF: { label: 'ตัดมิเตอร์', bg: 'bg-red-100', text: 'text-red-700' }
};

const PAYMENT_STATUS_MAP = {
  PAID: { label: 'ชำระแล้ว', bg: 'bg-blue-100', text: 'text-blue-700' },
  OVERDUE: { label: 'ค้างชำระ', bg: 'bg-amber-100', text: 'text-amber-800' }
};

const WaterUsers = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const villageId = userData.village_id || 1;

  const [meters, setMeters] = useState([]);
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);

  // ตัวกรอง ค้นหา และโหมดแสดงผล (รายการ / แผนที่)
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'MAP'

  // Modal เพิ่ม/แก้ไข
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    household_id: '',
    member_id: '',
    meter_code: '',
    meter_photo_url: '',
    meter_status: 'ACTIVE',
    payment_status: 'PAID',
    latitude: '',
    longitude: '',
    last_meter_reading: 0,
    note: ''
  });

  // โหลดรายชื่อผู้ใช้น้ำ + รายชื่อบ้านเลขที่ในหมู่บ้าน
  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, hRes] = await Promise.all([
        fetch(`${API_URL}/api/water/meters/${villageId}`).then((r) => r.json()),
        fetch(`${API_URL}/api/water/households/${villageId}`).then((r) => r.json())
      ]);
      if (mRes.success) setMeters(mRes.data || []);
      if (hRes.success) setHouseholds(hRes.data || []);
    } catch (err) {
      console.error('Load water data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [villageId]);

  const selectedHouse = households.find((h) => String(h.household_id) === String(form.household_id));
  const selectedMember = selectedHouse?.members?.find((m) => String(m.member_id) === String(form.member_id));

  const openAddModal = () => {
    setEditingMeter(null);
    setForm({
      household_id: '', member_id: '', meter_code: '', meter_photo_url: '',
      meter_status: 'ACTIVE', payment_status: 'PAID',
      latitude: '', longitude: '', last_meter_reading: 0, note: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingMeter(item);
    setForm({
      household_id: item.household_id,
      member_id: item.member_id,
      meter_code: item.meter_code || '',
      meter_photo_url: item.meter_photo_url || '',
      meter_status: item.meter_status || 'ACTIVE',
      payment_status: item.payment_status || 'PAID',
      latitude: item.latitude || '',
      longitude: item.longitude || '',
      last_meter_reading: item.last_meter_reading || 0,
      note: item.note || ''
    });
    setIsModalOpen(true);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, meter_photo_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) return alert('อุปกรณ์นี้ไม่รองรับ GPS');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6)
        }));
      },
      () => alert('ไม่สามารถดึงพิกัด GPS ได้ กรุณาอนุญาตสิทธิ์ตำแหน่งที่ตั้ง')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingMeter && (!form.household_id || !form.member_id)) {
      return alert('กรุณาเลือกบ้านเลขที่และชื่อผู้ใช้น้ำในบ้าน');
    }
    setSubmitting(true);
    try {
      const url = editingMeter
        ? `${API_URL}/api/water/meters/${editingMeter.meter_id}`
        : `${API_URL}/api/water/meters`;
      const method = editingMeter ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          village_id: villageId,
          changed_by: userData.full_name || userData.username || 'ADMIN'
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setIsModalOpen(false);
        fetchData();
      } else {
        alert(result.message || 'บันทึกไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`ต้องการปิดใช้งานมิเตอร์เลขที่ ${item.meter_code} (${item.full_name}) ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/water/meters/${item.meter_id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) fetchData();
    } catch (err) {
      alert('ลบไม่สำเร็จ');
    }
  };

  const filteredMeters = meters.filter((m) => {
    const q = searchText.trim().toLowerCase();
    const matchText =
      !q ||
      (m.house_no || '').toLowerCase().includes(q) ||
      (m.meter_code || '').toLowerCase().includes(q) ||
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.phone || '').toLowerCase().includes(q);

    const matchStatus =
      statusFilter === 'ALL' ||
      m.meter_status === statusFilter ||
      m.payment_status === statusFilter;

    return matchText && matchStatus;
  });

  const stats = {
    total: meters.length,
    active: meters.filter((m) => m.meter_status === 'ACTIVE').length,
    overdue: meters.filter((m) => m.payment_status === 'OVERDUE').length,
    cutoff: meters.filter((m) => m.meter_status === 'CUT_OFF').length
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans">
      <TopNavbar userData={userData} />

      <div className="max-w-7xl mx-auto p-4 pt-20">
        {/* ส่วนหัว + ปุ่มสลับมุมมอง รายการ / แผนที่ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Droplets size={24} /></div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800">ทะเบียนผู้ใช้น้ำประปาหมู่บ้าน</h1>
              <p className="text-xs md:text-sm text-slate-500">ผูกบ้านเลขที่ เลขมิเตอร์ ภาพถ่าย พิกัด GPS และสถานะพร้อมออกบิล</p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'LIST' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                }`}
              >
                <List size={15} /> รายชื่อ
              </button>
              <button
                type="button"
                onClick={() => setViewMode('MAP')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'MAP' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                }`}
              >
                <MapIcon size={15} /> แผนที่ (1 กม.)
              </button>
            </div>

            <button
              onClick={openAddModal}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={18} /> เพิ่มผู้ใช้น้ำ
            </button>
          </div>
        </div>

        {/* การ์ดสรุปสถานะ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-bold">ผู้ใช้น้ำทั้งหมด</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm">
            <div className="text-xs text-emerald-600 font-bold flex items-center gap-1"><CheckCircle size={14} /> ใช้งานปกติ</div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.active}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm">
            <div className="text-xs text-amber-600 font-bold flex items-center gap-1"><AlertTriangle size={14} /> ค้างชำระ</div>
            <div className="text-2xl font-extrabold text-amber-700 mt-1">{stats.overdue}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-red-200 shadow-sm">
            <div className="text-xs text-red-600 font-bold flex items-center gap-1"><PowerOff size={14} /> ตัดมิเตอร์</div>
            <div className="text-2xl font-extrabold text-red-700 mt-1">{stats.cutoff}</div>
          </div>
        </div>

        {/* แถบค้นหาและตัวกรองสถานะ */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm mb-5 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา บ้านเลขที่ / เลขมิเตอร์ / ชื่อ-นามสกุล / เบอร์โทร..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { code: 'ALL', label: 'ทั้งหมด' },
              { code: 'ACTIVE', label: 'ใช้งาน' },
              { code: 'INACTIVE', label: 'ไม่ใช้งาน' },
              { code: 'PAID', label: 'ชำระแล้ว' },
              { code: 'OVERDUE', label: 'ค้างชำระ' },
              { code: 'CUT_OFF', label: 'ตัดมิเตอร์' }
            ].map((tab) => (
              <button
                key={tab.code}
                onClick={() => setStatusFilter(tab.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                  statusFilter === tab.code ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* แสดงผลตามโหมด: แผนที่รวมรัศมี 1,000 เมตร หรือ การ์ดรายชื่อ */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">กำลังโหลดข้อมูลผู้ใช้น้ำ...</div>
        ) : viewMode === 'MAP' ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-3 text-xs">
              <div className="font-bold text-slate-700">
                แผนที่ตำแหน่งมิเตอร์น้ำประปา (รัศมีการมองเห็น 1,000 เมตร)
              </div>
              <div className="flex flex-wrap gap-3 text-slate-600 font-semibold">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> ใช้งานปกติ</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> ค้างชำระ</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> ตัดมิเตอร์</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-500 inline-block"></span> ไม่ใช้งาน</span>
              </div>
            </div>
            <WaterMeterMap
              mode="view"
              meters={filteredMeters}
              radiusMeters={1000}
              height="520px"
            />
          </div>
        ) : filteredMeters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
            ยังไม่มีรายชื่อผู้ใช้น้ำประปาในเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeters.map((item) => {
              const mStatus = METER_STATUS_MAP[item.meter_status] || METER_STATUS_MAP.ACTIVE;
              const pStatus = PAYMENT_STATUS_MAP[item.payment_status] || PAYMENT_STATUS_MAP.PAID;
              return (
                <div key={item.meter_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="text-xs font-mono font-extrabold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                        มิเตอร์: {item.meter_code}
                      </span>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${mStatus.bg} ${mStatus.text}`}>{mStatus.label}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${pStatus.bg} ${pStatus.text}`}>{pStatus.label}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 items-center mb-3">
                      <img src={item.member_image} alt={item.full_name} className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">{item.full_name}</div>
                        <div className="text-xs text-slate-600 font-semibold">บ้านเลขที่ {item.house_no}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone size={12} /> {item.phone || '-'}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg mb-3 leading-relaxed">
                      {item.full_address}
                    </div>

                    {item.meter_photo_url && (
                      <div className="mb-3">
                        <img src={item.meter_photo_url} alt="Meter" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center gap-2">
                    {item.latitude && item.longitude ? (
                      <a
                        href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <MapPin size={14} /> เปิดแผนที่มิเตอร์
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">ยังไม่ปักหมุด GPS</span>
                    )}
                    <div className="flex gap-1.5">
                      <button onClick={() => openEditModal(item)} className="p-2 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded-lg" title="แก้ไข">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg" title="ลบ">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Modal เพิ่ม / แก้ไข ผู้ใช้น้ำประปา + แผนที่ปักหมุดรัศมี 1,000 เมตร */}
      {/* ================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Droplets size={18} /> {editingMeter ? 'แก้ไขข้อมูลผู้ใช้น้ำประปา' : 'เพิ่มผู้ใช้น้ำประปาใหม่'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {!editingMeter && (
                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">1. เลือกบ้านเลขที่ในหมู่บ้าน *</label>
                    <select
                      required
                      value={form.household_id}
                      onChange={(e) => setForm({ ...form, household_id: e.target.value, member_id: '' })}
                      className="w-full p-2.5 border border-blue-200 rounded-lg text-sm bg-white"
                    >
                      <option value="">-- เลือกบ้านเลขที่ ({households.length} หลังคาเรือน) --</option>
                      {households.map((h) => (
                        <option key={h.household_id} value={h.household_id}>
                          บ้านเลขที่ {h.house_no} ({h.members.length} คน)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">2. เลือกชื่อผู้ใช้น้ำในบ้าน *</label>
                    <select
                      required
                      disabled={!selectedHouse}
                      value={form.member_id}
                      onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                      className="w-full p-2.5 border border-blue-200 rounded-lg text-sm bg-white disabled:bg-slate-100"
                    >
                      <option value="">-- เลือกรายชื่อสมาชิกในบ้าน --</option>
                      {selectedHouse?.members?.map((m) => (
                        <option key={m.member_id} value={m.member_id}>
                          {m.full_name} {m.relationship ? `(${m.relationship})` : ''} {m.phone ? `• ${m.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedMember && (
                    <div className="flex gap-3 items-center bg-white p-2.5 rounded-lg border border-blue-100">
                      <img src={selectedMember.member_image} alt="" className="w-12 h-12 rounded-lg object-cover border" />
                      <div className="text-xs text-slate-600">
                        <div className="font-bold text-slate-800">{selectedMember.full_name}</div>
                        <div>เบอร์โทร: {selectedMember.phone || '-'}</div>
                        <div className="text-[11px] text-slate-500">{selectedHouse.full_address}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เลขมิเตอร์น้ำ *</label>
                  <input
                    required
                    type="text"
                    placeholder="เช่น WM-001"
                    value={form.meter_code}
                    onChange={(e) => setForm({ ...form, meter_code: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เลขมิเตอร์ตั้งต้น (หน่วย)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.last_meter_reading}
                    onChange={(e) => setForm({ ...form, last_meter_reading: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สถานะมิเตอร์</label>
                  <select
                    value={form.meter_status}
                    onChange={(e) => setForm({ ...form, meter_status: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="ACTIVE">ใช้งาน</option>
                    <option value="INACTIVE">ไม่ใช้งาน</option>
                    <option value="CUT_OFF">ตัดมิเตอร์</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สถานะการชำระเงิน</label>
                  <select
                    value={form.payment_status}
                    onChange={(e) => setForm({ ...form, payment_status: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="PAID">ชำระแล้ว</option>
                    <option value="OVERDUE">ค้างชำระ</option>
                  </select>
                </div>
              </div>

              {/* ปักหมุดแผนที่ Google Maps รัศมี 1,000 เมตร */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1"><MapPin size={14} /> พิกัดแผนที่มิเตอร์</label>
                  <button type="button" onClick={handleGetGPS} className="text-xs font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-emerald-700">
                    <Navigation size={12} /> ดึงพิกัด GPS ปัจจุบัน
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="p-2 border border-slate-300 rounded-lg text-xs font-mono bg-white" />
                  <input type="text" placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="p-2 border border-slate-300 rounded-lg text-xs font-mono bg-white" />
                </div>

                <WaterMeterMap
                  mode="pick"
                  lat={form.latitude}
                  lng={form.longitude}
                  radiusMeters={1000}
                  height="250px"
                  onSelectLocation={(newLat, newLng) =>
                    setForm((prev) => ({ ...prev, latitude: newLat, longitude: newLng }))
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ภาพถ่ายมิเตอร์น้ำ</label>
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 text-sm text-slate-600">
                  <Camera size={18} /> ถ่ายภาพ / เลือกรูปภาพมิเตอร์
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                </label>
                {form.meter_photo_url && (
                  <img src={form.meter_photo_url} alt="Meter Preview" className="mt-2 w-full h-36 object-cover rounded-xl border" />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ</label>
                <input type="text" placeholder="เช่น จุดติดตั้งหน้าบ้าน / ค้างชำระ 2 เดือน" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex gap-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 text-sm">ยกเลิก</button>
              <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-blue-700">
                <Save size={16} /> {submitting ? 'กำลังบันทึก...' : 'บันทึกผู้ใช้น้ำ'}
              </button>
            </div>
          </form>
        </div>
      )}

      <BottomNavbar />
    </div>
  );
};

export default WaterUsers;