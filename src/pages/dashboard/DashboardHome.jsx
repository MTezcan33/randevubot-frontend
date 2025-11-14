import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Calendar, DollarSign, Users, TrendingUp, Edit, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const DashboardHome = () => {
  const { company, staff, workingHours } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [totalAppointments, setTotalAppointments] = useState(0);
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);
  const [newCustomers, setNewCustomers] = useState(0);
  // const [avgOccupancy, setAvgOccupancy] = useState(0); // Average occupancy state removed

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('weekly'); // 'weekly' or 'monthly'
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
    } else { // monthly
      startDate = new Date(today.setMonth(today.getMonth() - 1));
    }

    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`*, company_services(price, duration), customers(created_at)`)
      .eq('company_id', company.id)
      .gte('date', startDate.toISOString().split('T')[0]);

    if (appointmentsError) {
      toast({ title: t('error'), description: t('appointmentsFetchError', { error: appointmentsError.message }), variant: "destructive" });
      setLoading(false);
      return;
    }

    let totalAppts = 0;
    let totalRevenue = 0;
    const customerIds = new Set();
    const newCustomerCount = new Set();
    
    // const expertOccupancyData = {}; // Expert occupancy data removed

    appointmentsData.forEach(appt => {
      totalAppts++;
      if (appt.company_services?.price) {
        totalRevenue += parseFloat(appt.company_services.price);
      }
      customerIds.add(appt.customer_id);

      // Check if customer is "new" within the period
      if (appt.customers?.created_at) {
        const customerCreatedAt = new Date(appt.customers.created_at);
        if (customerCreatedAt >= startDate) {
          newCustomerCount.add(appt.customer_id);
        }
      }

      /* Expert occupancy calculation removed as per user request
      if (appt.expert_id && appt.company_services?.duration) {
        expertOccupancyData[appt.expert_id] = (expertOccupancyData[appt.expert_id] || 0) + appt.company_services.duration;
      }
      */
    });

    setTotalAppointments(totalAppts);
    setEstimatedRevenue(totalRevenue);
    setNewCustomers(newCustomerCount.size);
    
    /* Average occupancy calculation removed as per user request
    let totalCalculatedOccupancy = 0;
    let validExpertsForOccupancy = 0;

    experts.forEach(expert => {
        const dayOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][new Date().getDay()];
        const expertHours = workingHours.find(wh => wh.expert_id === expert.id && wh.day === dayOfWeek);

        if (expertHours && expertHours.is_open) {
            const timeToMinutes = (time) => time ? time.split(':').map(Number).reduce((h, m) => h * 60 + m, 0) : 0;

            const workStart = timeToMinutes(expertHours.start_time);
            const workEnd = timeToMinutes(expertHours.end_time);
            const lunchStart = timeToMinutes(expert?.general_lunch_start_time);
            const lunchEnd = timeToMinutes(expert?.general_lunch_end_time);

            const lunchDuration = (lunchEnd > lunchStart) ? (lunchEnd - lunchStart) : 0;
            const totalWorkableMinutes = (workEnd > workStart) ? (workEnd - workStart) - lunchDuration : 0;

            if (totalWorkableMinutes > 0) {
                const bookedMinutes = expertOccupancyData[expert.id] || 0;
                totalCalculatedOccupancy += (bookedMinutes / totalWorkableMinutes);
                validExpertsForOccupancy++;
            }
        }
    });

    setAvgOccupancy(validExpertsForOccupancy > 0 ? Math.round((totalCalculatedOccupancy / validExpertsForOccupancy) * 100) : 0);
    */

    setLoading(false);
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
        <title>{t('businessAnalysisTitle')} | RandevuBot</title>
        <meta name="description" content={t('businessAnalysisDescription')} />
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center">
            {t('businessAnalysisTitle')} <Edit className="w-5 h-5 ml-2 text-slate-400 cursor-pointer" />
          </h1>
          <div className="flex items-center space-x-2">
            <p className="text-slate-600 mr-2">{t('trackPerformance')}</p>
            <Button variant={period === 'weekly' ? 'default' : 'outline'} onClick={() => setPeriod('weekly')}>{t('weekly')}</Button>
            <Button variant={period === 'monthly' ? 'default' : 'outline'} onClick={() => setPeriod('monthly')}>{t('monthly')}</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-effect p-6 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('totalAppointments')}</p>
              <h2 className="text-3xl font-bold mt-1">{totalAppointments}</h2>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <div className="glass-effect p-6 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('estimatedRevenue')}</p>
              <h2 className="text-3xl font-bold mt-1">₺{estimatedRevenue.toLocaleString('tr-TR')}</h2>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>

          <div className="glass-effect p-6 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('newCustomers')}</p>
              <h2 className="text-3xl font-bold mt-1">{newCustomers}</h2>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>

          <div className="glass-effect p-6 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('averageOccupancy')}</p>
              <h2 className="text-3xl font-bold mt-1">🚧%</h2> {/* Temporarily removed calculation, placeholder added */}
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Uzman Doluluk Oranları bölümü kaldırıldı */}
        {/*
        <div className="glass-effect p-6 rounded-2xl">
          <h3 className="text-2xl font-bold mb-4">{t('expertOccupancyRates')}</h3>
          <div className="space-y-4">
            {experts.map(expert => (
              <div key={expert.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-semibold">
                    {expert.name[0]}
                  </div>
                  <p className="font-semibold">{expert.name}</p>
                </div>
                <p className="text-lg font-bold text-blue-600">{calculateOccupancy(expert.id)}% {t('occupancy')}</p>
              </div>
            ))}
          </div>
        </div>
        */}
      </div>
    </>
  );
};

export default DashboardHome;