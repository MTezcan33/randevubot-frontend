import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PanelAuthProvider } from './contexts/PanelAuthContext';
import { usePanelAuth } from './hooks/usePanelAuth';
import PanelLogin from './pages/PanelLogin';
import PanelShell from './components/PanelShell';
// Panel sayfaları
import UzmanProgramim from './pages/uzman/UzmanProgramim';
import UzmanRandevularim from './pages/uzman/UzmanRandevularim';
import ResepsiyonistRandevular from './pages/resepsiyonist/ResepsiyonistRandevular';
import KasaOdemeler from './pages/kasa/KasaOdemeler';

/**
 * Rol bazlı koruma bileşeni
 * Kullanıcının belirtilen role sahip olup olmadığını kontrol eder
 */
function RoleGuard({ allowedRole, children }) {
  const { panelUser, panelRole, loading } = usePanelAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // Giriş yapılmamışsa login'e yönlendir
  if (!panelUser) {
    return <Navigate to="/panel" replace />;
  }

  // Yönetici her panele erişebilir, diğerleri sadece kendi rollerine
  const hasAccess = panelRole === 'yonetici' || panelRole === allowedRole;
  if (!hasAccess) {
    return <Navigate to="/panel" replace />;
  }

  return children;
}

/**
 * Panel uygulaması ana router bileşeni
 */
function PanelRoutes() {
  return (
    <Routes>
      {/* PIN giriş sayfası */}
      <Route path="/" element={<PanelLogin />} />

      {/* Uzman paneli */}
      <Route
        path="/uzman/*"
        element={
          <RoleGuard allowedRole="uzman">
            <PanelShell role="uzman" />
          </RoleGuard>
        }
      >
        <Route index element={<UzmanProgramim />} />
        <Route path="programim" element={<UzmanProgramim />} />
        <Route path="randevularim" element={<UzmanRandevularim />} />
      </Route>

      {/* Resepsiyonist paneli */}
      <Route
        path="/resepsiyonist/*"
        element={
          <RoleGuard allowedRole="resepsiyonist">
            <PanelShell role="resepsiyonist" />
          </RoleGuard>
        }
      >
        <Route index element={<ResepsiyonistRandevular />} />
        <Route path="randevular" element={<ResepsiyonistRandevular />} />
      </Route>

      {/* Kasa paneli */}
      <Route
        path="/kasa/*"
        element={
          <RoleGuard allowedRole="kasa">
            <PanelShell role="kasa" />
          </RoleGuard>
        }
      >
        <Route index element={<KasaOdemeler />} />
        <Route path="odemeler" element={<KasaOdemeler />} />
      </Route>

      {/* Bilinmeyen panel rotaları → login'e yönlendir */}
      <Route path="*" element={<Navigate to="/panel" replace />} />
    </Routes>
  );
}

export default function PanelApp() {
  return (
    <PanelAuthProvider>
      <PanelRoutes />
    </PanelAuthProvider>
  );
}
