
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import UpdatePasswordPage from '@/pages/UpdatePasswordPage';
import OnboardingPage from '@/pages/OnboardingPage';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardHome from '@/pages/dashboard/DashboardHome';
import ServicesPage from '@/pages/dashboard/ServicesPage';
import StaffPage from '@/pages/dashboard/StaffPage';
import AppointmentsPage from '@/pages/dashboard/AppointmentsPage';
import CustomersPage from '@/pages/dashboard/CustomersPage';
import WorkingHoursPage from '@/pages/dashboard/WorkingHoursPage';
import BillingPage from '@/pages/dashboard/BillingPage';
import SettingsPage from '@/pages/dashboard/SettingsPage';
import SupportPage from '@/pages/dashboard/SupportPage';
import LegalPage from '@/pages/LegalPage';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import OnboardingRoute from '@/components/OnboardingRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="/legal" element={<LegalPage />} />
          
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard" element={
            <OnboardingRoute>
              <DashboardLayout />
            </OnboardingRoute>
          }>
            <Route index element={<DashboardHome />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="working-hours" element={<WorkingHoursPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="support" element={<SupportPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
