import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Hassas ayarlar için PIN doğrulama kapısı
const AdminPinGate = ({ isOpen, onClose, onVerified, title }) => {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleDigit = (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      // PIN doğrulama — admin PIN'i company_users'dan kontrol edilecek
      onVerified(newPin);
      setPin('');
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Shield className="w-5 h-5 text-emerald-600" />
            {title || t('adminPinRequired') || 'Yönetici PIN Gerekli'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-4 space-y-4">
          {/* PIN gösterimi */}
          <div className="flex gap-3">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                  i < pin.length
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-300'
                }`}
              >
                {i < pin.length ? <Lock className="w-5 h-5" /> : ''}
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Sayısal tuş takımı */}
          <div className="grid grid-cols-3 gap-2 w-48">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, i) => {
              if (key === null) return <div key={i} />;
              if (key === 'del') {
                return (
                  <button
                    key={i}
                    onClick={handleDelete}
                    className="h-12 rounded-lg bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-colors text-sm"
                  >
                    {t('delete') || 'Sil'}
                  </button>
                );
              }
              return (
                <button
                  key={i}
                  onClick={() => handleDigit(String(key))}
                  className="h-12 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold text-lg hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="w-full">
            {t('cancel') || 'İptal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminPinGate;
