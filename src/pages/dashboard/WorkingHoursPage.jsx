import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Calendar, Plus, Trash2, UserCircle, Clock, Coffee, Sun, Moon, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const WorkingHoursEditor = ({ expert, companyId, refreshExpertData, t, currentLanguage }) => {
  const { toast } = useToast();
  const [hours, setHours] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newHoliday, setNewHoliday] = useState({ date: '', description: '' });
  const [lunch, setLunch] = useState({ start: expert.general_lunch_start_time || '', end: expert.general_lunch_end_time || '' });
  const [isExpanded, setIsExpanded] = useState(false);
  
  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayKeysOriginal = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

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
      const daysToCreate = dayKeysOriginal.filter(d => !existingDays.includes(d));
      if (daysToCreate.length > 0) {
        const newHoursData = daysToCreate.map(day => ({ 
          company_id: companyId, 
          expert_id: expert.id, 
          day: day, 
          is_open: !['Cumartesi', 'Pazar'].includes(day), 
          start_time: '09:00', 
          end_time: '18:00' 
        }));
        await supabase.from('company_working_hours').insert(newHoursData);
        await fetchWorkingHours();
        return;
      }
      setHours(data.sort((a, b) => dayKeysOriginal.indexOf(a.day) - dayKeysOriginal.indexOf(b.day)));
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
      toast({ title: t('success'), description: t('companyInfoUpdated') });
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

  if (loading) return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <UserCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">{expert.name}</h3>
              <p className="text-white/80 text-sm flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {hours.filter(h => h.is_open).length} {t('workingDays')}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setIsExpanded(!isExpanded)}
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/20"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[2000px]' : 'max-h-0'}`}>
        <div className="p-4 space-y-3">
          {/* Working Days */}
          <div className="space-y-2">
            {hours.map((day, index) => (
              <div 
                key={day.id} 
                className={`rounded-lg p-3 transition-all ${
                  day.is_open 
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200' 
                    : 'bg-slate-50 border border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${day.is_open ? 'bg-green-500' : 'bg-slate-400'}`} />
                    <span className="font-semibold text-sm">{t(`day.${dayKeys[index]}`)}</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={day.is_open} 
                      onChange={(e) => handleUpdate(day.id, { is_open: e.target.checked })} 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <span className={`text-xs font-medium ${day.is_open ? 'text-green-600' : 'text-slate-500'}`}>
                      {day.is_open ? t('open') : t('closed')}
                    </span>
                  </label>
                </div>
                {day.is_open && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="flex items-center gap-2 bg-white rounded-md p-2 border">
                      <Sun className="w-4 h-4 text-orange-500" />
                      <input 
                        type="time" 
                        value={day.start_time || ''} 
                        onBlur={(e) => handleUpdate(day.id, { start_time: e.target.value })} 
                        onChange={(e) => setHours(hours.map(h => h.id === day.id ? {...h, start_time: e.target.value} : h))} 
                        className="w-full text-sm focus:outline-none" 
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-md p-2 border">
                      <Moon className="w-4 h-4 text-indigo-500" />
                      <input 
                        type="time" 
                        value={day.end_time || ''} 
                        onBlur={(e) => handleUpdate(day.id, { end_time: e.target.value })} 
                        onChange={(e) => setHours(hours.map(h => h.id === day.id ? {...h, end_time: e.target.value} : h))} 
                        className="w-full text-sm focus:outline-none" 
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Lunch Break */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Coffee className="w-4 h-4 text-amber-600" />
              <h4 className="font-semibold text-sm text-amber-900">{t('lunchBreak')}</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="time" 
                value={lunch.start || ''} 
                onChange={(e) => handleLunchUpdate('start', e.target.value)} 
                className="w-full px-3 py-2 text-sm rounded-md border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white" 
              />
              <input 
                type="time" 
                value={lunch.end || ''} 
                onChange={(e) => handleLunchUpdate('end', e.target.value)} 
                className="w-full px-3 py-2 text-sm rounded-md border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white" 
              />
            </div>
          </div>

          {/* Holidays */}
          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-3 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-red-600" />
              <h4 className="font-semibold text-sm text-red-900">{t('holidays')}</h4>
            </div>
            <div className="flex gap-2 mb-2">
              <input 
                type="date" 
                value={newHoliday.date} 
                onChange={(e) => setNewHoliday({...newHoliday, date: e.target.value})} 
                className="flex-1 px-3 py-2 text-sm rounded-md border border-red-300 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                lang={currentLanguage === 'tr' ? 'tr-TR' : currentLanguage === 'ru' ? 'ru-RU' : 'en-US'}
              />
              <Button 
                onClick={handleAddHoliday} 
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {holidays.map(holiday => (
                <div key={holiday.id} className="flex justify-between items-center bg-white p-2 rounded-md border border-red-200">
                  <span className="text-xs font-medium text-slate-700">
                    {new Date(holiday.date).toLocaleDateString(currentLanguage === 'tr' ? 'tr-TR' : currentLanguage === 'ru' ? 'ru-RU' : 'en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteHoliday(holiday.id)}
                    className="h-7 w-7 p-0 hover:bg-red-100"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              ))}
              {holidays.length === 0 && (
                <p className="text-xs text-center text-slate-400 py-2">{t('noHolidays')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Summary when collapsed */}
      {!isExpanded && (
        <div className="p-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-slate-600">
                  {hours.find(h => h.is_open)?.start_time} - {hours.find(h => h.is_open)?.end_time}
                </span>
              </div>
              {lunch.start && lunch.end && (
                <div className="flex items-center gap-1">
                  <Coffee className="w-4 h-4 text-amber-500" />
                  <span className="text-slate-600">
                    {lunch.start} - {lunch.end}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs text-slate-500">{holidays.length} {t('holidays')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const WorkingHoursPage = () => {
  const { company, staff, refreshCompany } = useAuth();
  const { t, i18n } = useTranslation();
  const experts = staff.filter(s => s.role === 'Uzman');

  return (
    <>
      <Helmet>
        <title>{t('workingHoursTitle')} | RandevuBot</title>
        <meta name="description" content={t('workingHoursSubtitle')} />
      </Helmet>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('workingHoursTitle')}
            </h1>
            <p className="text-slate-600">{t('workingHoursSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <UserCircle className="w-5 h-5" />
            <span>{experts.length} {t('staff')}</span>
          </div>
        </div>

        {/* Content */}
        {experts.length === 0 ? (
          <div className="glass-effect rounded-2xl p-12 text-center">
            <UserCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">{t('noExpertForHours')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {experts.map(expert => (
              <WorkingHoursEditor 
                key={expert.id} 
                expert={expert} 
                companyId={company.id} 
                refreshExpertData={refreshCompany} 
                t={t} 
                currentLanguage={i18n.language}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default WorkingHoursPage;