import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Calendar, Plus, Trash2, UserCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const WorkingHoursEditor = ({ expert, companyId, refreshExpertData, t }) => {
  const { toast } = useToast();
  const [hours, setHours] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newHoliday, setNewHoliday] = useState({ date: '', description: '' });
  const [lunch, setLunch] = useState({ start: expert.general_lunch_start_time || '', end: expert.general_lunch_end_time || '' });
  
  const dayKeys = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const daysOfWeek = dayKeys.map(day => t(`day.${day}`));

  useEffect(() => {
    if (expert) {
      setLoading(true);
      Promise.all([fetchWorkingHours(), fetchHolidays()]).finally(() => setLoading(false));
      setLunch({ start: expert.general_lunch_start_time || '', end: expert.general_lunch_end_time || '' });
    }
  }, [expert, t]);

  const fetchWorkingHours = async () => {
    try {
      const { data, error } = await supabase.from('company_working_hours').select('*').eq('company_id', companyId).eq('expert_id', expert.id);
      if (error) throw error;
      const existingDays = data.map(d => d.day);
      const daysToCreate = dayKeys.filter(d => !existingDays.includes(d));
      if (daysToCreate.length > 0) {
        const newHoursData = daysToCreate.map(day => ({ company_id: companyId, expert_id: expert.id, day: day, is_open: !['Cumartesi', 'Pazar'].includes(day), start_time: '09:00', end_time: '18:00' }));
        await supabase.from('company_working_hours').insert(newHoursData);
        await fetchWorkingHours();
        return;
      }
      setHours(data.sort((a, b) => dayKeys.indexOf(a.day) - dayKeys.indexOf(b.day)));
    } catch (error) { console.error('Error fetching working hours:', error); }
  };
  
  const fetchHolidays = async () => {
     try {
       const { data, error } = await supabase.from('company_holidays').select('*').eq('company_id', companyId).eq('expert_id', expert.id).order('date', { ascending: true });
       if (error) throw error; setHolidays(data || []);
     } catch (error) { console.error('Error fetching holidays:', error); }
  };
  
  const handleUpdate = async (id, updates) => {
    try {
      const { error } = await supabase.from('company_working_hours').update(updates).eq('id', id);
      if (error) throw error; fetchWorkingHours();
    } catch (error) { toast({ title: t('error'), description: t('companyInfoUpdateError', { error: error.message }), variant: "destructive" }); }
  };
  
  const handleLunchUpdate = async (type, value) => {
    const newLunch = {...lunch, [type]: value};
    setLunch(newLunch);
    try {
      const { error } = await supabase.from('company_users').update({ general_lunch_start_time: newLunch.start, general_lunch_end_time: newLunch.end }).eq('id', expert.id);
      if (error) throw error;
      refreshExpertData();
      toast({ title: t('success'), description: t('companyInfoUpdated') });
    } catch(error) { toast({ title: t('error'), description: t('companyInfoUpdateError', { error: error.message }), variant: "destructive" }); }
  };
  
  const handleAddHoliday = async () => {
    if (!newHoliday.date) { toast({ title: t('missingInfo'), description: t('pleaseFillAllFields'), variant: "destructive"}); return; }
    try {
      await supabase.from('company_holidays').insert({ ...newHoliday, company_id: companyId, expert_id: expert.id });
      toast({ title: t('success'), description: t('companyInfoUpdated') });
      setNewHoliday({ date: '', description: '' }); fetchHolidays();
    } catch (error) { toast({ title: t('error'), description: t('companyInfoUpdateError', { error: error.message }), variant: "destructive"}); }
  };
  
  const handleDeleteHoliday = async (id) => {
    try {
      await supabase.from('company_holidays').delete().eq('id', id);
      toast({ title: t('success'), description: t('companyInfoUpdated') }); fetchHolidays();
    } catch(error) { toast({ title: t('error'), description: t('companyInfoUpdateError', { error: error.message }), variant: "destructive"}); }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex flex-col gap-2 p-2 bg-white rounded-lg shadow-sm h-full">
      <h3 className="font-semibold text-center truncate px-2">{expert.name.toUpperCase()}</h3>
      <div className="space-y-1 overflow-y-auto px-1">
        {hours.map((day, index) => (
          <div key={day.id} className="bg-slate-50 rounded-md p-2 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium w-24">{daysOfWeek[index]}</span>
              <label className="flex items-center space-x-2 cursor-pointer scale-90">
                <input type="checkbox" checked={day.is_open} onChange={(e) => handleUpdate(day.id, { is_open: e.target.checked })} className="w-4 h-4 rounded" />
                <span>{day.is_open ? t('open') : t('closed')}</span>
              </label>
            </div>
            {day.is_open && (
              <div className="grid grid-cols-2 gap-1">
                <input type="time" value={day.start_time || ''} onBlur={(e) => handleUpdate(day.id, { start_time: e.target.value })} onChange={(e) => setHours(hours.map(h => h.id === day.id ? {...h, start_time: e.target.value} : h))} className="w-full px-1 py-0.5 rounded-md border" />
                <input type="time" value={day.end_time || ''} onBlur={(e) => handleUpdate(day.id, { end_time: e.target.value })} onChange={(e) => setHours(hours.map(h => h.id === day.id ? {...h, end_time: e.target.value} : h))} className="w-full px-1 py-0.5 rounded-md border" />
              </div>
            )}
          </div>
        ))}
        <div className="bg-slate-50 rounded-md p-2 text-sm">
            <h4 className="font-medium mb-1">{t('lunchBreak')}</h4>
            <div className="grid grid-cols-2 gap-1">
              <input type="time" value={lunch.start || ''} onChange={(e) => handleLunchUpdate('start', e.target.value)} className="w-full px-1 py-0.5 rounded-md border" />
              <input type="time" value={lunch.end || ''} onChange={(e) => handleLunchUpdate('end', e.target.value)} className="w-full px-1 py-0.5 rounded-md border" />
            </div>
        </div>
        <div className="bg-slate-50 rounded-md p-2 text-sm">
            <h4 className="font-medium mb-1 flex items-center"><Calendar className="w-3 h-3 mr-1" /> {t('holidays')}</h4>
            <div className="flex gap-1 mb-1">
               <input type="date" value={newHoliday.date} onChange={(e) => setNewHoliday({...newHoliday, date: e.target.value})} className="w-full px-1 py-0.5 rounded-md border" />
               <Button onClick={handleAddHoliday} size="icon" className="h-6 w-6 flex-shrink-0"><Plus className="w-3 h-3" /></Button>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
                {holidays.map(holiday => (
                  <div key={holiday.id} className="flex justify-between items-center bg-slate-100 p-1 rounded text-xs">
                    <span className="truncate">{new Date(holiday.date).toLocaleDateString(t.language)}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDeleteHoliday(holiday.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                  </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

const WorkingHoursPage = () => {
  const { company, staff, refreshCompany } = useAuth();
  const { t } = useTranslation();
  const experts = staff.filter(s => s.role === 'Uzman');

  return (
    <>
      <Helmet>
        <title>{t('workingHoursTitle')} | RandevuBot</title>
        <meta name="description" content={t('workingHoursSubtitle')} />
      </Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('workingHoursTitle')}</h1>
          <p className="text-slate-600">{t('workingHoursSubtitle')}</p>
        </div>
        {experts.length === 0 ? (
           <div className="glass-effect rounded-2xl p-12 text-center">
             <UserCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
             <p className="text-slate-600">{t('noExpertForHours')}</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {experts.map(expert => (
              <WorkingHoursEditor key={expert.id} expert={expert} companyId={company.id} refreshExpertData={refreshCompany} t={t} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default WorkingHoursPage;