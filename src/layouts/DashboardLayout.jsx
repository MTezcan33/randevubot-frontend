import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import {
  Scissors,
  LayoutDashboard,
  Briefcase,
  Users,
  Calendar,
  UserCircle,
  Clock,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Bell,
  CheckCheck,
  Calculator,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { markAllNotificationsRead, markNotificationRead } from '@/services/notificationService';

// Bildirim tipine göre yönlendirme haritası
const NOTIF_ROUTES = {
  new_appointment: '/dashboard/appointments',
  cancelled_appointment: '/dashboard/appointments',
  customer_complaint: '/dashboard/support',
  whatsapp_disconnected: '/dashboard/settings',
  daily_summary: '/dashboard',
  payment_received: '/dashboard/billing',
  trial_expiring: '/dashboard/billing',
};

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, company } = useAuth();
  const { toast } = useToast();
  // Mobil drawer
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop daraltma/genişletme
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { t, i18n } = useTranslation();

  const menuItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: t('dashboard'), path: '/dashboard' },
    { icon: <Calendar className="w-5 h-5" />, label: t('appointments'), path: '/dashboard/appointments' },
    { icon: <Briefcase className="w-5 h-5" />, label: t('services'), path: '/dashboard/services' },
    { icon: <Users className="w-5 h-5" />, label: t('staff'), path: '/dashboard/staff' },
    { icon: <UserCircle className="w-5 h-5" />, label: t('customers'), path: '/dashboard/customers' },
    { icon: <Clock className="w-5 h-5" />, label: t('workingHours'), path: '/dashboard/working-hours' },
    { icon: <Calculator className="w-5 h-5" />, label: t('accounting'), path: '/dashboard/accounting' },
    { icon: <CreditCard className="w-5 h-5" />, label: t('billing'), path: '/dashboard/billing' },
    { icon: <Settings className="w-5 h-5" />, label: t('settings'), path: '/dashboard/settings' },
    { icon: <HelpCircle className="w-5 h-5" />, label: t('support'), path: '/dashboard/support' },
  ];

  // Aktif sayfanın başlığını bul (header için)
  const currentMenuItem = menuItems.find(item => location.pathname === item.path);
  const pageTitle = currentMenuItem?.label || t('dashboard');

  // admin_notifications tablosundan bildirimleri çek
  const fetchNotifications = useCallback(async () => {
    if (!company) return;
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Bildirim getirme hatası:', error);
      return;
    }
    setNotifications(data || []);
    setUnreadCount((data || []).filter(n => !n.is_read).length);
  }, [company]);

  useEffect(() => {
    if (!company) return;
    fetchNotifications();

    // Realtime subscription — yeni bildirim gelince anında güncelle
    const channel = supabase
      .channel(`admin_notifications_${company.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company, fetchNotifications]);

  // Tekil bildirimi oku + yönlendir
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markNotificationRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    const route = NOTIF_ROUTES[notification.type];
    if (route) navigate(route);
  };

  // Tümünü okundu işaretle
  const handleMarkAllRead = async () => {
    if (!company) return;
    await markAllNotificationsRead(company.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ title: "Hata", description: "Çıkış yapılamadı", variant: "destructive" });
    } else {
      navigate('/');
    }
  };

  // Sidebar içerik bileşeni (desktop + mobile drawer için ortak)
  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo + Toggle/Close */}
      <div className={`flex items-center h-16 px-4 border-b border-white/10 flex-shrink-0 ${
        !isMobile && collapsed ? 'justify-center' : 'justify-between'
      }`}>
        {(isMobile || !collapsed) ? (
          <Link
            to="/"
            className="flex items-center gap-2"
            onClick={isMobile ? () => setMobileOpen(false) : undefined}
          >
            <div className="w-8 h-8 bg-[#E91E8C] rounded-lg flex items-center justify-center flex-shrink-0">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg">RandevuBot</span>
          </Link>
        ) : (
          <Link to="/" className="flex items-center justify-center w-8 h-8 bg-[#E91E8C] rounded-lg mx-auto">
            <Scissors className="w-4 h-4 text-white" />
          </Link>
        )}

        {isMobile ? (
          <button
            onClick={() => setMobileOpen(false)}
            className="text-white/60 hover:text-white p-1 rounded transition-colors ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`text-white/60 hover:text-white p-1 rounded transition-colors ${collapsed ? 'mx-auto' : 'ml-2'}`}
            title={collapsed ? 'Genişlet' : 'Daralt'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Firma Bilgisi */}
      {(isMobile || !collapsed) && (
        <div className="mx-3 mt-4 mb-2 p-3 bg-white/10 rounded-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt="Logo"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 bg-[#E91E8C]/30 rounded-full flex items-center justify-center flex-shrink-0 border border-[#E91E8C]/40">
                <span className="text-white text-xs font-bold">
                  {company?.name?.charAt(0)?.toUpperCase() || 'R'}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white/60 text-xs">{t('company')}</p>
              <p className="text-white font-medium text-sm truncate">{company?.name || '...'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigasyon */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={index}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              title={!isMobile && collapsed ? item.label : undefined}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium
                border-l-[3px]
                ${isActive
                  ? 'bg-white/15 border-[#E91E8C] text-white'
                  : 'border-transparent text-white/70 hover:bg-white/10 hover:text-white'
                }
                ${!isMobile && collapsed ? 'justify-center px-2' : ''}
              `}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {(isMobile || !collapsed) && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Dil Değiştirici + Çıkış */}
      <div className={`p-3 border-t border-white/10 flex-shrink-0 ${
        !isMobile && collapsed ? 'flex flex-col items-center gap-2' : 'space-y-2'
      }`}>
        {(isMobile || !collapsed) && (
          <div className="mb-1">
            <LanguageSwitcher />
          </div>
        )}
        <button
          onClick={handleSignOut}
          title={!isMobile && collapsed ? t('logout') : undefined}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70
            hover:bg-white/10 hover:text-white transition-all text-sm
            ${!isMobile && collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(isMobile || !collapsed) && <span>{t('logout')}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* Desktop Sidebar — sabit, sol */}
      <aside className={`
        fixed top-0 left-0 h-full z-50
        bg-gradient-to-b from-[#1A1A2E] to-[#2D1B69]
        hidden lg:block transition-all duration-300
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
      `}>
        <SidebarContent />
      </aside>

      {/* Mobil Drawer — overlay + slide-in */}
      <div className={`
        fixed inset-0 z-50 lg:hidden
        transition-all duration-300
        ${mobileOpen ? 'visible' : 'invisible pointer-events-none'}
      `}>
        {/* Overlay */}
        <div
          className={`
            absolute inset-0 bg-black/60
            transition-opacity duration-300
            ${mobileOpen ? 'opacity-100' : 'opacity-0'}
          `}
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer paneli */}
        <aside className={`
          absolute top-0 left-0 h-full w-[260px]
          bg-gradient-to-b from-[#1A1A2E] to-[#2D1B69]
          transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <SidebarContent isMobile />
        </aside>
      </div>

      {/* Header — üstte sabit */}
      <header className={`
        fixed top-0 right-0 h-16 bg-white border-b border-gray-100 z-40
        flex items-center justify-between px-4 lg:px-6
        transition-all duration-300
        left-0 ${collapsed ? 'lg:left-[72px]' : 'lg:left-[260px]'}
      `}>
        {/* Sol: hamburger + sayfa başlığı */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base lg:text-lg font-semibold text-gray-800 truncate">{pageTitle}</h1>
        </div>

        {/* Sağ: dil + bildirim zili */}
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          {/* Bildirim Zili */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E91E8C] text-[10px] text-white font-bold leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-2 py-1.5">
                <DropdownMenuLabel className="p-0 text-sm font-semibold">{t('notifications')}</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs text-[#E91E8C] hover:text-pink-700 transition-colors"
                  >
                    <CheckCheck className="w-3 h-3" />
                    {t('markAllRead')}
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              {notifications.length > 0 ? (
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map(n => (
                    <DropdownMenuItem
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`flex items-start gap-2 cursor-pointer ${!n.is_read ? 'bg-pink-50' : ''}`}
                    >
                      <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                        !n.is_read ? 'bg-[#E91E8C]' : 'bg-transparent'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        {n.message && (
                          <p className="text-xs text-slate-500 truncate">{n.message}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(n.created_at).toLocaleString(i18n.language)}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              ) : (
                <DropdownMenuItem disabled className="text-sm text-slate-500 justify-center py-4">
                  {t('noNotifications')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className={`
        transition-all duration-300 pt-16 min-h-screen
        ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'}
      `}>
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
