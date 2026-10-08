import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { API_URL } from '../config'; 

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  const [langWarning, setLangWarning] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEnglishOnly = (e) => {
    const originalValue = e.target.value;
    const filteredValue = originalValue.replace(/[^a-zA-Z0-9]/g, '');

    if (originalValue !== filteredValue) {
      setLangWarning(true);
      setTimeout(() => setLangWarning(false), 3000);
    }
    setFormData({ ...formData, username: filteredValue });
    setLoginError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
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
        let currencySymbol = '฿'; 
        let currencyCode = 'THB';
        
        const userCountry = data.user?.country || ''; 
        if (userCountry.toLowerCase().includes('laos')) {
          currencySymbol = '₭';
          currencyCode = 'LAK';
        }

        const userData = {
          ...data.user,
          wallet: data.user?.wallet || 0.00,
          point: data.user?.point || 0,
          currencySymbol: currencySymbol,
          currencyCode: currencyCode
        };

        localStorage.clear(); 
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('username', userData.username);
        
        const urlParams = new URLSearchParams(window.location.search);
        const redirectPath = urlParams.get('redirect');

        navigate(redirectPath ? redirectPath : '/dashboard');
      } else {
        setLoginError(data.message || t('invalidCredentials', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'));
      }
    } catch (error) {
      setLoginError(t('serverError', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้'));
      console.error('Login Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

return (
    <div className="cyber-hex-bg">
      <div className="main-content" style={{ maxWidth: '400px', margin: '0 auto', padding: '80px 30px' }}>
        
        {/* โลโก้ และข้อความต้อนรับ */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', letterSpacing: '4px', fontWeight: 'bold', color: '#00e5ff' }}>
            Kin non
          </h1>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'normal', color: '#00e5ff', letterSpacing: '1px' }}>
            Welcome Back
          </h2>
        </div>
        
        <form className="auth-form" onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* ช่องกรอก Username */}
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#ffffff', fontWeight: 'bold' }}>
              {t('emailLabel', 'Username)')}
            </label>
            <input 
              className="cyber-input" 
              type="text" 
              placeholder="Username" 
              value={formData.username}
              onChange={handleEnglishOnly}
              required 
              disabled={isLoading}
            />
            {langWarning && (
              <div className="status-text text-red" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: '#f87171', fontSize: '12px' }}>
                <AlertCircle size={14} /> {t('engOnlyWarning', 'Please use English (A-Z, 0-9)')}
              </div>
            )}
          </div>

          {/* ช่องกรอก Password */}
          <div style={{ textAlign: 'left', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#ffffff', fontWeight: 'bold' }}>
              {t('passwordLabel', 'Password')}
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
              style={{
                position: 'absolute', right: '15px', top: '38px',
                background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8'
              }}
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Forget Password */}
          <div style={{ textAlign: 'left', marginTop: '-10px' }}>
            <Link to="/forgot-password" style={{ fontSize: '12px', color: '#ffffff', textDecoration: 'none' }}>
              Forget Password ?
            </Link>
          </div>

          {loginError && (
            <div className="status-text text-red" style={{ textAlign: 'center', fontSize: '14px', color: '#f87171' }}>
              ❌ {loginError}
            </div>
          )}

          {/* ปุ่ม Login */}
          <button 
            className="cyber-btn" 
            type="submit" 
            disabled={!formData.username || !formData.password || isLoading}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '10px' }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin-icon" /> {t('loggingIn', 'Logging in...')}
              </>
            ) : (
              t('loginBtn', 'เข้าสู่ระบบ')
            )}
          </button>
        </form>

        {/* Sign UP Link */}
        <p style={{ marginTop: '30px', fontSize: '13px', color: '#f0ca0e', textAlign: 'center' }}>
          Are You New Member ? <Link to="/register" style={{ color: '#ffffff', fontWeight: 'bold', textDecoration: 'none', marginLeft: '5px' }}>Sign UP</Link>
        </p>
      </div>
    </div>
  );
};
export default Login;