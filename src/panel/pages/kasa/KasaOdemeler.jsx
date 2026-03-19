import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePanelAuth } from '../../contexts/PanelAuthContext';
import {
  getTodayCashRegister,
  getTransactions,
  addTransaction,
  closeCashRegister,
  calculateSummary,
} from '@/services/accountingService';
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Banknote, ArrowRightLeft,
  Plus, Lock, Loader2, X,
} from 'lucide-react';

const PAYMENT_METHODS = [
  { key: 'cash', icon: Banknote, label: 'Nakit' },
  { key: 'card', icon: CreditCard, label: 'Kart' },
  { key: 'transfer', icon: ArrowRightLeft, label: 'Havale' },
];

export default function KasaOdemeler() {
  const { t } = useTranslation();
  const { company } = usePanelAuth();
  const [cashRegister, setCashRegister] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'cash',
    description: '',
    type: 'income',
  });

  const today = new Date().toISOString().split('T')[0];

  // Verileri getir
  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const [register, txns] = await Promise.all([
        getTodayCashRegister(company.id),
        getTransactions(company.id, { startDate: today, endDate: today }),
      ]);
      setCashRegister(register);
      setTransactions(txns);
      setSummary(calculateSummary(txns));
    } catch (err) {
      console.error('Kasa verileri hatası:', err);
    } finally {
      setLoading(false);
    }
  }, [company?.id, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Ödeme ekle
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !company?.id) return;
    setSubmitting(true);
    try {
      await addTransaction(company.id, {
        ...formData,
        amount: parseFloat(formData.amount),
        transaction_date: today,
      });
      setFormData({ amount: '', payment_method: 'cash', description: '', type: 'income' });
      setShowForm(false);
      await fetchData();
    } catch (err) {
      console.error('İşlem ekleme hatası:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Kasayı kapat
  const handleCloseRegister = async () => {
    if (!cashRegister?.id || !summary) return;
    setClosing(true);
    try {
      const closingBalance = (cashRegister.opening_balance || 0) + (summary.netProfit || 0);
      await closeCashRegister(cashRegister.id, closingBalance, null, {
        cash: summary.byCash,
        card: summary.byCard,
        transfer: summary.byTransfer,
        expense: summary.totalExpense,
      });
      await fetchData();
    } catch (err) {
      console.error('Kasa kapama hatası:', err);
    } finally {
      setClosing(false);
    }
  };

  const fmt = (val) => `${(val || 0).toFixed(2)} ${company?.currency || '₺'}`;
  const isClosed = cashRegister?.status === 'closed';

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-6">
      {/* Başlık */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 pt-6 pb-4 text-white">
        <h1 className="text-lg font-bold mb-3">{t('dailyCashRegister') || 'Günlük Kasa'}</h1>
        {/* Özet kartlar */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-emerald-200" />
            <p className="text-sm font-bold">{fmt(summary?.totalIncome)}</p>
            <p className="text-xs text-emerald-100">{t('income') || 'Gelir'}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <TrendingDown className="w-4 h-4 mx-auto mb-1 text-red-200" />
            <p className="text-sm font-bold">{fmt(summary?.totalExpense)}</p>
            <p className="text-xs text-emerald-100">{t('expense') || 'Gider'}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <DollarSign className="w-4 h-4 mx-auto mb-1 text-yellow-200" />
            <p className="text-sm font-bold">{fmt(summary?.netProfit)}</p>
            <p className="text-xs text-emerald-100">{t('net') || 'Net'}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Ödeme ekle butonu */}
        {!isClosed && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-medium min-h-[44px] active:bg-emerald-700"
          >
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {showForm ? (t('close') || 'Kapat') : (t('addPayment') || 'Ödeme Ekle')}
          </button>
        )}

        {/* Ödeme formu */}
        {showForm && !isClosed && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            {/* Gelir / Gider */}
            <div className="flex gap-2">
              {['income', 'expense'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, type }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium min-h-[44px] border transition-colors ${
                    formData.type === type
                      ? type === 'income' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-stone-600 border-stone-200'
                  }`}
                >
                  {type === 'income' ? (t('income') || 'Gelir') : (t('expense') || 'Gider')}
                </button>
              ))}
            </div>
            {/* Tutar */}
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder={t('amount') || 'Tutar'}
              value={formData.amount}
              onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg border border-stone-200 text-lg min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            {/* Ödeme yöntemi */}
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.key}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, payment_method: pm.key }))}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium min-h-[44px] border transition-colors ${
                    formData.payment_method === pm.key
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : 'bg-white text-stone-500 border-stone-200'
                  }`}
                >
                  <pm.icon className="w-4 h-4" />
                  {t(pm.key) || pm.label}
                </button>
              ))}
            </div>
            {/* Açıklama */}
            <input
              type="text"
              placeholder={t('description') || 'Açıklama'}
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg border border-stone-200 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={submitting || !formData.amount}
              className="w-full py-3 rounded-lg bg-emerald-600 text-white font-medium min-h-[44px] active:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('save') || 'Kaydet'}
            </button>
          </form>
        )}

        {/* İşlem listesi */}
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          {t('todayTransactions') || 'Bugünkü İşlemler'} ({transactions.length})
        </h2>
        {transactions.length === 0 ? (
          <p className="text-center text-sm text-stone-400 py-8">{t('noTransactions') || 'Henüz işlem yok'}</p>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="bg-white rounded-xl border border-stone-200 p-3 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                tx.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'
              }`}>
                {tx.type === 'income' ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-700 truncate">{tx.description || tx.transaction_categories?.name || '-'}</p>
                <p className="text-xs text-stone-400">{tx.payment_method}</p>
              </div>
              <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                {tx.type === 'income' ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)}
              </span>
            </div>
          ))
        )}

        {/* Gün sonu kasa kapat */}
        {!isClosed && transactions.length > 0 && (
          <button
            onClick={handleCloseRegister}
            disabled={closing}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-800 text-white font-medium min-h-[44px] active:bg-stone-900 disabled:opacity-50 mt-4"
          >
            {closing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
            {t('closeCashRegister') || 'Kasayı Kapat'}
          </button>
        )}

        {isClosed && (
          <div className="text-center py-4 text-stone-500 text-sm bg-stone-100 rounded-xl">
            <Lock className="w-5 h-5 mx-auto mb-1 text-stone-400" />
            {t('cashRegisterClosed') || 'Kasa kapatıldı'}
          </div>
        )}
      </div>
    </div>
  );
}
