import React, { useState } from 'react';
import { Database, Activity, Search, Server, ArrowRight, Table2, Layers, Filter } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; // ปรับ Path ให้ตรงกับของคุณ

// 🌟 ข้อมูลจำลอง API เพื่อแสดงความเชื่อมโยง (คุณสามารถเพิ่ม API อื่นๆ เข้าไปใน Array นี้ได้)
const apiData = [
  {
    id: 1,
    group: 'Authentication',
    method: 'POST',
    endpoint: '/api/login',
    description: 'ระบบเข้าสู่ระบบ, ตรวจสอบสิทธิ์ และดึงข้อมูล Profile/พื้นที่/ตำแหน่ง เพื่อจัดเตรียม Session',
    tables: [
      { name: 'user_accounts', action: 'READ', columns: ['account_id', 'username_phone', 'password_hash', 'is_active', 'role', 'village_id', 'occupation_id'] },
      { name: 'user_profiles', action: 'READ', columns: ['first_name', 'last_name', 'citizen_id', 'dob', 'gender'] },
      { name: 'villages', action: 'READ', columns: ['village_name', 'tambon_id', 'headman_account_id'] },
      { name: 'user_positions', action: 'READ', columns: ['position_id', 'start_date', 'end_date'] },
      { name: 'sys_tambons', action: 'READ', columns: ['tambon_name_th'] }
    ]
  },
  {
    id: 2,
    group: 'Registration',
    method: 'POST',
    endpoint: '/api/villages/register',
    description: 'ลงทะเบียนหมู่บ้านใหม่ พร้อมสร้างบัญชีผู้ใหญ่บ้าน และผูกความสัมพันธ์พื้นที่',
    tables: [
      { name: 'villages', action: 'INSERT', columns: ['village_id', 'village_no', 'village_name', 'tambon_id', 'headman_lat', 'headman_lng'] },
      { name: 'user_profiles', action: 'INSERT', columns: ['profile_id', 'first_name', 'last_name', 'nickname', 'citizen_id', 'dob'] },
      { name: 'user_accounts', action: 'INSERT', columns: ['account_id', 'username_phone', 'password_hash', 'profile_id', 'village_id', 'referrer_id', 'role'] },
      { name: 'village_committees', action: 'INSERT', columns: ['committee_id', 'village_id', 'account_id', 'position_name'] },
      { name: 'user_positions', action: 'INSERT', columns: ['account_id', 'position_id', 'scope_type', 'scope_id', 'start_date'] }
    ]
  },
  {
    id: 3,
    group: 'Population',
    method: 'POST',
    endpoint: '/api/household-members',
    description: 'เพิ่มรายชื่อประชากรเข้าบ้านเลขที่ (มีระบบป้องกันเลขบัตร ปชช. / พาสปอร์ต ซ้ำซ้อน)',
    tables: [
      { name: 'household_members', action: 'INSERT', columns: ['household_id', 'citizen_id', 'passport_no', 'first_name', 'resident_type', 'status'] },
      { name: 'household_members', action: 'READ', columns: ['citizen_id', 'passport_no', 'household_id'] }
    ]
  },


  // 👇 เพิ่มอันนี้เข้าไปสำหรับการค้นหา app.get('/api/users')
  {
    id: 4,
    group: 'Users',
    method: 'GET',
    endpoint: '/api/users',
    description: 'ดึงข้อมูลผู้ใช้งานทั้งหมดในระบบ',
    tables: [
      { name: 'user_accounts', action: 'READ', columns: ['account_id', 'username_phone', 'role'] }
    ]
  },
  
  // 👇 เพิ่มอันนี้เข้าไปสำหรับการค้นหา app.put('/api/community-places/:id')
  {
    id: 5,
    group: 'Community',
    method: 'PUT',
    endpoint: '/api/community-places/:id',
    description: 'แก้ไขข้อมูลสถานที่สำคัญในชุมชน',
    tables: [
      { name: 'community_places', action: 'UPDATE', columns: ['place_name', 'latitude', 'longitude'] }
    ]
  }


  
];

const getMethodColor = (method) => {
  switch (method) {
    case 'GET': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'POST': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'PUT': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getActionColor = (action) => {
  switch (action) {
    case 'INSERT': return 'text-emerald-600 bg-emerald-50';
    case 'UPDATE': return 'text-amber-600 bg-amber-50';
    case 'READ': return 'text-blue-600 bg-blue-50';
    case 'DELETE': return 'text-red-600 bg-red-50';
    default: return 'text-slate-600 bg-slate-50';
  }
};

const ApiTracker = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');

  const groups = ['All', ...new Set(apiData.map(api => api.group))];

const filteredApi = apiData.filter(api => {
    // 🌟 ทำความสะอาดคำค้นหา (ให้รองรับการก๊อปปี้ app.post('...') มาวางได้เลย)
    const cleanSearch = searchTerm
      .toLowerCase()
      .replace(/app\.(post|get|put|delete|patch)\(/g, '') // ตัดคำว่า app.post(, app.get( ออก
      .replace(/['"`)]/g, '') // ตัดเครื่องหมายคำพูด ' " และวงเล็บปิด ) ออก
      .trim();

    const matchesSearch = api.endpoint.toLowerCase().includes(cleanSearch) || 
                          cleanSearch.includes(api.endpoint.toLowerCase()) ||
                          api.description.toLowerCase().includes(cleanSearch);
                          
    const matchesGroup = filterGroup === 'All' || api.group === filterGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <TopNavbar />
      
      <div className="max-w-6xl mx-auto px-4 pt-[100px]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white mb-6 shadow-lg flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Server size={28} className="text-emerald-400" />
              API & Database Flow Tracker
            </h1>
            <p className="text-slate-300 text-sm mt-2">ศูนย์รวมแผนผังการทำงานของ API และความสัมพันธ์ของตารางฐานข้อมูล</p>
          </div>
          <Activity size={48} className="text-slate-700 opacity-50" />
        </div>

        {/* Tools (Search & Filter) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="ค้นหา Endpoint หรือ คำอธิบาย..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-slate-400" />
            <select 
              className="py-2.5 px-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white min-w-[150px]"
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
            >
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {/* API List */}
        <div className="space-y-6">
          {filteredApi.map((api) => (
            <div key={api.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* API Endpoint Header */}
              <div className="border-b border-slate-100 p-5 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className={`px-3 py-1 rounded-md text-xs font-bold border ${getMethodColor(api.method)}`}>
                    {api.method}
                  </span>
                  <div>
                    <h3 className="font-mono text-lg font-bold text-slate-800">{api.endpoint}</h3>
                    <p className="text-sm text-slate-500 mt-1">{api.description}</p>
                  </div>
                </div>
                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 w-fit">
                  <Layers size={12} /> {api.group}
                </span>
              </div>

              {/* Database Interaction Mapping */}
              <div className="p-5">
                <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Database size={16} className="text-blue-500" /> ตารางที่ได้รับผลกระทบ (Tables Affected)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {api.tables.map((table, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all bg-white">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                        <strong className="flex items-center gap-2 text-sm text-slate-800">
                          <Table2 size={16} className="text-slate-400" /> {table.name}
                        </strong>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getActionColor(table.action)} border-current`}>
                          {table.action}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {table.columns.map((col, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-2 text-xs text-slate-600 font-mono">
                            <ArrowRight size={12} className="text-slate-300" /> {col}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          
          {filteredApi.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Database size={48} className="mx-auto text-slate-300 mb-3" />
              <p>ไม่พบ API ที่ค้นหา</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiTracker;