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
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'qr_pending', 'connected'
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
      
      // WhatsApp bağlantı durumunu set et
      setQrCodeData(company.qr_code || null);
      updateConnectionStatus(company.status);
    }
    if (user) {
        const fetchAdminUser = async () => {
            if(!company) return;
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

  // Bağlantı durumunu güncelle
  const updateConnectionStatus = (status) => {
    if (status === 'open' || status === 'connected') {
      setConnectionStatus('connected');
    } else if (status === 'qr_pending' || status === 'connecting') {
      setConnectionStatus('qr_pending');
    } else {
      setConnectionStatus('disconnected');
    }
  };

  // Supabase'deki değişiklikleri dinle (real-time)
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
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
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
        throw new Error('Yüklenecek bir dosya seçmelisiniz.');
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

  // QR Kod al
  const handleGetQRCode = async () => {
    if (!company.whatsapp_number) {
      toast({
        title: 'Hata',
        description: 'Önce WhatsApp numaranızı ayarlardan kaydedin.',
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
          title: 'Başarılı',
          description: 'QR kod oluşturuldu. Lütfen telefonunuzla okutun.',
        });
        
        // QR kod ve durum güncellenmesi Supabase real-time ile otomatik gelecek
        // Ama yine de manuel refresh yapalım
        await refreshCompany();
      } else {
        throw new Error(data.message || 'QR kod alınamadı');
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: error.message || 'QR kod alınırken bir hata oluştu',
        variant: 'destructive'
      });
    } finally {
      setQrCodeLoading(false);
    }
  };

  // Bağlantıyı kes
  const handleDisconnect = async () => {
    if (!company.instance_name) {
      toast({
        title: 'Hata',
        description: 'WhatsApp instance bulunamadı.',
        variant: 'destructive'
      });
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch(import.meta.env.VITE_N8N_DISCONNECT_INSTANCE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: company.id,
          instance_name: company.instance_name
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Başarılı',
          description: 'WhatsApp bağlantısı kesildi.',
        });
        
        // Durum güncellenmesi Supabase real-time ile otomatik gelecek
        await refreshCompany();
      } else {
        throw new Error(data.message || 'Bağlantı kesilemedi');
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: error.message || 'Bağlantı kesilirken bir hata oluştu',
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
        description: t('companyInfoUpdateError', { error: error.message || "Güncelleme başarısız" }),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Durum göstergesi komponenti
  const ConnectionStatusBadge = () => {
    const statusConfig = {
      connected: {
        icon: CheckCircle2,
        text: 'Bağlı',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        iconColor: 'text-green-600'
      },
      qr_pending: {
        icon: AlertCircle,
        text: 'QR Kod Bekliyor',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-700',
        iconColor: 'text-yellow-600'
      },
      disconnected: {
        icon: XCircle,
        text: 'Bağlı Değil',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        iconColor: 'text-red-600'
      }
    };

    const config = statusConfig[connectionStatus];
    const StatusIcon = config.icon;

    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${config.bgColor}`}>
        <StatusIcon className={`w-5 h-5 ${config.iconColor}`} />
        <span className={`font-medium ${config.textColor}`}>{config.text}</span>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>{t('settingsTitle')} | RandevuBot</title>
        <meta name="description" content={t('settingsSubtitle')} />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('settingsTitle')}</h1>
          <p className="text-slate-600">{t('settingsSubtitle')}</p>
        </div>

        {/* WhatsApp Bağlantı Bölümü */}
        <div className="glass-effect rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                WhatsApp Bağlantısı
              </h2>
              <p className="text-sm text-slate-600">
                WhatsApp hesabınızı bağlayarak randevu asistanınızı aktifleştirin
              </p>
            </div>
            <ConnectionStatusBadge />
          </div>

          {/* QR Kod Gösterimi */}
          {qrCodeData && connectionStatus !== 'connected' && (
            <div className="flex justify-center">
              <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-slate-200">
                <div className="mb-4 text-center">
                  <h3 className="font-semibold text-lg mb-1">QR Kodu Okutun</h3>
                  <p className="text-sm text-slate-600">
                    WhatsApp uygulamanızdan bu QR kodu okutarak bağlantıyı tamamlayın
                  </p>
                </div>
                <img 
                  src={qrCodeData} 
                  alt="WhatsApp QR Code" 
                  className="w-64 h-64 mx-auto"
                />
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-500">
                    WhatsApp {">"} Ayarlar {">"} Bağlı Cihazlar {">"} Cihaz Bağla
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bağlantı Durumu Mesajları */}
          {connectionStatus === 'connected' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900">WhatsApp Bağlı</h4>
                  <p className="text-sm text-green-700">
                    Randevu asistanınız aktif ve müşterilerinizle iletişim kurmaya hazır.
                  </p>
                </div>
              </div>
            </div>
          )}

          {connectionStatus === 'disconnected' && !qrCodeData && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">Bağlantı Kurulmadı</h4>
                  <p className="text-sm text-blue-700">
                    WhatsApp hesabınızı bağlamak için aşağıdaki butona tıklayın ve QR kodu okutun.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Kontrol Butonları */}
          <div className="flex gap-4">
            <Button
              onClick={handleGetQRCode}
              disabled={qrCodeLoading || connectionStatus === 'connected'}
              className="flex-1"
              size="lg"
            >
              {qrCodeLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  QR Kod Alınıyor...
                </>
              ) : (
                <>
                  <QrCode className="w-5 h-5 mr-2" />
                  QR Kod Al
                </>
              )}
            </Button>

            <Button
              onClick={handleDisconnect}
              disabled={disconnecting || connectionStatus === 'disconnected'}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              {disconnecting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Bağlantı Kesiliyor...
                </>
              ) : (
                <>
                  <Power className="w-5 h-5 mr-2" />
                  Bağlantıyı Kes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Mevcut Ayarlar Formu */}
        <form onSubmit={handleSubmit} className="glass-effect rounded-2xl p-8 space-y-6">
          
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Image className="w-4 h-4 mr-2" />
              {t('companyLogo')}
            </label>
            <div className="flex items-center gap-4">
              {formData.logo_url ? 
                <img src={formData.logo_url} alt="Firma Logosu" className="w-20 h-20 rounded-full object-cover" /> :
                <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center">
                    <Building className="w-8 h-8 text-slate-500" />
                </div>
              }
              <Button asChild variant="outline">
                <label htmlFor="logo-upload">
                  {uploading ? t('uploading') : <><Upload className="w-4 h-4 mr-2"/> {t('uploadLogo')}</>}
                  <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} disabled={uploading}/>
                </label>
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Building className="w-4 h-4 mr-2" /> {t('companyName')}
            </label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white" />
          </div>

           <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Phone className="w-4 h-4 mr-2" /> {t('adminPhone')}
            </label>
            <input type="tel" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <MessageCircle className="w-4 h-4 mr-2" /> {t('whatsappNumber')}
            </label>
            <input 
              type="tel" 
              placeholder="+905551234567" 
              value={formData.whatsapp_number} 
              onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })} 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white" 
            />
            <p className="text-xs text-slate-500 mt-1">
              WhatsApp bağlantısı için bu numarayı kullanacaksınız. Uluslararası format kullanın (+90...)
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium flex items-center">
                  <MapPin className="w-4 h-4 mr-2" /> {t('address')}
                </label>
            </div>
            <textarea value={formData.address} onChange={handleAddressChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white" rows={3} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center">
                <Globe className="w-4 h-4 mr-2" /> {t('country')}
              </label>
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
              >
                {countries.map(country => (
                  <option key={country.code} value={country.name}>{country.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-2" /> {t('timezone')}
              </label>
              <div className='flex items-center gap-4'>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                >
                  {timezones.map(tz => (
                    <option key={tz.text} value={tz.text}>{tz.text}</option>
                  ))}
                </select>
                {currentTime && <span className="text-sm font-semibold whitespace-nowrap">{currentTime}</span>}
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center">
                  <BellRing className="w-4 h-4 mr-2" /> Randevu Hatırlatma (Saat önce)
                </label>
                <input type="number" min="1" value={formData.reminder_hours_before} onChange={(e) => setFormData({ ...formData, reminder_hours_before: parseInt(e.target.value) })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center">
                  <Ban className="w-4 h-4 mr-2" /> Son İptal Süresi (Saat önce)
                </label>
                <input type="number" min="1" value={formData.cancellation_hours_before} onChange={(e) => setFormData({ ...formData, cancellation_hours_before: parseInt(e.target.value) })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white" />
              </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? t('saving') : t('updateCompanyInfo')}
          </Button>
        </form>
      </div>
    </>
  );
};

export default SettingsPage;
