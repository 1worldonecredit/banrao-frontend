import React from 'react';
import { Outlet } from 'react-router-dom'; // นำเข้า Outlet จาก React Router
import TopNavbar from './TopNavbar';
import BottomNavbar from './BottomNavbar';

const Layout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
      
      {/* 1. แถบนำทางด้านบน (Fix ไว้) */}
      <div style={{ flexShrink: 0, zIndex: 50 }}>
        <TopNavbar />
      </div>
      
      {/* 2. พื้นที่เนื้อหาตรงกลาง (เลื่อนได้) */}
      <div 
        className="custom-scrollbar"
        style={{ flex: '1 1 auto', overflowY: 'auto', paddingBottom: '100px', width: '100%' }}
      >
        {/* <Outlet /> คือรูรับเสียบ! React Router จะเอาเนื้อหาของแต่ละหน้ามาใส่ตรงนี้อัตโนมัติ */}
        <Outlet />
      </div>
      
      {/* 3. แถบนำทางด้านล่าง (Fix ไว้) */}
      <div style={{ flexShrink: 0, zIndex: 50 }}>
        <BottomNavbar /> 
      </div>
      
    </div>
  );
};

export default Layout;