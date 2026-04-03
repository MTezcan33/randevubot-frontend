import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import AsistanChatWidget from '@/components/chat/AsistanChatWidget';
import {
  Leaf,
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
  Globe,
  DoorOpen,
  Wallet,
  BarChart3,
  ChevronDown,
  Shield,
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

  // Collapsible grup state'i
  const [adminOpen, setAdminOpen] = useState(false);

  // Gruplu menu yapısı
  const menuGroups = [
    { items: [
      { icon: <LayoutDashboard className="w-5 h-5" />, label: t('dashboard'), path: '/dashboard' },
      { icon: <Calendar className="w-5 h-5" />, label: t('appointments'), path: '/dashboard/appointments' },
      { icon: <Wallet className="w-5 h-5" />, label: t('payments'), path: '/dashboard/payments' },
      { icon: <Briefcase className="w-5 h-5" />, label: t('services'), path: '/dashboard/services' },
      { icon: <UserCircle className="w-5 h-5" />, label: t('customers'), path: '/dashboard/customers' },
      { icon: <Clock className="w-5 h-5" />, label: t('workingHours'), path: '/dashboard/working-hours' },
      { icon: <DoorOpen className="w-5 h-5" />, label: t('resources'), path: '/dashboard/resources' },
    ]},
    { title: t('administration') || 'İdari İşler', icon: <Shield className="w-4 h-4" />, collapsible: true, open: adminOpen, toggle: () => setAdminOpen(!adminOpen), items: [
      { icon: <Users className="w-5 h-5" />, label: t('staff'), path: '/dashboard/staff' },
      { icon: <Calculator className="w-5 h-5" />, label: t('accounting'), path: '/dashboard/accounting' },
      { icon: <BarChart3 className="w-5 h-5" />, label: t('reports') || 'Raporlar', path: '/dashboard/reports' },
    ]},
    { items: [
      { icon: <CreditCard className="w-5 h-5" />, label: t('billing'), path: '/dashboard/billing' },
      { icon: <Globe className="w-5 h-5" />, label: t('onlineBooking') || 'Online Randevu', path: '/dashboard/booking-settings' },
      { icon: <Settings className="w-5 h-5" />, label: t('settings'), path: '/dashboard/settings' },
      { icon: <HelpCircle className="w-5 h-5" />, label: t('support'), path: '/dashboard/support' },
    ]},
  ];

  // Tüm menü itemlerini düz liste olarak al (başlık bulmak için)
  const allMenuItems = menuGroups.flatMap(g => g.items);

  // İdari İşler altındaki bir sayfa aktifse grubu otomatik aç
  const adminPaths = menuGroups.find(g => g.collapsible)?.items.map(i => i.path) || [];
  useEffect(() => {
    if (adminPaths.includes(location.pathname)) setAdminOpen(true);
  }, [location.pathname]);

  // Aktif sayfanın başlığını bul (header için)
  const currentMenuItem = allMenuItems.find(item => location.pathname === item.path);
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
      <div className={`flex items-center h-12 px-4 flex-shrink-0 ${
        !isMobile && collapsed ? 'justify-center' : 'justify-between'
      }`}>
        {(isMobile || !collapsed) ? (
          <Link
            to="/"
            className="flex items-center gap-2"
            onClick={isMobile ? () => setMobileOpen(false) : undefined}
          >
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-800 to-teal-700 rounded flex items-center justify-center flex-shrink-0">
              <Leaf className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-sm">RandevuBot</span>
          </Link>
        ) : (
          <Link to="/" className="flex items-center justify-center w-7 h-7 bg-gradient-to-br from-emerald-800 to-teal-700 rounded mx-auto">
            <Leaf className="w-3.5 h-3.5 text-white" />
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
              <div className="w-8 h-8 bg-emerald-700/30 rounded-full flex items-center justify-center flex-shrink-0 border border-emerald-600/40">
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
        {menuGroups.map((group, gi) => (
          <React.Fragment key={gi}>
            {/* Grup ayırıcı çizgi (ilk grup hariç) */}
            {gi > 0 && (isMobile || !collapsed) && (
              <div className="mx-3 my-2 border-t border-white/10" />
            )}

            {/* Collapsible grup başlığı */}
            {group.title && (isMobile || !collapsed) && (
              <button
                onClick={group.toggle}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/60 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  {group.icon}
                  {group.title}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${group.open ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            )}

            {/* Grup itemleri — collapsible ise open kontrolü */}
            {(!group.collapsible || group.open) && group.items.map((item, index) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={`${gi}-${index}`}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  title={!isMobile && collapsed ? item.label : undefined}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium
                    border-l-[3px]
                    ${isActive
                      ? 'bg-white/15 border-emerald-500 text-white'
                      : 'border-transparent text-white/70 hover:bg-white/10 hover:text-white'
                    }
                    ${!isMobile && collapsed ? 'justify-center px-2' : ''}
                    ${group.collapsible ? 'pl-5' : ''}
                  `}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {(isMobile || !collapsed) && <span>{item.label}</span>}
                </button>
              );
            })}
          </React.Fragment>
        ))}
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
    <div className="min-h-screen bg-stone-50/80">
      {/* Desktop Sidebar — sabit, sol */}
      <aside className={`
        fixed top-0 left-0 h-full z-50
        bg-gradient-to-b from-stone-900 to-emerald-950
        hidden lg:block transition-all duration-300
        ${collapsed ? 'w-[72px]' : 'w-[156px]'}
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
          absolute top-0 left-0 h-full w-[156px]
          bg-gradient-to-b from-stone-900 to-emerald-950
          transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <SidebarContent isMobile />
        </aside>
      </div>

      {/* Ana İçerik */}
      <main className={`
        transition-all duration-300 h-screen overflow-hidden
        ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[156px]'}
      `}>
        <Outlet />
      </main>
      <AsistanChatWidget />
    </div>
  );
};

export default DashboardLayout;
