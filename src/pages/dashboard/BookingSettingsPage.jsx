import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Globe, Copy, Check, ExternalLink, Code, Calendar,
  ToggleLeft, ToggleRight, Loader2, Link2,
} from 'lucide-react';

const BookingSettingsPage = () => {
  const { company, refreshCompany } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null); // 'link' | 'embed' | null

  // Form state
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [slug, setSlug] = useState('');
  const [maxDaysInAdvance, setMaxDaysInAdvance] = useState(30);
  const [requirePhoneVerification, setRequirePhoneVerification] = useState(false);
  const [autoConfirm, setAutoConfirm] = useState(false);

  // Slug oluşturma: Türkçe karakter ve boşluk temizleme
  const generateSlug = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/Ğ/g, 'g').replace(/Ü/g, 'u').replace(/Ş/g, 's')
      .replace(/İ/g, 'i').replace(/Ö/g, 'o').replace(/Ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Mevcut ayarları yükle
  useEffect(() => {
    if (!company) return;
    setBookingEnabled(company.booking_enabled || false);
    setSlug(company.slug || generateSlug(company.name));
    setMaxDaysInAdvance(company.booking_max_days || 30);
    setRequirePhoneVerification(company.booking_require_phone_verification || false);
    setAutoConfirm(company.booking_auto_confirm || false);
  }, [company]);

  const bookingUrl = `https://randevubot.net/book/${slug}`;
  const embedCode = `<iframe src="${bookingUrl}" width="100%" height="700" frameborder="0" style="border:none; border-radius:12px;"></iframe>`;

  // Panoya kopyala
  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
      toast({ title: t('copied'), variant: 'default' });
    } catch {
      toast({ title: t('copyFailed'), variant: 'destructive' });
    }
  };

  // Ayarları kaydet
  const handleSave = async () => {
    if (!slug.trim()) {
      toast({ title: t('slugRequired'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Slug benzersizlik kontrolü
      const { data: existing } = await supabase
        .from('companies')
        .select('id')
        .eq('slug', slug)
        .neq('id', company.id)
        .single();

      if (existing) {
        toast({ title: t('slugAlreadyInUse'), description: t('pleaseEnterDifferentSlug'), variant: 'destructive' });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('companies')
        .update({
          booking_enabled: bookingEnabled,
          slug: slug,
          booking_max_days: maxDaysInAdvance,
          booking_require_phone_verification: requirePhoneVerification,
          booking_auto_confirm: autoConfirm,
        })
        .eq('id', company.id);

      if (error) throw error;

      await refreshCompany();
      toast({ title: t('settingsSaved'), variant: 'default' });
    } catch (err) {
      console.error('Booking ayarları kaydetme hatası:', err);
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  // Toggle buton bileşeni
  const Toggle = ({ enabled, onToggle, label, description }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-stone-700 text-sm">{label}</p>
        {description && <p className="text-xs text-stone-400 mt-0.5">{description}</p>}
      </div>
      <button onClick={onToggle} className="focus:outline-none">
        {enabled ? (
          <ToggleRight className="w-10 h-10 text-emerald-600" />
        ) : (
          <ToggleLeft className="w-10 h-10 text-stone-300" />
        )}
      </button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">{t('onlineBookingSettings')}</h1>
        <p className="text-stone-500 text-sm mt-1">
          {t('onlineBookingSettingsDesc')}
        </p>
      </div>

      {/* Ana toggle */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
        <Toggle
          enabled={bookingEnabled}
          onToggle={() => setBookingEnabled(!bookingEnabled)}
          label={t('enableOnlineBooking')}
          description={t('onlineBookingToggleDesc')}
        />
      </div>

      {/* Bağlantı & Slug */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="w-5 h-5 text-emerald-600" />
          <h2 className="font-semibold text-stone-800">{t('bookingLink')}</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1.5">{t('linkSlug')}</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-400 whitespace-nowrap">randevubot.net/book/</span>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder={t('slugPlaceholder')}
              className="flex-1"
            />
          </div>
        </div>

        {/* Önizleme bağlantısı */}
        <div className="flex items-center gap-2 bg-stone-50 rounded-xl p-3">
          <Globe className="w-4 h-4 text-stone-400 shrink-0" />
          <span className="text-sm text-stone-600 truncate flex-1">{bookingUrl}</span>
          <button
            onClick={() => handleCopy(bookingUrl, 'link')}
            className="p-1.5 rounded-lg hover:bg-stone-200 transition-colors"
          >
            {copied === 'link' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-stone-500" />
            )}
          </button>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-stone-200 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-stone-500" />
          </a>
        </div>
      </div>

      {/* Embed kodu */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Code className="w-5 h-5 text-emerald-600" />
          <h2 className="font-semibold text-stone-800">{t('addToWebsite')}</h2>
        </div>
        <p className="text-xs text-stone-400">
          {t('embedCodeDesc')}
        </p>
        <div className="relative">
          <pre className="bg-stone-50 rounded-xl p-3 text-xs text-stone-600 overflow-x-auto whitespace-pre-wrap break-all">
            {embedCode}
          </pre>
          <button
            onClick={() => handleCopy(embedCode, 'embed')}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white shadow-sm hover:bg-stone-100 transition-colors"
          >
            {copied === 'embed' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-stone-500" />
            )}
          </button>
        </div>
      </div>

      {/* Ayarlar */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 space-y-1">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <h2 className="font-semibold text-stone-800">{t('bookingSettings')}</h2>
        </div>

        <div className="py-3">
          <label className="block text-sm font-medium text-stone-600 mb-1.5">
            {t('maxAdvanceDays')}
          </label>
          <Input
            type="number"
            min={1}
            max={90}
            value={maxDaysInAdvance}
            onChange={(e) => setMaxDaysInAdvance(Number(e.target.value))}
            className="w-32"
          />
          <p className="text-xs text-stone-400 mt-1">{t('maxAdvanceDaysDesc')}</p>
        </div>

        <div className="border-t border-stone-50">
          <Toggle
            enabled={requirePhoneVerification}
            onToggle={() => setRequirePhoneVerification(!requirePhoneVerification)}
            label={t('phoneVerification')}
            description={t('phoneVerificationDesc')}
          />
        </div>

        <div className="border-t border-stone-50">
          <Toggle
            enabled={autoConfirm}
            onToggle={() => setAutoConfirm(!autoConfirm)}
            label={t('autoApproval')}
            description={t('autoApprovalDesc')}
          />
        </div>
      </div>

      {/* Kaydet */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-medium"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {saving ? t('saving') : t('saveSettings')}
      </Button>
    </div>
  );
};

export default BookingSettingsPage;
