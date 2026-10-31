import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Settings, Package, Image as ImageIcon, Plus, Save, ImagePlus, X } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const EditPlace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info'); 
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

  // ----------------------------------------------------
  // State: แท็บ 1 (แก้ไขข้อมูล)
  // ----------------------------------------------------
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    place_name: '', description: '', address_text: '', visibility_level: 'PUBLIC', services: ''
  });
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('17:00');
  const [daysOff, setDaysOff] = useState([]);

  // ----------------------------------------------------
  // State: แท็บ 2 (สินค้าและบริการ)
  // ----------------------------------------------------
  const [products, setProducts] = useState([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ product_name: '', price: '', description: '' });
  const [productImageFile, setProductImageFile] = useState(null);
  const [productPreviewUrl, setProductPreviewUrl] = useState('');

  // ----------------------------------------------------
  // โหลดข้อมูลเมื่อเปิดหน้า
  // ----------------------------------------------------
  useEffect(() => {
    fetchPlaceDetail();
    fetchProducts();
  }, [id]);

  const fetchPlaceDetail = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/community-places/detail/${id}`);
      if (res.data.success) {
        const data = res.data.data;
        setFormData({
          place_name: data.place_name || '',
          description: data.description || '',
          address_text: data.address_text || '',
          visibility_level: data.visibility_level || 'PUBLIC',
          services: data.services ? data.services.join(', ') : ''
        });
        if (data.operating_hours) {
          setOpenTime(data.operating_hours.open_time || '08:00');
          setCloseTime(data.operating_hours.close_time || '17:00');
          setDaysOff(data.operating_hours.days_off || []);
        }
      }
    } catch (error) {
      console.error("Error fetching detail:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/community-places/${id}/products`);
      if (res.data.success) setProducts(res.data.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  // ----------------------------------------------------
  // Functions: แท็บ 1
  // ----------------------------------------------------
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        services: formData.services.split(',').map(s => s.trim()).filter(s => s !== ''),
        operating_hours: { open_time: openTime, close_time: closeTime, days_off: daysOff }
      };
      const res = await axios.put(`${API_URL}/api/community-places/${id}`, payload);
      if (res.data.success) alert('อัปเดตข้อมูลสำเร็จ!');
    } catch (error) {
      console.error("Update Error:", error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
    setIsSaving(false);
  };

  // ----------------------------------------------------
  // Functions: แท็บ 2
  // ----------------------------------------------------
  const handleProductChange = (e) => setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
  
  const handleProductImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductImageFile(file);
      setProductPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.product_name) return alert("กรุณาใส่ชื่อสินค้า");
    
    setIsSaving(true);
    try {
      let finalImageUrl = '';
      
      // 1. อัปโหลดรูปสินค้าขึ้น Cloudflare ก่อน (ถ้ามีการเลือกรูป)
      if (productImageFile) {
        const imgForm = new FormData();
        imgForm.append('image', productImageFile);
        const uploadRes = await axios.post(`${API_URL}/api/upload-image`, imgForm, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (uploadRes.data.success) {
          finalImageUrl = uploadRes.data.imageUrl;
        }
      }

      // 2. บันทึกข้อมูลสินค้าลง Database
      const payload = {
        product_name: newProduct.product_name,
        price: newProduct.price,
        description: newProduct.description,
        image_url: finalImageUrl
      };

      const res = await axios.post(`${API_URL}/api/community-places/${id}/products`, payload);
      
      if (res.data.success) {
        alert("เพิ่มสินค้าสำเร็จ!");
        setIsAddingProduct(false); // ปิดฟอร์ม
        setNewProduct({ product_name: '', price: '', description: '' }); // ล้างค่า
        setProductImageFile(null);
        setProductPreviewUrl('');
        fetchProducts(); // โหลดรายการสินค้าใหม่มาแสดง
      }
    } catch (error) {
      console.error(error);
      alert("เพิ่มสินค้าไม่สำเร็จ กรุณาลองใหม่");
    }
    setIsSaving(false);
  };

  const tabStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '20px', border: 'none',
    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap',
    backgroundColor: isActive ? '#3b82f6' : '#e2e8f0', color: isActive ? 'white' : '#475569', transition: 'all 0.2s',
    boxShadow: isActive ? '0 4px 6px -1px rgba(59, 130, 246, 0.4)' : 'none'
  });

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <TopNavbar userData={userData} />
      
      <div style={{ padding: '80px 20px 100px 20px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)', borderRadius: '16px', padding: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color="white" />
          </button>
          <div style={{ overflow: 'hidden' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>จัดการร้านค้า / สถานที่</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>รหัส: {id}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
          <button onClick={() => setActiveTab('info')} style={tabStyle(activeTab === 'info')}><Settings size={16} /> แก้ไขข้อมูลร้าน</button>
          <button onClick={() => setActiveTab('menu')} style={tabStyle(activeTab === 'menu')}><Package size={16} /> สินค้าและบริการ</button>
          <button onClick={() => setActiveTab('gallery')} style={tabStyle(activeTab === 'gallery')}><ImageIcon size={16} /> แกลลอรี่ (0/10)</button>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minHeight: '300px' }}>
           
           {/* ======================================= */}
           {/* แท็บที่ 1: แก้ไขข้อมูลทั่วไป */}
           {/* ======================================= */}
           {activeTab === 'info' && (
              isLoading ? <div style={{textAlign: 'center', padding: '20px'}}>กำลังโหลดข้อมูล...</div> :
              <form onSubmit={handleUpdateInfo}>
                <h3 style={{marginTop: 0, color: '#1e293b', marginBottom: '20px'}}>แก้ไขข้อมูลทั่วไป</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#475569', fontWeight: 'bold' }}>ชื่อสถานที่ / ชื่อร้าน *</label>
                    <input required type="text" name="place_name" value={formData.place_name} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#475569', fontWeight: 'bold' }}>รายละเอียดสั้นๆ *</label>
                    <textarea required name="description" value={formData.description} onChange={handleChange} rows="3" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#475569', fontWeight: 'bold' }}>ที่ตั้ง / ที่อยู่</label>
                    <input type="text" name="address_text" value={formData.address_text} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#475569', fontWeight: 'bold' }}>แท็กบริการ (คั่นด้วยลูกน้ำ)</label>
                    <input type="text" name="services" value={formData.services} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} />
                  </div>
                </div>

                <button disabled={isSaving} type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', marginTop: '25px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                  {isSaving ? '⏳ กำลังบันทึก...' : <><Save size={18} /> บันทึกข้อมูลการแก้ไข</>}
                </button>
              </form>
           )}

           {/* ======================================= */}
           {/* แท็บที่ 2: สินค้าและเมนู */}
           {/* ======================================= */}
           {activeTab === 'menu' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{margin: 0, color: '#1e293b'}}>รายการสินค้าและบริการ</h3>
                  {!isAddingProduct && (
                    <button onClick={() => setIsAddingProduct(true)} style={{display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'}}>
                      <Plus size={16} /> เพิ่มสินค้า
                    </button>
                  )}
                </div>

                {/* ฟอร์มเพิ่มสินค้าใหม่ */}
                {isAddingProduct && (
                  <form onSubmit={handleAddProduct} style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#334155' }}>เพิ่มสินค้าใหม่</h4>
                    
                    {/* อัปโหลดรูปสินค้า */}
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ position: 'relative', width: '100px', height: '100px', backgroundColor: '#fff', borderRadius: '12px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
                           onClick={() => document.getElementById('product-image-upload').click()}>
                        {productPreviewUrl ? (
                          <>
                            <img src={productPreviewUrl} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '2px' }} onClick={(e) => { e.stopPropagation(); setProductPreviewUrl(''); setProductImageFile(null); }}>
                              <X size={14} color="#fff" />
                            </div>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                            <ImagePlus size={24} style={{ margin: '0 auto' }} />
                            <div style={{ fontSize: '10px', marginTop: '4px' }}>รูปสินค้า</div>
                          </div>
                        )}
                        <input type="file" id="product-image-upload" accept="image/*" onChange={handleProductImageChange} style={{ display: 'none' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input required type="text" name="product_name" value={newProduct.product_name} onChange={handleProductChange} placeholder="ชื่อสินค้า/เมนู *" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                      <input type="number" name="price" value={newProduct.price} onChange={handleProductChange} placeholder="ราคา (บาท)" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                      <input type="text" name="description" value={newProduct.description} onChange={handleProductChange} placeholder="รายละเอียดสั้นๆ (ถ้ามี)" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <button type="button" onClick={() => setIsAddingProduct(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
                      <button disabled={isSaving} type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                        {isSaving ? '⏳ บันทึก...' : '✅ บันทึกสินค้า'}
                      </button>
                    </div>
                  </form>
                )}

                {/* รายการสินค้าที่มีอยู่ */}
                {products.length === 0 && !isAddingProduct ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                    <Package size={40} style={{ opacity: 0.5, marginBottom: '10px' }} />
                    <p style={{ margin: 0 }}>ยังไม่มีรายการสินค้าในร้านนี้</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
                    {products.map(p => (
                       <div key={p.product_id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ width: '100%', height: '120px', backgroundColor: '#f1f5f9' }}>
                            {p.image_url ? 
                              <img src={p.image_url} alt={p.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package color="#cbd5e1" /></div>
                            }
                          </div>
                          <div style={{ padding: '10px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.product_name}</div>
                            <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 'bold' }}>{p.price > 0 ? `฿${p.price}` : 'ฟรี'}</div>
                          </div>
                       </div>
                    ))}
                  </div>
                )}
              </div>
           )}

           {/* ======================================= */}
           {/* แท็บที่ 3: แกลลอรี่รูปภาพ */}
           {/* ======================================= */}
           {activeTab === 'gallery' && (
              <div>
                <h3 style={{marginTop: 0, color: '#1e293b'}}>รูปภาพร้าน (สูงสุด 10 รูป)</h3>
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                  <ImageIcon size={40} style={{ opacity: 0.5, marginBottom: '10px' }} />
                  <p style={{ margin: 0 }}>อัปโหลดรูปภาพบรรยากาศร้าน (เตรียมพบกันสเต็ปหน้า...)</p>
                </div>
              </div>
           )}

        </div>
      </div>
      <BottomNavbar />
    </div>
  );
};

export default EditPlace;