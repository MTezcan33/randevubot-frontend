import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, UserCircle, Shield, Wallet, Calendar, Delete, LogIn } from 'lucide-react';
import { usePanelAuth } from '../hooks/usePanelAuth';

// Panel rolleri
const ROLES = [
  { key: 'uzman', icon: Calendar, labelKey: 'panelRoleUzman', fallback: 'Uzman' },
  { key: 'resepsiyonist', icon: UserCircle, labelKey: 'panelRoleResepsiyonist', fallback: 'Resepsiyonist' },
  { key: 'kasa', icon: Wallet, labelKey: 'panelRoleKasa', fallback: 'Kasa' },
  { key: 'yonetici', icon: Shield, labelKey: 'panelRoleYonetici', fallback: 'Yönetici' },
];

export default function PanelLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { panelLogin, panelUser, panelRole, loading } = usePanelAuth();

  const [companyId, setCompanyId] = useState(searchParams.get('company') || '');
  const [pin, setPin] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Zaten giriş yapılmışsa ilgili panele yönlendir
  useEffect(() => {
    if (panelUser && panelRole) {
      navigate(`/panel/${panelRole}`, { replace: true });
    }
  }, [panelUser, panelRole, navigate]);

  // PIN tuşuna basma
  const handlePinDigit = (digit) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
      setError('');
    }
  };

  // PIN silme
  const handlePinDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  // Giriş yap
  const handleSubmit = async () => {
    if (!companyId.trim()) {
      setError(t('panelErrorCompanyId') || 'Şirket ID gerekli');
      return;
    }
    if (pin.length !== 4) {
      setError(t('panelErrorPin') || '4 haneli PIN giriniz');
      return;
    }
    if (!selectedRole) {
      setError(t('panelErrorRole') || 'Rol seçiniz');
      return;
    }

    setSubmitting(true);
    setError('');

    const result = await panelLogin(companyId.trim(), pin, selectedRole);

    if (result.success) {
      navigate(`/panel/${selectedRole}`, { replace: true });
    } else {
      setError(result.error || t('panelLoginFailed') || 'Giriş başarısız');
      setPin('');
    }

    setSubmitting(false);
  };

  // PIN tamamlandığında otomatik submit (rol seçiliyse)
  useEffect(() => {
    if (pin.length === 4 && selectedRole && companyId.trim()) {
      handleSubmit();
    }
  }, [pin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-stone-100 flex flex-col items-center justify-center p-4">
      {/* Başlık */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white mb-3">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-stone-800">
          {t('panelLoginTitle') || 'Panel Girişi'}
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          {t('panelLoginSubtitle') || 'PIN kodunuz ile giriş yapın'}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-5">
        {/* Şirket ID (URL param yoksa göster) */}
        {!searchParams.get('company') && (
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              {t('panelCompanyId') || 'Şirket ID'}
            </label>
            <input
              type="text"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-800
                         placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500
                         focus:border-emerald-500 text-sm"
            />
          </div>
        )}

        {/* Rol seçimi */}
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2">
            {t('panelSelectRole') || 'Rol Seçin'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(({ key, icon: Icon, labelKey, fallback }) => (
              <button
                key={key}
                onClick={() => { setSelectedRole(key); setError(''); }}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium
                  ${selectedRole === key
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{t(labelKey) || fallback}</span>
              </button>
            ))}
          </div>
        </div>

        {/* PIN gösterimi */}
        <div className="flex justify-center gap-3 py-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all
                ${pin.length > i
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-stone-300 bg-white text-stone-300'
                }`}
            >
              {pin.length > i ? '●' : ''}
            </div>
          ))}
        </div>

        {/* Hata mesajı */}
        {error && (
          <div className="text-center text-red-600 text-sm bg-red-50 rounded-xl py-2 px-3">
            {error}
          </div>
        )}

        {/* Sayısal tuş takımı */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              onClick={() => handlePinDigit(String(digit))}
              disabled={submitting}
              className="h-14 rounded-xl bg-white border border-stone-200 text-xl font-semibold text-stone-700
                         hover:bg-stone-50 active:bg-stone-100 transition-colors disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          {/* Alt sıra: Sil, 0, Giriş */}
          <button
            onClick={handlePinDelete}
            disabled={submitting}
            className="h-14 rounded-xl bg-white border border-stone-200 flex items-center justify-center
                       text-stone-500 hover:bg-stone-50 active:bg-stone-100 transition-colors disabled:opacity-50"
          >
            <Delete className="w-6 h-6" />
          </button>
          <button
            onClick={() => handlePinDigit('0')}
            disabled={submitting}
            className="h-14 rounded-xl bg-white border border-stone-200 text-xl font-semibold text-stone-700
                       hover:bg-stone-50 active:bg-stone-100 transition-colors disabled:opacity-50"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || pin.length !== 4}
            className="h-14 rounded-xl bg-emerald-600 text-white flex items-center justify-center
                       hover:bg-emerald-700 active:bg-emerald-800 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <LogIn className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
