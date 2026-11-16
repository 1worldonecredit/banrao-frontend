import React, { useState, useEffect } from 'react';
import { Users, Calendar, Edit, Camera, Save, X, UserPlus, Search, Plus, Trash2, FolderPlus } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

// ==========================================
// 🌟 1. Component ก้อน Node
// ==========================================
const OrgNode = ({ node, onAddNode, onEditNode, onDeleteNode }) => {
  const hasUser = !!node.account_id;

  return (
    <div className="flex flex-col items-center">
      <div className="relative group m-1 md:m-2 mt-4">
        <div className="bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 rounded-2xl p-4 w-36 sm:w-48 md:w-56 flex flex-col items-center z-10 relative overflow-hidden">
          
          <div className={`absolute top-0 left-0 w-full h-1.5 ${node.isRoot ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-emerald-400 to-teal-400'}`}></div>
          
          <div className="relative mt-2 mb-3">
             <div className="absolute inset-0 bg-blue-100 rounded-full scale-110 -z-10 opacity-50"></div>
             <img 
               src={node.user_image || '/profile-img.jpg'} 
               alt="Profile" 
               className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover border-2 border-white shadow-sm relative z-0"
             />
          </div>
          
          <span className="text-[10px] md:text-xs font-bold text-slate-700 bg-white/80 border border-slate-200 px-3 py-1 rounded-full mb-2 text-center w-full truncate shadow-sm">
            {node.role_name || 'ตำแหน่งใหม่'}
          </span>
          <h3 className="font-bold text-slate-800 text-xs md:text-sm truncate w-full text-center">
            {hasUser ? `${node.first_name} ${node.last_name}` : 'คลิกระบุบุคลากร'}
          </h3>
          <p className="text-[10px] md:text-xs text-slate-500 mt-1 truncate w-full text-center">
            {node.responsibilities || 'ยังไม่ระบุหน้าที่'}
          </p>

          <div className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
             <button onClick={() => onEditNode(node)} className="p-1.5 bg-white/80 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors shadow-sm" title="แก้ไขข้อมูล">
               <Edit size={14} />
             </button>
             {(!node.isRoot && hasUser) && (
               <button onClick={() => onDeleteNode(node)} className="p-1.5 bg-white/80 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors shadow-sm" title="ลบบุคลากรออกจากตำแหน่ง">
                 <Trash2 size={14} />
               </button>
             )}
          </div>
        </div>

        {hasUser ? (
           <button onClick={() => onAddNode(node, 'child')} className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 hover:bg-emerald-600 hover:scale-110 transition-all z-20" title="เพิ่มผู้ใต้บังคับบัญชา (ลูกน้อง)">
             <Plus size={14} />
           </button>
        ) : (
           <button onClick={() => onEditNode(node)} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white rounded-full p-3 shadow-lg opacity-0 group-hover:opacity-100 hover:bg-blue-600 hover:scale-110 transition-all z-20" title="เพิ่มข้อมูลบุคลากร">
             <Edit size={18} />
           </button>
        )}
        
        {/* 🌟 ปรับปุ่มซ้าย/ขวา ให้คลิกง่ายขึ้นและเด่นขึ้นเล็กน้อย */}
        {!node.isRoot && (
           <>
             <button onClick={() => onAddNode(node, 'left')} className="absolute top-1/2 -left-3 md:-left-4 transform -translate-y-1/2 bg-white border border-slate-200 text-blue-600 rounded-full p-1.5 shadow-md opacity-40 group-hover:opacity-100 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all z-20" title="เพิ่มตำแหน่งระดับเดียวกัน">
               <Plus size={12} />
             </button>
             <button onClick={() => onAddNode(node, 'right')} className="absolute top-1/2 -right-3 md:-right-4 transform -translate-y-1/2 bg-white border border-slate-200 text-blue-600 rounded-full p-1.5 shadow-md opacity-40 group-hover:opacity-100 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all z-20" title="เพิ่มตำแหน่งระดับเดียวกัน">
               <Plus size={12} />
             </button>
           </>
        )}
      </div>

      {Array.isArray(node.children) && node.children.length > 0 && (
        <div className="flex flex-col items-center w-full">
          <div className="w-px h-6 bg-slate-300"></div>
          <div className="flex justify-center relative pt-4 border-t border-slate-300 gap-4 md:gap-8 px-4">
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
// 🌟 2. Main Component
// ==========================================
const CommunityLeaders = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const villageId = userData.village_id || 1; 
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 
  const [orgTree, setOrgTree] = useState(null); 
  
  const [committees, setCommittees] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [committeeForm, setCommitteeForm] = useState({ name: '', description: '' });

  // 🌟 เพิ่ม State 2 ตัวนี้ สำหรับแก้ไขแท็บ
  const [editingCommitteeId, setEditingCommitteeId] = useState(null); 
  const [isEditCommitteeModalOpen, setIsEditCommitteeModalOpen] = useState(false);

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

  const buildTree = (data) => {
    let tree = [];
    let lookup = {};

    data.forEach(item => {
      lookup[item.position_record_id] = { 
        ...item, 
        id: item.position_record_id, 
        role_name: item.position_name,
        userName: `${item.first_name || ''} ${item.last_name || ''}`,
        children: [] 
      };
    });

    data.forEach(item => {
      if (item.parent_id && lookup[item.parent_id]) {
        lookup[item.parent_id].children.push(lookup[item.position_record_id]);
      } else {
        lookup[item.position_record_id].isRoot = true;
        tree.push(lookup[item.position_record_id]);
      }
    });

    return tree[0] || null; 
  };


  const fetchCommittees = async () => {
    try {
      const res = await fetch(`${API_URL}/api/community-committees/${villageId}`);
      const result = await res.json();
      if (result.success && result.data.length > 0) {
        setCommittees(result.data);
        if (!activeTab) setActiveTab(result.data[0].committee_id);
      }
    } catch (error) { console.error("Error fetching committees:", error); }
  };

  const fetchLeaders = async (dateQuery = '', committeeId) => {
    if (!committeeId) return; 
    try {
      const url = `${API_URL}/api/community-leaders/${villageId}?committee_id=${committeeId}${dateQuery ? `&term_date=${dateQuery}` : ''}`;
      const res = await fetch(url);
      const result = await res.json();
      
      if (result.success && result.data.length > 0) {
        const treeData = buildTree(result.data);
        setOrgTree(treeData);
      } else {
        setOrgTree({ isRoot: true, role_name: 'ประธาน / หัวหน้าชุด', id: 'root-0', children: [] });
      }
    } catch (error) { console.error("Error fetching leaders:", error); }
  };

  useEffect(() => { fetchCommittees(); }, []);
  useEffect(() => {
    if (activeTab) {
      setOrgTree(null); 
      fetchLeaders(selectedDate, activeTab);
    }
  }, [activeTab, selectedDate]);

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
  const handleCitizenIdChange = (e) => setSearchCitizenId(formatCitizenId(e.target.value));
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setFormData({ ...formData, image_file: file, previewUrl: URL.createObjectURL(file) });
  };

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
                ...prev, account_id: result.data.account_id, previewUrl: result.data.user_image || '/profile-img.jpg', responsibilities: result.data.responsibilities || prev.responsibilities
            }));
        } else {
            alert(result.message || 'ไม่พบข้อมูลลูกบ้าน');
            setFoundUser(null);
        }
    } catch (error) { alert('เกิดข้อผิดพลาดในการเชื่อมต่อ'); } finally { setIsLoading(false); }
  };

  // 🌟 ฟังก์ชันจัดการเพิ่มคน (แก้ไขลอจิก ซ้าย/ขวา/ล่าง)
  const handleAddNode = (node, direction) => {
    let targetParentId = null;
    
    if (direction === 'child') {
      // เพิ่มลูกน้อง (ลงล่าง) -> ให้กล่องที่ถูกคลิกเป็นหัวหน้า
      targetParentId = node.position_record_id || node.id;
    } else {
      // เพิ่มเพื่อนร่วมงาน (ซ้าย/ขวา) -> ให้หัวหน้าของกล่องที่ถูกคลิก เป็นหัวหน้าของคนใหม่ด้วย
      targetParentId = node.parent_id || null;
    }

    setEditingSlot({ isNew: true, parentId: targetParentId, direction }); 
    
    const today = new Date().toISOString().split('T')[0];
    setFormData({ role_name: '', account_id: '', start_date: today, end_date: '', responsibilities: '', previewUrl: '/profile-img.jpg', image_file: null });
    setFoundUser(null);
    setSearchCitizenId('');
    setIsModalOpen(true);
  };

  const handleEditNode = (node) => {
    const isMockNode = !node.position_record_id || String(node.id).startsWith('root-');
    
    setEditingSlot({ 
      isNew: isMockNode, 
      recordId: isMockNode ? null : (node.position_record_id || node.id),
      parentId: node.parent_id || null // ถ่ายทอด parent_id เดิม
    });
    
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      role_name: node.role_name, 
      account_id: node.account_id || '',
      start_date: node.start_date ? node.start_date.split('T')[0] : today, 
      end_date: node.end_date ? node.end_date.split('T')[0] : '',
      responsibilities: node.responsibilities || '', 
      previewUrl: node.user_image || '/profile-img.jpg', 
      image_file: null
    });

    if (node.account_id) {
        setFoundUser({
          first_name: node.first_name, last_name: node.last_name,
          village_name: node.village_name || userData.villageName, tambon_name_th: node.tambon_name_th || userData.tambonName
        });
    } else setFoundUser(null); 
    
    setIsModalOpen(true);
  };

  const handleDeleteNode = async (node) => {
    if (node.isRoot) return alert("ไม่สามารถลบประธาน/หัวหน้าชุดได้ กรุณาใช้ฟังก์ชันแก้ไขแทน");
    if (window.confirm(`คุณต้องการลบ "${node.first_name} ${node.last_name}" ใช่หรือไม่?`)) {
        try {
            const res = await fetch(`${API_URL}/api/community-leaders/${node.position_record_id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) { alert(result.message); fetchLeaders(selectedDate, activeTab); } 
            else alert('ลบข้อมูลไม่สำเร็จ: ' + result.message);
        } catch (error) { alert('เกิดข้อผิดพลาดในการลบข้อมูล'); }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.account_id) return alert("กรุณาระบุบุคลากร");
    if (!formData.role_name) return alert("กรุณาระบุชื่อตำแหน่ง");

    try {
      const payload = {
        village_id: villageId,
        committee_id: activeTab, 
        position_name: formData.role_name, 
        account_id: formData.account_id,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        responsibilities: formData.responsibilities,
        parent_id: editingSlot.parentId || null // ส่ง parent_id ไปให้ Backend ด้วยเสมอ
      };

      const url = editingSlot.isNew ? `${API_URL}/api/community-leaders` : `${API_URL}/api/community-leaders/${editingSlot.recordId}`;
      const method = editingSlot.isNew ? 'POST' : 'PUT';

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) {
        alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
        setIsModalOpen(false);
        fetchLeaders(selectedDate, activeTab);
      } else alert('บันทึกไม่สำเร็จ: ' + result.message);
    } catch (error) { alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล'); }
  };

  const handleSaveCommittee = async (e) => {
    e.preventDefault();
    if (!committeeForm.name) return;
    try {
      const res = await fetch(`${API_URL}/api/community-committees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ village_id: villageId, committee_name: committeeForm.name, description: committeeForm.description })
      });
      const result = await res.json();
      if (result.success) {
        alert('เพิ่มคณะทำงานใหม่สำเร็จ');
        fetchCommittees(); 
        setIsCommitteeModalOpen(false);
        setCommitteeForm({ name: '', description: '' });
      } else alert('เกิดข้อผิดพลาด: ' + result.message);
    } catch (error) { alert('เชื่อมต่อระบบล้มเหลว'); }
  };

