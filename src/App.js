import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { UserProvider } from "./UserContext";
import Signup from "./screens/Signup";
import Login from "./screens/Login";
import Dashboard from "./screens/Dashboard";
import Profile from "./screens/Profile";
import Onboarding from "./screens/Onboarding";

// Owner/Admin screens
import OwnerDashboard from "./screens/OwnerDashboard";
import AdminUsers from "./screens/AdminUsers";
import PendingApproval from "./screens/Pendingapproval";
import AdminBookings from "./screens/Adminbookings";
import AdminMechanics from "./screens/Adminmechanics";
import AdminReports from "./screens/AdminReports";
import AdminAlerts from "./screens/AdminAlerts";
import AdminCarParts from "./screens/AdminCarParts";
import AdminReviews from "./screens/AdminReviews";
import AutoShopProfile from "./screens/AutoShopProfile";

// Customer screens
import CustomerDashboard from "./screens/CustomerDashboard";
import ShopSelect from "./screens/ShopSelect";
import BookService from "./screens/BookService";
import FindMechanic from "./screens/FindMechanic";
import MyVehicles from "./screens/MyVehicles";
import BookingHistory from "./screens/BookingHistory";
import Alerts from "./screens/Alerts";
import ShopFeed from "./screens/ShopFeed";
import GlobalBottomNav from "./screens/GlobalBottomNav";
import StrategicCheckup from "./screens/StrategicCheckup";

// Mechanic/job screens
import MechanicRequests from "./screens/Mechanicrequests";

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          {/* Auth */}
          <Route path="/" element={<Onboarding />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          {/* Shared */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/pending" element={<PendingApproval />} />

          {/* Owner/Admin management screens */}
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
          <Route path="/admin/mechanics" element={<AdminMechanics />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/alerts" element={<AdminAlerts />} />
          <Route path="/admin/carparts" element={<AdminCarParts />} />
          <Route path="/admin/reviews" element={<AdminReviews />} />

          {/* Owner's own job management */}
          <Route path="/mechanic/requests" element={<MechanicRequests />} />

          {/* Customer */}
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
          <Route path="/customer/shop-select" element={<ShopSelect />} />
          <Route path="/customer/book-service" element={<BookService />} />
          <Route path="/customer/mechanics" element={<FindMechanic />} />
          <Route path="/customer/vehicles" element={<MyVehicles />} />
          <Route path="/customer/history" element={<BookingHistory />} />
          <Route path="/customer/alerts" element={<Alerts />} />
          <Route path="/customer/feed" element={<ShopFeed />} />
          <Route path="/customer/checkup" element={<StrategicCheckup />} />
          <Route path="/customer/shop-profile" element={<AutoShopProfile />} />
        </Routes>
        <GlobalBottomNav />
      </Router>
    </UserProvider>
  );
}

export default App;