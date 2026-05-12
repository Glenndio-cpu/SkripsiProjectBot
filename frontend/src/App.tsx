import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Tentang from "./pages/Tentang";
import Penyakit from "./pages/Penyakit";
import Pencegahan from "./pages/Pencegahan";
import Konsultasi from "./pages/Konsultasi";
import Kontak from "./pages/Kontak";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import JadwalBerobat from "./pages/JadwalBerobat";
import BroadcastManager from "./pages/BroadcastManager";
import AdminDashboard from "./pages/AdminDashboard";
import PatientManagement from "./pages/PatientManagement";
import UserManagement from "./pages/UserManagement";
import RAGManagement from "./pages/RAGManagement";
import DatabaseManagement from "./pages/DatabaseManagement";
import AnnouncementManagement from "./pages/AnnouncementManagement";
import ScheduleManagement from "./pages/ScheduleManagement";
import ApprovalInformasi from "./pages/ApprovalInformasi";
import ApprovalWaiting from "./pages/ApprovalWaiting";
import PendingApprovals from "./pages/PendingApprovals";
import SyaratKetentuan from "./pages/SyaratKetentuan";
import KebijakanPrivasi from "./pages/KebijakanPrivasi";
import ProtectedRoute from "./components/ProtectedRoute";
import { trackDailyActivity } from "./lib/userActivityTracking";

const queryClient = new QueryClient();

const App = () => {
  // Track daily activity whenever the app is loaded
  useEffect(() => {
    trackDailyActivity();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/tentang" element={<Tentang />} />
            <Route
              path="/penyakit"
              element={<Penyakit />}
            />
            <Route
              path="/informasi"
              element={<Penyakit />}
            />
            <Route
              path="/pencegahan"
              element={<Pencegahan />}
            />
            <Route
              path="/konsultasi"
              element={<Konsultasi />}
            />
            <Route
              path="/jadwal-berobat"
              element={<JadwalBerobat />}
            />
            <Route path="/kontak" element={<Kontak />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/syarat-ketentuan" element={<SyaratKetentuan />} />
            <Route path="/kebijakan-privasi" element={<KebijakanPrivasi />} />
            <Route path="/approval-waiting" element={<ApprovalWaiting />} />
            <Route path="/profile" element={<Profile />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allow={["head", "nurse"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/patients"
              element={
                <ProtectedRoute allow={["admin", "head", "nurse"]}>
                  <PatientManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pending-approvals"
              element={
                <ProtectedRoute allow={["admin", "head", "nurse"]}>
                  <PendingApprovals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/register"
              element={
                <Navigate to="/admin/users" replace />
              }
            />
            <Route
              path="/admin/broadcast"
              element={
                <ProtectedRoute allow={["admin", "head"]}>
                  <BroadcastManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ai"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <RAGManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/database"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <DatabaseManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/rag"
              element={<Navigate to="/admin/ai" replace />}
            />
            <Route
              path="/admin/settings"
              element={<Navigate to="/admin/ai" replace />}
            />
            <Route
              path="/admin/announcements"
              element={
                <ProtectedRoute allow={["head", "nurse"]}>
                  <AnnouncementManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/schedules"
              element={
                <ProtectedRoute allow={["head", "nurse"]}>
                  <ScheduleManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/approval-informasi"
              element={
                <ProtectedRoute allow={["head"]}>
                  <ApprovalInformasi />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