// ==========================================
  // 🌟 ฟังก์ชันจัดการแท็บ (ลบ / แก้ไข)
  // ==========================================
  const openEditCommitteeModal = (committee) => {
    setCommitteeForm({ name: committee.committee_name, description: committee.description || '' });
    setEditingCommitteeId(committee.committee_id);
    setIsEditCommitteeModalOpen(true);
  };

  const handleUpdateCommittee = async (e) => {
    e.preventDefault();
    if (!committeeForm.name || !editingCommitteeId) return;
    try {
      const res = await fetch(`${API_URL}/api/community-committees/${editingCommitteeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ committee_name: committeeForm.name, description: committeeForm.description })
      });
      const result = await res.json();
      if (result.success || res.ok) {
        alert('แก้ไขข้อมูลคณะทำงานสำเร็จ');
        fetchCommittees();
        setIsEditCommitteeModalOpen(false);
        setEditingCommitteeId(null);
        setCommitteeForm({ name: '', description: '' });
      } else alert('เกิดข้อผิดพลาด: ' + (result.message || 'ไม่สามารถแก้ไขได้'));
    } catch (error) { alert('เชื่อมต่อระบบล้มเหลว'); }
  };

  const handleDeleteCommittee = async (id, name) => {
    if (!window.confirm(`คุณต้องการลบ "${name}" ใช่หรือไม่?\n\n⚠️ คำเตือน: บุคลากรที่อยู่ในผังนี้จะถูกลบไปด้วยทั้งหมด!`)) return;
    try {
      const res = await fetch(`${API_URL}/api/community-committees/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success || res.ok) {
        alert('ลบคณะทำงานเรียบร้อยแล้ว');
        if (activeTab === id) setActiveTab(null);
        fetchCommittees(); 
      } else alert('เกิดข้อผิดพลาด: ' + (result.message || 'ไม่สามารถลบได้'));
    } catch (error) { alert('เชื่อมต่อระบบล้มเหลว'); }
  };

  const activeCommitteeInfo = committees.find(c => c.committee_id === activeTab);

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-24 font-sans">
      <TopNavbar userData={userData} />
      
      <div className="max-w-7xl mx-auto p-4 pt-20">
        
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-5 rounded-2xl shadow-sm mb-6 border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Users size={28} strokeWidth={1.5} /></div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">ทำเนียบผู้นำและคณะทำงาน</h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">หมู่บ้าน: {userData?.villageName || 'ของคุณ'}</p>
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-3 mb-6 pb-2 hide-scrollbar items-center px-1">
          {committees.map(c => (
            <div key={c.committee_id} className="relative group shrink-0">
              <button
                onClick={() => setActiveTab(c.committee_id)}
                className={`px-6 py-3 rounded-xl whitespace-nowrap text-sm font-bold transition-all duration-300 ${
                  activeTab === c.committee_id 
                  ? 'bg-slate-800 text-white shadow-md -translate-y-0.5' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {c.committee_name}
              </button>
              
              {/* ปุ่มแก้ไข/ลบ จะโผล่มาเฉพาะแท็บที่ถูกเลือกและเอาเมาส์ไปชี้ */}
              {activeTab === c.committee_id && (
                <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button 
                    onClick={() => openEditCommitteeModal(c)}
                    className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white shadow-sm transition-colors" title="แก้ไข"
                  >
                    <Edit size={12} />
                  </button>
                  <button 
                    onClick={() => handleDeleteCommittee(c.committee_id, c.committee_name)}
                    className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-600 hover:text-white shadow-sm transition-colors" title="ลบ"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
          
          <button 
            onClick={() => {
              setCommitteeForm({ name: '', description: '' });
              setIsCommitteeModalOpen(true);
            }} 
            className="px-5 py-3 rounded-xl whitespace-nowrap text-sm font-bold bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 flex items-center gap-2 transition-colors ml-2 shrink-0"
          >
            <FolderPlus size={18} /> เพิ่มผังคณะทำงาน
          </button>
        </div>

        {activeCommitteeInfo && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 mt-2 tracking-tight">{activeCommitteeInfo.committee_name}</h2>
            <p className="text-sm md:text-base text-slate-500 mt-3 max-w-2xl mx-auto leading-relaxed font-medium">
              {activeCommitteeInfo.description || 'ยังไม่มีคำอธิบายหน้าที่ของคณะทำงานนี้'}
            </p>
          </div>
        )}

        <div className="relative py-12 overflow-x-auto flex justify-center min-w-max md:min-w-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] rounded-[2.5rem] border border-slate-200/50">
          {orgTree && orgTree.role_name ? (
            <OrgNode node={orgTree} onAddNode={handleAddNode} onEditNode={handleEditNode} onDeleteNode={handleDeleteNode} />
          ) : (
             <div className="text-slate-400 py-20 flex flex-col items-center gap-4">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
               <span className="font-medium text-sm">กำลังจัดเตรียมผังองค์กร...</span>
             </div>
          )}
        </div>
      </div>

      {isCommitteeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all">
            <div className="p-6 pb-0 flex justify-between items-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <FolderPlus size={24} />
              </div>
              <button onClick={() => setIsCommitteeModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 pt-4 pb-2">
              <h2 className="text-xl font-black text-slate-800">เพิ่มคณะทำงานใหม่</h2>
              <p className="text-sm text-slate-500 mt-1">สร้างกลุ่มคณะทำงานหรือโครงการใหม่ในชุมชน</p>
            </div>
            <form onSubmit={handleSaveCommittee} className="p-6 pt-4">
              <div className="mb-5">
                <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อคณะทำงาน / กลุ่ม *</label>
                <input 
                  type="text" required value={committeeForm.name} 
                  onChange={e => setCommitteeForm({...committeeForm, name: e.target.value})}
                  placeholder="เช่น คณะกรรมการหมู่บ้าน, กองทุนประชารัฐ" 
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-2">หน้าที่รับผิดชอบ (ย่อ)</label>
                <textarea 
                  rows="3" value={committeeForm.description} 
                  onChange={e => setCommitteeForm({...committeeForm, description: e.target.value})}
                  placeholder="อธิบายหน้าที่หลักของคณะทำงานนี้..." 
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                ></textarea>
              </div>
              <button type="submit" className="w-full py-3.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-colors flex justify-center items-center gap-2">
                <Plus size={18} /> สร้างผังคณะทำงาน
              </button>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
            <div className="p-5 flex justify-between items-center border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  {editingSlot?.isNew ? <UserPlus size={20} /> : <Edit size={20} />} 
                </div>
                {editingSlot?.isNew ? 'ระบุบุคลากรลงในผัง' : 'จัดการข้อมูลตำแหน่ง'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full transition-colors"><X size={18} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="mb-6">
                 <label className="text-sm font-bold text-slate-700 block mb-2 text-center">ชื่อตำแหน่งย่อยในผัง *</label>
                 <input 
                   type="text" required value={formData.role_name} 
                   onChange={e => setFormData({...formData, role_name: e.target.value})}
                   placeholder="เช่น รองประธาน, เหรัญญิก..." 
                   className="w-full text-center p-3.5 bg-blue-50/50 border-2 border-blue-100 text-blue-700 font-black text-lg outline-none rounded-2xl focus:border-blue-500 transition-colors"
                 />
              </div>

              {!foundUser && (
                <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Search size={16} className="text-slate-400"/> ค้นหาจากเลขบัตรประชาชน
                  </label>
                  <div className="flex gap-2 flex-col sm:flex-row">
                    <input 
                      type="text" maxLength="17" value={searchCitizenId} onChange={handleCitizenIdChange} 
                      placeholder="X-XXXX-XXXXX-XX-X" 
                      className="flex-1 p-3.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono tracking-wider font-bold" 
                    />
                    <button type="button" onClick={handleSearchUser} disabled={isLoading} className="bg-slate-900 text-white px-5 py-3.5 rounded-xl font-bold hover:bg-slate-800 disabled:bg-slate-300 transition-colors shrink-0">
                      {isLoading ? 'กำลังค้น...' : 'ค้นหา'}
                    </button>
                  </div>
                </div>
              )}

              {foundUser && (
                <form id="leaderForm" onSubmit={handleSave} className="animate-fade-in-up">
                  <div className="flex flex-col items-center mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="relative w-28 h-28 rounded-full p-1 bg-white shadow-sm border border-slate-200 group cursor-pointer" onClick={() => document.getElementById('leader-img-upload').click()}>
                      <img src={formData.previewUrl} alt="Preview" className="w-full h-full rounded-full object-cover" />
                      <div className="absolute inset-1 rounded-full bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={24} className="text-white" /></div>
                    </div>
                    
                    <h3 className="mt-4 font-black text-slate-800 text-xl">{foundUser.first_name} {foundUser.last_name}</h3>
                    
                    <button 
                      type="button" 
                      onClick={() => { setFoundUser(null); setFormData({...formData, account_id: '', previewUrl: '/profile-img.jpg'}); setSearchCitizenId(''); }} 
                      className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 hover:border-slate-300 mt-2 mb-3 transition-colors shadow-sm"
                    >
                      เปลี่ยนบุคลากร
                    </button>
                    
                    <div className="text-xs font-medium text-slate-500 text-center bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm w-full">
                      {foundUser.village_name || foundUser.tambon_name_th ? (<>หมู่บ้าน: {foundUser.village_name || '-'} • ตำบล: {foundUser.tambon_name_th || '-'}</>) : (<span className="text-red-400">ไม่มีข้อมูลที่อยู่</span>)}
                    </div>
                    
                    <input type="file" id="leader-img-upload" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">วันที่รับตำแหน่ง *</label>
                        <input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 font-medium transition-colors" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">วันหมดวาระ</label>
                        <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 font-medium transition-colors" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">หน้าที่รับผิดชอบเพิ่มเติม</label>
                      <textarea rows="3" value={formData.responsibilities} onChange={e => setFormData({...formData, responsibilities: e.target.value})} placeholder="ระบุหน้าที่เฉพาะของบุคคลนี้..." className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none focus:bg-white focus:border-blue-500 font-medium transition-colors"></textarea>
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3 bg-white">
              <button type="button" onClick={() => { setIsModalOpen(false); setFoundUser(null); setSearchCitizenId(''); }} className="w-1/3 py-3.5 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition-colors">ยกเลิก</button>
              <button type="submit" form="leaderForm" disabled={!foundUser} className={`w-2/3 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${(!foundUser) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:-translate-y-0.5'}`}>
                <Save size={18} /> บันทึกข้อมูลผัง
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