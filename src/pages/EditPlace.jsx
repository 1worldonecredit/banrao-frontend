import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Settings, Package, Image as ImageIcon, Plus, Save, ImagePlus, X, Tag } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';
import BottomNavbar from '../components/BottomNavbar';

const EditPlace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info'); 
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

  // State: แท็บ 1 (แก้ไขข้อมูล)
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [placeCategoryId, setPlaceCategoryId] = useState(null); // เก็บประเภทร้านค้า
  const [formData, setFormData] = useState({
    place_name: '', description: '', address_text: '', visibility_level: 'PUBLIC', services: ''
  });
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('17:00');
  const [daysOff, setDaysOff] = useState([]);

  // State: แท็บ 2 (สินค้าและบริการ)
  const [products, setProducts] = useState([]);
  const [productCategories, setProductCategories] = useState([]); // เก็บหมวดหมู่สินค้า (Dropdown)
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  
  // ข้อมูลสินค้าใหม่
  const [newProduct, setNewProduct] = useState({ product_name: '', price: '', description: '', prod_cat_id: '' });
  const [productImageFile, setProductImageFile] = useState(null);
  const [productPreviewUrl, setProductPreviewUrl] = useState('');
  
  // สถานะแกลลอรี่สินค้า (6 รูป)
  const [galleryFiles, setGalleryFiles] = useState(Array(6).fill(null));
  const [galleryPreviews, setGalleryPreviews] = useState(Array(6).fill(''));

  // โหลดข้อมูลเริ่มต้น
  useEffect(() => {
    fetchPlaceDetail();
    fetchProducts();
  }, [id]);

  const fetchPlaceDetail = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/community-places/detail/${id}`);
      if (res.data.success) {
        const data = res.data.data;
        setPlaceCategoryId(data.category_id); // เก็บ ID ประเภทร้าน
        fetchProductCategories(data.category_id); // ดึงหมวดหมู่สินค้าที่ตรงกับประเภทร้าน

        setFormData({
          place_name: data.place_name || '', description: data.description || '',
          address_text: data.address_text || '', visibility_level: data.visibility_level || 'PUBLIC',
          services: data.services ? data.services.join(', ') : ''
        });
        if (data.operating_hours) {
          setOpenTime(data.operating_hours.open_time || '08:00');
          setCloseTime(data.operating_hours.close_time || '17:00');
          setDaysOff(data.operating_hours.days_off || []);
        }
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const fetchProductCategories = async (catId) => {
    if (!catId) return;
    try {
      const res = await axios.get(`${API_URL}/api/product-categories/${catId}`);
      if (res.data.success) setProductCategories(res.data.data);
    } catch (error) { console.error(error); }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/community-places/${id}/products`);
      if (res.data.success) setProducts(res.data.data);
    } catch (error) { console.error(error); }
  };

  // Functions: แท็บ 1
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
      await axios.put(`${API_URL}/api/community-places/${id}`, payload);
      alert('อัปเดตข้อมูลสำเร็จ!');
    } catch (error) { alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล'); }
    setIsSaving(false);
  };

  // Functions: แท็บ 2 (จัดการสินค้า)
  const handleProductChange = (e) => setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
  
  const handleProductImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setProductImageFile(file); setProductPreviewUrl(URL.createObjectURL(file)); }
  };

  const handleGalleryChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const newFiles = [...galleryFiles];
      newFiles[index] = file;
      setGalleryFiles(newFiles);

      const newPreviews = [...galleryPreviews];
      newPreviews[index] = URL.createObjectURL(file);
      setGalleryPreviews(newPreviews);
    }
  };

  const removeGalleryImage = (index) => {
    const newFiles = [...galleryFiles]; newFiles[index] = null; setGalleryFiles(newFiles);
    const newPreviews = [...galleryPreviews]; newPreviews[index] = ''; setGalleryPreviews(newPreviews);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.product_name) return alert("กรุณาใส่ชื่อสินค้า");
    
    setIsSaving(true);
    try {
      let finalImageUrl = '';
      let finalGalleryUrls = [];

      // 1. อัปโหลดรูปหลัก
      if (productImageFile) {
        const imgForm = new FormData(); imgForm.append('image', productImageFile);
        const res = await axios.post(`${API_URL}/api/upload-image`, imgForm, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (res.data.success) finalImageUrl = res.data.imageUrl;
      }

      // 2. อัปโหลดรูปแกลลอรี่ (ทั้ง 6 ช่อง)
      for (let i = 0; i < 6; i++) {
        if (galleryFiles[i]) {
          const galForm = new FormData(); galForm.append('image', galleryFiles[i]);
          try {
            const galRes = await axios.post(`${API_URL}/api/upload-image`, galForm, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (galRes.data.success) finalGalleryUrls.push(galRes.data.imageUrl);
          } catch(err) { console.error("Gallery upload error", err); }
        }
      }

      // 3. บันทึกข้อมูลสินค้า
      const payload = {
        product_name: newProduct.product_name, price: newProduct.price, description: newProduct.description,
        prod_cat_id: newProduct.prod_cat_id || null, image_url: finalImageUrl, gallery_urls: finalGalleryUrls
      };

      const res = await axios.post(`${API_URL}/api/community-places/${id}/products`, payload);
      
      if (res.data.success) {
        alert("เพิ่มสินค้าสำเร็จ!");
        setIsAddingProduct(false);
        setNewProduct({ product_name: '', price: '', description: '', prod_cat_id: '' });
        setProductImageFile(null); setProductPreviewUrl('');
        setGalleryFiles(Array(6).fill(null)); setGalleryPreviews(Array(6).fill(''));
        fetchProducts(); 
      }
    } catch (error) { alert("เพิ่มสินค้าไม่สำเร็จ กรุณาลองใหม่"); }
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
        
        <div style={{ background: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)', borderRadius: '16px', padding: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color="white" />
          </button>
          <div style={{ overflow: 'hidden' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>จัดการร้านค้า / สถานที่</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>รหัส: {id}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
          <button onClick={() => setActiveTab('info')} style={tabStyle(activeTab === 'info')}><Settings size={16} /> แก้ไขข้อมูล</button>
          <button onClick={() => setActiveTab('menu')} style={tabStyle(activeTab === 'menu')}><Package size={16} /> สินค้า/บริการ</button>
          <button onClick={() => setActiveTab('gallery')} style={tabStyle(activeTab === 'gallery')}><ImageIcon size={16} /> แกลลอรี่ (0/10)</button>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minHeight: '300px' }}>
           
           {/* แท็บที่ 1: แก้ไขข้อมูลทั่วไป */}
           {activeTab === 'info' && (
              /* ... (ส่วนนี้คงไว้เหมือนเดิม) ... */
              isLoading ? <div style={{textAlign: 'center', padding: '20px'}}>กำลังโหลดข้อมูล...</div> :
              <form onSubmit={handleUpdateInfo}>
                <h3 style={{marginTop: 0, color: '#1e293b', marginBottom: '20px'}}>แก้ไขข้อมูลทั่วไป</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <input required type="text" name="place_name" value={formData.place_name} onChange={handleChange} placeholder="ชื่อสถานที่ / ชื่อร้าน *" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} />
                  <textarea required name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="รายละเอียดสั้นๆ *" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} />
                  <input type="text" name="address_text" value={formData.address_text} onChange={handleChange} placeholder="ที่ตั้ง / ที่อยู่" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} />
                  <input type="text" name="services" value={formData.services} onChange={handleChange} placeholder="แท็กบริการ (คั่นด้วยลูกน้ำ)" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }} />
                </div>
                <button disabled={isSaving} type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', marginTop: '25px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                  {isSaving ? '⏳ กำลังบันทึก...' : <><Save size={18} /> บันทึกข้อมูลการแก้ไข</>}
                </button>
              </form>
           )}

           {/* แท็บที่ 2: สินค้าและเมนู */}
           {activeTab === 'menu' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{margin: 0, color: '#1e293b'}}>รายการสินค้าและบริการ</h3>
                  {!isAddingProduct && (
                    <button onClick={() => setIsAddingProduct(true)} style={{display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'}}>
                      <Plus size={16} /> เพิ่มใหม่
                    </button>
                  )}
                </div>

                {isAddingProduct && (
                  <form onSubmit={handleAddProduct} style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#334155' }}>เพิ่มรายการใหม่</h4>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                      {/* รูปหลัก */}
                      <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0, backgroundColor: '#fff', borderRadius: '12px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
                           onClick={() => document.getElementById('product-image-upload').click()}>
                        {productPreviewUrl ? (
                          <>
                            <img src={productPreviewUrl} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '2px' }} onClick={(e) => { e.stopPropagation(); setProductPreviewUrl(''); setProductImageFile(null); }}><X size={14} color="#fff" /></div>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#94a3b8' }}><ImagePlus size={24} style={{ margin: '0 auto' }} /><div style={{ fontSize: '10px', marginTop: '4px' }}>รูปปก</div></div>
                        )}
                        <input type="file" id="product-image-upload" accept="image/*" onChange={handleProductImageChange} style={{ display: 'none' }} />
                      </div>

                      {/* ข้อมูลพื้นฐาน */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input required type="text" name="product_name" value={newProduct.product_name} onChange={handleProductChange} placeholder="ชื่อสินค้า/เมนู *" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input type="number" name="price" value={newProduct.price} onChange={handleProductChange} placeholder="ราคา (บาท)" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                          {/* 🌟 Dropdown หมวดหมู่สินค้าที่ฉลาด! */}
                          {productCategories.length > 0 && (
                            <select name="prod_cat_id" value={newProduct.prod_cat_id} onChange={handleProductChange} style={{ flex: 1.5, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}>
                              <option value="">-- หมวดหมู่ --</option>
                              {productCategories.map(cat => <option key={cat.prod_cat_id} value={cat.prod_cat_id}>{cat.category_name}</option>)}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <input type="text" name="description" value={newProduct.description} onChange={handleProductChange} placeholder="รายละเอียดสั้นๆ (ถ้ามี)" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', marginBottom: '20px' }} />

                    {/* 🌟 ส่วนอัปโหลดรูปรายละเอียดเพิ่มเติม 6 รูป */}
                    <div style={{ marginBottom: '20px', backgroundColor: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '10px', display: 'block' }}>รูปรายละเอียดเพิ่มเติม (สูงสุด 6 รูป)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        {[0, 1, 2, 3, 4, 5].map(index => (
                          <div key={index} style={{ position: 'relative', height: '80px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }} onClick={() => document.getElementById(`gallery-upload-${index}`).click()}>
                             {galleryPreviews[index] ? (
                                <>
                                  <img src={galleryPreviews[index]} alt="gallery" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <div style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '2px' }} onClick={(e) => { e.stopPropagation(); removeGalleryImage(index); }}><X size={12} color="#fff" /></div>
                                </>
                             ) : (
                                <Plus size={24} color="#cbd5e1" />
                             )}
                             <input type="file" id={`gallery-upload-${index}`} accept="image/*" onChange={(e) => handleGalleryChange(index, e)} style={{ display: 'none' }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" onClick={() => setIsAddingProduct(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
                      <button disabled={isSaving} type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                        {isSaving ? '⏳ กำลังบันทึก...' : '✅ บันทึกสินค้า'}
                      </button>
                    </div>
                  </form>
                )}

                {/* รายการสินค้าที่มีอยู่ */}
                {products.length === 0 && !isAddingProduct ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                    <Package size={40} style={{ opacity: 0.5, marginBottom: '10px' }} />
                    <p style={{ margin: 0 }}>ยังไม่มีรายการสินค้า/บริการ</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
                    {products.map(p => (
                       <div key={p.product_id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ width: '100%', height: '120px', backgroundColor: '#f1f5f9', position: 'relative' }}>
                            {p.image_url ? 
                              <img src={p.image_url} alt={p.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package color="#cbd5e1" /></div>
                            }
                            {/* ป้ายแสดงหมวดหมู่ที่เลือกไว้ */}
                            {p.prod_cat_name && (
                              <div style={{ position: 'absolute', bottom: '5px', left: '5px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Tag size={10} /> {p.prod_cat_name}
                              </div>
                            )}
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

           {/* แท็บที่ 3: แกลลอรี่รูปภาพ */}
           {activeTab === 'gallery' && (
              /* ... (ส่วนแกลลอรี่ร้านค้า รอทำสเต็ปต่อไป) ... */
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