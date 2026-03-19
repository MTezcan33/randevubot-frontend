import React from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar, ClipboardList, LogOut, Wallet, Users, LayoutGrid,
} from 'lucide-react';
import { usePanelAuth } from '../hooks/usePanelAuth';

// Rol bazlı alt navigasyon sekmeleri
const NAV_ITEMS = {
  uzman: [
    { path: '/panel/uzman/programim', icon: Calendar, labelKey: 'panelNavProgramim', fallback: 'Programım' },
    { path: '/panel/uzman/randevularim', icon: ClipboardList, labelKey: 'panelNavRandevularim', fallback: 'Randevularım' },
  ],
  resepsiyonist: [
    { path: '/panel/resepsiyonist/randevular', icon: Calendar, labelKey: 'panelNavRandevular', fallback: 'Randevular' },
  ],
  kasa: [
    { path: '/panel/kasa/odemeler', icon: Wallet, labelKey: 'panelNavOdemeler', fallback: 'Ödemeler' },
  ],
  yonetici: [
    { path: '/panel/uzman/programim', icon: Calendar, labelKey: 'panelNavProgramim', fallback: 'Programım' },
    { path: '/panel/resepsiyonist/randevular', icon: Users, labelKey: 'panelNavRandevular', fallback: 'Randevular' },
    { path: '/panel/kasa/odemeler', icon: Wallet, labelKey: 'panelNavOdemeler', fallback: 'Ödemeler' },
    { path: '/panel/uzman/randevularim', icon: LayoutGrid, labelKey: 'panelNavTumu', fallback: 'Tümü' },
  ],
};

// Rol etiketleri
const ROLE_LABELS = {
  uzman: 'Uzman',
  resepsiyonist: 'Resepsiyonist',
  kasa: 'Kasa',
  yonetici: 'Yönetici',
};

export default function PanelShell({ role }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { panelUser, panelLogout } = usePanelAuth();

  const navItems = NAV_ITEMS[role] || [];

  const handleLogout = () => {
    panelLogout();
    navigate('/panel', { replace: true });
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Üst başlık */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Rol rozeti */}
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wide">
            {ROLE_LABELS[role] || role}
          </span>
          {/* Kullanıcı adı */}
          <span className="text-sm font-medium text-stone-700 truncate max-w-[160px]">
            {panelUser?.name || ''}
          </span>
        </div>

        {/* Çıkış butonu */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">{t('panelLogout') || 'Çıkış'}</span>
        </button>
      </header>

      {/* Ana içerik alanı */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Alt navigasyon çubuğu */}
      {navItems.length > 0 && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-30">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
            {navItems.map(({ path, icon: Icon, labelKey, fallback }) => {
              const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors
                    ${isActive
                      ? 'text-emerald-600'
                      : 'text-stone-400 hover:text-stone-600'
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  <span className="text-[10px] font-medium leading-tight">
                    {t(labelKey) || fallback}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
