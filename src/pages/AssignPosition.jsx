import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, MapPin, Save, User, Map, Building, FileText, KeyRound, X } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; 
import BottomNavbar from '../components/BottomNavbar'; 

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const AssignPosition = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  const [searchCitizenId, setSearchCitizenId] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedVillageId, setSelectedVillageId] = useState('');
  const [villagesList, setVillagesList] = useState([]);
  
  // State สำหรับรหัสผ่านชุดที่ 2
  const [showPinModal, setShowPinModal] = useState(false);
  const [approvalPin, setApprovalPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [assignmentSuccess, setAssignmentSuccess] = useState(false);

  // ดึงรายการหมู่บ้านจาก Database ผ่าน API
  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/villages-list`);
        const result = await res.json();
        if (result.success) setVillagesList(result.data);
      } catch (error) { console.error("เกิดข้อผิดพลาดในการดึงหมู่บ้าน:", error); }
    };
    fetchVillages();
  }, []);

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

  const handleSearchUser = async () => {
    const rawCitizenId = searchCitizenId.replace(/-/g, ''); 
    if (rawCitizenId.length !== 13) return alert("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก");
    setIsLoading(true);
    setAssignmentSuccess(false);
    
    try {
        // เรียก API ค้นหาข้อมูลแบบเต็ม
        const res = await fetch(`${API_URL}/api/search-citizen-full/${rawCitizenId}`);
        const result = await res.json();
        
        if (result.success) {
            setFoundUser(result.data);
        } else {
            alert(result.message || 'ไม่พบข้อมูลประชาชน');
            setFoundUser(null);
        }
    } catch (error) { alert('ระบบขัดข้อง'); } 
    finally { setIsLoading(false); }
  };

  const openPinModal = (e) => {
    e.preventDefault();
    if (!foundUser || !selectedVillageId) return alert('กรุณาเลือกหมู่บ้านให้ครบถ้วน');
    setShowPinModal(true);
  };

  const confirmAssignment = async () => {
    if (!approvalPin) return alert('กรุณาระบุรหัสผ่านอนุมัติ');
    setIsProcessing(true);

    try {
        const res = await fetch(`${API_URL}/api/assign-role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_account_id: foundUser.account_id,
                position_id: 6, 
                scope_type: 'VILLAGE',
                scope_id: selectedVillageId,
                assigner_account_id: userData.id || userData.account_id,
                approval_pin: approvalPin
            })
        });

        const result = await res.json();
        if (result.success) {
            setAssignmentSuccess(true);
            setShowPinModal(false);
            setApprovalPin('');
        } else {
            alert('ล้มเหลว: ' + result.message);
        }
    } catch (error) {
        alert('เชื่อมต่อระบบล้มเหลว');
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 font-sans bg-gradient-to-br from-indigo-900 via-purple-900 to-fuchsia-900 relative overflow-hidden">
      
      {/* เอฟเฟกต์พื้นหลัง */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/30 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/30 rounded-full blur-[100px]"></div>

      <div><TopNavbar userData={userData} /></div>
      
      <div className="max-w-3xl mx-auto p-4 pt-24 relative z-10">
        
        {/* ==================================================== */}
        {/* หน้าจอหลัก UI แบบ Glassmorphism */}
        {/* ==================================================== */}
        {!assignmentSuccess && (
          <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20">
            <div className="flex items-center gap-5 mb-8 border-b border-white/10 pb-6">
              <div className="p-4 bg-gradient-to-tr from-purple-500 to-indigo-500 text-white rounded-2xl shadow-lg shadow-purple-500/30">
                <ShieldCheck size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-wide">แต่งตั้งตำแหน่ง</h1>
                <p className="text-sm text-purple-200 mt-1">ระบบบริหารจัดการและแต่งตั้งผู้นำชุมชน</p>
              </div>
            </div>

            <div className="mb-8 p-6 bg-black/20 rounded-2xl border border-white/5">
              <label className="text-sm font-bold text-purple-200 mb-4 flex items-center gap-2"><Search size={18}/> ค้นหาผู้ใช้งานระบบ</label>
              <div className="flex gap-3 flex-col sm:flex-row">
                  <input type="text" value={searchCitizenId} onChange={(e) => setSearchCitizenId(formatCitizenId(e.target.value))} placeholder="เลขประจำตัวประชาชน 13 หลัก" className="flex-1 p-4 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-purple-400 text-white font-mono tracking-widest font-bold transition-all" />
                  <button onClick={handleSearchUser} disabled={isLoading} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:from-purple-500 shadow-lg shadow-purple-500/25 transition-all">
                    {isLoading ? 'ค้นหา...' : 'ค้นหาข้อมูล'}
                  </button>
              </div>
            </div>

            {foundUser && (
              <form onSubmit={openPinModal} className="animate-fade-in-up">
                
                <div className="bg-black/20 border border-white/10 rounded-2xl p-6 mb-6">
                  <div className="flex items-start gap-6">
                    <img src={foundUser.user_image || '/profile-img.jpg'} alt="Profile" className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]" />
                    <div className="flex-1 text-white">
                      <div className="text-sm text-emerald-400 font-bold mb-1 flex items-center gap-1"><User size={14}/> ข้อมูลส่วนบุคคล (ยืนยันตัวตนแล้ว)</div>
                      <div className="font-black text-2xl mb-4">{foundUser.first_name} {foundUser.last_name}</div>
                      
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-purple-100 bg-white/5 p-4 rounded-xl border border-white/10">
                        <div><span className="text-purple-300">เพศ:</span> {foundUser.gender || 'ไม่ระบุ'}</div>
                        <div><span className="text-purple-300">อายุ:</span> {foundUser.age || '-'} ปี</div>
                        <div><span className="text-purple-300">เกิด:</span> {foundUser.birth_date}</div>
                        <div><span className="text-purple-300">ตำแหน่งเดิม:</span> {foundUser.prev_position}</div>
                        <div className="col-span-2"><span className="text-purple-300">ที่อยู่:</span> {foundUser.address}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 p-6 rounded-2xl border border-white/5 mb-8">
                  <label className="text-sm font-bold text-purple-200 mb-3 flex items-center gap-2"><MapPin size={16} className="text-emerald-400"/> เลือกพื้นที่มอบหมาย (หมู่บ้าน)</label>
                  <select required value={selectedVillageId} onChange={(e) => setSelectedVillageId(e.target.value)} className="w-full p-4 bg-white/10 border border-white/20 rounded-xl outline-none text-white font-bold appearance-none transition-all cursor-pointer">
                    <option value="" disabled className="bg-slate-900 text-white/50">-- เลือกหมู่บ้านเป้าหมาย --</option>
                    {villagesList.map((v, idx) => (<option key={idx} value={v.village_id} className="bg-slate-800 text-white">{v.name}</option>))}
                  </select>
                </div>

                <button type="submit" className="w-full py-4 rounded-xl font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] flex justify-center items-center gap-2 transition-all active:scale-[0.98] text-lg">
                  <FileText size={22} /> ยืนยันข้อมูลและแต่งตั้ง
                </button>
              </form>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* หน้าจอความสำเร็จ */}
        {/* ==================================================== */}
        {assignmentSuccess && (
          <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20 text-center animate-fade-in-up">
            
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              <ShieldCheck size={48} />
            </div>
            
            <h2 className="text-3xl font-black text-white mb-2">แต่งตั้งสำเร็จ!</h2>
            <p className="text-purple-200 mb-8">ระบบได้บันทึกข้อมูลและปรับปรุงสถานะเรียบร้อยแล้ว</p>
            
            <div className="bg-black/20 p-6 rounded-2xl border border-white/5 inline-block text-left mb-10 w-full max-w-md">
                <div className="text-sm text-purple-300 mb-1">ผู้ได้รับการแต่งตั้ง</div>
                <div className="text-xl font-bold text-white mb-4">{foundUser.first_name} {foundUser.last_name}</div>

                <div className="text-sm text-purple-300 mb-1">ตำแหน่งที่ได้รับมอบหมาย</div>
                <div className="text-lg font-bold text-emerald-400 mb-4">ผู้ใหญ่บ้าน {villagesList.find(v => v.village_id === selectedVillageId)?.name}</div>
                
                <div className="text-sm text-purple-300 mb-1">อนุมัติโดย (E-Signature)</div>
                <div className="font-bold text-white">{userData.firstName} {userData.lastName}</div>
            </div>

            <div className="flex justify-center">
                <button onClick={() => {
                  setAssignmentSuccess(false);
                  setFoundUser(null);
                  setSearchCitizenId('');
                  setSelectedVillageId('');
                }} className="px-8 py-4 bg-white/10 border border-white/20 rounded-xl font-bold text-white hover:bg-white/20 transition-all">
                  ทำรายการแต่งตั้งบุคคลอื่นต่อ
                </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* Modal ยืนยันรหัสผ่านชุดที่ 2 (E-Signature) */}
        {/* ==================================================== */}
        {showPinModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden transform transition-all border-t-4 border-blue-500 p-8 text-center relative">
              <button onClick={() => setShowPinModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
              
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <KeyRound size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">ยืนยันรหัสผ่านอนุมัติ</h2>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">กรุณากรอกรหัสผ่านชุดที่ 2 เพื่อยืนยันการทำรายการด้วยลายมือชื่ออิเล็กทรอนิกส์ (E-Signature)</p>
              
              <input 
                type="password" maxLength="6" placeholder="******" 
                value={approvalPin} onChange={(e) => setApprovalPin(e.target.value)}
                className="w-full text-center p-4 text-2xl tracking-[1em] font-black bg-slate-100 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all mb-6"
              />
              
              <button onClick={confirmAssignment} disabled={isProcessing} className="w-full py-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2">
                {isProcessing ? 'กำลังตรวจสอบและประทับตรา...' : 'ประทับตราและอนุมัติ'}
              </button>
            </div>
          </div>
        )}

      </div>

      <div>
        <BottomNavbar />
      </div>

    </div>
  );
};

export default AssignPosition;