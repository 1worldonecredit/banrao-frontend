import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, MapPin, Save, User, Map, Building, FileText, KeyRound, X, Download } from 'lucide-react';
import TopNavbar from '../components/TopNavbar'; 

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const AssignPosition = () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  const [searchCitizenId, setSearchCitizenId] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedVillageId, setSelectedVillageId] = useState('');
  const [villagesList, setVillagesList] = useState([]);
  
  // State สำหรับรหัสผ่านชุดที่ 2 และ PDF
  const [showPinModal, setShowPinModal] = useState(false);
  const [approvalPin, setApprovalPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [assignmentSuccess, setAssignmentSuccess] = useState(false);

// 🌟 ดึงรายการหมู่บ้านจาก API ทันทีที่โหลดหน้านี้
  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/villages-list`);
        const result = await res.json();
        
        if (result.success) {
          // นำข้อมูลหมู่บ้านจริงๆ จาก Database มาใส่ใน State
          setVillagesList(result.data);
        } else {
          console.error("ดึงข้อมูลหมู่บ้านล้มเหลว");
        }
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงหมู่บ้าน:", error);
      }
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
        const res = await fetch(`${API_URL}/api/search-citizen/${rawCitizenId}`);
        const result = await res.json();
        if (result.success) {
            // จำลองข้อมูลเพิ่มเติมที่ได้จาก API
            const mockFullData = {
              ...result.data,
              gender: 'ชาย',
              birth_date: '15 ตุลาคม 2520',
              age: 49,
              address: '12/3 หมู่ 1 ต.บ้านเป็ด อ.เมือง จ.ขอนแก่น',
              prev_position: 'ผู้ช่วยผู้ใหญ่บ้าน (ฝ่ายรักษาความสงบ)'
            };
            setFoundUser(mockFullData);
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
                assigner_account_id: userData.id,
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

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen pb-24 font-sans bg-gradient-to-br from-indigo-900 via-purple-900 to-fuchsia-900 relative overflow-hidden print:bg-white print:p-0">
      
      {/* เอฟเฟกต์พื้นหลัง (ซ่อนตอนปริ้นท์) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/30 rounded-full blur-[100px] print:hidden"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/30 rounded-full blur-[100px] print:hidden"></div>

      <div className="print:hidden"><TopNavbar userData={userData} /></div>
      
      <div className="max-w-3xl mx-auto p-4 pt-24 relative z-10 print:pt-0 print:p-8 print:max-w-full">
        
        {/* ==================================================== */}
        {/* หน้าจอหลัก UI แบบ Glassmorphism (ซ่อนเมื่อพิมพ์ PDF) */}
        {/* ==================================================== */}
        {!assignmentSuccess && (
          <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20 print:hidden">
            <div className="flex items-center gap-5 mb-8 border-b border-white/10 pb-6">
              <div className="p-4 bg-gradient-to-tr from-purple-500 to-indigo-500 text-white rounded-2xl shadow-lg shadow-purple-500/30">
                <ShieldCheck size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-wide">แต่งตั้งตำแหน่ง (ผู้ใหญ่บ้าน)</h1>
                <p className="text-sm text-purple-200 mt-1">ระบบบริหารจัดการสำหรับนายอำเภอ / ปลัดอำเภอ</p>
              </div>
            </div>

            <div className="mb-8 p-6 bg-black/20 rounded-2xl border border-white/5">
              <label className="text-sm font-bold text-purple-200 mb-4 flex items-center gap-2"><Search size={18}/> ค้นหาประชาชน</label>
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
                      <div className="text-sm text-emerald-400 font-bold mb-1 flex items-center gap-1"><User size={14}/> ข้อมูลประชาชน (ยืนยันตัวตนแล้ว)</div>
                      <div className="font-black text-2xl mb-4">{foundUser.first_name} {foundUser.last_name}</div>
                      
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-purple-100 bg-white/5 p-4 rounded-xl border border-white/10">
                        <div><span className="text-purple-300">เพศ:</span> {foundUser.gender}</div>
                        <div><span className="text-purple-300">อายุ:</span> {foundUser.age} ปี</div>
                        <div><span className="text-purple-300">เกิด:</span> {foundUser.birth_date}</div>
                        <div><span className="text-purple-300">ตำแหน่งเดิม:</span> {foundUser.prev_position || '-'}</div>
                        <div className="col-span-2"><span className="text-purple-300">ที่อยู่:</span> {foundUser.address}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 p-6 rounded-2xl border border-white/5 mb-8">
                  <label className="text-sm font-bold text-purple-200 mb-3 flex items-center gap-2"><MapPin size={16} className="text-emerald-400"/> เลือกพื้นที่ (หมู่บ้าน)</label>
                  <select required value={selectedVillageId} onChange={(e) => setSelectedVillageId(e.target.value)} className="w-full p-4 bg-white/10 border border-white/20 rounded-xl outline-none text-white font-bold appearance-none transition-all cursor-pointer">
                    <option value="" disabled className="bg-slate-900 text-white/50">-- เลือกหมู่บ้านเป้าหมาย --</option>
                    {villagesList.map((v, idx) => (<option key={idx} value={v.village_id} className="bg-slate-800 text-white">{v.name}</option>))}
                  </select>
                </div>

                <button type="submit" className="w-full py-4 rounded-xl font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] flex justify-center items-center gap-2 transition-all active:scale-[0.98] text-lg">
                  <FileText size={22} /> ร่างเอกสารและยืนยันการแต่งตั้ง
                </button>
              </form>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* หน้าจอความสำเร็จ และ แบบฟอร์ม PDF สำหรับสั่งปริ้นท์ */}
        {/* ==================================================== */}
        {assignmentSuccess && (
          <div className="bg-white p-10 rounded-none md:rounded-2xl shadow-none md:shadow-2xl text-slate-800 print:shadow-none print:p-0">
            
            {/* ปุ่มคำสั่ง (ซ่อนตอนพิมพ์) */}
            <div className="flex justify-between items-center mb-8 border-b pb-4 print:hidden">
              <div className="text-emerald-600 font-bold flex items-center gap-2"><ShieldCheck size={24}/> อนุมัติและบันทึกข้อมูลสำเร็จ</div>
              <div className="flex gap-2">
                <button onClick={() => setAssignmentSuccess(false)} className="px-4 py-2 bg-slate-100 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition">กลับหน้าแรก</button>
                <button onClick={handlePrintPDF} className="px-4 py-2 bg-blue-600 rounded-lg font-bold text-white hover:bg-blue-700 flex items-center gap-2 shadow-lg"><Download size={18}/> บันทึก/พิมพ์ PDF</button>
              </div>
            </div>

            {/* รูปแบบเอกสารราชการ (สำหรับแสดงผลและพิมพ์) */}
            <div className="font-serif leading-relaxed max-w-[210mm] mx-auto bg-white" style={{ minHeight: '297mm' }}>
              <div className="text-center mb-10">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Garuda_of_Thailand.svg/200px-Garuda_of_Thailand.svg.png" alt="ตราครุฑ" className="w-20 mx-auto mb-4" />
                <h2 className="text-xl font-bold">หนังสือแต่งตั้งผู้ใหญ่บ้าน</h2>
                <p className="text-lg">ที่ว่าการอำเภอเมือง จังหวัดขอนแก่น</p>
              </div>
              
              <div className="text-right mb-8">
                วันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>

              <div className="mb-6 indent-12 text-justify">
                อาศัยอำนาจตามความในมาตรา ๑๒ แห่งพระราชบัญญัติลักษณะปกครองท้องที่ พระพุทธศักราช ๒๔๕๗ และที่แก้ไขเพิ่มเติม นายอำเภอเมือง จังหวัดขอนแก่น จึงขอแต่งตั้งให้:
              </div>

              <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl mb-8 flex gap-6 items-center">
                 <img src={foundUser.user_image || '/profile-img.jpg'} alt="Profile" className="w-28 h-28 rounded-xl object-cover shadow-md" />
                 <div>
                   <div className="text-2xl font-bold text-slate-900 mb-2">{foundUser.first_name} {foundUser.last_name}</div>
                   <div className="text-sm text-slate-600 grid grid-cols-2 gap-2">
                     <div><strong className="text-slate-800">อายุ:</strong> {foundUser.age} ปี</div>
                     <div><strong className="text-slate-800">เพศ:</strong> {foundUser.gender}</div>
                     <div className="col-span-2"><strong className="text-slate-800">ที่อยู่:</strong> {foundUser.address}</div>
                     <div className="col-span-2"><strong className="text-slate-800">ตำแหน่งเดิม:</strong> {foundUser.prev_position || '-'}</div>
                   </div>
                 </div>
              </div>

              <div className="mb-12 indent-12 text-justify">
                ดำรงตำแหน่ง <strong>ผู้ใหญ่บ้าน {villagesList.find(v => v.village_id === selectedVillageId)?.name}</strong> โดยให้มีหน้าที่ปกครองดูแลรักษาความสงบเรียบร้อย และอำนวยความเป็นธรรมให้แก่ราษฎรในพื้นที่รับผิดชอบ ตั้งแต่บัดนี้เป็นต้นไป
              </div>

              {/* ลายเซ็นอิเล็กทรอนิกส์ */}
              <div className="flex justify-end mt-16">
                <div className="text-center">
                  <div className="border-2 border-dashed border-blue-300 bg-blue-50/50 rounded-xl p-4 mb-2 w-64">
                     <div className="text-blue-600 font-black italic text-2xl mb-1">{userData.firstName} {userData.lastName}</div>
                     <div className="text-[10px] text-blue-500/70 border-t border-blue-200 pt-1 mt-1">E-SIGNATURE VERIFIED</div>
                     <div className="text-[9px] text-slate-400 font-sans tracking-tight">Approved via Secure PIN by {userData.username}</div>
                  </div>
                  <div className="text-sm font-bold">({userData.firstName} {userData.lastName})</div>
                  <div className="text-sm text-slate-600 mt-1">นายอำเภอเมือง จังหวัดขอนแก่น</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* Modal ยืนยันรหัสผ่านชุดที่ 2 (E-Signature) */}
        {/* ==================================================== */}
        {showPinModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden transform transition-all border-t-4 border-blue-500 p-8 text-center relative">
              <button onClick={() => setShowPinModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
              
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <KeyRound size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">ยืนยันรหัสผ่านอนุมัติ</h2>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">กรุณากรอกรหัสผ่านชุดที่ 2 เพื่อใช้แทนลายมือชื่ออิเล็กทรอนิกส์ (E-Signature) ในเอกสารแต่งตั้งผู้ใหญ่บ้าน</p>
              
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
    </div>
  );
};

export default AssignPosition;