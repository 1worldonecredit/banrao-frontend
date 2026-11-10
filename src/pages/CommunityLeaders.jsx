import React, { useState, useEffect } from 'react';
import { Users, Calendar, Edit, Camera, Save, X, UserPlus, Search, Plus } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

// ==========================================
// 🌟 1. Component ก้อน Node (สำหรับวาดกล่องทีละกล่องแบบ Mind Map)
// ==========================================
const OrgNode = ({ node, onAddNode, onEditNode, onDeleteNode }) => {
  // เช็คว่า Node นี้มีข้อมูลบุคคลอยู่หรือไม่
  const hasUser = !!node.account_id;

  return (
    <div className="flex flex-col items-center">
      {/* 🌟 ตัวกล่องข้อมูล (Card) */}
      <div className="relative group m-2 mt-4">
        <div className="bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all rounded-2xl p-4 w-56 md:w-64 flex flex-col items-center z-10 relative overflow-hidden">
          
          {/* แถบสีด้านบนกล่อง */}
          <div className={`absolute top-0 left-0 w-full h-1.5 ${node.isRoot ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}></div>
          
          <img 
            src={node.user_image || '/profile-img.jpg'} 
            alt="Profile" 
            className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover border-2 border-slate-100 shadow-sm mt-2 mb-3"
          />
          
          <span className="text-[10px] md:text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-1 text-center w-full truncate">
            {node.role_name || 'ตำแหน่งใหม่'}
          </span>
          <h3 className="font-bold text-slate-800 text-xs md:text-sm truncate w-full text-center">
            {hasUser ? `${node.first_name} ${node.last_name}` : 'คลิกเพื่อระบุบุคลากร'}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1 truncate w-full text-center line-clamp-2">
            {node.responsibilities || 'ยังไม่ระบุหน้าที่รับผิดชอบ'}
          </p>

          {/* 🌟 ชุดปุ่มจัดการ (โชว์ตอนเอาเมาส์ชี้) */}
          <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
             {/* ปุ่มแก้ไข: โชว์เสมอ ไม่ว่าจะมีคนหรือไม่มี เพื่อแก้ไขชื่อตำแหน่งได้ */}
             <button onClick={() => onEditNode(node)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors" title="แก้ไขข้อมูล">
               <Edit size={14} />
             </button>
             
             {/* ปุ่มลบ: โชว์เฉพาะถ้ามีข้อมูลบุคคล หรือไม่ใช่ Root (ผู้ใหญ่บ้านลบไม่ได้) */}
             {(!node.isRoot && hasUser) && (
               <button onClick={() => onDeleteNode(node)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors mt-1" title="ลบบุคลากรออกจากตำแหน่ง">
                 <Trash2 size={14} /> {/* 🛠 อย่าลืม import Trash2 จาก lucide-react ด้วยนะครับ */}
               </button>
             )}
          </div>
        </div>

        {/* 🌟 ปุ่มเพิ่ม/แก้ไข (ด้านล่างกล่อง) */}
        {hasUser ? (
           // ถ้ามีคนแล้ว ปุ่มข้างล่างจะเป็นปุ่มเพิ่มลูกน้อง
           <button onClick={() => onAddNode(node, 'child')} className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 hover:bg-emerald-600 transition-all z-20" title="เพิ่มผู้ใต้บังคับบัญชา / ทีมย่อย">
             <Plus size={14} />
           </button>
        ) : (
           // ถ้ายังไม่มีคน ปุ่มตรงกลางจะเป็นปุ่มแก้ไข (Edit) แทนการเพิ่ม
           <button onClick={() => onEditNode(node)} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white rounded-full p-3 shadow-lg opacity-0 group-hover:opacity-100 hover:bg-blue-600 transition-all z-20" title="เพิ่มข้อมูลบุคลากร">
             <Edit size={20} />
           </button>
        )}
        
        {/* ปุ่มเพิ่มซ้าย/ขวา (ถ้าไม่ใช่ Root) */}
        {!node.isRoot && (
           <>
             <button onClick={() => onAddNode(node, 'left')} className="absolute top-1/2 -left-3 transform -translate-y-1/2 bg-slate-400 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 hover:bg-blue-500 transition-all z-20" title="เพิ่มทีมงานระดับเดียวกัน">
               <Plus size={12} />
             </button>
             <button onClick={() => onAddNode(node, 'right')} className="absolute top-1/2 -right-3 transform -translate-y-1/2 bg-slate-400 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 hover:bg-blue-500 transition-all z-20" title="เพิ่มทีมงานระดับเดียวกัน">
               <Plus size={12} />
             </button>
           </>
        )}
      </div>

      {/* 🌟 วาดเส้นและลูกหลาน */}
      {node.children && node.children.length > 0 && (
        <div className="flex flex-col items-center w-full">
          <div className="w-px h-6 bg-slate-300"></div>
          <div className="flex justify-center relative pt-4 border-t-2 border-slate-300 gap-4 md:gap-8 px-4">
            {node.children.map((child, index) => (
              <div key={child.id || index} className="relative flex flex-col items-center">
                <div className="absolute top-0 w-px h-4 bg-slate-300 -mt-4"></div>
                <OrgNode node={child} onAddNode={onAddNode} onEditNode={onEditNode} onDeleteNode={onDeleteNode} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


// ==========================================
// 🌟 2. Main Component (หน้าหลัก)
// ==========================================
const CommunityLeaders = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const villageId = userData.village_id || 1; 
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 
  const [orgTree, setOrgTree] = useState(null); // เก็บข้อมูลแบบต้นไม้ (Mind Map)
  
  // State สำหรับ Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null); 
  const [searchCitizenId, setSearchCitizenId] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    role_name: '',
    account_id: '',
    start_date: '',
    end_date: '',
    responsibilities: '',
    previewUrl: '/profile-img.jpg',
    image_file: null
  });

  // 🌟 ดึงข้อมูลและสร้าง Tree แบบง่ายๆ (ให้ทุกคนอยู่ใต้ผู้ใหญ่บ้าน)
  const fetchLeaders = async (dateQuery = '') => {
    try {
      const url = `${API_URL}/api/community-leaders/${villageId}${dateQuery ? `?term_date=${dateQuery}` : ''}`;
      const res = await fetch(url);
      const result = await res.json();
      
      if (result.success && result.data.length > 0) {
        
        // 1. หาคนที่เป็นผู้ใหญ่บ้านมาตั้งเป็น Root
        let rootNode = result.data.find(l => l.position_name?.includes('ผู้ใหญ่บ้าน'));
        
        // 2. ถ้าไม่มีผู้ใหญ่บ้าน ให้เอาคนแรกสุดที่ดึงมาได้เป็น Root แทนชั่วคราว
        if (!rootNode) {
             rootNode = result.data[0];
        }

        // 3. กรองเอา Root ออกจากรายชื่อที่เหลือ เพื่อเอาไปทำเป็นกล่องลูก
        const childrenList = result.data.filter(l => l.position_record_id !== rootNode.position_record_id);

        // 4. แปลงข้อมูลให้อยู่ในรูปแบบที่ OrgNode นำไปใช้แสดงผลได้
        const childrenNodes = childrenList.map(l => ({
            ...l, 
            id: l.position_record_id,
            role_name: l.position_name,
            userName: `${l.first_name} ${l.last_name}`
        }));
        
        // 5. ประกอบร่างเป็น Tree กลับไปเซ็ตค่าให้ orgTree
        setOrgTree({
            ...rootNode,
            isRoot: true,
            id: rootNode.position_record_id,
            role_name: rootNode.position_name || 'ผู้ใหญ่บ้าน',
            userName: `${rootNode.first_name} ${rootNode.last_name}`,
            children: childrenNodes
        });
      } else {
        // กรณีไม่มีข้อมูลเลย ให้สร้างกล่องว่างรอไว้
        setOrgTree({
            isRoot: true, role_name: 'ผู้ใหญ่บ้าน', id: 'root-0', children: []
        });
      }
    } catch (error) {
      console.error("Error fetching leaders:", error);
    }
  };

  useEffect(() => {
    fetchLeaders(selectedDate);
  }, []);

  const handleDateSearch = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    fetchLeaders(date);
  };

  // ฟังก์ชันจัดรูปแบบเลขบัตรประชาชน (เพิ่มขีดอัตโนมัติ)
  const formatCitizenId = (value) => {
    // ลบตัวอักษรที่ไม่ใช่ตัวเลขออกให้หมด
    const numbers = value.replace(/\D/g, '');
    
    // จัดกลุ่มตัวเลขและเติมขีด
    let formatted = '';
    if (numbers.length > 0) formatted += numbers.substring(0, 1);
    if (numbers.length > 1) formatted += '-' + numbers.substring(1, 5);
    if (numbers.length > 5) formatted += '-' + numbers.substring(5, 10);
    if (numbers.length > 10) formatted += '-' + numbers.substring(10, 12);
    if (numbers.length > 12) formatted += '-' + numbers.substring(12, 13);
    
    return formatted;
  };

  // ฟังก์ชันจัดการการพิมพ์ในช่องค้นหา
  const handleCitizenIdChange = (e) => {
    const formatted = formatCitizenId(e.target.value);
    setSearchCitizenId(formatted);
  };

  // 🌟 ฟังก์ชันค้นหาลูกบ้าน
  const handleSearchUser = async () => {
    // 1. นำขีดออกก่อนเพื่อตรวจสอบความยาวที่แท้จริงของตัวเลข
    const rawCitizenId = searchCitizenId.replace(/-/g, ''); 

    // 2. ตรวจสอบความยาวโดยใช้ rawCitizenId ที่ไม่มีขีดแล้ว
    if (rawCitizenId.length !== 13) return alert("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก");
    
    setIsLoading(true);
    try {
        // 3. ส่ง rawCitizenId (ตัวเลขล้วน) ไปยัง API
        const res = await fetch(`${API_URL}/api/search-citizen/${rawCitizenId}`);
        const result = await res.json();
        
        // ... (ส่วนที่เหลือของฟังก์ชันคงเดิม) ...
        if (result.success) {
            setFoundUser(result.data);
            setFormData(prev => ({
                ...prev, 
                account_id: result.data.account_id, 
                previewUrl: result.data.user_image || '/profile-img.jpg',
                responsibilities: result.data.responsibilities || prev.responsibilities
            }));
        } else {
            alert(result.message || 'ไม่พบข้อมูลลูกบ้าน');
            setFoundUser(null);
        }
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
        setIsLoading(false);
    }
  };

  // 🌟 ฟังก์ชันจัดการปุ่ม (+) และปุ่ม (แก้ไข) บนกล่อง
  const handleAddNode = (parentNode, direction) => {
    setEditingSlot({ isNew: true, parentNode, direction });
    setFormData({ role_name: '', account_id: '', start_date: new Date().toISOString().split('T')[0], end_date: '', responsibilities: '', previewUrl: '/profile-img.jpg', image_file: null });
    setFoundUser(null);
    setSearchCitizenId('');
    setIsModalOpen(true);
  };

  const handleEditNode = (node) => {
    setEditingSlot({ isNew: false, recordId: node.position_record_id || node.id });
    setFormData({
      role_name: node.role_name,
      account_id: node.account_id,
      start_date: node.start_date ? node.start_date.split('T')[0] : '',
      end_date: node.end_date ? node.end_date.split('T')[0] : '',
      responsibilities: node.responsibilities || '',
      previewUrl: node.user_image || '/profile-img.jpg',
      image_file: null
    });
    setFoundUser({
      first_name: node.first_name,
      last_name: node.last_name,
      village_name: node.village_name || userData.villageName,
      tambon_name_th: node.tambon_name_th || userData.tambonName
    });
    setIsModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setFormData({ ...formData, image_file: file, previewUrl: URL.createObjectURL(file) });
  };

  // 🌟 บันทึกข้อมูล
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.account_id) return alert("กรุณาระบุบุคลากร");
    if (!formData.role_name) return alert("กรุณาระบุชื่อตำแหน่ง/โครงการ");

    try {
      const payload = {
        village_id: villageId,
        position_id: 12, // 🛠 กำหนด ID กลางสำหรับตำแหน่งที่เพิ่มแบบ Dynamic
        position_name: formData.role_name, // 🛠 ส่งชื่อที่พิมพ์เองไปให้ Backend
        account_id: formData.account_id,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        responsibilities: formData.responsibilities
      };

      const url = editingSlot.isNew ? `${API_URL}/api/community-leaders` : `${API_URL}/api/community-leaders/${editingSlot.recordId}`;
      const method = editingSlot.isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      if (result.success) {
        alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
        setIsModalOpen(false);
        fetchLeaders(selectedDate); // โหลดผังใหม่ทั้งหมด
      } else {
        alert('บันทึกไม่สำเร็จ: ' + result.message);
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      <TopNavbar userData={userData} />
      
      <div className="max-w-7xl mx-auto p-4 pt-20">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-8 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><Users size={24} /></div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800">ทำเนียบผู้นำและคณะทำงาน</h1>
              <p className="text-sm text-slate-500">หมู่บ้านของคุณ</p>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Calendar size={18} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-700">ดูวาระ ณ วันที่:</span>
           <input 
    type="text" 
    maxLength="17" // 🛠 เปลี่ยนจาก 13 เป็น 17 เพื่อเผื่อที่ให้ขีด (13 ตัวเลข + 4 ขีด)
    value={searchCitizenId} 
    onChange={handleCitizenIdChange} // 🌟 เรียกใช้ฟังก์ชันที่สร้างใหม่
    placeholder="X-XXXX-XXXXX-XX-X" // 🌟 แนะนำรูปแบบให้ผู้ใช้เห็น
    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider" // 🌟 เพิ่ม font-mono tracking-wider ให้ตัวเลขดูชัดเจนขึ้น
  />
          </div>
        </div>

        {/* 🌟 วาดผังองค์กรแบบ MIND MAP (กล่องเดียวแตกสาขา) */}
        <div className="relative py-10 overflow-x-auto flex justify-center min-w-max md:min-w-full">
          {orgTree && (
            <OrgNode 
              node={orgTree} 
              onAddNode={handleAddNode} 
              onEditNode={handleEditNode} 
            />
          )}
        </div>
      </div>

      {/* 🌟 Modal เพิ่ม/แก้ไข 🌟 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
            
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {editingSlot?.isNew ? <UserPlus size={20} /> : <Edit size={20} />} 
                {editingSlot?.isNew ? 'เพิ่มคณะทำงาน/ตำแหน่งใหม่' : 'แก้ไขข้อมูล'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:text-blue-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              
              {/* 🌟 พิมพ์ชื่อตำแหน่งหรือชื่อโครงการได้อิสระเลย */}
              <div className="mb-6 text-center">
                 <label className="text-sm font-bold text-slate-700 block mb-1">ชื่อตำแหน่ง / ชื่อคณะทำงาน *</label>
                 <input 
                   type="text" 
                   required
                   value={formData.role_name} 
                   onChange={e => setFormData({...formData, role_name: e.target.value})}
                   placeholder="เช่น ประธานธนาคารชุมชน, อสม...." 
                   className="w-full text-center p-2.5 border-b-2 border-blue-500 bg-blue-50 text-blue-800 font-bold outline-none rounded-t-lg focus:bg-blue-100 transition-colors"
                 />
              </div>

             {/* โหมดเพิ่มใหม่: ช่องค้นหาด้วยเลขบัตร */}
              {editingSlot?.isNew && !foundUser && (
                <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-sm font-bold text-slate-700 mb-2">ค้นหาจากเลขบัตรประชาชน 13 หลัก</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      maxLength="17" // 🛠 สำคัญ 1: ต้องเปลี่ยน maxLength เป็น 17 เพื่อเผื่อที่ให้ขีด (-)
                      value={searchCitizenId} 
                      onChange={handleCitizenIdChange} // 🛠 สำคัญ 2: ต้องเปลี่ยน onChange มาเรียกใช้ handleCitizenIdChange
                      placeholder="X-XXXX-XXXXX-XX-X" 
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider" 
                    />
                    <button type="button" onClick={handleSearchUser} disabled={isLoading} className="bg-slate-800 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-slate-700 flex items-center gap-2 shrink-0 disabled:bg-slate-400">
                      <Search size={16} /> {isLoading ? 'ค้นหา...' : 'ค้นหา'}
                    </button>
                  </div>
                </div>
              )}

              {/* ฟอร์มกรอกรายละเอียด */}
              {(!editingSlot?.isNew || foundUser) && (
                <form id="leaderForm" onSubmit={handleSave}>
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative w-28 h-28 rounded-full border-4 border-slate-100 overflow-hidden shadow-md group cursor-pointer" onClick={() => document.getElementById('leader-img-upload').click()}>
                      <img src={formData.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>
                    {foundUser && (
                      <>
                        <h3 className="mt-3 font-bold text-slate-800 text-lg">{foundUser.first_name} {foundUser.last_name}</h3>
                        <p className="text-sm text-slate-500 text-center mt-1">
                          {foundUser.village_name || foundUser.tambon_name_th ? (
                            <>หมู่บ้าน: {foundUser.village_name || '-'} <br/> ตำบล: {foundUser.tambon_name_th || '-'}</>
                          ) : (
                            <span className="text-red-400">ไม่มีข้อมูลที่อยู่</span>
                          )}
                        </p>
                      </>
                    )}
                    <input type="file" id="leader-img-upload" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">วันที่รับตำแหน่ง *</label>
                        <input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none bg-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">วันหมดวาระ</label>
                        <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none bg-white" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">หน้าที่รับผิดชอบ</label>
                      <textarea rows="3" value={formData.responsibilities} onChange={e => setFormData({...formData, responsibilities: e.target.value})} placeholder="เช่น ดูแลความสงบเรียบร้อย..." className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none resize-none bg-white"></textarea>
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex gap-3 shrink-0">
              <button type="button" onClick={() => { setIsModalOpen(false); setFoundUser(null); setSearchCitizenId(''); }} className="flex-1 py-3 rounded-lg border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                ยกเลิก
              </button>
              <button type="submit" form="leaderForm" disabled={editingSlot?.isNew && !foundUser} className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${(editingSlot?.isNew && !foundUser) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'}`}>
                <Save size={18} /> บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
      
      <BottomNavbar />
    </div>
  );
};

export default CommunityLeaders;