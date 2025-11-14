import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle,
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

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, company } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { t } = useTranslation();

  const menuItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: t('dashboard'), path: '/dashboard' },
    { icon: <Briefcase className="w-5 h-5" />, label: t('services'), path: '/dashboard/services' },
    { icon: <Users className="w-5 h-5" />, label: t('staff'), path: '/dashboard/staff' },
    { icon: <Calendar className="w-5 h-5" />, label: t('appointments'), path: '/dashboard/appointments' },
    { icon: <UserCircle className="w-5 h-5" />, label: t('customers'), path: '/dashboard/customers' },
    { icon: <Clock className="w-5 h-5" />, label: t('workingHours'), path: '/dashboard/working-hours' },
    { icon: <CreditCard className="w-5 h-5" />, label: t('billing'), path: '/dashboard/billing' },
    { icon: <Settings className="w-5 h-5" />, label: t('settings'), path: '/dashboard/settings' },
    { icon: <HelpCircle className="w-5 h-5" />, label: t('support'), path: '/dashboard/support' }
  ];

  useEffect(() => {
    if (company) {
      fetchNotifications();
    }
  }, [company]);
  
  const fetchNotifications = async () => {
    if (!company) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };
  
  const markAsRead = async (id) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Hata",
        description: "Çıkış yapılamadı",
        variant: "destructive"
      });
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="fixed top-0 left-0 right-0 h-16 glass-effect z-40 flex items-center justify-between px-4 lg:pl-72 lg:pr-8">
        <div className="flex items-center space-x-2">
           <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative">
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>{t('notifications')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <DropdownMenuItem key={n.id} onClick={() => markAsRead(n.id)} className={`flex items-start gap-2 ${!n.is_read && 'bg-blue-50'}`}>
                      <div className={`mt-1 h-2 w-2 rounded-full ${!n.is_read ? 'bg-blue-500' : 'bg-transparent'}`} />
                      <div className="flex-1">
                        <p className="text-sm">{n.message}</p>
                        <p className="text-xs text-slate-500">{new Date(n.created_at).toLocaleString('tr-TR')}</p>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    {t('noNotifications')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>

      <aside className={`
        fixed top-0 left-0 h-full w-64 glass-effect z-50 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          <Link to="/" className="flex items-center space-x-2 mb-8">
            <MessageCircle className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold gradient-text">RandevuBot</span>
          </Link>

          <div className="mb-6 p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white flex items-center space-x-3">
             {company?.logo_url ? (
                <img src={company.logo_url} alt="Firma Logosu" className="w-10 h-10 rounded-full object-cover"/>
             ) : (
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Briefcase className="w-5 h-5"/>
                </div>
             )}
            <div>
              <p className="text-sm opacity-90">{t('company')}</p>
              <p className="font-semibold truncate">{company?.name || '...'}</p>
            </div>
          </div>
          
          <div className="lg:hidden mb-4">
            <LanguageSwitcher />
          </div>

          <nav className="space-y-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all
                  ${location.pathname === item.path
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'hover:bg-slate-100 text-slate-700'
                  }
                `}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-8">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </aside>

      <main className="lg:ml-64 pt-16 min-h-screen">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;