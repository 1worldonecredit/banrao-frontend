import React, { useState } from 'react';
import { Database, Activity, Search, Server, ArrowRight, Table2, Layers, Code, Play, FileJson } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; 

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
  const [rawCode, setRawCode] = useState('');
  const [analyzedApi, setAnalyzedApi] = useState(null);

  const handleAnalyzeCode = () => {
    if (!rawCode) return;
    try {
      const routeMatch = rawCode.match(/app\.(get|post|put|delete|patch)\s*\(\s*['"`](.*?)['"`]/i);
      if (!routeMatch) {
        alert('ไม่พบรูปแบบ API ในโค้ดนี้ครับ');
        return;
      }

      const method = routeMatch[1].toUpperCase();
      const endpoint = routeMatch[2];

      let tablesMap = new Map();

      // วิเคราะห์ตารางเหมือนเดิม
      const addTable = (regex, action) => {
        const matches = [...rawCode.matchAll(regex)];
        matches.forEach(m => {
          const tableName = m[1].toLowerCase().trim();
          if (!['where', 'select', 'order', 'group', 'by'].includes(tableName)) {
            const key = `${tableName}-${action}`;
            if (!tablesMap.has(key)) tablesMap.set(key, { name: tableName, action: action });
          }
        });
      };

      addTable(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/gi, 'INSERT');
      addTable(/UPDATE\s+([a-zA-Z0-9_]+)/gi, 'UPDATE');
      addTable(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)/gi, 'DELETE');
      addTable(/(?:FROM|JOIN)\s+([a-zA-Z0-9_]+)/gi, 'READ');

      // 🌟 ไฮไลท์: วิเคราะห์ Response (หาตัวแปร responseData หรือ res.json)
      let responsePayload = null;
      // พยายามหาบล็อก responseData = { ... }
      const resMatch = rawCode.match(/const\s+responseData\s*=\s*({[\s\S]*?});/);
      if (resMatch) {
        responsePayload = resMatch[1];
      } else {
        // ถ้าไม่มี responseData ให้ลองหาใน res.json({ ... })
        const jsonMatch = rawCode.match(/res\.json\s*\(\s*({[\s\S]*?})\s*\)/);
        if (jsonMatch) responsePayload = jsonMatch[1];
      }

      setAnalyzedApi({
        id: 'auto-gen',
        group: 'Auto Analyzed',
        method,
        endpoint,
        description: 'ผลการวิเคราะห์โครงสร้างฐานข้อมูลและข้อมูลที่ส่งกลับไปยัง Frontend',
        tables: Array.from(tablesMap.values()),
        responsePayload: responsePayload
      });
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการวิเคราะห์โค้ด');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <TopNavbar />
      
      <div className="max-w-6xl mx-auto px-4 pt-[100px]">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white mb-6 shadow-lg flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Server size={28} className="text-emerald-400" />
              API & Frontend Link Tracker
            </h1>
            <p className="text-slate-300 text-sm mt-2">วิเคราะห์โครงสร้าง API และดูว่า Frontend จะได้รับข้อมูลอะไรกลับไปบ้าง</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <label className="block text-slate-700 font-bold mb-2 flex items-center gap-2">
              <Code size={18} /> วางโค้ด API ทั้งก้อนลงในช่องนี้ (เช่นโค้ดของ Login):
            </label>
            <textarea 
              className="w-full h-[200px] p-4 font-mono text-sm bg-slate-900 text-emerald-400 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="วางโค้ดจาก server.js..."
              value={rawCode}
              onChange={(e) => setRawCode(e.target.value)}
            ></textarea>
            <button 
              onClick={handleAnalyzeCode}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all w-full md:w-auto justify-center"
            >
              <Play size={18} /> วิเคราะห์และดึงข้อมูล Response
            </button>
          </div>

          {analyzedApi && (
            <div className="bg-white rounded-2xl shadow-md border-2 border-blue-200 overflow-hidden flex flex-col md:flex-row">
              {/* ซ้าย: โครงสร้างตาราง (ที่ได้ทำไปแล้ว) */}
              <div className="flex-1 p-5 border-r border-slate-200">
                <div className="mb-4 flex items-center gap-3">
                   <span className={`px-3 py-1 rounded-md text-xs font-bold border ${getMethodColor(analyzedApi.method)}`}>
                      {analyzedApi.method}
                   </span>
                   <h3 className="font-mono text-lg font-bold text-slate-800">{analyzedApi.endpoint}</h3>
                </div>
                <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Database size={16} className="text-blue-500" /> ตารางที่เกี่ยวข้อง
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analyzedApi.tables.map((table, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Table2 size={14} className="text-slate-400" /> {table.name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getActionColor(table.action)}`}>
                        {table.action}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ขวา: โครงสร้างข้อมูลที่ส่งให้ React (Frontend Response) */}
              <div className="flex-1 bg-slate-50 p-5">
                <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <FileJson size={16} className="text-emerald-600" /> โครงสร้างข้อมูลที่ส่งให้ React (Response Payload)
                </h4>
                {analyzedApi.responsePayload ? (
                  <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto h-[300px] overflow-y-auto shadow-inner border border-slate-700">
                    {analyzedApi.responsePayload}
                  </pre>
                ) : (
                  <p className="text-sm text-slate-500 italic">ไม่พบโครงสร้างข้อมูล (Response) ที่ชัดเจนในโค้ดชุดนี้</p>
                )}
                <div className="mt-4 p-3 bg-blue-100/50 border border-blue-200 rounded-lg text-xs text-blue-800">
                  <strong>💡 วิธีใช้งาน:</strong> ฝั่ง React คุณสามารถเรียกใช้ <code>user.ชื่อตัวแปรที่เห็นด้านบน</code> เพื่อดึงข้อมูลมาแสดงได้เลย (เช่น <code>user.tambonName</code>)
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiTracker;