import React, { useState, useEffect } from 'react';
import {
  Users, Edit, Save, X, UserPlus, Search, Plus, Trash2, FolderPlus,
  ShieldCheck, KeyRound, CheckCircle, Clock, Lock, UserCheck,
  RefreshCw, History, ArrowRight
} from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';
import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const COMMITTEE_TYPES = [
  { code: 'LEADERS', label: 'ผังผู้นำชุมชน / ปกครองหมู่บ้าน' },
  { code: 'WATER', label: 'คณะกรรมการประปาหมู่บ้าน' },
  { code: 'FUND', label: 'คณะกรรมการกองทุน / เศรษฐกิจชุมชน' },
  { code: 'HEALTH', label: 'อสม. / สาธารณสุขหมู่บ้าน' },
  { code: 'PLACE_GOV', label: 'สถานศึกษา / วัด / หน่วยงานราชการ' },
  { code: 'CUSTOM', label: 'คณะทำงานเฉพาะกิจ / กลุ่มอื่นๆ' }
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const formatThaiDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543} เวลา ${pad(d.getHours())}:${pad(d.getMinutes())} น.`;
};

const calcAgeText = (dobStr) => {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (now.getDate() < dob.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  return `${years} ปี ${months} เดือน`;
};

const OrgNode = ({ node, onAddNode, onEditNode, onRevokeNode, onApproveNode, onHandoverNode }) => {
  if (!node) return null;
  const hasPerson = Boolean(node.account_id || node.member_id || node.citizen_id || node.first_name);
  const isPending = !node.isRoot && node.status === 'PENDING_APPROVAL';
  const isApproved = node.isRoot || node.status === 'ACTIVE';

  return (
    <div className="flex flex-col items-center">
      <div className="relative group m-1.5 md:m-2 mt-4">
        <div
          className={`bg-white border-2 shadow-sm hover:shadow-md transition-all rounded-2xl p-3 md:p-4 w-48 sm:w-56 md:w-64 flex flex-col items-center z-10 relative overflow-hidden ${
            isPending ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
          }`}
        >
          <div
            className={`absolute top-0 left-0 w-full h-1.5 ${
              node.isRoot
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                : isPending
                ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500'
            }`}
          />

          {!node.isRoot && (
            <div className="w-full flex justify-center mt-1 mb-1.5">
              {isPending ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  <Clock size={11} /> รออนุมัติจากผู้ใหญ่บ้าน
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <CheckCircle size={11} /> อนุมัติแล้ว
                </span>
              )}
            </div>
          )}

          <img
            src={node.user_image || '/profile-img.jpg'}
            alt="Profile"
            className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover border-2 border-slate-100 shadow-sm mb-2"
          />

          <span className="text-[10px] md:text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full mb-1 text-center w-full truncate">
            {node.role_name || 'ตำแหน่งใหม่'}
          </span>

          <h3 className="font-bold text-slate-800 text-xs md:text-sm truncate w-full text-center">
            {hasPerson ? `${node.first_name || ''} ${node.last_name || ''}`.trim() : 'คลิกระบุบุคลากร'}
          </h3>

          {!node.isRoot && node.template_name_th && (
            <div className="text-[10px] text-indigo-700 font-semibold mt-0.5 truncate w-full text-center">
              สิทธิ์: {node.template_name_th}
            </div>
          )}

          {!node.isRoot && (
            <div className={`text-[9.5px] mt-0.5 font-medium ${node.has_app_account ? 'text-emerald-600' : 'text-slate-400'}`}>
              {node.has_app_account ? '• เชื่อมบัญชีเข้าแอปแล้ว' : '• ยังไม่สมัครแอป (เชื่อมอัตโนมัติเมื่อสมัคร)'}
            </div>
          )}

          <p className="text-[10px] md:text-xs text-slate-500 mt-1 truncate w-full text-center">
            {node.responsibilities || 'ยังไม่ระบุหน้าที่'}
          </p>

          {/* ปุ่มจัดการ */}
          <div className="w-full mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap justify-center gap-1.5">
            {isPending && (
              <button
                type="button"
                onClick={() => onApproveNode(node)}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm"
                title="ผู้ใหญ่บ้านอนุมัติด้วย PIN"
              >
                <ShieldCheck size={12} /> อนุมัติ
              </button>
            )}
            {!node.isRoot && isApproved && hasPerson && (
              <button
                type="button"
                onClick={() => onHandoverNode(node)}
                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                title="เปลี่ยนตัวกรรมการ / ส่งมอบงานและปรับกลับเป็นประชาชน"
              >
                <RefreshCw size={11} /> ส่งมอบงาน
              </button>
            )}
            {!node.isRoot && (
              <button
                type="button"
                onClick={() => onEditNode(node)}
                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                title="แก้ไขข้อมูล"
              >
                <Edit size={13} />
              </button>
            )}
            {!node.isRoot && hasPerson && (
              <button
                type="button"
                onClick={() => onRevokeNode(node)}
                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                title={isApproved ? 'ถอดถอนตำแหน่ง (ใช้ PIN ผู้ใหญ่บ้าน)' : 'ลบออกจากผัง'}
              >
                <Trash2 size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onAddNode(node, 'child')}
              className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors"
              title="เพิ่มทีมงานย่อยด้านล่าง"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {!node.isRoot && hasPerson && (
          <>
            <button
              type="button"
              onClick={() => onAddNode(node, 'left')}
              className="absolute top-1/2 -left-3 transform -translate-y-1/2 bg-slate-400 text-white rounded-full p-1 shadow-md opacity-80 hover:opacity-100 hover:bg-blue-500 transition-all z-20"
              title="เพิ่มทีมงานระดับเดียวกัน"
            >
              <Plus size={11} />
            </button>
            <button
              type="button"
              onClick={() => onAddNode(node, 'right')}
              className="absolute top-1/2 -right-3 transform -translate-y-1/2 bg-slate-400 text-white rounded-full p-1 shadow-md opacity-80 hover:opacity-100 hover:bg-blue-500 transition-all z-20"
              title="เพิ่มทีมงานระดับเดียวกัน"
            >
              <Plus size={11} />
            </button>
          </>
        )}
      </div>

      {Array.isArray(node.children) && node.children.length > 0 && (
        <div className="flex flex-col items-center w-full">
          <div className="w-px h-5 bg-slate-300" />
          <div className="flex justify-center relative pt-4 border-t-2 border-slate-300 gap-3 md:gap-6 px-2 md:px-4">
            {node.children.map((child, index) => {
              if (!child) return null;
              return (
                <div key={child.id || index} className="relative flex flex-col items-center">
                  <div className="absolute top-0 w-px h-4 bg-slate-300 -mt-4" />
                  <OrgNode
                    node={child}
                    onAddNode={onAddNode}
                    onEditNode={onEditNode}
                    onRevokeNode={onRevokeNode}
                    onApproveNode={onApproveNode}
                    onHandoverNode={onHandoverNode}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const CommunityLeaders = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const villageId = userData.village_id || '';
  const currentAccountId = userData.account_id || userData.id || '';

  const [fullAddress, setFullAddress] = useState({
    village_name: userData?.villageName || userData?.village_name || '',
    village_no: userData?.village_no || '',
    tambon: userData?.tambon_name_th || userData?.tambon || '',
    amphure: userData?.amphure_name_th || userData?.amphure || '',
    province: userData?.province_name_th || userData?.province || ''
  });

  const [roleTemplates, setRoleTemplates] = useState([]);
  const [pinInfo, setPinInfo] = useState({ has_pin: false, headman_name: 'ผู้ใหญ่บ้าน' });

  const [committees, setCommittees] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [orgTree, setOrgTree] = useState(null);
  const [leadersFlat, setLeadersFlat] = useState([]);

  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [isEditCommitteeModalOpen, setIsEditCommitteeModalOpen] = useState(false);
  const [editingCommitteeId, setEditingCommitteeId] = useState(null);
  const [committeeForm, setCommitteeForm] = useState({ name: '', description: '', type_code: 'CUSTOM' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [searchCitizenId, setSearchCitizenId] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    role_name: '',
    role_template_code: 'COMMITTEE_GENERAL',
    account_id: '',
    member_id: '',
    citizen_id: '',
    start_date: '',
    end_date: '',
    responsibilities: '',
    previewUrl: '/profile-img.jpg'
  });

  const [isPinSetupOpen, setIsPinSetupOpen] = useState(false);
  const [pinSetupForm, setPinSetupForm] = useState({ old_pin: '', new_pin: '', confirm_pin: '' });
  const [savingPin, setSavingPin] = useState(false);

  const [approvalModal, setApprovalModal] = useState(null);
  const [approvalPin, setApprovalPin] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);

  // Modal ผลัดเปลี่ยนกรรมการ / ส่งมอบงาน (ปรับคนเดิมกลับเป็นประชาชน + ตั้งคนใหม่รับช่วงต่อ)
  const [handoverTarget, setHandoverTarget] = useState(null);
  const [handoverMode, setHandoverMode] = useState('REPLACE'); // REPLACE | STEP_DOWN_ONLY
  const [handoverSearchCid, setHandoverSearchCid] = useState('');
  const [handoverIncoming, setHandoverIncoming] = useState(null);
  const [handoverSearching, setHandoverSearching] = useState(false);
  const [handoverReason, setHandoverReason] = useState('');
  const [handoverStartDate, setHandoverStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [handoverEndDate, setHandoverEndDate] = useState('');
  const [handoverPin, setHandoverPin] = useState('');
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);

  // Modal ประวัติการส่งมอบงานถาวร (อ่านอย่างเดียว ห้ามลบ)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [handoverLogs, setHandoverLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (currentAccountId) {
      authFetch(`${API_URL}/api/user/profile/${currentAccountId}`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            const d = result.data;
            setFullAddress({
              village_name: d.village_name || userData?.villageName || '',
              village_no: d.village_no || userData?.village_no || '',
              tambon: d.tambon_name_th || '',
              amphure: d.amphure_name_th || '',
              province: d.province_name_th || ''
            });
          }
        })
        .catch(() => {});
    }

    authFetch(`${API_URL}/api/v3/role-templates`)
      .then((res) => res.json())
      .then((res) => { if (res.success) setRoleTemplates(res.data || []); })
      .catch(() => {});

    if (villageId) {
      authFetch(`${API_URL}/api/v3/headman-pin/${villageId}`)
        .then((res) => res.json())
        .then((res) => { if (res.success && res.data) setPinInfo(res.data); })
        .catch(() => {});
    }
  }, [currentAccountId, villageId]);

  const buildTree = (data) => {
    const lookup = {};
    data.forEach((item) => {
      const realId = item.id || item.position_record_id;
      lookup[realId] = { ...item, id: realId, children: [] };
    });

    const rootNodes = [];
    data.forEach((item) => {
      const realId = item.id || item.position_record_id;
      const parentId = item.parent_id;
      if (parentId && parentId !== 'null' && lookup[parentId]) {
        lookup[parentId].children.push(lookup[realId]);
      } else {
        rootNodes.push(lookup[realId]);
      }
    });
    return rootNodes;
  };

  const fetchCommittees = async () => {
    if (!villageId) return;
    try {
      const res = await authFetch(`${API_URL}/api/v3/committees/${villageId}`);
      const result = await res.json();
      if (result.success && result.data.length > 0) {
        const sorted = result.data.sort((a, b) => {
          if (a.committee_name === 'ผังผู้นำชุมชน') return -1;
          if (b.committee_name === 'ผังผู้นำชุมชน') return 1;
          return b.committee_id - a.committee_id;
        });
        setCommittees(sorted);
        if (!activeTab || !sorted.some((c) => c.committee_id === activeTab)) {
          setActiveTab(sorted[0].committee_id);
        }
      } else {
        setCommittees([]);
        setActiveTab(null);
      }
    } catch (err) {
      console.error('Fetch committees error:', err);
    }
  };

  const fetchLeaders = async (committeeId) => {
    if (!committeeId) return;
    try {
      const res = await authFetch(`${API_URL}/api/v3/committees/${committeeId}/leaders?village_id=${villageId}`);
      const result = await res.json();
      if (!result.success) return;

      const list = result.data || [];
      setLeadersFlat(list);
      const childrenFromDB = list.length > 0 ? buildTree(list) : [];

      setOrgTree({
        isRoot: true,
        id: currentAccountId || 'root-0',
        account_id: currentAccountId,
        role_name: userData.position_name || 'ผู้ใหญ่บ้าน / ผู้นำชุมชน',
        first_name: userData.firstName || pinInfo.headman_name || 'ผู้ใหญ่บ้าน',
        last_name: userData.lastName || '',
        user_image: userData.profile_image || userData.imageUrl || userData.userImage || '/profile-img.jpg',
        responsibilities: `ผู้อนุมัติประจำหมู่ที่ ${fullAddress.village_no || '-'} ${fullAddress.village_name || ''}`,
        children: childrenFromDB
      });
    } catch (err) {
      console.error('Fetch leaders error:', err);
    }
  };

  const fetchHandoverHistory = async () => {
    if (!villageId) return;
    setIsHistoryOpen(true);
    setLoadingLogs(true);
    try {
      const res = await authFetch(`${API_URL}/api/v3/committee-handovers/${villageId}`);
      const result = await res.json();
      if (result.success) setHandoverLogs(result.data || []);
    } catch (err) {
      console.error('Fetch handover history error:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => { fetchCommittees(); }, [villageId]);
  useEffect(() => {
    if (activeTab) fetchLeaders(activeTab);
    else setOrgTree(null);
  }, [activeTab, fullAddress.village_name]);

  const handleSaveCommittee = async (e) => {
    e.preventDefault();
    if (!committeeForm.name.trim()) return alert('กรุณากรอกชื่อคณะทำงาน');
    try {
      const res = await authFetch(`${API_URL}/api/v3/committees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          village_id: villageId,
          committee_name: committeeForm.name,
          description: committeeForm.description,
          committee_type_code: committeeForm.type_code
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setIsCommitteeModalOpen(false);
        setCommitteeForm({ name: '', description: '', type_code: 'CUSTOM' });
        await fetchCommittees();
        if (result.data?.committee_id) setActiveTab(result.data.committee_id);
      } else {
        alert(result.message || 'สร้างผังไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการสร้างผัง');
    }
  };

  const openEditCommitteeModal = (c) => {
    setCommitteeForm({
      name: c.committee_name,
      description: c.description || '',
      type_code: c.committee_type_code || 'CUSTOM'
    });
    setEditingCommitteeId(c.committee_id);
    setIsEditCommitteeModalOpen(true);
  };

  const handleUpdateCommittee = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch(`${API_URL}/api/v3/committees/${editingCommitteeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          village_id: villageId,
          committee_name: committeeForm.name,
          description: committeeForm.description,
          committee_type_code: committeeForm.type_code
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setIsEditCommitteeModalOpen(false);
        fetchCommittees();
      }
    } catch (err) {
      alert('แก้ไขแท็บไม่สำเร็จ');
    }
  };

  const handleDeleteCommittee = async (id, name) => {
    if (!window.confirm(`ต้องการลบผัง "${name}" ใช่หรือไม่?\nบุคลากรในผังนี้จะถูกถอดถอนตำแหน่งและปรับสิทธิ์อัตโนมัติ`)) return;
    try {
      const res = await authFetch(`${API_URL}/api/v3/committees/${id}?village_id=${villageId}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        if (activeTab === id) setActiveTab(null);
        fetchCommittees();
      }
    } catch (err) {
      alert('ลบผังไม่สำเร็จ');
    }
  };

  const formatCitizenId = (value) => {
    const n = value.replace(/\D/g, '');
    let out = '';
    if (n.length > 0) out += n.substring(0, 1);
    if (n.length > 1) out += '-' + n.substring(1, 5);
    if (n.length > 5) out += '-' + n.substring(5, 10);
    if (n.length > 10) out += '-' + n.substring(10, 12);
    if (n.length > 12) out += '-' + n.substring(12, 13);
    return out;
  };

  const handleSearchUser = async () => {
    const raw = searchCitizenId.replace(/\D/g, '');
    if (raw.length !== 13) return alert('กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก');
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/v3/search-citizen/${villageId}/${raw}`);
      const result = await res.json();
      if (result.success && result.data) {
        setFoundUser(result.data);
        setFormData((prev) => ({
          ...prev,
          account_id: result.data.account_id || '',
          member_id: result.data.member_id || '',
          citizen_id: result.data.citizen_id || raw,
          previewUrl: result.data.user_image || '/profile-img.jpg'
        }));
      } else {
        alert(result.message || 'ไม่พบข้อมูลลูกบ้านในหมู่บ้านนี้');
        setFoundUser(null);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNode = (node, direction) => {
    if (!activeTab) return alert('กรุณาสร้างและเลือกผังคณะทำงานก่อนครับ');
    const targetParentId = direction === 'child'
      ? (node.isRoot ? null : (node.position_record_id || node.id))
      : (node.parent_id || null);

    const currentComm = committees.find((c) => c.committee_id === activeTab);
    let defaultTemplate = 'COMMITTEE_GENERAL';
    if (currentComm?.committee_type_code === 'WATER') defaultTemplate = 'WATER_READER';
    else if (currentComm?.committee_type_code === 'LEADERS') defaultTemplate = 'VILLAGE_ADMIN';
    else if (currentComm?.committee_type_code === 'PLACE_GOV') defaultTemplate = 'PLACE_GOV_HEAD';

    setEditingSlot({ isNew: true, parentId: targetParentId, direction });
    setFormData({
      role_name: '',
      role_template_code: defaultTemplate,
      account_id: '',
      member_id: '',
      citizen_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      responsibilities: '',
      previewUrl: '/profile-img.jpg'
    });
    setFoundUser(null);
    setSearchCitizenId('');
    setIsModalOpen(true);
  };

  const handleEditNode = (node) => {
    setEditingSlot({
      isNew: false,
      recordId: node.position_record_id || node.id,
      parentId: node.parent_id || null
    });
    setFormData({
      role_name: node.role_name || '',
      role_template_code: node.role_template_code || 'COMMITTEE_GENERAL',
      account_id: node.account_id || '',
      member_id: node.member_id || '',
      citizen_id: node.citizen_id || '',
      start_date: node.start_date ? node.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
      end_date: node.end_date ? node.end_date.split('T')[0] : '',
      responsibilities: node.responsibilities || '',
      previewUrl: node.user_image || '/profile-img.jpg'
    });
    setFoundUser({
      first_name: node.first_name,
      last_name: node.last_name,
      dob: node.dob,
      has_app_account: node.has_app_account
    });
    setIsModalOpen(true);
  };

  const handleSavePerson = async (e) => {
    e.preventDefault();
    if (editingSlot?.isNew && !foundUser) return alert('กรุณาค้นหาลูกบ้านด้วยเลขบัตร 13 หลักก่อนครับ');
    if (!formData.role_name.trim()) return alert('กรุณาระบุชื่อตำแหน่งในผัง');
    if (!formData.role_template_code) return alert('กรุณาเลือกชุดสิทธิ์มาตรฐานในระบบ');

    try {
      const payload = {
        village_id: villageId,
        committee_id: activeTab,
        custom_position_title: formData.role_name.trim(),
        role_template_code: formData.role_template_code,
        account_id: formData.account_id || null,
        member_id: formData.member_id || null,
        citizen_id: formData.citizen_id || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        responsibilities: formData.responsibilities,
        parent_id: editingSlot.parentId || null,
        assigned_by: currentAccountId || null
      };

      const url = editingSlot.isNew
        ? `${API_URL}/api/v3/committee-leaders`
        : `${API_URL}/api/v3/committee-leaders/${editingSlot.recordId}`;
      const method = editingSlot.isNew ? 'POST' : 'PUT';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setIsModalOpen(false);
        await fetchCommittees();
        await fetchLeaders(activeTab);
      } else {
        alert('บันทึกไม่สำเร็จ: ' + result.message);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleSaveHeadmanPin = async (e) => {
    e.preventDefault();
    if (pinSetupForm.new_pin.trim().length < 4) return alert('กรุณากำหนดรหัส PIN อย่างน้อย 4-6 หลัก');
    if (pinSetupForm.new_pin !== pinSetupForm.confirm_pin) return alert('รหัส PIN ใหม่และยืนยันรหัสไม่ตรงกัน');

    setSavingPin(true);
    try {
      const res = await authFetch(`${API_URL}/api/v3/headman-pin/${villageId}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: currentAccountId,
          old_pin: pinSetupForm.old_pin,
          new_pin: pinSetupForm.new_pin
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setPinInfo((prev) => ({ ...prev, has_pin: true }));
        setPinSetupForm({ old_pin: '', new_pin: '', confirm_pin: '' });
        setIsPinSetupOpen(false);
      } else {
        alert(result.message || 'ตั้งรหัส PIN ไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingPin(false);
    }
  };

  const openApproveSingle = (node) => {
    if (!pinInfo.has_pin) {
      alert('ยังไม่ได้ตั้งรหัส PIN ผู้ใหญ่บ้าน กรุณาตั้งรหัส PIN ก่อนทำการอนุมัติครับ');
      setIsPinSetupOpen(true);
      return;
    }
    setApprovalPin('');
    setApprovalNote('');
    setApprovalModal({ mode: 'APPROVE_ONE', targetNode: node });
  };

  const openApproveAll = () => {
    if (!pinInfo.has_pin) {
      alert('ยังไม่ได้ตั้งรหัส PIN ผู้ใหญ่บ้าน กรุณาตั้งรหัส PIN ก่อนทำการอนุมัติครับ');
      setIsPinSetupOpen(true);
      return;
    }
    setApprovalPin('');
    setApprovalNote('');
    setApprovalModal({ mode: 'APPROVE_ALL', pendingCount: pendingInTab.length });
  };

  const openRevokeSingle = (node) => {
    if (node.status === 'PENDING_APPROVAL') {
      if (!window.confirm(`ลบ "${node.first_name} ${node.last_name}" ที่รออนุมัติออกจากผังใช่หรือไม่?`)) return;
      executeRevoke(node, '', 'ยกเลิกรายการรออนุมัติ');
      return;
    }
    if (!pinInfo.has_pin) {
      alert('กรุณาตั้งรหัส PIN ผู้ใหญ่บ้านก่อนถอดถอนตำแหน่งที่อนุมัติแล้วครับ');
      setIsPinSetupOpen(true);
      return;
    }
    setApprovalPin('');
    setApprovalNote('');
    setApprovalModal({ mode: 'REVOKE_ONE', targetNode: node });
  };

  const executeRevoke = async (node, pin, reasonText) => {
    setProcessingApproval(true);
    try {
      const res = await authFetch(`${API_URL}/api/v3/committee-leaders/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          village_id: villageId,
          approver_account_id: currentAccountId,
          pin_code: pin,
          record_id: node.id || node.position_record_id,
          reason: reasonText
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setApprovalModal(null);
        await fetchCommittees();
        await fetchLeaders(activeTab);
      } else {
        alert(result.message || 'ถอดถอนตำแหน่งไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleConfirmApprovalSubmit = async (e) => {
    e.preventDefault();
    if (!approvalPin.trim()) return alert('กรุณากรอกรหัส PIN อนุมัติของผู้ใหญ่บ้าน');

    if (approvalModal.mode === 'REVOKE_ONE') {
      await executeRevoke(approvalModal.targetNode, approvalPin, approvalNote);
      return;
    }

    setProcessingApproval(true);
    try {
      const payload = {
        village_id: villageId,
        approver_account_id: currentAccountId,
        pin_code: approvalPin,
        note: approvalNote,
        ...(approvalModal.mode === 'APPROVE_ONE'
          ? { record_ids: [approvalModal.targetNode.id || approvalModal.targetNode.position_record_id] }
          : { committee_id: activeTab })
      };

      const res = await authFetch(`${API_URL}/api/v3/committee-leaders/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setApprovalModal(null);
        await fetchCommittees();
        await fetchLeaders(activeTab);
      } else {
        alert(result.message || 'อนุมัติไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setProcessingApproval(false);
    }
  };

  // เปิดหน้าต่างผลัดเปลี่ยนกรรมการ / ส่งมอบงาน
  const openHandoverModal = (node) => {
    if (!pinInfo.has_pin) {
      alert('กรุณาตั้งรหัส PIN ผู้ใหญ่บ้านก่อนทำการส่งมอบงานหรือเปลี่ยนตัวกรรมการครับ');
      setIsPinSetupOpen(true);
      return;
    }
    setHandoverTarget(node);
    setHandoverMode('REPLACE');
    setHandoverSearchCid('');
    setHandoverIncoming(null);
    setHandoverReason('');
    setHandoverStartDate(new Date().toISOString().split('T')[0]);
    setHandoverEndDate('');
    setHandoverPin('');
  };

  const handleSearchHandoverIncoming = async () => {
    const raw = handoverSearchCid.replace(/\D/g, '');
    if (raw.length !== 13) return alert('กรุณากรอกเลขบัตรประชาชนคนใหม่ให้ครบ 13 หลัก');
    setHandoverSearching(true);
    try {
      const res = await authFetch(`${API_URL}/api/v3/search-citizen/${villageId}/${raw}`);
      const result = await res.json();
      if (result.success && result.data) {
        setHandoverIncoming(result.data);
      } else {
        alert(result.message || 'ไม่พบข้อมูลลูกบ้านในหมู่บ้านนี้');
        setHandoverIncoming(null);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setHandoverSearching(false);
    }
  };

  const handleSubmitHandover = async (e) => {
    e.preventDefault();
    if (handoverMode === 'REPLACE' && !handoverIncoming) {
      return alert('กรุณาค้นหาและเลือกผู้ที่จะมารับช่วงต่อก่อนครับ');
    }
    if (!handoverPin.trim()) {
      return alert('กรุณากรอกรหัส PIN อนุมัติของผู้ใหญ่บ้าน');
    }

    setHandoverSubmitting(true);
    try {
      const payload = {
        village_id: villageId,
        approver_account_id: currentAccountId,
        pin_code: handoverPin.trim(),
        outgoing_record_id: handoverTarget.id || handoverTarget.position_record_id,
        handover_reason: handoverReason.trim() || (handoverMode === 'REPLACE' ? 'ผลัดเปลี่ยนกรรมการและส่งมอบงาน' : 'พ้นวาระ / ปรับกลับเป็นประชาชน'),
        start_date: handoverStartDate,
        end_date: handoverEndDate || null,
        ...(handoverMode === 'REPLACE' && handoverIncoming
          ? {
              incoming_account_id: handoverIncoming.account_id || null,
              incoming_member_id: handoverIncoming.member_id || null,
              incoming_citizen_id: handoverIncoming.citizen_id || handoverSearchCid.replace(/\D/g, ''),
              incoming_full_name: `${handoverIncoming.first_name || ''} ${handoverIncoming.last_name || ''}`.trim()
            }
          : {})
      };

      const res = await authFetch(`${API_URL}/api/v3/committee-leaders/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setHandoverTarget(null);
        await fetchCommittees();
        await fetchLeaders(activeTab);
      } else {
        alert(result.message || 'ส่งมอบงานไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการส่งมอบงาน');
    } finally {
      setHandoverSubmitting(false);
    }
  };

  const activeCommitteeInfo = committees.find((c) => c.committee_id === activeTab);
  const pendingInTab = leadersFlat.filter((x) => x.status === 'PENDING_APPROVAL');
  const selectedTemplateObj = roleTemplates.find((t) => t.role_template_code === formData.role_template_code);

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans">
      <TopNavbar userData={userData} />

      <div className="max-w-7xl mx-auto p-4 pt-20">
        {/* ส่วนหัว + ปุ่มประวัติส่งมอบงาน + ปุ่มตั้งรหัส PIN */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-white p-4 rounded-2xl shadow-sm mb-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600"><Users size={24} /></div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800">ทำเนียบผู้นำและคณะทำงานหมู่บ้าน</h1>
              <p className="text-xs md:text-sm text-slate-500">
                หมู่บ้าน:{' '}
                {fullAddress.village_name
                  ? (fullAddress.village_name.startsWith('บ้าน') ? fullAddress.village_name : `บ้าน${fullAddress.village_name}`)
                  : '-'}{' '}
                หมู่ที่ {fullAddress.village_no || '-'}
                {fullAddress.tambon ? ` ต.${fullAddress.tambon}` : ''}
                {fullAddress.amphure ? ` อ.${fullAddress.amphure}` : ''}
                {fullAddress.province ? ` จ.${fullAddress.province}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {pendingInTab.length > 0 && (
              <button
                type="button"
                onClick={openApproveAll}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm animate-pulse"
              >
                <ShieldCheck size={16} /> อนุมัติทั้งผังนี้ ({pendingInTab.length} คนรออนุมัติ)
              </button>
            )}

            <button
              type="button"
              onClick={fetchHandoverHistory}
              className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <History size={15} /> ประวัติส่งมอบงาน (ห้ามลบ)
            </button>

            <button
              type="button"
              onClick={() => setIsPinSetupOpen(true)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                pinInfo.has_pin
                  ? 'bg-slate-800 hover:bg-slate-900 text-white border-slate-800'
                  : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300'
              }`}
            >
              <KeyRound size={15} />
              {pinInfo.has_pin ? 'เปลี่ยนรหัส PIN ผู้ใหญ่บ้าน' : 'ตั้งรหัส PIN ผู้ใหญ่บ้าน (จำเป็น)'}
            </button>
          </div>
        </div>

        {/* แถบเลือกคณะทำงาน */}
        <div className="flex overflow-x-auto gap-3 mb-6 pb-2 items-center px-1">
          {committees.map((c) => (
            <div key={c.committee_id} className="relative group shrink-0">
              <button
                onClick={() => setActiveTab(c.committee_id)}
                className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all shadow-sm flex items-center gap-2 ${
                  activeTab === c.committee_id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-blue-600'
                }`}
              >
                <span>{c.committee_name}</span>
                {Number(c.pending_count || 0) > 0 && (
                  <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                    รอ {c.pending_count}
                  </span>
                )}
              </button>

              {activeTab === c.committee_id && (
                <div className="absolute -top-2 -right-2 flex gap-1 z-10">
                  <button
                    onClick={() => openEditCommitteeModal(c)}
                    className="p-1.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-600 hover:text-white shadow-sm border border-blue-200"
                    title="แก้ไขชื่อแท็บ"
                  >
                    <Edit size={12} />
                  </button>
                  {(c.committee_name !== 'ผังผู้นำชุมชน' || committees.filter((x) => x.committee_name === 'ผังผู้นำชุมชน').length > 1) && (
                    <button
                      onClick={() => handleDeleteCommittee(c.committee_id, c.committee_name)}
                      className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-600 hover:text-white shadow-sm border border-red-200"
                      title="ลบแท็บนี้"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={() => { setCommitteeForm({ name: '', description: '', type_code: 'CUSTOM' }); setIsCommitteeModalOpen(true); }}
            className="px-4 py-2.5 rounded-full whitespace-nowrap text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <FolderPlus size={16} /> เพิ่มผังใหม่
          </button>
        </div>

        {/* คำอธิบายคณะทำงาน */}
        {activeCommitteeInfo && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <h2 className="text-lg md:text-xl font-bold text-slate-800 mt-1">{activeCommitteeInfo.committee_name}</h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl mx-auto">
              {activeCommitteeInfo.description || 'ยังไม่มีคำอธิบายหน้าที่ของคณะทำงานนี้'}
            </p>
            <div className="mt-2.5 flex justify-center gap-3 text-xs font-bold flex-wrap">
              <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                อนุมัติแล้ว {leadersFlat.filter((x) => x.status === 'ACTIVE').length} คน
              </span>
              {pendingInTab.length > 0 && (
                <span className="text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                  รอผู้ใหญ่บ้านอนุมัติ {pendingInTab.length} คน
                </span>
              )}
            </div>
          </div>
        )}

        {/* ผังต้นไม้ */}
        <div className="relative py-8 overflow-x-auto flex justify-center min-w-max md:min-w-full bg-slate-50/50 rounded-3xl">
          {committees.length === 0 ? (
            <div className="text-slate-500 py-10 font-bold text-sm">กรุณากด "เพิ่มผังใหม่" ด้านบนเพื่อเริ่มจัดทำเนียบครับ</div>
          ) : orgTree ? (
            <OrgNode
              node={orgTree}
              onAddNode={handleAddNode}
              onEditNode={handleEditNode}
              onRevokeNode={openRevokeSingle}
              onApproveNode={openApproveSingle}
              onHandoverNode={openHandoverModal}
            />
          ) : (
            <div className="text-slate-400 py-10 text-sm">กำลังโหลดข้อมูลผังองค์กร...</div>
          )}
        </div>
      </div>

      {/* Modal 1: เพิ่ม / แก้ไขผังคณะทำงาน */}
      {(isCommitteeModalOpen || isEditCommitteeModalOpen) && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className={`p-4 text-white flex justify-between items-center ${isEditCommitteeModalOpen ? 'bg-blue-600' : 'bg-emerald-600'}`}>
              <h2 className="text-base font-bold flex items-center gap-2">
                {isEditCommitteeModalOpen ? <><Edit size={18} /> แก้ไขผังคณะทำงาน</> : <><FolderPlus size={18} /> เพิ่มผังคณะทำงานใหม่</>}
              </h2>
              <button type="button" onClick={() => { setIsCommitteeModalOpen(false); setIsEditCommitteeModalOpen(false); }}><X size={22} /></button>
            </div>
            <form onSubmit={isEditCommitteeModalOpen ? handleUpdateCommittee : handleSaveCommittee} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทกลุ่มงาน (ใช้เชื่อมโมดูลระบบ)</label>
                <select
                  value={committeeForm.type_code}
                  onChange={(e) => setCommitteeForm({ ...committeeForm, type_code: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {COMMITTEE_TYPES.map((t) => (
                    <option key={t.code} value={t.code}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อคณะทำงาน / กลุ่ม *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คณะกรรมการน้ำประปาหมู่บ้าน, กลุ่มออมทรัพย์..."
                  value={committeeForm.name}
                  onChange={(e) => setCommitteeForm({ ...committeeForm, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">หน้าที่รับผิดชอบ (ย่อ)</label>
                <textarea
                  rows="3"
                  value={committeeForm.description}
                  onChange={(e) => setCommitteeForm({ ...committeeForm, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setIsCommitteeModalOpen(false); setIsEditCommitteeModalOpen(false); }} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 text-sm">ยกเลิก</button>
                <button type="submit" className={`flex-1 py-2.5 rounded-xl font-bold text-white text-sm ${isEditCommitteeModalOpen ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                  {isEditCommitteeModalOpen ? 'บันทึกการแก้ไข' : 'สร้างผังใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: เพิ่ม / แก้ไขบุคลากรในผัง */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-3 sm:p-4 z-[9999]">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white flex justify-between items-center shrink-0">
              <h2 className="text-base font-bold flex items-center gap-2">
                {editingSlot?.isNew ? <UserPlus size={18} /> : <Edit size={18} />}
                {editingSlot?.isNew ? 'เพิ่มบุคลากรลงผัง (รออนุมัติ)' : 'แก้ไขข้อมูลตำแหน่ง'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)}><X size={22} /></button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อตำแหน่งที่แสดงในผัง *</label>
                <input
                  type="text"
                  required
                  value={formData.role_name}
                  onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                  placeholder="เช่น ประธานกลุ่มน้ำ, คนเก็บค่าน้ำ, เหรัญญิก..."
                  className="w-full p-2.5 border-2 border-blue-200 bg-blue-50/40 rounded-xl text-sm font-bold text-blue-900"
                />
              </div>

              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
                <label className="block text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
                  <ShieldCheck size={14} /> ชุดสิทธิ์ในระบบ (กำหนดเมนูที่คนนี้จะเห็นหลังอนุมัติ) *
                </label>
                <select
                  value={formData.role_template_code}
                  onChange={(e) => setFormData({ ...formData, role_template_code: e.target.value })}
                  className="w-full p-2.5 border border-indigo-300 rounded-lg text-xs font-bold text-slate-800 bg-white"
                >
                  {roleTemplates.map((tpl) => (
                    <option key={tpl.role_template_code} value={tpl.role_template_code}>
                      {tpl.template_name_th}
                    </option>
                  ))}
                </select>
                {selectedTemplateObj && (
                  <div className="text-[11px] text-indigo-800 mt-1.5 leading-relaxed">
                    • {selectedTemplateObj.description}
                  </div>
                )}
              </div>

              {editingSlot?.isNew && !foundUser && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-xs font-bold text-slate-700 mb-2">ค้นหาลูกบ้านในหมู่บ้านนี้ (เลขบัตร 13 หลัก) *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength="17"
                      value={searchCitizenId}
                      onChange={(e) => setSearchCitizenId(formatCitizenId(e.target.value))}
                      placeholder="X-XXXX-XXXXX-XX-X"
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSearchUser}
                      disabled={isLoading}
                      className="bg-slate-800 text-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                      <Search size={15} /> {isLoading ? 'ค้นหา...' : 'ค้นหา'}
                    </button>
                  </div>
                </div>
              )}

              {(!editingSlot?.isNew || foundUser) && (
                <form id="leaderForm" onSubmit={handleSavePerson} className="space-y-3.5">
                  <div className="flex flex-col items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <img src={formData.previewUrl} alt="Preview" className="w-20 h-20 rounded-xl object-cover border-2 border-white shadow" />
                    {foundUser && (
                      <>
                        <h3 className="mt-2 font-bold text-slate-800 text-base">
                          {foundUser.first_name} {foundUser.last_name}
                        </h3>
                        {calcAgeText(foundUser.dob) && (
                          <span className="mt-0.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">
                            อายุ: {calcAgeText(foundUser.dob)}
                          </span>
                        )}
                        <div className={`text-[11px] font-bold mt-1 ${foundUser.has_app_account ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {foundUser.has_app_account
                            ? '✓ มีบัญชีแอป Ban Rao แล้ว (ปรับสิทธิ์ทันทีหลังอนุมัติ)'
                            : '• ยังไม่สมัครแอป (ระบบจะผูกสิทธิ์ให้อัตโนมัติเมื่อมาสมัคร)'}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">วันที่รับตำแหน่ง *</label>
                      <input type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">วันหมดวาระ</label>
                      <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">หน้าที่รับผิดชอบเพิ่มเติม</label>
                    <textarea rows="2" value={formData.responsibilities} onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })} placeholder="ระบุหน้าที่เฉพาะของบุคคลนี้..." className="w-full p-2.5 border border-slate-300 rounded-lg text-xs resize-none bg-white" />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900">
                    *หลังบันทึกแล้ว บุคคลนี้จะอยู่ในสถานะ <strong>รออนุมัติ</strong> จนกว่าผู้ใหญ่บ้านจะกดอนุมัติด้วยรหัส PIN
                  </div>
                </form>
              )}
            </div>

            <div className="bg-slate-50 p-3.5 border-t flex gap-2 shrink-0">
              <button type="button" onClick={() => { setIsModalOpen(false); setFoundUser(null); }} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 text-sm">ยกเลิก</button>
              <button
                type="submit"
                form="leaderForm"
                disabled={editingSlot?.isNew && !foundUser}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-200 disabled:text-slate-400"
              >
                <Save size={16} /> บันทึกลงผัง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: ตั้ง / เปลี่ยนรหัส PIN ผู้ใหญ่บ้าน */}
      {isPinSetupOpen && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-[9999]">
          <form onSubmit={handleSaveHeadmanPin} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <h2 className="text-base font-bold flex items-center gap-2"><KeyRound size={18} /> รหัส PIN อนุมัติของผู้ใหญ่บ้าน</h2>
              <button type="button" onClick={() => setIsPinSetupOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border">
                ใช้ยืนยันการ <strong>อนุมัติแต่งตั้ง</strong>, <strong>ส่งมอบงาน/เปลี่ยนตัวกรรมการ</strong>, <strong>ถอดถอนตำแหน่ง</strong> และ <strong>ยกเลิกใบเสร็จ</strong> ของหมู่บ้านนี้
              </div>
              {pinInfo.has_pin && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัส PIN เดิม *</label>
                  <input type="password" required value={pinSetupForm.old_pin} onChange={(e) => setPinSetupForm({ ...pinSetupForm, old_pin: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm font-mono" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">รหัส PIN ใหม่ (4-6 หลัก) *</label>
                <input type="password" required value={pinSetupForm.new_pin} onChange={(e) => setPinSetupForm({ ...pinSetupForm, new_pin: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ยืนยันรหัส PIN ใหม่ *</label>
                <input type="password" required value={pinSetupForm.confirm_pin} onChange={(e) => setPinSetupForm({ ...pinSetupForm, confirm_pin: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm font-mono" />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t flex gap-2">
              <button type="button" onClick={() => setIsPinSetupOpen(false)} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 text-sm">ยกเลิก</button>
              <button type="submit" disabled={savingPin} className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm">
                {savingPin ? 'กำลังบันทึก...' : 'บันทึกรหัส PIN'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 4: ยืนยันรหัส PIN (อนุมัติรายคน / อนุมัติทั้งผัง / ถอดถอน) */}
      {approvalModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[9999]">
          <form onSubmit={handleConfirmApprovalSubmit} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className={`p-4 text-white flex justify-between items-center ${approvalModal.mode === 'REVOKE_ONE' ? 'bg-red-600' : 'bg-amber-600'}`}>
              <h2 className="text-base font-bold flex items-center gap-2">
                <ShieldCheck size={19} />
                {approvalModal.mode === 'APPROVE_ONE'
                  ? 'อนุมัติแต่งตั้งตำแหน่ง (ผู้ใหญ่บ้าน)'
                  : approvalModal.mode === 'APPROVE_ALL'
                  ? `อนุมัติทั้งผัง (${approvalModal.pendingCount} คน)`
                  : 'ถอดถอนออกจากตำแหน่ง (ผู้ใหญ่บ้าน)'}
              </h2>
              <button type="button" onClick={() => setApprovalModal(null)}><X size={20} /></button>
            </div>

            <div className="p-5 space-y-3.5">
              {approvalModal.mode === 'APPROVE_ONE' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1 text-emerald-950">
                  <div className="font-bold flex items-center gap-1.5"><UserCheck size={14} /> {approvalModal.targetNode.first_name} {approvalModal.targetNode.last_name}</div>
                  <div>ตำแหน่งในผัง: <strong>{approvalModal.targetNode.role_name}</strong></div>
                  <div>ชุดสิทธิ์ที่ได้รับ: <strong>{approvalModal.targetNode.template_name_th}</strong></div>
                </div>
              )}

              {approvalModal.mode === 'APPROVE_ALL' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-950">
                  ยืนยันอนุมัติบุคลากรที่รออนุมัติทั้งหมด <strong>{approvalModal.pendingCount} คน</strong> ในผัง{' '}
                  <strong>"{activeCommitteeInfo?.committee_name}"</strong>
                </div>
              )}

              {approvalModal.mode === 'REVOKE_ONE' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-900">
                  ยืนยันถอดถอน <strong>{approvalModal.targetNode.first_name} {approvalModal.targetNode.last_name}</strong> ออกจากตำแหน่ง{' '}
                  <strong>"{approvalModal.targetNode.role_name}"</strong>
                  <div className="text-[11px] mt-1">
                    *ระบบจะปรับสถานะกลับเป็นประชาชนทั่วไป (CITIZEN) และเก็บประวัติการทำงานเดิมไว้ครบถ้วน
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ / เลขคำสั่ง (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder={approvalModal.mode === 'REVOKE_ONE' ? 'เช่น ครบวาระ / ลาออก' : 'เช่น ตามมติที่ประชุมหมู่บ้าน'}
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  className="w-full p-2.5 border rounded-lg text-xs"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-300">
                <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Lock size={14} className="text-red-600" /> กรอกรหัส PIN อนุมัติของผู้ใหญ่บ้าน *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="กรอกรหัส PIN เพื่อยืนยัน..."
                  value={approvalPin}
                  onChange={(e) => setApprovalPin(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-mono bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex gap-2">
              <button type="button" onClick={() => setApprovalModal(null)} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 text-sm">ยกเลิก</button>
              <button
                type="submit"
                disabled={processingApproval}
                className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm ${
                  approvalModal.mode === 'REVOKE_ONE' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {processingApproval ? 'กำลังดำเนินการ...' : approvalModal.mode === 'REVOKE_ONE' ? 'ยืนยันถอดถอน' : 'ยืนยันอนุมัติ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 5: ผลัดเปลี่ยนกรรมการ / ส่งมอบงาน (ปรับคนเดิมกลับเป็นประชาชน + ไม่กระทบประวัติเดิม) */}
      {handoverTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-3 sm:p-4 z-[9999]">
          <form onSubmit={handleSubmitHandover} className="bg-white rounded-2xl w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-700 to-blue-700 p-4 text-white flex justify-between items-center shrink-0">
              <h2 className="text-base font-bold flex items-center gap-2">
                <RefreshCw size={18} /> ผลัดเปลี่ยนกรรมการ / ส่งมอบงาน
              </h2>
              <button type="button" onClick={() => setHandoverTarget(null)}><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3.5 text-xs">
              {/* ข้อมูลกรรมการเดิมที่จะพ้นวาระ */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <div className="text-[11px] font-bold text-slate-500">กรรมการเดิม (จะถูกปรับสถานะกลับเป็นประชาชน)</div>
                <div className="font-bold text-slate-900 text-sm">
                  {handoverTarget.first_name} {handoverTarget.last_name}
                </div>
                <div>ตำแหน่ง: <strong className="text-blue-700">{handoverTarget.role_name}</strong> ({handoverTarget.template_name_th})</div>
                <div className="text-[11px] text-emerald-700 pt-1">
                  ✓ ประวัติการจดมิเตอร์ บิล ใบเสร็จ และรายงานย้อนหลังทั้งหมดยังคงชื่อเดิมแบบ Snapshot ไม่เปลี่ยนตามคนใหม่
                </div>
              </div>

              {/* เลือกรูปแบบการส่งมอบ */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHandoverMode('REPLACE')}
                  className={`p-2.5 rounded-xl border-2 font-bold text-left ${
                    handoverMode === 'REPLACE' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  ตั้งคนใหม่รับช่วงต่อทันที
                </button>
                <button
                  type="button"
                  onClick={() => { setHandoverMode('STEP_DOWN_ONLY'); setHandoverIncoming(null); }}
                  className={`p-2.5 rounded-xl border-2 font-bold text-left ${
                    handoverMode === 'STEP_DOWN_ONLY' ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  ปรับกลับเป็นประชาชนอย่างเดียว
                </button>
              </div>

              {/* ค้นหาคนใหม่มารับช่วงต่อ */}
              {handoverMode === 'REPLACE' && (
                <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 space-y-2.5">
                  <label className="block font-bold text-indigo-900">ค้นหาผู้มารับตำแหน่งแทน (เลขบัตร 13 หลักในหมู่บ้านนี้) *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength="17"
                      value={handoverSearchCid}
                      onChange={(e) => setHandoverSearchCid(formatCitizenId(e.target.value))}
                      placeholder="X-XXXX-XXXXX-XX-X"
                      className="w-full p-2 border border-indigo-300 rounded-lg text-sm font-mono bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleSearchHandoverIncoming}
                      disabled={handoverSearching}
                      className="px-3.5 py-2 bg-indigo-700 text-white rounded-lg font-bold shrink-0 flex items-center gap-1"
                    >
                      <Search size={14} /> {handoverSearching ? '...' : 'ค้นหา'}
                    </button>
                  </div>

                  {handoverIncoming && (
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-indigo-200">
                      <img src={handoverIncoming.user_image || '/profile-img.jpg'} alt="" className="w-11 h-11 rounded-lg object-cover border" />
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {handoverIncoming.first_name} {handoverIncoming.last_name}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-semibold">
                          พร้อมรับช่วงต่อในตำแหน่ง "{handoverTarget.role_name}" ทันที
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">วันเริ่มงานคนใหม่</label>
                      <input type="date" value={handoverStartDate} onChange={(e) => setHandoverStartDate(e.target.value)} className="w-full p-2 border rounded-lg bg-white" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">วันหมดวาระ (ถ้ามี)</label>
                      <input type="date" value={handoverEndDate} onChange={(e) => setHandoverEndDate(e.target.value)} className="w-full p-2 border rounded-lg bg-white" />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">เหตุผลการผลัดเปลี่ยน / เลขคำสั่ง</label>
                <input
                  type="text"
                  placeholder="เช่น ครบวาระปี 2569 / ลาออก / ส่งมอบหน้าที่ตามมติที่ประชุม"
                  value={handoverReason}
                  onChange={(e) => setHandoverReason(e.target.value)}
                  className="w-full p-2.5 border rounded-lg text-xs"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-300">
                <label className="block font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Lock size={14} className="text-red-600" /> กรอกรหัส PIN ผู้ใหญ่บ้านเพื่อยืนยันส่งมอบงาน *
                </label>
                <input
                  type="password"
                  required
                  placeholder="กรอกรหัส PIN ผู้ใหญ่บ้าน..."
                  value={handoverPin}
                  onChange={(e) => setHandoverPin(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-mono bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex gap-2 shrink-0">
              <button type="button" onClick={() => setHandoverTarget(null)} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 text-sm">ยกเลิก</button>
              <button
                type="submit"
                disabled={handoverSubmitting || (handoverMode === 'REPLACE' && !handoverIncoming)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-sm disabled:bg-slate-300"
              >
                {handoverSubmitting ? 'กำลังบันทึก...' : 'ยืนยันส่งมอบงาน'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 6: ประวัติการผลัดเปลี่ยนกรรมการและส่งมอบงานถาวร (อ่านอย่างเดียว ล็อกห้ามลบ) */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-3 sm:p-4 z-[9999]">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2"><History size={18} /> ประวัติการผลัดเปลี่ยนกรรมการและส่งมอบงาน</h2>
                <div className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                  <Lock size={11} /> บันทึกถาวรระดับฐานข้อมูล • ล็อกห้ามลบทุกกรณี
                </div>
              </div>
              <button type="button" onClick={() => setIsHistoryOpen(false)}><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {loadingLogs ? (
                <div className="text-center py-10 text-slate-400 text-sm">กำลังโหลดประวัติ...</div>
              ) : handoverLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">ยังไม่มีประวัติการผลัดเปลี่ยนกรรมการในหมู่บ้านนี้</div>
              ) : (
                handoverLogs.map((log) => (
                  <div key={log.handover_id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span className="font-bold text-indigo-800">
                        {log.committee_name || 'คณะทำงาน'} • ตำแหน่ง: {log.position_title}
                      </span>
                      <span className="text-[11px] text-slate-500">{formatThaiDateTime(log.handover_at)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs">
                        เดิม: {log.outgoing_full_name} → ปรับเป็น {log.outgoing_new_role || 'CITIZEN'}
                      </span>
                      {log.incoming_full_name && (
                        <>
                          <ArrowRight size={14} className="text-slate-400" />
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-xs">
                            คนใหม่: {log.incoming_full_name}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-slate-600">เหตุผล: {log.handover_reason || '-'}</div>
                    <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-200">
                      <span>อนุมัติโดย: <strong>{log.approved_by_name || 'ผู้ใหญ่บ้าน'}</strong></span>
                      <span className="inline-flex items-center gap-1 text-slate-600 font-semibold"><Lock size={10} /> ห้ามลบ</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 bg-slate-50 border-t text-right shrink-0">
              <button type="button" onClick={() => setIsHistoryOpen(false)} className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      <BottomNavbar />
    </div>
  );
};

export default CommunityLeaders;