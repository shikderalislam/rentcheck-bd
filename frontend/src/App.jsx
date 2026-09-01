import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import AnnouncementBar from "./components/AnnouncementBar.jsx";
import RoleRoute from "./components/RoleRoute.jsx";
import Home from "./pages/Home.jsx";
import Search from "./pages/Search.jsx";
import PropertyDetail from "./pages/PropertyDetail.jsx";
import LandlordDetail from "./pages/LandlordDetail.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import SubmitReview from "./pages/SubmitReview.jsx";
import ReportIssue from "./pages/ReportIssue.jsx";
import ReportsFeed from "./pages/ReportsFeed.jsx";
import ReportDetail from "./pages/ReportDetail.jsx";
import UserDashboard from "./pages/dashboards/UserDashboard.jsx";
import LandlordDashboard from "./pages/dashboards/LandlordDashboard.jsx";
import ModeratorDashboard from "./pages/dashboards/ModeratorDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

// Dashboards render their own full-screen shell — hide the public chrome there.
const DASH_PREFIXES = ["/dashboard", "/landlord", "/moderator", "/admin"];

export default function App() {
  const location = useLocation();
  const isDash = DASH_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

  return (
    <div className="min-h-screen flex flex-col">
      {!isDash && <AnnouncementBar />}
      {!isDash && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/properties/:slug" element={<PropertyDetail />} />
          <Route path="/landlords/:slug" element={<LandlordDetail />} />
          <Route path="/reports" element={<ReportsFeed />} />
          <Route path="/reports/:id" element={<ReportDetail />} />
          <Route path="/report-issue" element={<ReportIssue />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <RoleRoute groups={["USER", "LANDLORD"]}>
                <UserDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/landlord"
            element={
              <RoleRoute groups={["LANDLORD", "SUPER_ADMIN"]}>
                <LandlordDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/moderator"
            element={
              <RoleRoute groups={["MODERATOR", "SUPER_ADMIN"]}>
                <ModeratorDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <RoleRoute groups={["SUPER_ADMIN"]}>
                <AdminDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/submit-review"
            element={
              <RoleRoute groups={["USER", "LANDLORD", "MODERATOR", "SUPER_ADMIN"]}>
                <SubmitReview />
              </RoleRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isDash && <Footer />}
    </div>
  );
}
