import React, { useState } from 'react'; // 🌟 ลบ useEffect ออก
import { Search, ShieldCheck, MapPin, Save, User, Map, Building, FileText, KeyRound, X } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; 
import BottomNavbar from '../components/BottomNavbar'; 

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const AssignPosition = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  const [searchCitizenId, setSearchCitizenId] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 🌟 ลบ State selectedVillageId และ villagesList ออกไปเลย
  // const [selectedVillageId, setSelectedVillageId] = useState('');
  // const [villagesList, setVillagesList] = useState([]);
  
  const [showPinModal, setShowPinModal] = useState(false);
  const [approvalPin, setApprovalPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [assignmentSuccess, setAssignmentSuccess] = useState(false);

  // 🌟 ลบ useEffect fetchVillages() ทิ้งไปเลย

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
    // 🌟 เปลี่ยนเงื่อนไขการเช็ค ให้เช็คว่ามีหมู่บ้านผูกกับโปรไฟล์ไหม
    if (!foundUser || !foundUser.village_id) return alert('ไม่สามารถแต่งตั้งได้ เนื่องจากประชาชนท่านนี้ยังไม่ได้ระบุหมู่บ้านในระบบ');
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
                // 🌟 ดึงหมู่บ้านจากข้อมูลคนที่ค้นหาเจอโดยตรง ไม่ต้องให้เลือก
                scope_id: foundUser.village_id, 
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
    <div className="min-h-screen pb-24 font-sans relative overflow-hidden bg-hex-pattern">
      
      <div><TopNavbar userData={userData} /></div>
      
      <div className="max-w-3xl mx-auto p-4 pt-24 relative z-10">
        
        {!assignmentSuccess && (
          <div className="bg-white bg-opacity-70 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/40">
            <div className="flex items-center gap-5 mb-8 border-b border-slate-200 pb-6">
              <div className="p-4 bg-gradient-to-tr from-purple-500 to-indigo-500 text-white rounded-2xl shadow-lg shadow-purple-500/30">
                <ShieldCheck size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-wide">แต่งตั้งตำแหน่ง</h1>
                <p className="text-sm text-slate-500 mt-1">ระบบบริหารจัดการและแต่งตั้งผู้นำชุมชน</p>
              </div>
            </div>

            <div className="mb-8 p-6 bg-white/50 rounded-2xl border border-white/60">
              <label className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><Search size={18}/> ค้นหาผู้ใช้งานระบบ</label>
              <div className="flex gap-3 flex-col sm:flex-row">
                  <input type="text" value={searchCitizenId} onChange={(e) => setSearchCitizenId(formatCitizenId(e.target.value))} placeholder="เลขประจำตัวประชาชน 13 หลัก" className="flex-1 p-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-purple-400 text-slate-800 font-mono tracking-widest font-bold transition-all shadow-sm" />
                  <button onClick={handleSearchUser} disabled={isLoading} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:from-purple-500 shadow-lg shadow-purple-500/25 transition-all">
                    {isLoading ? 'ค้นหา...' : 'ค้นหาข้อมูล'}
                  </button>
              </div>
            </div>

            {foundUser && (
              <form onSubmit={openPinModal} className="animate-fade-in-up">
                
                <div className="bg-white/60 border border-white/80 rounded-2xl p-6 mb-6 shadow-sm">
                  <div className="flex items-start gap-6">
                    <img src={foundUser.user_image || '/profile-img.jpg'} alt="Profile" className="w-24 h-24 rounded-2xl object-cover border-2 border-white shadow-[0_0_15px_rgba(0,0,0,0.1)]" />
                    <div className="flex-1 text-slate-800">
                      <div className="text-sm text-emerald-600 font-bold mb-1 flex items-center gap-1"><User size={14}/> ข้อมูลส่วนบุคคล (ยืนยันตัวตนแล้ว)</div>
                      <div className="font-black text-2xl mb-4">{foundUser.first_name} {foundUser.last_name}</div>
                      
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-slate-700 bg-white/50 p-4 rounded-xl border border-slate-200">
                        <div><span className="text-slate-500">เพศ:</span> {foundUser.gender || 'ไม่ระบุ'}</div>
                        <div><span className="text-slate-500">อายุ:</span> {foundUser.age || '-'} ปี</div>
                        <div><span className="text-slate-500">เกิด:</span> {foundUser.birth_date}</div>
                        <div><span className="text-slate-500">ตำแหน่งเดิม:</span> {foundUser.prev_position}</div>
                        <div className="col-span-2"><span className="text-slate-500">ที่อยู่:</span> {foundUser.address}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/50 p-6 rounded-2xl border border-white/60 mb-8 shadow-sm">
                  <label className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><MapPin size={16} className="text-emerald-500"/> พื้นที่ปกครอง (ภูมิลำเนาของผู้รับตำแหน่ง)</label>
                  
                  {/* 🌟 เปลี่ยนจาก <select> เป็น <div> แสดงข้อความแบบล็อก (Read-only) */}
                  <div className="w-full p-4 bg-slate-100 border border-slate-300 rounded-xl text-slate-600 font-bold shadow-inner flex items-center justify-between">
                      {foundUser.village_name ? `หมู่บ้าน: ${foundUser.village_name}` : <span className="text-red-500">ยังไม่ระบุหมู่บ้าน (ไม่สามารถแต่งตั้งได้)</span>}
                      <ShieldCheck size={20} className="text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 mt-2 ml-1">* ตามกฎหมาย ผู้ถูกแต่งตั้งต้องมีภูมิลำเนาอยู่ในหมู่บ้านที่จะปกครองเท่านั้น (ระบบไม่อนุญาตให้เปลี่ยนพื้นที่)</p>
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
          <div className="bg-white bg-opacity-80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white text-center animate-fade-in-up">
            
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              <ShieldCheck size={48} />
            </div>
            
            <h2 className="text-3xl font-black text-slate-800 mb-2">แต่งตั้งสำเร็จ!</h2>
            <p className="text-slate-600 mb-8">ระบบได้บันทึกข้อมูลและปรับปรุงสถานะเรียบร้อยแล้ว</p>
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 inline-block text-left mb-10 w-full max-w-md shadow-inner">
                <div className="text-sm text-slate-500 mb-1">ผู้ได้รับการแต่งตั้ง</div>
                <div className="text-xl font-bold text-slate-800 mb-4">{foundUser.first_name} {foundUser.last_name}</div>

                <div className="text-sm text-slate-500 mb-1">ตำแหน่งที่ได้รับมอบหมาย</div>
                <div className="text-lg font-bold text-emerald-600 mb-4">ผู้ใหญ่บ้าน {foundUser.village_name}</div>
                
                <div className="text-sm text-slate-500 mb-1">อนุมัติโดย (E-Signature)</div>
                <div className="font-bold text-slate-800">{userData.firstName} {userData.lastName}</div>
            </div>

            <div className="flex justify-center">
                <button onClick={() => {
                  setAssignmentSuccess(false);
                  setFoundUser(null);
                  setSearchCitizenId('');
                }} className="px-8 py-4 bg-slate-200 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-300 transition-all shadow-sm">
                  ทำรายการแต่งตั้งบุคคลอื่นต่อ
                </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* Modal ยืนยันรหัสผ่านชุดที่ 2 (E-Signature) */}
        {/* ==================================================== */}
        {showPinModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
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
                className="w-full text-center p-4 text-2xl tracking-[1em] font-black bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all mb-6 shadow-inner"
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