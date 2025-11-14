import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [staff, setStaff] = useState([]);
  const [workingHours, setWorkingHours] = useState([]);
  const [selectedExpert, setSelectedExpert] = useState(null);
  const initialAuthEventHandled = useRef(false);

  const fetchCompanyAndStaffData = useCallback(async (userId) => {
    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', userId)
        .single();

      if (companyError && companyError.code !== 'PGRST116') throw companyError;
      
      setCompany(companyData);

      if (companyData) {
        const { data: staffData, error: staffError } = await supabase
            .from('company_users')
            .select(`*, company_user_tokens(user_id)`)
            .eq('company_id', companyData.id);
        
        if (staffError) throw staffError;
        const experts = staffData.filter(s => s.role === 'Uzman');
        setStaff(staffData || []);
        
        const { data: hoursData, error: hoursError } = await supabase
            .from('company_working_hours')
            .select('*')
            .eq('company_id', companyData.id);
        if(hoursError) throw hoursError;
        setWorkingHours(hoursData || []);

        setSelectedExpert(prevExpert => {
            const refreshedExpert = experts.find(e => e.id === (prevExpert ? prevExpert.id : null));
            if (refreshedExpert) return refreshedExpert;
            return experts.length > 0 ? experts[0] : null;
        });

      } else {
         setStaff([]);
         setWorkingHours([]);
         setSelectedExpert(null);
      }
      return companyData;
    } catch (error) {
      console.error('Data fetch error:', error.message);
      toast({ title: "Veri Yükleme Hatası", description: error.message, variant: "destructive" });
      setCompany(null);
      setStaff([]);
      setWorkingHours([]);
      setSelectedExpert(null);
      return null;
    }
  }, [toast]);

  const handleOAuthCallback = useCallback(async (session) => {
    const hash = window.location.hash;
    if (!hash.includes('provider_token') || !session) return;

    try {
      const urlParams = new URLSearchParams(hash.substring(1));
      const providerToken = urlParams.get('provider_token');
      const refreshToken = urlParams.get('refresh_token');
      const expiresIn = urlParams.get('expires_in');
      const stateParam = urlParams.get('state');
      
      if (stateParam) {
          const { expertId } = JSON.parse(decodeURIComponent(stateParam));

          if (expertId && providerToken) {
              const expires_at = new Date();
              expires_at.setSeconds(expires_at.getSeconds() + parseInt(expiresIn, 10));

              const { error: tokenError } = await supabase
                  .from('company_user_tokens')
                  .upsert({
                      user_id: expertId,
                      provider_token: providerToken,
                      provider_refresh_token: refreshToken,
                      expires_at: expires_at.toISOString(),
                  }, { onConflict: 'user_id' });

              if (tokenError) throw tokenError;
              
              toast({ title: "Başarılı!", description: "Google Takvim entegrasyonu tamamlandı." });
              window.history.replaceState(null, '', window.location.pathname); // Clean URL
              await fetchCompanyAndStaffData(session.user.id);
          }
      }
    } catch (error) {
      toast({ title: "OAuth Hatası", description: `Entegrasyon sırasında bir hata oluştu: ${error.message}`, variant: "destructive" });
    }
  }, [toast, fetchCompanyAndStaffData]);
  
  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const companyData = await fetchCompanyAndStaffData(currentUser.id);
        
        if (_event === "SIGNED_IN" && !initialAuthEventHandled.current) {
            initialAuthEventHandled.current = true;
            if (companyData && !companyData.onboarding_completed) {
                navigate('/onboarding', { replace: true });
            } else if (companyData && !location.pathname.startsWith('/dashboard')) {
                navigate('/dashboard', { replace: true });
            }
        }
        if ((_event === "SIGNED_IN" || _event === "TOKEN_REFRESHED") && window.location.hash.includes('provider_token')) {
            await handleOAuthCallback(session);
        }
      } else {
        setCompany(null);
        setStaff([]);
        setWorkingHours([]);
        setSelectedExpert(null);
        initialAuthEventHandled.current = false;
        const isAuthPage = ['/login', '/register', '/reset-password', '/update-password'].includes(location.pathname);
        if (_event === "SIGNED_OUT" && !isAuthPage) {
            navigate('/login', { replace: true });
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchCompanyAndStaffData, handleOAuthCallback, navigate, location.pathname]);
  
  const signUp = async (email, password, metadata) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
  };

  const signIn = async (email, password) => {
    const response = await supabase.auth.signInWithPassword({ email, password });
    if (!response.error) {
      initialAuthEventHandled.current = false;
    }
    return response;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`
    });
  };

  const updatePassword = async (newPassword) => {
    return await supabase.auth.updateUser({
      password: newPassword
    });
  };

  const refreshData = async () => {
    if (user) {
        return await fetchCompanyAndStaffData(user.id);
    }
    return null;
  }

  const value = {
    user,
    company,
    staff,
    workingHours,
    selectedExpert,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    setSelectedExpert,
    refreshCompany: refreshData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};