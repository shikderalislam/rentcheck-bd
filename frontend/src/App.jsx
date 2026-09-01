import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Search from "./pages/Search.jsx";
import PropertyDetail from "./pages/PropertyDetail.jsx";
import LandlordDetail from "./pages/LandlordDetail.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import SubmitReview from "./pages/SubmitReview.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ReportIssue from "./pages/ReportIssue.jsx";
import ReportsFeed from "./pages/ReportsFeed.jsx";
import ReportDetail from "./pages/ReportDetail.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container-page py-16 text-neutral-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
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
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/submit-review"
            element={
              <PrivateRoute>
                <SubmitReview />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute roles={["admin", "super_admin", "moderator"]}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<div className="container-page py-20 text-center text-neutral-400">Page not found</div>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
