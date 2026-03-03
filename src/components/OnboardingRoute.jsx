import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const OnboardingRoute = ({ children }) => {
  const { user, company, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-white to-emerald-50/20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user && (!company || !company.onboarding_completed)) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

export default OnboardingRoute;