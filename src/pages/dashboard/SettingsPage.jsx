import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Building, MapPin, Globe, Clock, Upload, Image, Phone, MessageCircle, BellRing, Ban, QrCode, Power, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import timezones from '@/lib/timezones.json';
import countries from '@/lib/countries.json';
import { useTranslation } from 'react-i18next';

const SettingsPage = () => {
  const { company, user, refreshCompany } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [currentTime, setCurrentTime] = useState('');

  // WhatsApp bağlantı durumu için state'ler
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [qrCodeData, setQrCodeData] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    country: '',
    timezone: '',
    logo_url: '',
    whatsapp_number: '',
    reminder_hours_before: 24,
    cancellation_hours_before: 4,
  });

  const [adminPhone, setAdminPhone] = useState('');

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        address: company.address || '',
        country: company.country || '',
        timezone: company.timezone || '',
        logo_url: company.logo_url || '',
        whatsapp_number: company.whatsapp_number || '',
        reminder_hours_before: company.reminder_hours_before || 24,
        cancellation_hours_before: company.cancellation_hours_before || 4,
      });

      setQrCodeData(company.qr_code || null);
      updateConnectionStatus(company.status);
    }
    if (user) {
      const fetchAdminUser = async () => {
        if (!company) return;
        const { data, error } = await supabase
          .from('company_users')
          .select('*')
          .eq('company_id', company.id)
          .eq('role', 'Yönetici')
          .single();
        if (data) {
          setAdminUser(data);
          setAdminPhone(data.phone || '');
        }
      };
      fetchAdminUser();
    }
  }, [company, user]);

  const updateConnectionStatus = (status) => {
    if (status === 'open' || status === 'connected') {
      setConnectionStatus('connected');
    } else if (status === 'qr_pending' || status === 'connecting') {
      setConnectionStatus('qr_pending');
    } else {
      setConnectionStatus('disconnected');
    }
  };

  useEffect(() => {
    if (!company) return;

    const channel = supabase
      .channel('company-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'companies',
          filter: `id=eq.${company.id}`
        },
        (payload) => {
          const newData = payload.new;
          if (newData.qr_code !== qrCodeData) {
            setQrCodeData(newData.qr_code);
          }
          if (newData.status) {
            updateConnectionStatus(newData.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company, qrCodeData]);

  useEffect(() => {
    let intervalId;
    if (formData.timezone) {
      const timezoneInfo = timezones.find(tz => tz.text === formData.timezone);
      if (timezoneInfo) {
        const ianaTimezone = timezoneInfo.utc[0];
        const updateCurrentTime = () => {
          const now = new Date();
          const timeString = now.toLocaleString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: ianaTimezone,
          });
          setCurrentTime(timeString);
        };
        updateCurrentTime();
        intervalId = setInterval(updateCurrentTime, 1000);
      }
    }
    return () => clearInterval(intervalId);
  }, [formData.timezone]);

  const handleUploadLogo = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error(t('selectFileError'));
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}-${Math.random()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      let { error: uploadError } = await supabase.storage.from('public-files').upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage.from('public-files').getPublicUrl(filePath);

      setFormData({ ...formData, logo_url: publicUrl });

      const { error: dbError } = await supabase
        .from('companies')
        .update({ logo_url: publicUrl })
        .eq('id', company.id);

      if (dbError) throw dbError;

      await refreshCompany();
      toast({ title: t('success'), description: t('logoUpdated') });

    } catch (error) {
      toast({ title: t('error'), description: t('logoUpdateError'), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleAddressChange = async (e) => {
    const newAddress = e.target.value;
    setFormData(prev => ({ ...prev, address: newAddress }));
  };

  const handleGetQRCode = async () => {
    if (!company.whatsapp_number) {
      toast({
        title: t('error'),
        description: t('saveWhatsAppFirst'),
        variant: 'destructive'
      });
      return;
    }

    setQrCodeLoading(true);
    try {
      const response = await fetch(import.meta.env.VITE_N8N_GET_QR_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: company.id,
          instance_name: company.instance_name || `company_${company.id}`,
          whatsapp_number: company.whatsapp_number
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: t('success'),
          description: t('qrCodeSuccess'),
        });
        await refreshCompany();
      } else {
        throw new Error(data.message || t('qrCodeError'));
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: error.message || t('qrCodeError'),
        variant: 'destructive'
      });
    } finally {
      setQrCodeLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!company.instance_name) {
      toast({
        title: t('error'),
        description: t('instanceNotFound'),
        variant: 'destructive'
      });
      return;
    }

    if (connectionStatus !== 'connected') {
      toast({
        title: t('warning'),
        description: t('alreadyDisconnected'),
        variant: 'destructive'
      });
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch(import.meta.env.VITE_EVOLUTION_API_DELETE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: company.id,
          instance_name: company.instance_name
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t('disconnectError'));
      }

      const data = await response.json().catch(() => ({}));

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          qr_code: null,
          status: 'disconnected'
        })
        .eq('id', company.id);

      if (updateError) throw updateError;

      toast({
        title: t('success'),
        description: t('whatsappDisconnected'),
      });

      await refreshCompany();
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: t('error'),
        description: error.message || t('disconnectError'),
        variant: 'destructive'
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { name, address, country, timezone, whatsapp_number, reminder_hours_before, cancellation_hours_before } = formData;
      const { error: companyError } = await supabase
        .from('companies')
        .update({ name, address, country, timezone, whatsapp_number, reminder_hours_before, cancellation_hours_before })
        .eq('id', company.id);

      if (companyError) throw companyError;

      if (adminUser) {
        const { error: adminError } = await supabase
          .from('company_users')
          .update({ phone: adminPhone })
          .eq('id', adminUser.id);
        if (adminError) throw adminError;
      }

      await refreshCompany();

      toast({ title: t('success'), description: t('companyInfoUpdated') });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('companyInfoUpdateError', { error: error.message || t('updateFailed') }),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const ConnectionStatusBadge = () => {
    const statusConfig = {
      connected: {
        icon: CheckCircle2,
        text: t('connected'),
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        iconColor: 'text-green-600',
        borderColor: 'border-green-200'
      },
      qr_pending: {
        icon: AlertCircle,
        text: t('qrPending'),
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        iconColor: 'text-yellow-600',
        borderColor: 'border-yellow-200'
      },
      disconnected: {
        icon: XCircle,
        text: t('notConnected'),
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        iconColor: 'text-red-600',
        borderColor: 'border-red-200'
      }
    };

    const config = statusConfig[connectionStatus];
    const StatusIcon = config.icon;

    return (
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
        <StatusIcon className={`w-4 h-4 ${config.iconColor}`} />
        <span className={`text-xs font-semibold ${config.textColor}`}>{config.text}</span>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>{t('settingsTitle')} | RandevuBot</title>
        <meta name="description" content={t('settingsSubtitle')} />
      </Helmet>

      <div className="space-y-4">
        {/* Başlık */}
        <div>
          <h1 className="text-2xl font-bold">{t('settingsTitle')}</h1>
          <p className="text-sm text-slate-600">{t('settingsSubtitle')}</p>
        </div>

        {/* Tek Sütun Layout */}
        <div className="grid lg:grid-cols-[1fr_400px] gap-4">
          {/* Sol Taraf - Form */}
          <div className="space-y-4">
            {/* Logo Kartı */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <label className="block text-sm font-semibold mb-3 flex items-center">
                <Image className="w-4 h-4 mr-2" />
                {t('companyLogo')}
              </label>
              <div className="flex items-center gap-3">
                {formData.logo_url ?
                  <img src={formData.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-cover border" /> :
                  <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center border">
                    <Building className="w-6 h-6 text-slate-400" />
                  </div>
                }
                <Button asChild variant="outline" size="sm">
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    {uploading ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-1.5" />
                    )}
                    <span className="text-xs">{uploading ? t('uploading') : t('uploadLogo')}</span>
                    <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} disabled={uploading} />
                  </label>
                </Button>
              </div>
            </div>

            {/* Firma Bilgileri Formu */}
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
              <h2 className="font-semibold text-base flex items-center pb-2 border-b">
                <Building className="w-5 h-5 mr-2" />
                {t('companyInfo')}
              </h2>

              {/* Firma Adı */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-slate-700">
                  {t('companyName')}
                </label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>

              {/* Admin Telefon */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-slate-700 flex items-center">
                  <Phone className="w-3 h-3 mr-1.5" />
                  {t('adminPhone')}
                </label>
                <input 
                  type="tel" 
                  value={adminPhone} 
                  onChange={(e) => setAdminPhone(e.target.value)} 
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>

              {/* WhatsApp Numarası */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-slate-700 flex items-center">
                  <MessageCircle className="w-3 h-3 mr-1.5" />
                  {t('whatsappNumber')}
                </label>
                <input
                  type="tel"
                  placeholder="+905551234567"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {t('useInternationalFormat')}
                </p>
              </div>

              {/* Adres */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-slate-700 flex items-center">
                  <MapPin className="w-3 h-3 mr-1.5" />
                  {t('address')}
                </label>
                <textarea 
                  value={formData.address} 
                  onChange={handleAddressChange} 
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  rows={2}
                />
              </div>

              {/* Ülke ve Zaman Dilimi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-slate-700 flex items-center">
                    <Globe className="w-3 h-3 mr-1.5" />
                    {t('country')}
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {countries.map(country => (
                      <option key={country.code} value={country.name}>{country.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 text-slate-700 flex items-center">
                    <Clock className="w-3 h-3 mr-1.5" />
                    {t('timezone')}
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {timezones.map(tz => (
                      <option key={tz.text} value={tz.text}>{tz.text}</option>
                    ))}
                  </select>
                  {currentTime && (
                    <p className="text-[10px] text-blue-600 font-semibold mt-1">
                      {t('currentTime', { time: currentTime })}
                    </p>
                  )}
                </div>
              </div>

              {/* Hatırlatma ve İptal Süreleri */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-slate-700 flex items-center">
                    <BellRing className="w-3 h-3 mr-1.5" />
                    {t('reminderHours')}
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    value={formData.reminder_hours_before} 
                    onChange={(e) => setFormData({ ...formData, reminder_hours_before: parseInt(e.target.value) })} 
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-slate-700 flex items-center">
                    <Ban className="w-3 h-3 mr-1.5" />
                    {t('cancellationHours')}
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    value={formData.cancellation_hours_before} 
                    onChange={(e) => setFormData({ ...formData, cancellation_hours_before: parseInt(e.target.value) })} 
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  />
                </div>
              </div>

              {/* Kaydet Butonu */}
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  t('updateCompanyInfo')
                )}
              </Button>
            </form>
          </div>

          {/* Sağ Taraf - WhatsApp */}
          <div className="space-y-4">
            {/* WhatsApp Bağlantı Kartı */}
            <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4 h-fit sticky top-4">
              {/* Başlık ve Durum */}
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">{t('whatsappConnection')}</h2>
                    <ConnectionStatusBadge />
                  </div>
                </div>
              </div>

              {/* QR Kod veya Durum Mesajı */}
              <div className="min-h-[280px] flex items-center justify-center">
                {qrCodeData && connectionStatus !== 'connected' ? (
                  <div className="text-center">
                    <div className="bg-white p-4 rounded-xl border-2 border-blue-500 inline-block">
                      <img
                        src={qrCodeData}
                        alt="WhatsApp QR Code"
                        className="w-56 h-56"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                      WhatsApp {">"} {t('settingsTitle')} {">"} {t('linkedDevices')}
                    </p>
                  </div>
                ) : connectionStatus === 'connected' ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-base text-green-900 mb-1">{t('whatsappConnected')}</h3>
                    <p className="text-sm text-green-700 max-w-xs">
                      {t('setupAssistant')}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-base text-blue-900 mb-1">{t('connectionRequired')}</h3>
                    <p className="text-sm text-blue-700 max-w-xs">
                      {t('connectWhatsApp')}
                    </p>
                  </div>
                )}
              </div>

              {/* Durum Mesajı */}
              {connectionStatus === 'qr_pending' && qrCodeData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm text-blue-900">{t('connectionRequired')}</h4>
                      <p className="text-xs text-blue-700">{t('scanQRToConnect')}</p>
                    </div>
                  </div>
                </div>
              )}

              {connectionStatus === 'disconnected' && !qrCodeData && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm text-red-900">{t('notConnected')}</h4>
                      <p className="text-xs text-red-700">{t('whatsappNotConnected')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Butonlar */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  onClick={handleGetQRCode}
                  disabled={qrCodeLoading || connectionStatus === 'connected'}
                  size="sm"
                  className="w-full"
                >
                  {qrCodeLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      <span className="text-xs">{t('gettingQR')}</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 mr-1.5" />
                      <span className="text-xs">{t('getQRCode')}</span>
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleDisconnect}
                  disabled={disconnecting || connectionStatus === 'disconnected'}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  {disconnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      <span className="text-xs">{t('disconnecting')}</span>
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4 mr-1.5" />
                      <span className="text-xs">{t('disconnectButton')}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;