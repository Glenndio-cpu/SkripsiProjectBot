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
import AdminRegister from "./pages/AdminRegister";
import RAGManagement from "./pages/RAGManagement";
import AnnouncementManagement from "./pages/AnnouncementManagement";
import ScheduleManagement from "./pages/ScheduleManagement";
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
            <Route path="/profile" element={<Profile />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allow={["admin", "head", "nurse"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/patients"
              element={
                <ProtectedRoute allow={["head"]}>
                  <PatientManagement />
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
                <ProtectedRoute allow={["admin"]}>
                  <AdminRegister />
                </ProtectedRoute>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
