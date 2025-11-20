import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Calendar, DollarSign, Users, TrendingUp, Clock, Target, Award, BarChart3, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const DashboardHome = () => {
  const { company, staff, workingHours } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  // State'ler
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);
  const [newCustomers, setNewCustomers] = useState(0);
  const [avgOccupancy, setAvgOccupancy] = useState(0);
  const [expertPerformance, setExpertPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('weekly');

  const experts = staff.filter(s => s.role === 'Uzman');

  useEffect(() => {
    if (company) {
      fetchDashboardData();
    }
  }, [company, period, staff, workingHours]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const today = new Date();
    let startDate;

    if (period === 'weekly') {
      startDate = new Date(today.setDate(today.getDate() - 7));
    } else {
      startDate = new Date(today.setMonth(today.getMonth() - 1));
    }

    // Randevuları çek
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`*, company_services(price, duration, description), customers(created_at, name), company_users(name, color)`)
      .eq('company_id', company.id)
      .gte('date', startDate.toISOString().split('T')[0]);

    if (appointmentsError) {
      toast({ title: t('error'), description: t('appointmentsFetchError', { error: appointmentsError.message }), variant: "destructive" });
      setLoading(false);
      return;
    }

    // Temel metrikleri hesapla
    calculateMetrics(appointmentsData, startDate);

    // Uzman performansını hesapla
    calculateExpertPerformance(appointmentsData, startDate);

    setLoading(false);
  };

  const calculateMetrics = (appointments, startDate) => {
    let totalAppts = 0;
    let totalRevenue = 0;
    const newCustomerCount = new Set();

    appointments.forEach(appt => {
      totalAppts++;
      if (appt.company_services?.price) {
        totalRevenue += parseFloat(appt.company_services.price);
      }

      // Yeni müşteri kontrolü
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

    // Her uzman için başlangıç değerleri
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
        dailyStats: []
      };
    });

    // Randevuları analiz et
    appointments.forEach(appt => {
      if (!appt.expert_id || !performanceData[appt.expert_id]) return;

      const expert = performanceData[appt.expert_id];
      expert.totalAppointments++;

      if (appt.company_services?.price) {
        expert.totalRevenue += parseFloat(appt.company_services.price);
      }

      if (appt.company_services?.duration) {
        expert.totalWorkMinutes += parseInt(appt.company_services.duration);
      }

      expert.uniqueCustomers.add(appt.customer_id);

      // Hizmet dağılımı
      const serviceName = appt.company_services?.description || t('unknownService');
      expert.servicesProvided[serviceName] = (expert.servicesProvided[serviceName] || 0) + 1;
    });

    // Çalışma saatlerini hesapla
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
        ? Math.round((expertData.totalWorkMinutes / totalPossibleMinutes) * 100)
        : 0;
      expertData.averageServiceDuration = expertData.totalAppointments > 0
        ? Math.round(expertData.totalWorkMinutes / expertData.totalAppointments)
        : 0;
      expertData.revenuePerHour = totalPossibleMinutes > 0
        ? (expertData.totalRevenue / (totalPossibleMinutes / 60)).toFixed(2)
        : 0;
      expertData.customerRetention = expertData.uniqueCustomers.size;
    });

    // Array'e dönüştür ve sırala (gelire göre)
    const performanceArray = Object.values(performanceData).sort((a, b) => b.totalRevenue - a.totalRevenue);
    setExpertPerformance(performanceArray);

    // Ortalama doluluk oranını hesapla
    const avgOcc = performanceArray.reduce((sum, exp) => sum + exp.occupancyRate, 0) / performanceArray.length;
    setAvgOccupancy(Math.round(avgOcc || 0));
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    // Saat ve dakika kısaltmalarını translation'dan al
    const hourUnit = 'h'; // Uluslararası standart
    const minUnit = t('minuteShort') || 'min'; // "dk" / "min" / "мин"

    if (hours > 0) {
      return `${hours}${hourUnit} ${mins}${minUnit}`;
    }
    return `${mins}${minUnit}`;
  };

  const getPerformanceColor = (rate) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-blue-600';
    if (rate >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceLabel = (rate) => {
    if (rate >= 80) return t('excellent');
    if (rate >= 60) return t('good');
    if (rate >= 40) return t('medium');
    return t('low');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('businessAnalysis')} | RandevuBot</title>
        <meta name="description" content={t('businessAnalysisSubtitle')} />
      </Helmet>

      <div className="space-y-4">
        {/* Başlık */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t('businessAnalysis')}</h1>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={period === 'weekly' ? 'default' : 'outline'}
              onClick={() => setPeriod('weekly')}
            >
              {t('weekly')}
            </Button>
            <Button
              size="sm"
              variant={period === 'monthly' ? 'default' : 'outline'}
              onClick={() => setPeriod('monthly')}
            >
              {t('monthly')}
            </Button>
          </div>
        </div>

        {/* Genel Metrikler */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">{t('totalAppointments')}</p>
              <h2 className="text-2xl font-bold mt-1">{totalAppointments}</h2>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">{t('estimatedRevenue')}</p>
              <h2 className="text-2xl font-bold mt-1">₺{estimatedRevenue.toLocaleString('tr-TR')}</h2>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">{t('newCustomers')}</p>
              <h2 className="text-2xl font-bold mt-1">{newCustomers}</h2>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">{t('averageOccupancy')}</p>
              <h2 className="text-2xl font-bold mt-1">{avgOccupancy}%</h2>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Uzman Performans Detayları */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              {t('expertPerformanceAnalysis')}
            </h3>
            <span className="text-xs text-slate-500">
              {t('lastDays', { days: period === 'weekly' ? 7 : 30 })}
            </span>
          </div>

          <div className="space-y-3">
            {expertPerformance.map(expert => (
              <div
                key={expert.expertId}
                className="p-4 bg-slate-50 rounded-lg border-l-4 hover:shadow-md transition-shadow"
                style={{ borderLeftColor: expert.expertColor || '#3b82f6' }}
              >
                {/* Uzman Başlık ve Özet */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-3">
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-base" style={{ color: expert.expertColor }}>
                      {expert.expertName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {expert.totalAppointments} {t('appointments').toLowerCase()} • {expert.customerRetention} {t('customers').toLowerCase()}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-slate-500">{t('occupancyRate')}</p>
                    <p className={`text-lg font-bold ${getPerformanceColor(expert.occupancyRate)}`}>
                      {expert.occupancyRate}%
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-slate-500">{t('expectedRevenue')}</p>
                    <p className="text-lg font-bold text-green-600">
                      ₺{expert.totalRevenue.toLocaleString('tr-TR')}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-slate-500">{t('revenuePerHour')}</p>
                    <p className="text-lg font-bold text-blue-600">
                      ₺{expert.revenuePerHour}
                    </p>
                  </div>
                </div>

                {/* Detaylı İstatistikler */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {t('workingTime')}
                    </p>
                    <p className="text-sm font-semibold">
                      {formatDuration(expert.totalWorkMinutes)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 flex items-center">
                      <Target className="w-3 h-3 mr-1" />
                      {t('availableTime')}
                    </p>
                    <p className="text-sm font-semibold">
                      {formatDuration(expert.totalPossibleMinutes)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 flex items-center">
                      <Activity className="w-3 h-3 mr-1" />
                      {t('avgServiceTime')}
                    </p>
                    <p className="text-sm font-semibold">
                      {expert.averageServiceDuration} {t('minuteShort')}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 flex items-center">
                      <Award className="w-3 h-3 mr-1" />
                      {t('efficiency')}
                    </p>
                    <p className={`text-sm font-semibold ${getPerformanceColor(expert.occupancyRate)}`}>
                      {getPerformanceLabel(expert.occupancyRate)}
                    </p>
                  </div>
                </div>

                {/* Hizmet Dağılımı */}
                {Object.keys(expert.servicesProvided).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-2">{t('serviceDistribution')}:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(expert.servicesProvided).map(([service, count]) => (
                        <span
                          key={service}
                          className="px-2 py-1 bg-white rounded text-xs border"
                        >
                          {service}: <strong>{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Doluluk Çubuğu */}
                <div className="mt-3">
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(expert.occupancyRate, 100)}%`,
                        backgroundColor: expert.expertColor || '#3b82f6'
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {expertPerformance.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>{t('noPerformanceData')}</p>
              <p className="text-xs mt-2">{t('performanceDataInfo')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardHome;