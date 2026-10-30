import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { API_URL } from '../config'; 

const API_URL = import.meta.env.VITE_API_URL || 'https://api.banrao.life';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ฟังก์ชันกรองให้พิมพ์ได้เฉพาะตัวเลข และไม่เกิน 10 หลัก
  const handlePhoneInput = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    setFormData({ ...formData, username: value });
    setLoginError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (formData.username.length !== 10) {
        setLoginError('กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก');
        return;
    }

    setIsLoading(true);
    setLoginError('');
    
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        // บันทึกข้อมูลพร้อม Permissions ลง localStorage
        localStorage.clear(); 
        localStorage.setItem('userData', JSON.stringify(data.user));
        localStorage.setItem('token', data.token); // เก็บ Token ไว้ใช้กับ API อื่นๆ
        
        navigate('/dashboard');
      } else {
        setLoginError(data.message || 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (error) {
      setLoginError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cyber-hex-bg">
      <div className="main-content" style={{ maxWidth: '400px', margin: '0 auto', padding: '80px 30px' }}>
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', fontWeight: 'bold', color: '#00e5ff' }}>บ้านเรา</h1>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#00e5ff' }}>เข้าสู่ระบบ</h2>
        </div>
        
        <form className="auth-form" onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#ffffff', fontWeight: 'bold' }}>
              เบอร์โทรศัพท์
            </label>
            <input 
              className="cyber-input" 
              type="text" 
              placeholder="08X-XXX-XXXX" 
              value={formData.username}
              onChange={handlePhoneInput}
              required 
              disabled={isLoading}
            />
          </div>

          <div style={{ textAlign: 'left', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#ffffff', fontWeight: 'bold' }}>
              รหัสผ่าน
            </label>
            <input 
              className="cyber-input" 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••••••" 
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                setLoginError('');
              }}
              required 
              disabled={isLoading}
              style={{ paddingRight: '45px' }} 
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '15px', top: '38px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {loginError && (
            <div className="status-text text-red" style={{ textAlign: 'center', fontSize: '14px', color: '#f87171' }}>
              ❌ {loginError}
            </div>
          )}

          <button className="cyber-btn" type="submit" disabled={!formData.username || !formData.password || isLoading}>
            {isLoading ? <Loader2 size={18} className="spin-icon" /> : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
};
export default Login;