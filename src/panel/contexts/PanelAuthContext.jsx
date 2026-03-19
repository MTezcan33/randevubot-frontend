import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const PanelAuthContext = createContext(null);

const SESSION_KEY = 'panelSession';

export function PanelAuthProvider({ children }) {
  const [panelUser, setPanelUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [panelRole, setPanelRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mount'ta sessionStorage'dan mevcut oturumu kontrol et
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        setPanelUser(session.panelUser || null);
        setCompany(session.company || null);
        setPanelRole(session.panelRole || null);
      }
    } catch (err) {
      console.error('Panel oturum yükleme hatası:', err);
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  // Oturumu sessionStorage'a kaydet
  const persistSession = useCallback((user, comp, role) => {
    if (user && comp && role) {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ panelUser: user, company: comp, panelRole: role })
      );
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  // PIN ile panel girişi
  const panelLogin = useCallback(async (companyId, pin, role) => {
    setLoading(true);
    try {
      // Supabase RPC çağrısı
      const { data, error } = await supabase.rpc('panel_login', {
        p_company_id: companyId,
        p_pin: pin,
        p_role: role,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Giriş başarısız' };
      }

      // Şirket bilgilerini çek
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) {
        return { success: false, error: 'Şirket bilgileri alınamadı' };
      }

      const user = data.user;
      setPanelUser(user);
      setCompany(companyData);
      setPanelRole(role);
      persistSession(user, companyData, role);

      return { success: true, user };
    } catch (err) {
      console.error('Panel login hatası:', err);
      return { success: false, error: 'Beklenmeyen bir hata oluştu' };
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  // Panel çıkışı
  const panelLogout = useCallback(() => {
    setPanelUser(null);
    setCompany(null);
    setPanelRole(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const value = {
    panelUser,
    company,
    panelRole,
    loading,
    panelLogin,
    panelLogout,
  };

  return (
    <PanelAuthContext.Provider value={value}>
      {children}
    </PanelAuthContext.Provider>
  );
}

export function usePanelAuth() {
  const context = useContext(PanelAuthContext);
  if (!context) {
    throw new Error('usePanelAuth must be used within a PanelAuthProvider');
  }
  return context;
}

export default PanelAuthContext;
