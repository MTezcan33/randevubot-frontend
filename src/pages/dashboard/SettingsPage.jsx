import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Building, MapPin, Globe, Clock, Upload, Image, Phone, MessageCircle, BellRing, Ban } from 'lucide-react';
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
            <input type="tel" placeholder="+905551234567" value={formData.whatsapp_number} onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white" />
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