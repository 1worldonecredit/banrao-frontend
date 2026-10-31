import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
// นำเข้าไฟล์ใหม่
import HotelSearch from './pages/HotelSearch';
import HotelMap from './pages/HotelMap';
import Team from './pages/team';
import Wallet from './pages/Wallet';
import Shop from './pages/Shop';
import Media from './pages/Media';
import Restaurants from './pages/Restaurants';
import NearbyHotels from './pages/NearbyHotels';
import MonthlyRentals from './pages/MonthlyRentals';
import Orders from './pages/Orders';
import Bookings from './pages/Bookings';
import Jobs from './pages/Jobs';
import Mechanics from './pages/Mechanics';
import Taxis from './pages/Taxis';
import PostVedio from './pages/PostVedio';
import Profile from './pages/Profile';
import villageDetails from './pages/TempVillageDetails';
import AddCommunityPlace from './pages/AddCommunityPlace';
import MyPlaces from './pages/MyPlaces';
import EditPlace from './pages/EditPlace';

function App() {
  return (
    <BrowserRouter>
      {/* ใช้ app-container เพื่อคุม Layout ให้เป็นไปตาม CSS ที่ตั้งไว้ */}
      <div className="app-container">
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/hotels" element={<HotelSearch />} />
            <Route path="/hotel-map" element={<HotelMap />} />
            <Route path="/team" element={<Team />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/media" element={<Media />} />
            <Route path="/restaurants" element={<Restaurants />} />
            <Route path="/nearby-hotels" element={<NearbyHotels />} />
            <Route path="/monthly-rentals" element={<MonthlyRentals />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/mechanics" element={<Mechanics />} />
            <Route path="/taxis" element={<Taxis />} />
            <Route path="/post-vedio" element={<PostVedio />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/village-details" element={<villageDetails />} />
           <Route path="/add-place" element={<AddCommunityPlace />} />
           <Route path="/my-places" element={<MyPlaces />} />
           <Route path="/edit-place/:id" element={<EditPlace />} />

          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;