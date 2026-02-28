import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Target,
  Award,
  BarChart3,
  Activity,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── İstatistik Kartı Bileşeni ────────────────────────────────────────────────
const StatCard = ({ label, value, icon, bgColor, iconColor, trend, trendLabel }) => {
  const TrendIcon = trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus;
  const trendColor = trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-gray-400';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start justify-between hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        {trendLabel && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span>{trendLabel}</span>
          </div>
        )}
      </div>
      <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center flex-shrink-0 ml-3`}>
        <span className={iconColor}>{icon}</span>
      </div>
    </div>
  );
};

// ─── Bugünkü Randevu Satırı ───────────────────────────────────────────────────
const TodayAppointmentRow = ({ appointment, t }) => {
  const timeStr = appointment.time?.substring(0, 5) || '--:--';
  const expertColor = appointment.company_users?.color || '#9333ea';
  const serviceName = appointment.company_services?.description || t('unknownService');
  const customerName = appointment.customers?.name || t('unknownCustomer');
  const duration = appointment.company_services?.duration || 30;

  const statusColors = {
    'onaylandı': 'bg-emerald-100 text-emerald-700',
    'beklemede': 'bg-amber-100 text-amber-700',
    'iptal': 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      {/* Renkli nokta + saat */}
      <div className="flex flex-col items-center gap-1 w-12 flex-shrink-0">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: expertColor }}
        />
        <span className="text-xs font-semibold text-gray-600">{timeStr}</span>
      </div>

      {/* Bilgiler */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{customerName}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-gray-500 truncate">{serviceName}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">{duration} dk</span>
        </div>
      </div>

      {/* Uzman adı */}
      {appointment.company_users?.name && (
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: `${expertColor}20`, color: expertColor }}
        >
          {appointment.company_users.name}
        </span>
      )}

      {/* Durum badge */}
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
        statusColors[appointment.status] || 'bg-gray-100 text-gray-600'
      }`}>
        {t(`status.${appointment.status}`) || appointment.status}
      </span>
    </div>
  );
};

