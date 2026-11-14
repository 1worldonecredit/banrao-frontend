import { BrowserRouter, Routes, Route } from 'react-router-dom';

// ==========================================
// 1. ส่วนนำเข้า (Import) หน้าต่างๆ (Pages)
// ==========================================
// ระบบบัญชีและหน้าหลัก
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// บริการและร้านค้าในชุมชน
import HotelSearch from './pages/HotelSearch';
import HotelMap from './pages/HotelMap';
import NearbyHotels from './pages/NearbyHotels';
import MonthlyRentals from './pages/MonthlyRentals';
import Restaurants from './pages/Restaurants';
import Shop from './pages/Shop';
import Mechanics from './pages/Mechanics';
import Taxis from './pages/Taxis';

// การจัดการสถานที่และหมู่บ้าน
import AddCommunityPlace from './pages/AddCommunityPlace';
import MyPlaces from './pages/MyPlaces';
import EditPlace from './pages/EditPlace';
import RegisterVillage from './pages/RegisterVillage';
import villageDetails from './pages/TempVillageDetails';

// ระบบสมาชิก สื่อ และอื่นๆ
import Team from './pages/team';
import Wallet from './pages/Wallet';
import Media from './pages/Media';
import PostVedio from './pages/PostVedio';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import Bookings from './pages/Bookings';
import Jobs from './pages/Jobs';

// 🌟 ระบบบริหารจัดการชุมชน (Community Management)
import MenuManagement from './pages/MenuManagement';
import PositionManagement from './pages/PositionManagement';
import CommunityLeaders from './pages/CommunityLeaders'; // <-- นำเข้า Component ผังผู้นำชุมชน
import AssignPosition from './pages/AssignPosition';
import AddHousehold from './pages/AddHousehold';
import AddVillageMaster from './pages/AddVillageMaster';

function App() {
  return (
    <BrowserRouter>
      {/* ใช้ app-container เพื่อคุม Layout ให้เป็นไปตาม CSS ที่ตั้งไว้ */}
      <div className="app-container">
        <div className="main-content">
          
          {/* ========================================== */}
          {/* 2. ส่วนกำหนดเส้นทาง (Routes) */}
          {/* วิธีเพิ่มหน้าใหม่: <Route path="/ชื่อurl" element={<ชื่อComponent />} /> */}
          {/* ========================================== */}
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            <Route path="/hotels" element={<HotelSearch />} />
            <Route path="/hotel-map" element={<HotelMap />} />
            <Route path="/nearby-hotels" element={<NearbyHotels />} />
            <Route path="/monthly-rentals" element={<MonthlyRentals />} />
            
            <Route path="/restaurants" element={<Restaurants />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/mechanics" element={<Mechanics />} />
            <Route path="/taxis" element={<Taxis />} />
            
            <Route path="/add-place" element={<AddCommunityPlace />} />
            <Route path="/my-places" element={<MyPlaces />} />
            <Route path="/edit-place/:id" element={<EditPlace />} />
            <Route path="/register-village" element={<RegisterVillage />} />
            <Route path="/village-details" element={<villageDetails />} />

            <Route path="/team" element={<Team />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/media" element={<Media />} />
            <Route path="/post-vedio" element={<PostVedio />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/jobs" element={<Jobs />} />

            {/* 🌟 เส้นทางสำหรับระบบบริหารจัดการชุมชน */}
            <Route path="/menu-management" element={<MenuManagement />} />
            <Route path="/position-management" element={<PositionManagement />} />
            
            {/* เส้นทางนี้คือตัวที่ทำให้ React รู้จัก /community-leaders และแสดงผลหน้าผังผู้นำชุมชนได้ */}
            <Route path="/community-leaders" element={<CommunityLeaders />} /> 
            <Route path="/assign-position" element={<AssignPosition />} /> 
            <Route path="/add-household" element={<AddHousehold />} /> 
            <Route path="/add-village-master" element={<AddVillageMaster />} /> 
            </Routes>
          
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;