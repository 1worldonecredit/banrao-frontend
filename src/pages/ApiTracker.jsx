import React, { useState } from 'react';
import { Database, Activity, Search, Server, ArrowRight, Table2, Layers, Filter, Code, Play } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; // ปรับ Path ให้ตรงกับโปรเจกต์ของคุณ

// ข้อมูลจำลองพื้นฐาน
const apiData = [
  {
    id: 1,
    group: 'Authentication',
    method: 'POST',
    endpoint: '/api/login',
    description: 'ระบบเข้าสู่ระบบ, ตรวจสอบสิทธิ์ และจัดเตรียม Session',
    tables: [
      { name: 'user_accounts', action: 'READ', columns: ['account_id', 'username_phone', 'role', 'village_id'] },
      { name: 'user_profiles', action: 'READ', columns: ['first_name', 'last_name'] }
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
    case 'INSERT': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'UPDATE': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'READ': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'DELETE': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-slate-600 bg-slate-50';
  }
};

const ApiTracker = () => {
  const [mode, setMode] = useState('search'); // 'search' หรือ 'analyze'
  const [searchTerm, setSearchTerm] = useState('');
  const [rawCode, setRawCode] = useState('');
  const [analyzedApi, setAnalyzedApi] = useState(null);

  // ฟังก์ชันวิเคราะห์โค้ดอัตโนมัติ (อ่าน SQL จากข้อความ)
  const handleAnalyzeCode = () => {
    if (!rawCode) return;
    try {
      // 1. หา Method และ Endpoint
      const routeMatch = rawCode.match(/app\.(get|post|put|delete|patch)\s*\(\s*['"`](.*?)['"`]/i);
      if (!routeMatch) {
        alert('ไม่พบรูปแบบ API (เช่น app.get, app.post) ในโค้ดนี้ครับ ลองวางให้ครบถ้วน');
        return;
      }

      const method = routeMatch[1].toUpperCase();
      const endpoint = routeMatch[2];

      let tablesMap = new Map();

      // 2. วิเคราะห์คำสั่ง SQL พื้นฐาน
      const addTable = (regex, action) => {
        const matches = [...rawCode.matchAll(regex)];
        matches.forEach(m => {
          const tableName = m[1].toLowerCase().trim();
          if (!['where', 'select', 'order', 'group', 'by'].includes(tableName)) {
            const key = `${tableName}-${action}`;
            if (!tablesMap.has(key)) {
              tablesMap.set(key, { name: tableName, action: action, columns: ['ตรวจพบจากการใช้คำสั่ง SQL'] });
            }
          }
        });
      };

      addTable(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/gi, 'INSERT');
      addTable(/UPDATE\s+([a-zA-Z0-9_]+)/gi, 'UPDATE');
      addTable(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)/gi, 'DELETE');
      addTable(/(?:FROM|JOIN)\s+([a-zA-Z0-9_]+)/gi, 'READ');

      setAnalyzedApi({
        id: 'auto-gen',
        group: 'Auto Analyzed',
        method,
        endpoint,
        description: 'ผลการวิเคราะห์ตารางฐานข้อมูลที่เกี่ยวข้องแบบอัตโนมัติ (อิงจากคำสั่ง SQL ในโค้ด)',
        tables: Array.from(tablesMap.values())
      });
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการวิเคราะห์โค้ด');
    }
  };

  const cleanSearch = searchTerm.toLowerCase().replace(/app\.(post|get|put|delete|patch)\(/g, '').replace(/['"`)]/g, '').trim();
  const filteredApi = apiData.filter(api => 
    api.endpoint.toLowerCase().includes(cleanSearch) || api.description.toLowerCase().includes(cleanSearch)
  );

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
            <p className="text-slate-300 text-sm mt-2">ศูนย์รวมแผนผังการทำงาน และเครื่องมือวิเคราะห์โค้ด API อัตโนมัติ</p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => setMode('search')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${mode === 'search' ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            <Search size={20} /> ค้นหา API ที่บันทึกไว้
          </button>
          <button 
            onClick={() => setMode('analyze')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${mode === 'analyze' ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            <Code size={20} /> วางโค้ดเพื่อวิเคราะห์ (Smart Analyze)
          </button>
        </div>

        {/* 🌟 โหมดที่ 1: วิเคราะห์โค้ด (Smart Analyze) */}
        {mode === 'analyze' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <label className="block text-slate-700 font-bold mb-2 flex items-center gap-2">
                <Code size={18} /> วางโค้ด API ทั้งก้อนลงในช่องนี้:
              </label>
              <textarea 
                className="w-full h-[200px] p-4 font-mono text-sm bg-slate-900 text-emerald-400 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`app.post('/api/example', async (req, res) => {\n  const result = await client.query('INSERT INTO user_accounts...');\n  res.json({ success: true });\n});`}
                value={rawCode}
                onChange={(e) => setRawCode(e.target.value)}
              ></textarea>
              <button 
                onClick={handleAnalyzeCode}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all w-full md:w-auto justify-center"
              >
                <Play size={18} /> เริ่มการวิเคราะห์
              </button>
            </div>

            {/* แสดงผลลัพธ์การวิเคราะห์ */}
            {analyzedApi && (
              <div className="bg-white rounded-2xl shadow-md border-2 border-blue-200 overflow-hidden">
                <div className="border-b border-blue-100 p-5 bg-blue-50 flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className={`px-3 py-1 rounded-md text-xs font-bold border ${getMethodColor(analyzedApi.method)}`}>
                      {analyzedApi.method}
                    </span>
                    <div>
                      <h3 className="font-mono text-lg font-bold text-slate-800">{analyzedApi.endpoint}</h3>
                      <p className="text-sm text-blue-600 mt-1 font-semibold">{analyzedApi.description}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Database size={16} className="text-blue-500" /> ตารางที่ตรวจพบในคำสั่ง SQL
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analyzedApi.tables.map((table, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                          <strong className="flex items-center gap-2 text-sm text-slate-800">
                            <Table2 size={16} className="text-slate-400" /> {table.name}
                          </strong>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getActionColor(table.action)}`}>
                            {table.action}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono italic">ตรวจพบจากคำสั่ง {table.action}</p>
                      </div>
                    ))}
                    {analyzedApi.tables.length === 0 && (
                      <p className="text-sm text-slate-500 col-span-full">ไม่พบคำสั่ง SQL ภายในโค้ดนี้</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🌟 โหมดที่ 2: ค้นหาปกติ (เหมือนเดิม) */}
        {mode === 'search' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center relative">
              <Search className="absolute left-7 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="ค้นหา Endpoint หรือวางโค้ดสั้นๆ (เช่น app.get('/api/login'))..." 
                className="w-full pl-12 pr-4 py-2.5 rounded-lg border-none focus:ring-0 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {filteredApi.map((api) => (
              <div key={api.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-100 p-5 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className={`px-3 py-1 rounded-md text-xs font-bold border ${getMethodColor(api.method)}`}>
                      {api.method}
                    </span>
                    <div>
                      <h3 className="font-mono text-lg font-bold text-slate-800">{api.endpoint}</h3>
                      <p className="text-sm text-slate-500 mt-1">{api.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default ApiTracker;