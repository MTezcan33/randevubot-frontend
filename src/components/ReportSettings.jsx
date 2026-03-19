import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Settings, Clock, Send, FileText, BarChart3, Users, Star, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { getReportSettings, updateReportSettings, getReportLogs } from '@/services/accountingService';

const REPORT_MODULES = [
  { id: 'appointment_summary', icon: Calendar, label: 'reportModAppointments' },
  { id: 'revenue_breakdown', icon: TrendingUp, label: 'reportModRevenue' },
  { id: 'expert_performance', icon: Users, label: 'reportModExpertPerf' },
  { id: 'customer_retention', icon: Users, label: 'reportModRetention' },
  { id: 'popular_services', icon: BarChart3, label: 'reportModPopularServices' },
  { id: 'peak_hours', icon: Clock, label: 'reportModPeakHours' },
  { id: 'feedback_summary', icon: Star, label: 'reportModFeedback' },
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Pazartesi' },
  { value: 2, label: 'Salı' },
  { value: 3, label: 'Çarşamba' },
  { value: 4, label: 'Perşembe' },
  { value: 5, label: 'Cuma' },
  { value: 6, label: 'Cumartesi' },
  { value: 0, label: 'Pazar' },
];

const ReportSettings = () => {
  const { company } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [logs, setLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company?.id) loadData();
  }, [company?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        getReportSettings(company.id),
        getReportLogs(company.id, 10),
      ]);
      setSettings(s);
      setLogs(l);
    } catch (err) {
      console.error('Rapor ayarları yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateReportSettings(company.id, settings);
      toast({ title: t('success'), description: t('reportSettingsSaved') || 'Rapor ayarları kaydedildi' });
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (moduleId) => {
    setSettings(prev => {
      const modules = prev.modules || [];
      return {
        ...prev,
        modules: modules.includes(moduleId)
          ? modules.filter(m => m !== moduleId)
          : [...modules, moduleId],
      };
    });
  };

  if (loading || !settings) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Otomatik Rapor Toggle */}
      <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="font-medium text-emerald-800">{t('autoReports') || 'Otomatik Raporlar'}</p>
            <p className="text-sm text-emerald-600">{t('autoReportsDesc') || 'Periyodik rapor gönderimi'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.enabled ? 'bg-emerald-600' : 'bg-slate-300'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            settings.enabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {settings.enabled && (
        <>
          {/* Zamanlama */}
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t('reportSchedule') || 'Zamanlama'}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t('frequency') || 'Sıklık'}</label>
                <select
                  value={settings.frequency}
                  onChange={(e) => setSettings(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="weekly">{t('weekly') || 'Haftalık'}</option>
                  <option value="monthly">{t('monthly') || 'Aylık'}</option>
                </select>
              </div>
              {settings.frequency === 'weekly' && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{t('dayOfWeek') || 'Gün'}</label>
                  <select
                    value={settings.day_of_week}
                    onChange={(e) => setSettings(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t('sendTime') || 'Saat'}</label>
                <input
                  type="time"
                  value={settings.time}
                  onChange={(e) => setSettings(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Rapor Modülleri */}
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {t('reportModules') || 'Rapor Modülleri'}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_MODULES.map(mod => {
                const Icon = mod.icon;
                const isSelected = settings.modules?.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-all ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{t(mod.label) || mod.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gönderim Kanalı */}
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Send className="w-4 h-4" />
              {t('deliveryChannel') || 'Gönderim Kanalı'}
            </h3>
            <div className="flex gap-2">
              {['whatsapp', 'email', 'pdf'].map(ch => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => {
                    setSettings(prev => {
                      const channels = prev.channels || [];
                      return {
                        ...prev,
                        channels: channels.includes(ch)
                          ? channels.filter(c => c !== ch)
                          : [...channels, ch],
                      };
                    });
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    settings.channels?.includes(ch)
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {ch === 'whatsapp' ? 'WhatsApp' : ch === 'email' ? 'Email' : 'PDF'}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Kaydet */}
      <Button onClick={handleSave} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
        {t('saveSettings') || 'Ayarları Kaydet'}
      </Button>

      {/* Gönderim Geçmişi */}
      {logs.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('reportHistory') || 'Gönderim Geçmişi'}</h3>
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm text-slate-700">{log.report_type} — {log.period_start} / {log.period_end}</p>
                  <p className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString('tr-TR')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  log.status === 'sent' ? 'bg-green-100 text-green-700' :
                  log.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {log.status === 'sent' ? t('notifSent') : log.status === 'failed' ? t('notifFailed') : t('notifPending')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportSettings;
