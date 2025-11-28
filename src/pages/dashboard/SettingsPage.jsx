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
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

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

  // Instance name oluşturma fonksiyonu
  const generateInstanceName = (companyName, sectorCode) => {
    if (!companyName) return null;

    // 1. Boşlukları _ ile değiştir
    let instanceName = companyName.trim().replace(/\s+/g, '_');

    // 2. İngilizce dışı karakterleri 0 ile değiştir
    // Sadece a-z, A-Z, 0-9 ve _ karakterlerine izin ver
    instanceName = instanceName.replace(/[^a-zA-Z0-9_]/g, '0');

    // 3. Sector code varsa ekle
    if (sectorCode) {
      instanceName = `${instanceName}_${sectorCode}`;
    }

    return instanceName;
  };

  // QR Code verisini güvenli şekilde işleyen yardımcı fonksiyon
  const processQrCodeData = (qrData) => {
    if (!qrData) return null;

    // Eğer zaten string ise
    if (typeof qrData === 'string') {
      // Boş string kontrolü
      if (qrData.trim() === '') return null;

      // Zaten base64 data URI formatında mı?
      if (qrData.startsWith('data:image')) {
        return qrData;
      }

      // Sadece base64 string ise, data URI formatına çevir
      if (qrData.match(/^[A-Za-z0-9+/=]+$/)) {
        return `data:image/png;base64,${qrData}`;
      }

      // URL formatında olabilir
      if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
        return qrData;
      }

      // Diğer durumlarda base64 olarak kabul et
      return `data:image/png;base64,${qrData}`;
    }

    // Eğer obje ise
    if (typeof qrData === 'object') {
      // { base64: "..." } formatı
      if (qrData.base64) {
        const base64Str = qrData.base64;
        if (base64Str.startsWith('data:image')) {
          return base64Str;
        }
        return `data:image/png;base64,${base64Str}`;
      }

      // { code: "..." } formatı
      if (qrData.code) {
        const codeStr = qrData.code;
        if (codeStr.startsWith('data:image')) {
          return codeStr;
        }
        return `data:image/png;base64,${codeStr}`;
      }

      // { qrcode: "..." } formatı
      if (qrData.qrcode) {
        const qrcodeStr = qrData.qrcode;
        if (qrcodeStr.startsWith('data:image')) {
          return qrcodeStr;
        }
        return `data:image/png;base64,${qrcodeStr}`;
      }

      // { data: "..." } formatı
      if (qrData.data) {
        const dataStr = qrData.data;
        if (dataStr.startsWith('data:image')) {
          return dataStr;
        }
        return `data:image/png;base64,${dataStr}`;
      }

      // { image: "..." } formatı
      if (qrData.image) {
        const imageStr = qrData.image;
        if (imageStr.startsWith('data:image')) {
          return imageStr;
        }
        return `data:image/png;base64,${imageStr}`;
      }

      console.warn('QR Code objesinde tanınmayan format:', Object.keys(qrData));
      return null;
    }

    console.warn('QR Code beklenmeyen tip:', typeof qrData);
    return null;
  };

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

      // QR kodunu güvenli şekilde işle
      const processedQr = processQrCodeData(company.qr_code);
      setQrCodeData(processedQr);
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

          // QR kodunu güvenli şekilde işle
          const processedQr = processQrCodeData(newData.qr_code);
          if (processedQr !== qrCodeData) {
            setQrCodeData(processedQr);
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

  // QR Kod Al - Güncellenmiş versiyon
  const handleGetQRCode = async () => {
    // WhatsApp numarası kontrolü
    if (!company.whatsapp_number) {
      toast({
        title: t('error'),
        description: t('saveWhatsAppFirst'),
        variant: 'destructive'
      });
      return;
    }

    // Instance name yoksa oluştur
    let instanceName = company.instance_name;
    if (!instanceName) {
      instanceName = generateInstanceName(company.name, company.sector_code);

      // Instance name'i veritabanına kaydet
      if (instanceName) {
        const { error: updateError } = await supabase
          .from('companies')
          .update({ instance_name: instanceName })
          .eq('id', company.id);

        if (updateError) {
          console.error('Instance name update error:', updateError);
          toast({
            title: t('error'),
            description: 'Instance name oluşturulamadı',
            variant: 'destructive'
          });
          return;
        }

        // Company verisini yenile
        await refreshCompany();
      }
    }

    if (!instanceName) {
      toast({
        title: t('error'),
        description: t('instanceNotFound', 'Instance name oluşturulamadı. Lütfen firma adını kontrol edin.'),
        variant: 'destructive'
      });
      return;
    }

    setQrCodeLoading(true);
    try {
      const webhookUrl = import.meta.env.VITE_N8N_GET_QR_WEBHOOK_URL;

      if (!webhookUrl) {
        throw new Error('VITE_N8N_GET_QR_WEBHOOK_URL tanımlı değil');
      }

      console.log('Sending QR request:', {
        company_id: company.id,
        company_name: company.name,
        instance_name: instanceName,
        whatsapp_number: company.whatsapp_number,
        sector_code: company.sector_code
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: company.id,
          company_name: company.name,
          instance_name: instanceName,
          whatsapp_number: company.whatsapp_number,
          sector_code: company.sector_code,
          action: 'get_qr'
        })
      });

      const data = await response.json();
      console.log('QR Code API Response:', data);

      if (response.ok) {
        // Eğer response'da direkt QR kodu varsa, işle
        if (data.qr_code || data.qrcode || data.base64 || data.code || data.qr) {
          const qrFromResponse = data.qr_code || data.qrcode || data.base64 || data.code || data.qr;
          const processedQr = processQrCodeData(qrFromResponse);
          if (processedQr) {
            setQrCodeData(processedQr);
            setConnectionStatus('qr_pending');
          }
        }

        toast({
          title: t('success'),
          description: t('qrCodeSuccess'),
        });
        await refreshCompany();
      } else {
        throw new Error(data.message || t('qrCodeError'));
      }
    } catch (error) {
      console.error('QR Code Error:', error);
      toast({
        title: t('error'),
        description: error.message || t('qrCodeError'),
        variant: 'destructive'
      });
    } finally {
      setQrCodeLoading(false);
    }
  };

  // Bağlantıyı Kes - Güncellenmiş versiyon
  const handleDisconnect = async () => {
    if (!company.instance_name) {
      toast({
        title: t('error'),
        description: t('instanceNotFound'),
        variant: 'destructive'
      });
      return;
    }

    if (connectionStatus !== 'connected' && connectionStatus !== 'qr_pending') {
      toast({
        title: t('warning'),
        description: t('alreadyDisconnected'),
        variant: 'destructive'
      });
      return;
    }

    setDisconnecting(true);
    try {
      const deleteUrl = import.meta.env.VITE_EVOLUTION_API_DELETE_URL;

      if (!deleteUrl) {
        throw new Error('VITE_EVOLUTION_API_DELETE_URL tanımlı değil');
      }

      console.log('Sending disconnect request to:', deleteUrl);
      console.log('Payload:', {
        company_id: company.id,
        company_name: company.name,
        instance_name: company.instance_name,
        action: 'disconnect'
      });

      const response = await fetch(deleteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: company.id,
          company_name: company.name,
          instance_name: company.instance_name,
          action: 'disconnect'
        })
      });

      console.log('Response status:', response.status);

      // Response'u parse etmeye çalış
      let data = {};
      try {
        const text = await response.text();
        console.log('Response text:', text);
        if (text) {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        console.log('Response parse error (not critical):', parseError);
      }

      // Başarılı kabul et (200-299 veya n8n'den gelen response)
      if (response.ok || response.status === 200) {
        // Veritabanını güncelle
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            qr_code: null,
            status: 'disconnected'
          })
          .eq('id', company.id);

        if (updateError) {
          console.error('Database update error:', updateError);
        }

        setQrCodeData(null);
        setConnectionStatus('disconnected');

        toast({
          title: t('success'),
          description: t('whatsappDisconnected'),
        });

        await refreshCompany();
      } else {
        throw new Error(data.message || `HTTP ${response.status}: ${t('disconnectError')}`);
      }
    } catch (error) {
      console.error('Disconnect error:', error);

      // Network hatası olsa bile local state'i güncelle
      if (error.message === 'Failed to fetch') {
        // CORS veya network hatası - yine de veritabanını güncellemeyi dene
        try {
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              qr_code: null,
              status: 'disconnected'
            })
            .eq('id', company.id);

          if (!updateError) {
            setQrCodeData(null);
            setConnectionStatus('disconnected');
            await refreshCompany();

            toast({
              title: t('warning', 'Uyarı'),
              description: t('disconnectPartial', 'Bağlantı durumu güncellendi. WhatsApp tarafında manuel kontrol gerekebilir.'),
            });
            return;
          }
        } catch (dbError) {
          console.error('Database fallback error:', dbError);
        }
      }

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

      // Instance name'i de güncelle (eğer firma adı değiştiyse)
      const instanceName = generateInstanceName(name, company.sector_code);

      const { error: companyError } = await supabase
        .from('companies')
        .update({
          name,
          address,
          country,
          timezone,
          whatsapp_number,
          reminder_hours_before,
          cancellation_hours_before,
          instance_name: instanceName // Instance name'i de güncelle
        })
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

  // QR kodunu güvenli şekilde render eden component
  const QRCodeDisplay = () => {
    if (!qrCodeData || connectionStatus === 'connected') {
      return null;
    }

    return (
      <div className="text-center">
        <div className="bg-white p-4 rounded-xl border-2 border-blue-500 inline-block">
          <img
            src={qrCodeData}
            alt="WhatsApp QR Code"
            className="w-56 h-56"
            onError={(e) => {
              console.error('QR Code image load error');
              e.target.style.display = 'none';
            }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-3">
          WhatsApp {">"} {t('settingsTitle')} {">"} {t('linkedDevices')}
        </p>
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
                  <QRCodeDisplay />
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

              {/* Disconnect Onay Dialogu */}
              {showDisconnectConfirm && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800 mb-3">
                    {t('disconnectConfirm', 'WhatsApp bağlantısını kesmek istediğinizden emin misiniz?')}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowDisconnectConfirm(false);
                        handleDisconnect();
                      }}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {t('confirm', 'Evet, Kes')}
                    </Button>
                    <Button
                      onClick={() => setShowDisconnectConfirm(false)}
                      variant="outline"
                      size="sm"
                    >
                      {t('cancel', 'İptal')}
                    </Button>
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
                  onClick={() => setShowDisconnectConfirm(true)}
                  disabled={disconnecting || connectionStatus === 'disconnected' || showDisconnectConfirm}
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