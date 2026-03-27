import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import {
  Banknote,
  CreditCard,
  Globe,
  Gift,
  X,
  Undo2,
  CheckCircle2,
  AlertCircle,
  User,
  Clock,
  Loader2,
} from 'lucide-react';
import { collectPayment, refundPayment, refundAllPayments, getAppointmentPaymentDetail } from '@/services/paymentService';

// Ödeme yöntemi tanımları
const PAYMENT_METHODS = [
  { key: 'cash', icon: Banknote, color: 'emerald', bgActive: 'bg-emerald-500', bgHover: 'hover:bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700' },
  { key: 'card', icon: CreditCard, color: 'blue', bgActive: 'bg-blue-500', bgHover: 'hover:bg-blue-50', border: 'border-blue-500', text: 'text-blue-700' },
  { key: 'online', icon: Globe, color: 'purple', bgActive: 'bg-purple-500', bgHover: 'hover:bg-purple-50', border: 'border-purple-500', text: 'text-purple-700' },
  { key: 'free', icon: Gift, color: 'amber', bgActive: 'bg-amber-500', bgHover: 'hover:bg-amber-50', border: 'border-amber-500', text: 'text-amber-700' },
];

const QUICK_AMOUNTS = [50, 100, 200, 500];

const PaymentCollectionModal = ({ open, onClose, appointmentId, companyId, experts = [], onPaymentComplete, currentUserId = null }) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);

  // Ödeme form state
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  // İade dialog
  const [refundingId, setRefundingId] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundingAll, setRefundingAll] = useState(false);

  // Veri yükle
  const fetchDetail = async () => {
    if (!appointmentId) return;
    setLoading(true);
    try {
      const data = await getAppointmentPaymentDetail(appointmentId);
      setDetail(data);
      // Varsayılan tutar: kalan miktar
      setAmount(data.remainingAmount > 0 ? data.remainingAmount.toFixed(2) : '0');
    } catch (err) {
      console.error('Ödeme detayı yükleme hatası:', err);
      toast({ title: t('error') || 'Hata', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && appointmentId) {
      fetchDetail();
      setSelectedMethod('cash');
      setNote('');
      setSelectedServiceIds([]);
      setRefundingId(null);
      setRefundReason('');
      setRefundingAll(false);
    }
  }, [open, appointmentId]);

  // Hizmet listesi (appointment_services veya doğrudan service_id)
  const services = useMemo(() => {
    if (!detail) return [];
    if (detail.appointment_services && detail.appointment_services.length > 0) {
      return detail.appointment_services.map(as => {
        const expert = as.expert_id ? experts.find(e => e.id === as.expert_id) : null;
        return {
          id: as.service_id,
          name: as.company_services?.description || '-',
          price: parseFloat(as.company_services?.price) || 0,
          duration: as.company_services?.duration || 0,
          expertId: as.expert_id,
          expertName: expert?.name || null,
          expertColor: expert?.color || null,
        };
      });
    }
    return [];
  }, [detail]);

  // Aktif (iade edilmemiş) önceki ödemeler
  const activePayments = useMemo(() => {
    if (!detail?.appointment_payments) return [];
    return detail.appointment_payments.filter(p => !p.is_refunded);
  }, [detail]);

  // Hizmet bazlı ödeme durumu
  const servicePaymentMap = useMemo(() => {
    const map = {};
    activePayments.forEach(p => {
      if (p.service_id) {
        if (!map[p.service_id]) map[p.service_id] = 0;
        map[p.service_id] += parseFloat(p.amount) || 0;
      }
    });
    return map;
  }, [activePayments]);

  // Seçili hizmetlerin toplam fiyatı
  const selectedTotal = useMemo(() => {
    if (selectedServiceIds.length === 0) return 0;
    return services
      .filter(s => selectedServiceIds.includes(s.id))
      .reduce((sum, s) => {
        const paid = servicePaymentMap[s.id] || 0;
        return sum + Math.max(0, s.price - paid);
      }, 0);
  }, [selectedServiceIds, services, servicePaymentMap]);

  // Hizmet seçimi değişince tutar güncelle
  useEffect(() => {
    if (selectedServiceIds.length > 0 && detail) {
      setAmount(selectedTotal.toFixed(2));
    } else if (detail) {
      setAmount(detail.remainingAmount > 0 ? detail.remainingAmount.toFixed(2) : '0');
    }
  }, [selectedServiceIds, selectedTotal, detail]);

  // Ücretsiz seçilince tutar = kalan tutar
  useEffect(() => {
    if (selectedMethod === 'free' && detail) {
      setAmount(detail.remainingAmount > 0 ? detail.remainingAmount.toFixed(2) : '0');
    }
  }, [selectedMethod, detail]);

  const remaining = detail?.remainingAmount || 0;
  const parsedAmount = parseFloat(amount) || 0;
  const afterPayment = Math.max(0, remaining - parsedAmount);
  const isComplete = afterPayment === 0 && parsedAmount > 0;

  // Ödeme kaydet
  const handleSavePayment = async () => {
    if (parsedAmount <= 0) {
      toast({ title: t('error') || 'Hata', description: t('amountMustBePositive') || 'Tutar 0\'dan büyük olmalı', variant: 'destructive' });
      return;
    }
    if (parsedAmount > remaining + 0.01) {
      toast({ title: t('error') || 'Hata', description: t('amountExceedsRemaining') || 'Tutar kalan tutarı aşamaz', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const serviceId = selectedServiceIds.length === 1 ? selectedServiceIds[0] : null;
      const result = await collectPayment(companyId, {
        appointmentId,
        amount: parsedAmount,
        paymentMethod: selectedMethod,
        serviceId,
        note: note || null,
        collectedBy: currentUserId || null,
      });

      const methodLabel = t(selectedMethod) || selectedMethod;
      toast({
        title: t('paymentRecorded') || 'Ödeme kaydedildi',
        description: `${parsedAmount.toFixed(2)} ${methodLabel}`,
      });

      // Tamamlandıysa kapat
      if (result.updatedAppointment.remainingAmount <= 0) {
        onPaymentComplete?.(result.updatedAppointment);
        onClose();
      } else {
        // Modal'ı güncelle, devam et
        setDetail(result.updatedAppointment);
        setAmount(result.updatedAppointment.remainingAmount.toFixed(2));
        setNote('');
        setSelectedServiceIds([]);
        onPaymentComplete?.(result.updatedAppointment);
      }
    } catch (err) {
      console.error('Ödeme kaydetme hatası:', err);
      toast({ title: t('error') || 'Hata', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Tekil iade
  const handleRefund = async (paymentId) => {
    try {
      await refundPayment(paymentId, refundReason || null);
      toast({ title: t('refunded') || 'İade edildi' });
      setRefundingId(null);
      setRefundReason('');
      fetchDetail();
    } catch (err) {
      toast({ title: t('error') || 'Hata', description: err.message, variant: 'destructive' });
    }
  };

  // Toplu iade
  const handleRefundAll = async () => {
    try {
      await refundAllPayments(appointmentId, refundReason || null);
      toast({ title: t('refunded') || 'Tüm ödemeler iade edildi' });
      setRefundingAll(false);
      setRefundReason('');
      fetchDetail();
    } catch (err) {
      toast({ title: t('error') || 'Hata', description: err.message, variant: 'destructive' });
    }
  };

  // Hizmet seçimi toggle
  const toggleService = (serviceId) => {
    setSelectedServiceIds(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  if (!open) return null;

  const methodLabel = selectedMethod === 'cash' ? (t('cash') || 'Nakit')
    : selectedMethod === 'card' ? (t('card') || 'Kredi Kartı')
    : selectedMethod === 'online' ? (t('online') || 'Online')
    : (t('freePayment') || 'Ücretsiz');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-gradient-to-r from-stone-50 to-emerald-50">
          <div>
            <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              {t('collectPayment') || 'Ödeme Al'}
            </h2>
            {detail && (
              <p className="text-sm text-stone-500 mt-0.5">
                <span className="font-medium text-stone-700">{detail.customers?.name}</span>
                {' · '}
                {detail.date} {detail.time?.slice(0, 5)}
                {detail.company_users?.name && (
                  <span> · <User className="w-3 h-3 inline" /> {detail.company_users.name}</span>
                )}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-stone-200">
              {/* SOL PANEL — Hizmetler & Özet */}
              <div className="p-5 space-y-4">
                {/* Hizmet listesi */}
                {services.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-stone-600 mb-2">
                      {t('services') || 'Hizmetler'}
                    </h3>
                    <div className="space-y-1.5">
                      {services.map(s => {
                        const paidForService = servicePaymentMap[s.id] || 0;
                        const isFullyPaid = paidForService >= s.price;
                        const isPartial = paidForService > 0 && paidForService < s.price;
                        const isSelected = selectedServiceIds.includes(s.id);

                        return (
                          <label
                            key={s.id}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer
                              ${isFullyPaid ? 'bg-emerald-50 border-emerald-200 opacity-60 cursor-not-allowed' : ''}
                              ${isSelected && !isFullyPaid ? 'bg-blue-50 border-blue-300' : 'border-stone-200 hover:border-stone-300'}
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected || isFullyPaid}
                              disabled={isFullyPaid}
                              onChange={() => !isFullyPaid && toggleService(s.id)}
                              className="w-4 h-4 rounded accent-emerald-600"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${isFullyPaid ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                                {s.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {s.duration > 0 && (
                                  <span className="text-xs text-stone-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {s.duration} dk
                                  </span>
                                )}
                                {s.expertName && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                                    style={{ backgroundColor: s.expertColor || '#6B7280' }}
                                  >
                                    <User className="w-2.5 h-2.5" />
                                    {s.expertName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-bold ${isFullyPaid ? 'text-emerald-600' : 'text-stone-800'}`}>
                                {s.price.toFixed(2)}
                              </p>
                              {isFullyPaid && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                                  {t('fullyPaid') || 'Ödendi'}
                                </span>
                              )}
                              {isPartial && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                                  {paidForService.toFixed(0)}/{s.price.toFixed(0)}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ödeme özeti */}
                <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-stone-600 mb-2">
                    {t('paymentSummary') || 'Ödeme Özeti'}
                  </h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">{t('totalAmount') || 'Toplam Tutar'}</span>
                    <span className="font-bold text-stone-800">{detail.totalAmount.toFixed(2)}</span>
                  </div>
                  {detail.paidAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">{t('paidAmount') || 'Ödenen'}</span>
                      <span className="font-medium text-emerald-600">-{detail.paidAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-stone-200 pt-2 flex justify-between text-sm">
                    <span className="text-stone-600 font-semibold">{t('remainingAmount') || 'Kalan'}</span>
                    <span className="font-bold text-lg text-red-600">{remaining.toFixed(2)}</span>
                  </div>
                  {parsedAmount > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-500">{t('thisPayment') || 'Bu İşlem'}</span>
                        <span className="font-medium text-blue-600">-{parsedAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-dashed border-stone-300 pt-1">
                        <span className="text-stone-500">{t('afterPayment') || 'İşlem Sonrası'}</span>
                        <span className={`font-bold ${afterPayment === 0 ? 'text-emerald-600' : 'text-stone-800'}`}>
                          {afterPayment.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                  {/* İlerleme çubuğu */}
                  {detail.totalAmount > 0 && (
                    <div className="mt-2">
                      <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, ((detail.paidAmount + parsedAmount) / detail.totalAmount) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-stone-400 mt-1 text-right">
                        %{Math.min(100, Math.round(((detail.paidAmount + parsedAmount) / detail.totalAmount) * 100))}
                      </p>
                    </div>
                  )}
                </div>

                {/* Önceki ödemeler */}
                {activePayments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-stone-600 mb-2">
                      {t('previousPayments') || 'Önceki Ödemeler'}
                    </h3>
                    <div className="space-y-1">
                      {activePayments.map(p => {
                        const method = PAYMENT_METHODS.find(m => m.key === p.payment_method);
                        const MethodIcon = method?.icon || Banknote;

                        return (
                          <div key={p.id} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg text-sm">
                            <MethodIcon className={`w-4 h-4 ${method?.text || 'text-stone-500'}`} />
                            <span className="font-medium text-stone-700">{parseFloat(p.amount).toFixed(2)}</span>
                            <span className="text-stone-400 text-xs">
                              {new Date(p.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {p.note && <span className="text-stone-400 text-xs truncate flex-1">— {p.note}</span>}
                            {/* Geri Al butonu */}
                            {refundingId === p.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={refundReason}
                                  onChange={e => setRefundReason(e.target.value)}
                                  placeholder={t('refundReason') || 'Neden...'}
                                  className="w-24 text-xs border rounded px-1.5 py-0.5"
                                />
                                <button
                                  onClick={() => handleRefund(p.id)}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                  {t('confirm') || 'Onayla'}
                                </button>
                                <button
                                  onClick={() => { setRefundingId(null); setRefundReason(''); }}
                                  className="text-xs text-stone-400 hover:text-stone-600"
                                >
                                  {t('cancel') || 'İptal'}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setRefundingId(p.id)}
                                className="ml-auto p-1 text-stone-400 hover:text-red-500 transition-colors"
                                title={t('refund') || 'İade Et'}
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SAĞ PANEL — Ödeme İşlemi */}
              <div className="p-5 space-y-5">
                {/* Ödeme yöntemi seçimi */}
                <div>
                  <h3 className="text-sm font-semibold text-stone-600 mb-3">
                    {t('paymentMethod') || 'Ödeme Yöntemi'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map(m => {
                      const Icon = m.icon;
                      const isActive = selectedMethod === m.key;
                      const label = m.key === 'cash' ? (t('cash') || 'Nakit')
                        : m.key === 'card' ? (t('card') || 'Kart')
                        : m.key === 'online' ? (t('online') || 'Online')
                        : (t('freePayment') || 'Ücretsiz');

                      return (
                        <button
                          key={m.key}
                          onClick={() => setSelectedMethod(m.key)}
                          className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all
                            ${isActive
                              ? `${m.bgActive} text-white border-transparent shadow-lg scale-[1.02]`
                              : `bg-white ${m.bgHover} border-stone-200 ${m.text}`
                            }
                          `}
                        >
                          <Icon className="w-5 h-5" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tutar girişi */}
                <div>
                  <h3 className="text-sm font-semibold text-stone-600 mb-2">
                    {t('amount') || 'Tutar'}
                  </h3>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-lg">₺</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      min="0"
                      max={remaining}
                      step="0.01"
                      disabled={selectedMethod === 'free'}
                      className="w-full pl-10 pr-4 py-4 text-2xl font-bold text-stone-800 border-2 border-stone-200 rounded-xl
                        focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all
                        disabled:bg-stone-50 disabled:text-stone-400"
                    />
                  </div>

                  {/* Hızlı tutar butonları */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setAmount(remaining.toFixed(2))}
                      className="flex-1 py-2 px-3 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                    >
                      {t('payAll') || 'Tamamı'}
                    </button>
                    {QUICK_AMOUNTS.map(qa => (
                      <button
                        key={qa}
                        onClick={() => setAmount(Math.min(qa, remaining).toFixed(2))}
                        disabled={qa > remaining}
                        className="py-2 px-3 text-xs font-medium bg-stone-50 text-stone-600 rounded-lg hover:bg-stone-100
                          transition-colors border border-stone-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ₺{qa}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Not */}
                <div>
                  <h3 className="text-sm font-semibold text-stone-600 mb-2">
                    {t('paymentNote') || 'Not (opsiyonel)'}
                  </h3>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder={t('paymentNotePlaceholder') || 'Ödeme notu...'}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all"
                  />
                </div>

                {/* Kaydet butonu */}
                <button
                  onClick={handleSavePayment}
                  disabled={saving || parsedAmount <= 0 || remaining <= 0}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all
                    flex items-center justify-center gap-2
                    ${saving || parsedAmount <= 0 || remaining <= 0
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      : isComplete
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98]'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 active:scale-[0.98]'
                    }
                  `}
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isComplete ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <CreditCard className="w-5 h-5" />
                  )}
                  {saving
                    ? (t('saving') || 'Kaydediliyor...')
                    : `₺${parsedAmount.toFixed(2)} ${methodLabel} ${isComplete ? '✓' : ''}`
                  }
                </button>

                {parsedAmount > 0 && !isComplete && (
                  <p className="text-center text-xs text-stone-400">
                    {t('afterPayment') || 'İşlem sonrası kalan'}: <span className="font-semibold text-stone-600">₺{afterPayment.toFixed(2)}</span>
                  </p>
                )}

                {remaining <= 0 && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5" />
                    {t('paymentCompleted') || 'Ödeme tamamlandı!'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-stone-400">
            <AlertCircle className="w-6 h-6 mr-2" /> {t('error') || 'Veri yüklenemedi'}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 flex items-center justify-between bg-stone-50">
          {activePayments.length > 0 ? (
            refundingAll ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  placeholder={t('refundReason') || 'İade nedeni...'}
                  className="text-sm border rounded px-2 py-1 w-40"
                />
                <button onClick={handleRefundAll} className="text-sm text-red-600 hover:text-red-700 font-medium">
                  {t('confirm') || 'Onayla'}
                </button>
                <button onClick={() => { setRefundingAll(false); setRefundReason(''); }} className="text-sm text-stone-400 hover:text-stone-600">
                  {t('cancel') || 'İptal'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setRefundingAll(true)}
                className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
              >
                <Undo2 className="w-3.5 h-3.5" />
                {t('refundAll') || 'Tüm Ödemeleri İptal Et'}
              </button>
            )
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition-colors"
          >
            {t('close') || 'Kapat'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCollectionModal;