// ─── Tooltip Özel Stili ───────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        <p className="text-[#E91E8C] font-bold">{payload[0].value} randevu</p>
      </div>
    );
  }
  return null;
};

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
const DashboardHome = () => {
  const { company, staff, workingHours } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Mevcut dönem istatistikleri (orijinal)
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);
  const [newCustomers, setNewCustomers] = useState(0);
  const [avgOccupancy, setAvgOccupancy] = useState(0);
  const [expertPerformance, setExpertPerformance] = useState([]);
  const [period, setPeriod] = useState('weekly');

  // Yeni: bugünkü + genel istatistikler
  const [todayCount, setTodayCount] = useState(0);
  const [yesterdayCount, setYesterdayCount] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [lastMonthRevenue, setLastMonthRevenue] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);

  const experts = staff.filter(s => s.role === 'Uzman');

  useEffect(() => {
    if (company) {
      fetchAllData();
    }
  }, [company, period, staff, workingHours]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchPeriodData(),
      fetchTodayData(),
      fetchTotalCustomers(),
      fetchMonthlyRevenue(),
      fetchWeeklyChart(),
    ]);
    setLoading(false);
  };

  // ── Dönem tabanlı veri (haftalık / aylık) ──────────────────────────────────
  const fetchPeriodData = async () => {
    const today = new Date();
    let startDate;
    if (period === 'weekly') {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
    } else {
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 1);
    }

    const { data: appointmentsData, error } = await supabase
      .from('appointments')
      .select(`*, company_services(price, duration, description), customers(created_at, name), company_users(name, color)`)
      .eq('company_id', company.id)
      .gte('date', startDate.toISOString().split('T')[0]);

    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
      return;
    }

    calculateMetrics(appointmentsData, startDate);
    calculateExpertPerformance(appointmentsData, startDate);
  };

  // ── Bugünkü randevular ─────────────────────────────────────────────────────
  const fetchTodayData = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const [todayRes, yesterdayRes] = await Promise.all([
      supabase
        .from('appointments')
        .select(`*, company_services(description, duration, price), customers(name), company_users(name, color)`)
        .eq('company_id', company.id)
        .eq('date', todayStr)
        .order('time', { ascending: true }),
      supabase
        .from('appointments')
        .select('id')
        .eq('company_id', company.id)
        .eq('date', yesterdayStr),
    ]);

    if (!todayRes.error) {
      setTodayAppointments(todayRes.data || []);
      setTodayCount((todayRes.data || []).length);
    }
    if (!yesterdayRes.error) {
      setYesterdayCount((yesterdayRes.data || []).length);
    }
  };

  // ── Toplam müşteri sayısı ──────────────────────────────────────────────────
  const fetchTotalCustomers = async () => {
    const { count, error } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id);

    if (!error) setTotalCustomers(count || 0);
  };

  // ── Bu ay ve geçen ay randevu geliri ──────────────────────────────────────
  const fetchMonthlyRevenue = async () => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const [thisRes, lastRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('company_services(price)')
        .eq('company_id', company.id)
        .gte('date', thisMonthStart),
      supabase
        .from('appointments')
        .select('company_services(price)')
        .eq('company_id', company.id)
        .gte('date', lastMonthStart)
        .lte('date', lastMonthEnd),
    ]);

    if (!thisRes.error) {
      const rev = (thisRes.data || []).reduce((sum, a) => sum + (parseFloat(a.company_services?.price) || 0), 0);
      setMonthlyRevenue(rev);
    }
    if (!lastRes.error) {
      const rev = (lastRes.data || []).reduce((sum, a) => sum + (parseFloat(a.company_services?.price) || 0), 0);
      setLastMonthRevenue(rev);
    }
  };

  // ── Son 7 günlük randevu sayısı (bar chart için) ───────────────────────────
  const fetchWeeklyChart = async () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const startDate = days[0];
    const endDate = days[days.length - 1];

    const { data, error } = await supabase
      .from('appointments')
      .select('date')
      .eq('company_id', company.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (!error) {
      const counts = {};
      days.forEach(d => { counts[d] = 0; });
      (data || []).forEach(a => {
        if (counts[a.date] !== undefined) counts[a.date]++;
      });

      const chartData = days.map(d => {
        const date = new Date(d);
        const dayName = date.toLocaleDateString('tr-TR', { weekday: 'short' });
        return { day: dayName, count: counts[d] };
      });
      setWeeklyData(chartData);
    }
  };

  // ── Metrik hesaplamalar (orijinal mantık korundu) ─────────────────────────
  const calculateMetrics = (appointments, startDate) => {
    let totalAppts = 0;
    let totalRevenue = 0;
    const newCustomerCount = new Set();

    appointments.forEach(appt => {
      totalAppts++;
      if (appt.company_services?.price) {
        totalRevenue += parseFloat(appt.company_services.price);
      }
      if (appt.customers?.created_at) {
        const customerCreatedAt = new Date(appt.customers.created_at);
        if (customerCreatedAt >= startDate) {
          newCustomerCount.add(appt.customer_id);
        }
      }
    });

    setTotalAppointments(totalAppts);
    setEstimatedRevenue(totalRevenue);
    setNewCustomers(newCustomerCount.size);
  };

  const calculateExpertPerformance = (appointments, startDate) => {
    const performanceData = {};

    experts.forEach(expert => {
      performanceData[expert.id] = {
        expertId: expert.id,
        expertName: expert.name,
        expertColor: expert.color,
        totalAppointments: 0,
        totalRevenue: 0,
        totalWorkMinutes: 0,
        totalPossibleMinutes: 0,
        occupancyRate: 0,
        averageServiceDuration: 0,
        uniqueCustomers: new Set(),
        servicesProvided: {},
      };
    });

    appointments.forEach(appt => {
      if (!appt.expert_id || !performanceData[appt.expert_id]) return;
      const expert = performanceData[appt.expert_id];
      expert.totalAppointments++;
      if (appt.company_services?.price) expert.totalRevenue += parseFloat(appt.company_services.price);
      if (appt.company_services?.duration) expert.totalWorkMinutes += parseInt(appt.company_services.duration);
      expert.uniqueCustomers.add(appt.customer_id);
      const serviceName = appt.company_services?.description || t('unknownService');
      expert.servicesProvided[serviceName] = (expert.servicesProvided[serviceName] || 0) + 1;
    });

    const daysInPeriod = period === 'weekly' ? 7 : 30;
    const today = new Date();

    experts.forEach(expert => {
      const expertData = performanceData[expert.id];
      let totalPossibleMinutes = 0;

      for (let i = 0; i < daysInPeriod; i++) {
        const checkDate = new Date(startDate);
        checkDate.setDate(startDate.getDate() + i);
        if (checkDate > today) continue;

        const dayOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][checkDate.getDay()];
        const expertHours = workingHours.find(wh => wh.expert_id === expert.id && wh.day === dayOfWeek);

        if (expertHours && expertHours.is_open) {
          const timeToMinutes = (time) => {
            if (!time) return 0;
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
          };
          const workStart = timeToMinutes(expertHours.start_time);
          const workEnd = timeToMinutes(expertHours.end_time);
          const lunchStart = timeToMinutes(expertHours.lunch_start_time);
          const lunchEnd = timeToMinutes(expertHours.lunch_end_time);
          const lunchDuration = (lunchEnd > lunchStart) ? (lunchEnd - lunchStart) : 0;
          const dailyWorkMinutes = (workEnd > workStart) ? (workEnd - workStart) - lunchDuration : 0;
          totalPossibleMinutes += dailyWorkMinutes;
        }
      }

      expertData.totalPossibleMinutes = totalPossibleMinutes;
      expertData.occupancyRate = totalPossibleMinutes > 0
        ? Math.round((expertData.totalWorkMinutes / totalPossibleMinutes) * 100) : 0;
      expertData.averageServiceDuration = expertData.totalAppointments > 0
        ? Math.round(expertData.totalWorkMinutes / expertData.totalAppointments) : 0;
      expertData.revenuePerHour = totalPossibleMinutes > 0
        ? (expertData.totalRevenue / (totalPossibleMinutes / 60)).toFixed(2) : 0;
      expertData.customerRetention = expertData.uniqueCustomers.size;
    });

    const performanceArray = Object.values(performanceData).sort((a, b) => b.totalRevenue - a.totalRevenue);
    setExpertPerformance(performanceArray);
    const avgOcc = performanceArray.reduce((sum, exp) => sum + exp.occupancyRate, 0) / (performanceArray.length || 1);
    setAvgOccupancy(Math.round(avgOcc || 0));
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const minUnit = t('minuteShort') || 'dk';
    if (hours > 0) return `${hours}h ${mins}${minUnit}`;
    return `${mins}${minUnit}`;
  };

  const getPerformanceColor = (rate) => {
    if (rate >= 80) return 'text-emerald-600';
    if (rate >= 60) return 'text-blue-600';
    if (rate >= 40) return 'text-amber-600';
    return 'text-red-500';
  };

  const getPerformanceLabel = (rate) => {
    if (rate >= 80) return t('excellent');
    if (rate >= 60) return t('good');
    if (rate >= 40) return t('medium');
    return t('low');
  };

  // Trend hesapla
  const todayTrend = todayCount - yesterdayCount;
  const revenueTrend = monthlyRevenue - lastMonthRevenue;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-[#E91E8C]/30 border-t-[#E91E8C] animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('businessAnalysis')} | RandevuBot</title>
        <meta name="description" content={t('businessAnalysisSubtitle')} />
      </Helmet>

      <div className="space-y-6">
        {/* ── 4 İstatistik Kartı ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={t('todayAppointments')}
            value={todayCount}
            icon={<Calendar className="w-6 h-6" />}
            bgColor="bg-pink-100"
            iconColor="text-[#E91E8C]"
            trend={todayTrend}
            trendLabel={`${Math.abs(todayTrend)} ${t('vsYesterday')}`}
          />
          <StatCard
            label={t('monthlyRevenue')}
            value={`₺${monthlyRevenue.toLocaleString('tr-TR')}`}
            icon={<DollarSign className="w-6 h-6" />}
            bgColor="bg-emerald-100"
            iconColor="text-emerald-600"
            trend={revenueTrend}
            trendLabel={`${t('vsLastMonth')}`}
          />
          <StatCard
            label={t('totalCustomers')}
            value={totalCustomers}
            icon={<Users className="w-6 h-6" />}
            bgColor="bg-purple-100"
            iconColor="text-purple-600"
            trend={newCustomers > 0 ? 1 : 0}
            trendLabel={newCustomers > 0 ? `+${newCustomers} ${t('newThisMonth')}` : undefined}
          />
          <StatCard
            label={t('averageOccupancy')}
            value={`${avgOccupancy}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            bgColor="bg-amber-100"
            iconColor="text-amber-600"
            trend={avgOccupancy >= 60 ? 1 : avgOccupancy < 30 ? -1 : 0}
            trendLabel={getPerformanceLabel(avgOccupancy)}
          />
        </div>

        {/* ── Orta Satır: Bugünkü Program + Hızlı İşlemler / Haftalık Chart ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bugünkü Program (sol, 2/3) */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#E91E8C]" />
                {t('todaySchedule')}
              </h3>
              <Button
                size="sm"
                onClick={() => navigate('/dashboard/appointments')}
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 text-xs px-3 h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {t('newAppointment')}
              </Button>
            </div>
            <div className="divide-y divide-gray-50">
              {todayAppointments.length > 0 ? (
                todayAppointments.map(app => (
                  <TodayAppointmentRow key={app.id} appointment={app} t={t} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Calendar className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">{t('noTodayAppointments')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sağ Kolon: Hızlı İşlemler + Haftalık Chart */}
          <div className="flex flex-col gap-4">
            {/* Hızlı İşlemler */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-base font-semibold text-gray-800 mb-3">{t('quickActions')}</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/dashboard/appointments')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-[#E91E8C]/15 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-[#E91E8C]" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{t('appointments')}</span>
                </button>
                <button
                  onClick={() => navigate('/dashboard/customers')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{t('customers')}</span>
                </button>
                <button
                  onClick={() => navigate('/dashboard/accounting')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-emerald-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{t('accounting')}</span>
                </button>
              </div>
            </div>

            {/* Haftalık Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex-1">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                {t('weeklyAppointments')}
              </h3>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="count"
                      fill="url(#pinkPurple)"
                      radius={[6, 6, 0, 0]}
                    />
                    <defs>
                      <linearGradient id="pinkPurple" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E91E8C" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#9333ea" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* ── Dönem Analizi Başlığı ─────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">{t('expertPerformanceAnalysis')}</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={period === 'weekly' ? 'default' : 'outline'}
              onClick={() => setPeriod('weekly')}
              className={period === 'weekly' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0' : ''}
            >
              {t('weekly')}
            </Button>
            <Button
              size="sm"
              variant={period === 'monthly' ? 'default' : 'outline'}
              onClick={() => setPeriod('monthly')}
              className={period === 'monthly' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0' : ''}
            >
              {t('monthly')}
            </Button>
          </div>
        </div>

        {/* ── Dönem Özet Kartları ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{t('totalAppointments')}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{totalAppointments}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{t('estimatedRevenue')}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">₺{estimatedRevenue.toLocaleString('tr-TR')}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{t('newCustomers')}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{newCustomers}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>

        {/* ── Uzman Performans Detayları ────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              {t('expertPerformanceAnalysis')}
            </h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {t('lastDays', { days: period === 'weekly' ? 7 : 30 })}
            </span>
          </div>

          <div className="space-y-4">
            {expertPerformance.map(expert => (
              <div
                key={expert.expertId}
                className="p-4 bg-gray-50/80 rounded-xl border-l-4 hover:shadow-sm transition-shadow"
                style={{ borderLeftColor: expert.expertColor || '#9333ea' }}
              >
                {/* Üst Satır */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-base" style={{ color: expert.expertColor }}>
                      {expert.expertName}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {expert.totalAppointments} {t('appointments').toLowerCase()} · {expert.customerRetention} {t('customers').toLowerCase()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">{t('occupancyRate')}</p>
                    <p className={`text-lg font-bold ${getPerformanceColor(expert.occupancyRate)}`}>
                      {expert.occupancyRate}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">{t('expectedRevenue')}</p>
                    <p className="text-lg font-bold text-emerald-600">
                      ₺{expert.totalRevenue.toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">{t('revenuePerHour')}</p>
                    <p className="text-lg font-bold text-blue-600">
                      ₺{expert.revenuePerHour}
                    </p>
                  </div>
                </div>

                {/* Alt İstatistikler */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {t('workingTime')}
                    </p>
                    <p className="text-sm font-semibold text-gray-700">{formatDuration(expert.totalWorkMinutes)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Target className="w-3 h-3" /> {t('availableTime')}
                    </p>
                    <p className="text-sm font-semibold text-gray-700">{formatDuration(expert.totalPossibleMinutes)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> {t('avgServiceTime')}
                    </p>
                    <p className="text-sm font-semibold text-gray-700">{expert.averageServiceDuration} {t('minuteShort')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Award className="w-3 h-3" /> {t('efficiency')}
                    </p>
                    <p className={`text-sm font-semibold ${getPerformanceColor(expert.occupancyRate)}`}>
                      {getPerformanceLabel(expert.occupancyRate)}
                    </p>
                  </div>
                </div>

                {/* Hizmet Dağılımı */}
                {Object.keys(expert.servicesProvided).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-400 mb-2">{t('serviceDistribution')}:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(expert.servicesProvided).map(([service, count]) => (
                        <span
                          key={service}
                          className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600"
                        >
                          {service}: <strong className="text-gray-800">{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Doluluk Çubuğu */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(expert.occupancyRate, 100)}%`,
                        backgroundColor: expert.expertColor || '#9333ea',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {expertPerformance.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('noPerformanceData')}</p>
              <p className="text-xs mt-1">{t('performanceDataInfo')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardHome;
