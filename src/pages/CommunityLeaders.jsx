import React, { useState, useEffect } from 'react';
import { Users, Calendar, Edit, Camera, Save, X, UserPlus, Search, Plus, Trash2, FolderPlus } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

// ==========================================
// 🌟 1. Component ก้อน Node (สำหรับวาดผัง)
// ==========================================
const OrgNode = ({ node, onAddNode, onEditNode, onDeleteNode }) => {
  const hasUser = !!node.account_id;

  return (
    <div className="flex flex-col items-center">
      <div className="relative group m-1 md:m-2 mt-4">
        <div className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl p-3 md:p-4 w-36 sm:w-48 md:w-56 flex flex-col items-center z-10 relative overflow-hidden">
          
          <div className={`absolute top-0 left-0 w-full h-1 md:h-1.5 ${node.isRoot ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}></div>
          
          <img 
            src={node.user_image || '/profile-img.jpg'} 
            alt="Profile" 
            className="w-12 h-12 md:w-16 md:h-16 rounded-xl object-cover border-2 border-slate-100 shadow-sm mt-1 md:mt-2 mb-2 md:mb-3"
          />
          
          <span className="text-[9px] md:text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 md:px-3 md:py-1 rounded-full mb-1 text-center w-full truncate">
            {node.role_name || 'ตำแหน่งใหม่'}
          </span>
          <h3 className="font-bold text-slate-800 text-[11px] md:text-sm truncate w-full text-center">
            {hasUser ? `${node.first_name} ${node.last_name}` : 'คลิกระบุบุคลากร'}
          </h3>
          <p className="text-[9px] md:text-xs text-slate-500 mt-0.5 md:mt-1 truncate w-full text-center">
            {node.responsibilities || 'ยังไม่ระบุหน้าที่'}
          </p>

          <div className="absolute top-0 right-0 p-1.5 md:p-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
             <button onClick={() => onEditNode(node)} className="p-1 md:p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors" title="แก้ไขข้อมูล">
               <Edit size={12} className="md:w-3.5 md:h-3.5" />
             </button>
             {(!node.isRoot && hasUser) && (
               <button onClick={() => onDeleteNode(node)} className="p-1 md:p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors mt-1" title="ลบบุคลากรออกจากตำแหน่ง">
                 <Trash2 size={12} className="md:w-3.5 md:h-3.5" />
               </button>
             )}
          </div>
        </div>

        {hasUser ? (
           <button onClick={() => onAddNode(node, 'child')} className="absolute -bottom-2.5 md:-bottom-3 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white rounded-full p-1 md:p-1.5 shadow-md opacity-0 group-hover:opacity-100 hover:bg-emerald-600 transition-all z-20" title="เพิ่มผู้ใต้บังคับบัญชา / ทีมย่อย">
             <Plus size={12} className="md:w-3.5 md:h-3.5" />
           </button>
        ) : (
           <button onClick={() => onEditNode(node)} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white rounded-full p-2.5 md:p-3 shadow-lg opacity-0 group-hover:opacity-100 hover:bg-blue-600 transition-all z-20" title="เพิ่มข้อมูลบุคลากร">
             <Edit size={16} className="md:w-5 md:h-5" />
           </button>
        )}
        
        {!node.isRoot && (
           <>
             <button onClick={() => onAddNode(node, 'left')} className="absolute top-1/2 -left-2 md:-left-3 transform -translate-y-1/2 bg-slate-400 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 hover:bg-blue-500 transition-all z-20" title="เพิ่มทีมงานระดับเดียวกัน">
               <Plus size={10} className="md:w-3 md:h-3" />
             </button>
             <button onClick={() => onAddNode(node, 'right')} className="absolute top-1/2 -right-2 md:-right-3 transform -translate-y-1/2 bg-slate-400 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 hover:bg-blue-500 transition-all z-20" title="เพิ่มทีมงานระดับเดียวกัน">
               <Plus size={10} className="md:w-3 md:h-3" />
             </button>
           </>
        )}
      </div>

      {Array.isArray(node.children) && node.children.length > 0 && (
        <div className="flex flex-col items-center w-full">
          <div className="w-px h-4 md:h-6 bg-slate-300"></div>
          <div className="flex justify-center relative pt-4 border-t-2 border-slate-300 gap-2 sm:gap-4 md:gap-8 px-2 md:px-4">
            {node.children.map((child, index) => {
              if (!child) return null;
              return (
                <div key={child.id || index} className="relative flex flex-col items-center">
                  <div className="absolute top-0 w-px h-4 bg-slate-300 -mt-4"></div>
                  <OrgNode node={child} onAddNode={onAddNode} onEditNode={onEditNode} onDeleteNode={onDeleteNode} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 🌟 2. Main Component (เพิ่มระบบ Tabs คณะทำงาน)
// ==========================================
const CommunityLeaders = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const villageId = userData.village_id || 1; 
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 
  const [orgTree, setOrgTree] = useState(null); 
  
  // 🌟 State สำหรับระบบ Tabs (คณะทำงาน)
  const [committees, setCommittees] = useState([
    { id: 1, name: 'คณะกรรมการหมู่บ้าน', description: 'บริหารจัดการและดูแลความเรียบร้อยโดยรวมของหมู่บ้าน' },
    { id: 2, name: 'กองทุนหมู่บ้าน', description: 'บริหารจัดการเงินทุนและสินเชื่อเพื่อชุมชน' }
  ]);
  const [activeTab, setActiveTab] = useState(1);
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [committeeForm, setCommitteeForm] = useState({ name: '', description: '' });

  // State สำหรับ Modal บุคลากร
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

  const formatCitizenId = (value) => {
    const numbers = value.replace(/\D/g, '');
    let formatted = '';
    if (numbers.length > 0) formatted += numbers.substring(0, 1);
    if (numbers.length > 1) formatted += '-' + numbers.substring(1, 5);
    if (numbers.length > 5) formatted += '-' + numbers.substring(5, 10);
    if (numbers.length > 10) formatted += '-' + numbers.substring(10, 12);
    if (numbers.length > 12) formatted += '-' + numbers.substring(12, 13);
    return formatted;
  };

  const handleCitizenIdChange = (e) => {
    setSearchCitizenId(formatCitizenId(e.target.value));
  };

  const fetchLeaders = async (dateQuery = '') => {
    try {
      const url = `${API_URL}/api/community-leaders/${villageId}${dateQuery ? `?term_date=${dateQuery}` : ''}`;
      const res = await fetch(url);
      const result = await res.json();
      
      if (result.success && result.data.length > 0) {
        let rootNode = result.data.find(l => l.position_name?.includes('ผู้ใหญ่บ้าน') || l.position_name?.includes('ประธาน')) || result.data[0];
        const childrenList = result.data.filter(l => l.position_record_id !== rootNode.position_record_id);

        const childrenNodes = childrenList.map(l => ({
            ...l, 
            id: l.position_record_id,
            role_name: l.position_name,
            userName: `${l.first_name} ${l.last_name}`
        }));
        
        setOrgTree({
            ...rootNode,
            isRoot: true,
            id: rootNode.position_record_id,
            role_name: rootNode.position_name || 'ประธาน / หัวหน้าชุด',
            userName: `${rootNode.first_name} ${rootNode.last_name}`,
            children: childrenNodes
        });
      } else {
        setOrgTree({
            isRoot: true, role_name: 'ประธาน / หัวหน้าชุด', id: 'root-0', children: []
        });
      }
    } catch (error) {
      console.error("Error fetching leaders:", error);
    }
  };

  useEffect(() => {
    fetchLeaders(selectedDate);
    // Note: ถ้า Backend รองรับ committee_id แล้ว ให้ดึงข้อมูลแยกตาม activeTab ที่ตรงนี้ครับ
  }, [activeTab, selectedDate]);

  const handleSearchUser = async () => {
    const rawCitizenId = searchCitizenId.replace(/-/g, ''); 
    if (rawCitizenId.length !== 13) return alert("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก");
    
    setIsLoading(true);
    try {
        const res = await fetch(`${API_URL}/api/search-citizen/${rawCitizenId}`);
        const result = await res.json();
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

  const handleDeleteNode = async (node) => {
    if (node.isRoot) {
        alert("ไม่สามารถลบหัวหน้าชุด/ประธานได้โดยตรง กรุณาใช้ฟังก์ชันแก้ไขแทน");
        return;
    }

    if (window.confirm(`คุณต้องการลบ "${node.first_name} ${node.last_name}" ออกจากตำแหน่ง "${node.role_name}" ใช่หรือไม่?`)) {
        try {
            const response = await fetch(`${API_URL}/api/community-leaders/${node.position_record_id}`, { method: 'DELETE' });
            const result = await response.json();
            
            if (result.success) {
                alert(result.message);
                fetchLeaders(selectedDate);
            } else {
                alert('ลบข้อมูลไม่สำเร็จ: ' + result.message);
            }
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการลบข้อมูล');
        }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.account_id) return alert("กรุณาระบุบุคลากร");
    if (!formData.role_name) return alert("กรุณาระบุชื่อตำแหน่ง/โครงการ");

    try {
      const payload = {
        village_id: villageId,
        committee_id: activeTab, // 🌟 ส่ง ID คณะทำงานไปด้วย (สำหรับ Backend ในอนาคต)
        position_name: formData.role_name, 
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
        fetchLeaders(selectedDate);
      } else {
        alert('บันทึกไม่สำเร็จ: ' + result.message);
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // ฟังก์ชันเพิ่มคณะทำงานใหม่ (Tabs)
  const handleSaveCommittee = (e) => {
    e.preventDefault();
    if (!committeeForm.name) return;
    
    const newCommittee = {
      id: Date.now(), // ชั่วคราว ใช้ Timestamp เป็น ID
      name: committeeForm.name,
      description: committeeForm.description
    };
    
    setCommittees([...committees, newCommittee]);
    setActiveTab(newCommittee.id);
    setIsCommitteeModalOpen(false);
    setCommitteeForm({ name: '', description: '' });
    // Note: ตรงนี้ในอนาคตควรยิง API ไปบันทึกลง Database ด้วยครับ
  };

  const activeCommitteeInfo = committees.find(c => c.id === activeTab);

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      <TopNavbar userData={userData} />
      
      <div className="max-w-7xl mx-auto p-4 pt-20">
        
        {/* Header หลัก */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><Users size={24} /></div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800">ทำเนียบผู้นำและคณะทำงาน</h1>
              <p className="text-sm text-slate-500">หมู่บ้าน: {userData?.villageName || 'ของคุณ'}</p>
            </div>
          </div>
        </div>

        {/* 🌟 1. แถบ Tabs สำหรับเลือกคณะทำงาน */}
        <div className="flex overflow-x-auto gap-2 mb-6 pb-2 hide-scrollbar items-center">
          {committees.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveTab(c.id)}
              className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all shadow-sm ${
                activeTab === c.id 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              {c.name}
            </button>
          ))}
          
          <button 
            onClick={() => setIsCommitteeModalOpen(true)} 
            className="px-4 py-2.5 rounded-full whitespace-nowrap text-sm font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1.5 shadow-sm transition-colors ml-2"
          >
            <FolderPlus size={16} /> เพิ่มผังใหม่
          </button>
        </div>

        {/* 🌟 2. Header ของคณะทำงานที่ถูกเลือก (แสดงชื่อและหน้าที่) */}
        {activeCommitteeInfo && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 mt-2">{activeCommitteeInfo.name}</h2>
            <p className="text-sm md:text-base text-slate-500 mt-2 max-w-2xl mx-auto leading-relaxed">
              {activeCommitteeInfo.description || 'ยังไม่มีคำอธิบายหน้าที่ของคณะทำงานนี้'}
            </p>
            
            <button 
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg hover:bg-blue-100 transition-colors"
              title="แก้ไขข้อมูลคณะทำงาน"
            >
              <Edit size={18}/>
            </button>
          </div>
        )}

        {/* วาดผังองค์กรแบบ MIND MAP */}
        <div className="relative py-10 overflow-x-auto flex justify-center min-w-max md:min-w-full bg-slate-50/50 rounded-3xl">
          {orgTree && orgTree.role_name ? (
            <OrgNode 
              node={orgTree} 
              onAddNode={handleAddNode} 
              onEditNode={handleEditNode} 
              onDeleteNode={handleDeleteNode}
            />
          ) : (
             <div className="text-slate-400 py-10 flex flex-col items-center gap-3">
               <div className="animate-pulse bg-slate-200 w-16 h-16 rounded-full"></div>
               กำลังโหลดข้อมูลผังองค์กร...
             </div>
          )}
        </div>
      </div>

      {/* 🌟 Modal สำหรับเพิ่มคณะทำงานใหม่ (Tab ใหม่) */}
      {isCommitteeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2"><FolderPlus size={20} /> เพิ่มคณะทำงาน / ผังใหม่</h2>
              <button onClick={() => setIsCommitteeModalOpen(false)} className="hover:text-emerald-200"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveCommittee} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อคณะทำงาน / กลุ่ม *</label>
                <input 
                  type="text" required
                  value={committeeForm.name} 
                  onChange={e => setCommitteeForm({...committeeForm, name: e.target.value})}
                  placeholder="เช่น คณะกรรมการร้านค้าชุมชน" 
                  className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">หน้าที่รับผิดชอบ (ย่อ)</label>
                <textarea 
                  rows="3"
                  value={committeeForm.description} 
                  onChange={e => setCommitteeForm({...committeeForm, description: e.target.value})}
                  placeholder="อธิบายหน้าที่หลักของคณะทำงานนี้..." 
                  className="w-full p-3 border border-slate-300 rounded-lg outline-none resize-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsCommitteeModalOpen(false)} className="flex-1 py-3 rounded-lg border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-100">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 rounded-lg font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md">สร้างผังใหม่</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal เพิ่ม/แก้ไข บุคลากรในผัง (เหมือนเดิม) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
            
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {editingSlot?.isNew ? <UserPlus size={20} /> : <Edit size={20} />} 
                {editingSlot?.isNew ? 'เพิ่มบุคลากรในผัง' : 'แก้ไขข้อมูล'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:text-blue-200"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6 text-center">
                 <label className="text-sm font-bold text-slate-700 block mb-1">ชื่อตำแหน่งย่อยในผัง *</label>
                 <input 
                   type="text" required
                   value={formData.role_name} 
                   onChange={e => setFormData({...formData, role_name: e.target.value})}
                   placeholder="เช่น รองประธาน, เหรัญญิก..." 
                   className="w-full text-center p-2.5 border-b-2 border-blue-500 bg-blue-50 text-blue-800 font-bold outline-none rounded-t-lg focus:bg-blue-100"
                 />
              </div>

              {editingSlot?.isNew && !foundUser && (
                <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-sm font-bold text-slate-700 mb-2">ค้นหาจากเลขบัตรประชาชน 13 หลัก</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" maxLength="17" value={searchCitizenId} onChange={handleCitizenIdChange} 
                      placeholder="X-XXXX-XXXXX-XX-X" 
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider" 
                    />
                    <button type="button" onClick={handleSearchUser} disabled={isLoading} className="bg-slate-800 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-slate-700 flex items-center gap-2 shrink-0 disabled:bg-slate-400">
                      <Search size={16} /> {isLoading ? 'ค้นหา...' : 'ค้นหา'}
                    </button>
                  </div>
                </div>
              )}

              {(!editingSlot?.isNew || foundUser) && (
                <form id="leaderForm" onSubmit={handleSave}>
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative w-28 h-28 rounded-2xl border-4 border-slate-100 overflow-hidden shadow-md group cursor-pointer" onClick={() => document.getElementById('leader-img-upload').click()}>
                      <img src={formData.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={24} className="text-white" /></div>
                    </div>
                    {foundUser && (
                      <>
                        <h3 className="mt-3 font-bold text-slate-800 text-lg">{foundUser.first_name} {foundUser.last_name}</h3>
                        <p className="text-sm text-slate-500 text-center mt-1">
                          {foundUser.village_name || foundUser.tambon_name_th ? (<>หมู่บ้าน: {foundUser.village_name || '-'} <br/> ตำบล: {foundUser.tambon_name_th || '-'}</>) : (<span className="text-red-400">ไม่มีข้อมูลที่อยู่</span>)}
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
                      <label className="block text-sm font-bold text-slate-700 mb-1">หน้าที่รับผิดชอบเพิ่มเติม</label>
                      <textarea rows="3" value={formData.responsibilities} onChange={e => setFormData({...formData, responsibilities: e.target.value})} placeholder="ระบุหน้าที่เฉพาะของบุคคลนี้..." className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none resize-none bg-white"></textarea>
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex gap-3 shrink-0">
              <button type="button" onClick={() => { setIsModalOpen(false); setFoundUser(null); setSearchCitizenId(''); }} className="flex-1 py-3 rounded-lg border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-100">ยกเลิก</button>
              <button type="submit" form="leaderForm" disabled={editingSlot?.isNew && !foundUser} className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${(editingSlot?.isNew && !foundUser) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'}`}>
                <Save size={18} /> บันทึกบุคลากร
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