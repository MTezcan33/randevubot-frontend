import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import {
  Wallet,
  Search,
  Filter,
  Calendar,
  CreditCard,
  Banknote,
  Globe,
  Gift,
  User,
  Phone,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Settings2,
  CheckCircle2,
  AlertCircle,
  History,
  Loader2,
  Undo2,
} from 'lucide-react';
import PaymentCollectionModal from '@/components/PaymentCollectionModal';
import {
  getUnpaidAppointments,
  getPaymentHistory,
  getPaymentSummary,
  getPaymentSettings,
  updatePaymentSettings,
} from '@/services/paymentService';
import * as XLSX from 'xlsx';

// Ödeme yöntemi stilleri (label'lar component içinde t() ile oluşturulur)
const METHOD_STYLES = {
  cash: { icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  card: { icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  online: { icon: Globe, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  free: { icon: Gift, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
};

// Ödeme durumu badge stilleri (label'lar component içinde t() ile oluşturulur)
const STATUS_BADGE_STYLES = {
  unpaid: { color: 'bg-red-100 text-red-700 border-red-200' },
  partial: { color: 'bg-amber-100 text-amber-700 border-amber-200' },
  paid: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  free: { color: 'bg-stone-100 text-stone-600 border-stone-200' },
  refunded: { color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const PaymentsPage = () => {
  const { company, staff } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();

  // Çeviri destekli ödeme yöntemi label'ları
  const methodLabels = useMemo(() => ({
    cash: t('cash'),
    card: t('card'),
    online: t('online'),
    free: t('freePayment'),
  }), [t]);

  // Çeviri destekli ödeme durumu badge'leri
  const statusBadges = useMemo(() => ({
    unpaid: { label: t('unpaid'), ...STATUS_BADGE_STYLES.unpaid },
    partial: { label: t('partiallyPaid'), ...STATUS_BADGE_STYLES.partial },
    paid: { label: t('paid'), ...STATUS_BADGE_STYLES.paid },
    free: { label: t('freePayment'), ...STATUS_BADGE_STYLES.free },
    refunded: { label: t('refunded'), ...STATUS_BADGE_STYLES.refunded },
  }), [t]);

  // Tab: 0=Bekleyen, 1=Geçmiş, 2=Ayarlar
  const [activeTab, setActiveTab] = useState(0);

  // Bekleyen ödemeler state
  const [unpaidAppointments, setUnpaidAppointments] = useState([]);
  const [unpaidLoading, setUnpaidLoading] = useState(true);
  const [unpaidFilter, setUnpaidFilter] = useState({
    dateRange: 'today',
    expertId: '',
    status: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Geçmiş state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySummary, setHistorySummary] = useState(null);
  const [historyFilter, setHistoryFilter] = useState({
    dateRange: 'today',
    paymentMethod: '',
    status: '',
    search: '',
  });

  // Ayarlar state
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Modal state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Tarih hesaplama
  const getDateRange = (rangeKey) => {
    const today = new Date().toISOString().split('T')[0];
    if (rangeKey === 'today') return { startDate: today, endDate: today };
    if (rangeKey === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { startDate: d.toISOString().split('T')[0], endDate: today };
    }
    if (rangeKey === 'month') {
      const d = new Date();
      d.setDate(1);
      return { startDate: d.toISOString().split('T')[0], endDate: today };
    }
    return { startDate: null, endDate: null }; // Tümü
  };

  // ─── Bekleyen ödemeleri yükle ──────────────────────────────────────────────
  const fetchUnpaid = useCallback(async () => {
    if (!company) return;
    setUnpaidLoading(true);
    try {
      const { startDate, endDate } = getDateRange(unpaidFilter.dateRange);
      const data = await getUnpaidAppointments(company.id, {
        startDate,
        endDate,
        expertId: unpaidFilter.expertId || undefined,
        status: unpaidFilter.status || undefined,
        search: unpaidFilter.search || undefined,
      });
      setUnpaidAppointments(data);
    } catch (err) {
      console.error('Bekleyen ödemeler yükleme hatası:', err);
    } finally {
      setUnpaidLoading(false);
    }
  }, [company, unpaidFilter]);

  useEffect(() => { fetchUnpaid(); }, [fetchUnpaid]);

  // ─── Ödeme geçmişi yükle ──────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (!company || activeTab !== 1) return;
    setHistoryLoading(true);
    try {
      const { startDate, endDate } = getDateRange(historyFilter.dateRange);
      const [histData, summaryData] = await Promise.all([
        getPaymentHistory(company.id, {
          startDate,
          endDate,
          paymentMethod: historyFilter.paymentMethod || undefined,
          status: historyFilter.status || undefined,
          search: historyFilter.search || undefined,
        }),
        getPaymentSummary(company.id, startDate || '2020-01-01', endDate || new Date().toISOString().split('T')[0]),
      ]);
      setHistory(histData);
      setHistorySummary(summaryData);
    } catch (err) {
      console.error('Ödeme geçmişi yükleme hatası:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [company, activeTab, historyFilter]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ─── Ayarları yükle ───────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    if (!company || activeTab !== 2) return;
    setSettingsLoading(true);
    try {
      const data = await getPaymentSettings(company.id);
      setSettings(data);
    } catch (err) {
      console.error('Ödeme ayarları yükleme hatası:', err);
    } finally {
      setSettingsLoading(false);
    }
  }, [company, activeTab]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Ayar kaydet
  const handleSaveSettings = async () => {
    if (!settings) return;
    setSettingsSaving(true);
    try {
      const { id, company_id, created_at, updated_at, ...rest } = settings;
      await updatePaymentSettings(company.id, rest);
      toast({ title: t('saved') || 'Kaydedildi' });
    } catch (err) {
      toast({ title: t('error') || 'Hata', description: err.message, variant: 'destructive' });
    } finally {
      setSettingsSaving(false);
    }
  };

  // Modal açma/kapama
  const openPaymentModal = (appointmentId) => {
    setSelectedAppointmentId(appointmentId);
    setModalOpen(true);
  };

  const handlePaymentComplete = () => {
    fetchUnpaid();
    if (activeTab === 1) fetchHistory();
  };

  // Excel export
  const handleExportExcel = () => {
    if (!history.length) return;
    const rows = history.map(p => ({
      Tarih: new Date(p.created_at).toLocaleDateString('tr-TR'),
      Saat: new Date(p.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      Müşteri: p.appointments?.customers?.name || '-',
      Hizmet: p.company_services?.description || '-',
      Tutar: parseFloat(p.amount).toFixed(2),
      Yöntem: methodLabels[p.payment_method] || p.payment_method,
      Uzman: p.appointments?.company_users?.name || '-',
      Durum: p.is_refunded ? t('refunded') : t('active'),
      Not: p.note || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ödemeler');
    XLSX.writeFile(wb, `odemeler_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Tarih filtre seçenekleri
  const dateOptions = [
    { key: 'today', label: t('today') || 'Bugün' },
    { key: 'week', label: t('thisWeek') || 'Bu Hafta' },
    { key: 'month', label: t('thisMonth') || 'Bu Ay' },
    { key: 'all', label: t('all') || 'Tümü' },
  ];

  // Uzmanlar listesi
  const experts = useMemo(() => (staff || []).filter(s => s.role === 'Uzman'), [staff]);

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-emerald-600" />
            {t('payments') || 'Ödeme Al'}
          </h1>
          <p className="text-sm text-stone-500 mt-1">{t('paymentsDesc') || 'Randevu ödemelerini tahsil edin ve takip edin'}</p>
        </div>
      </div>

      {/* Tablar */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit">
        {[
          { icon: AlertCircle, label: t('pendingPayments') || 'Bekleyen Ödemeler', count: unpaidAppointments.length },
          { icon: History, label: t('paymentHistory') || 'Ödeme Geçmişi' },
          { icon: Settings2, label: t('paymentSettings') || 'Ayarlar' },
        ].map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === idx
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700 hover:bg-white/50'
              }
            `}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB 0: Bekleyen Ödemeler ──────────────────────────────────────── */}
      {activeTab === 0 && (
        <div className="space-y-4">
          {/* Filtreler */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Tarih */}
              <div className="flex gap-1 bg-stone-100 rounded-lg p-0.5">
                {dateOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setUnpaidFilter(f => ({ ...f, dateRange: opt.key }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all
                      ${unpaidFilter.dateRange === opt.key ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Arama */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={unpaidFilter.search}
                  onChange={e => setUnpaidFilter(f => ({ ...f, search: e.target.value }))}
                  placeholder={t('searchCustomer') || 'Müşteri ara...'}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                />
              </div>

              {/* Filtre toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-stone-100">
                <select
                  value={unpaidFilter.expertId}
                  onChange={e => setUnpaidFilter(f => ({ ...f, expertId: e.target.value }))}
                  className="text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="">{t('allExperts') || 'Tüm Uzmanlar'}</option>
                  {experts.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
                <select
                  value={unpaidFilter.status}
                  onChange={e => setUnpaidFilter(f => ({ ...f, status: e.target.value }))}
                  className="text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="">{t('allStatuses') || 'Tüm Durumlar'}</option>
                  <option value="unpaid">{t('unpaid') || 'Ödenmemiş'}</option>
                  <option value="partial">{t('partiallyPaid') || 'Kısmi Ödenen'}</option>
                </select>
              </div>
            )}
          </div>

          {/* Liste */}
          {unpaidLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : unpaidAppointments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="text-stone-500 font-medium">{t('noUnpaidAppointments') || 'Bekleyen ödeme bulunmuyor'}</p>
              <p className="text-stone-400 text-sm mt-1">{t('allPaymentsCollected') || 'Tüm ödemeler tahsil edilmiş'}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {unpaidAppointments.map(apt => {
                const totalAmount = parseFloat(apt.total_amount) || 0;
                const paidAmount = parseFloat(apt.paid_amount) || 0;
                const remainingAmount = Math.max(0, totalAmount - paidAmount);
                const paidPercent = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
                const statusBadge = statusBadges[apt.payment_status] || statusBadges.unpaid;
                const aptServices = apt.appointment_services || [];

                // Önceki ödemelerin yöntem özeti
                const prevPayments = (apt.appointment_payments || []).filter(p => !p.is_refunded);
                const paymentMethodSummary = prevPayments.reduce((acc, p) => {
                  const label = methodLabels[p.payment_method] || p.payment_method;
                  acc[label] = (acc[label] || 0) + parseFloat(p.amount);
                  return acc;
                }, {});

                return (
                  <div key={apt.id} className="bg-white rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Sol: Müşteri + Hizmetler */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-stone-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-stone-800 text-sm">{apt.customers?.name || '-'}</p>
                              {apt.customers?.phone && (
                                <p className="text-xs text-stone-400 flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {apt.customers.phone}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </div>

                        {/* Randevu bilgileri */}
                        <div className="flex items-center gap-4 text-xs text-stone-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {apt.date} {apt.time?.slice(0, 5)}
                          </span>
                          {apt.company_users?.name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {apt.company_users.name}
                            </span>
                          )}
                        </div>

                        {/* Hizmetler */}
                        {aptServices.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {aptServices.map((as, i) => (
                              <span key={i} className="text-xs bg-stone-50 text-stone-600 px-2 py-0.5 rounded-md border border-stone-100">
                                {as.company_services?.description} — {parseFloat(as.company_services?.price || 0).toFixed(2)}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Önceki ödemeler */}
                        {Object.keys(paymentMethodSummary).length > 0 && (
                          <p className="text-xs text-stone-400">
                            {t('paidAmount') || 'Ödenen'}: {Object.entries(paymentMethodSummary).map(([m, a]) => `${a.toFixed(0)} ${m}`).join(' + ')}
                          </p>
                        )}
                      </div>

                      {/* Sağ: Tutar + Buton */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
                        <div className="text-right">
                          <p className="text-xs text-stone-400">{t('totalAmount') || 'Toplam'}</p>
                          <p className="text-lg font-bold text-stone-800">{totalAmount.toFixed(2)}</p>
                          {paidAmount > 0 && (
                            <p className="text-xs text-emerald-600 font-medium">
                              {t('paidAmount') || 'Ödenen'}: {paidAmount.toFixed(2)}
                            </p>
                          )}
                          <p className="text-sm font-bold text-red-600">
                            {t('remainingAmount') || 'Kalan'}: {remainingAmount.toFixed(2)}
                          </p>
                        </div>

                        {/* İlerleme çubuğu */}
                        {paidPercent > 0 && paidPercent < 100 && (
                          <div className="w-full sm:w-24 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${paidPercent}%` }}
                            />
                          </div>
                        )}

                        <button
                          onClick={() => openPaymentModal(apt.id)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white
                            rounded-xl font-semibold text-sm hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98]
                            transition-all shadow-sm whitespace-nowrap"
                        >
                          <CreditCard className="w-4 h-4" />
                          {t('collectPayment') || 'Ödeme Al'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 1: Ödeme Geçmişi ─────────────────────────────────────────── */}
      {activeTab === 1 && (
        <div className="space-y-4">
          {/* Özet Kartları */}
          {historySummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t('totalCollected') || 'Toplam Tahsilat', value: historySummary.totalAmount, icon: Wallet, color: 'emerald', count: historySummary.totalCount },
                { label: t('cash') || 'Nakit', value: historySummary.byCash, icon: Banknote, color: 'green' },
                { label: t('card') || 'Kart', value: historySummary.byCard, icon: CreditCard, color: 'blue' },
                { label: t('online') || 'Online', value: historySummary.byOnline, icon: Globe, color: 'purple' },
              ].map((card, idx) => (
                <div key={idx} className={`bg-white rounded-xl border border-stone-200 p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <card.icon className={`w-4 h-4 text-${card.color}-600`} />
                    <span className="text-xs text-stone-500 font-medium">{card.label}</span>
                  </div>
                  <p className="text-xl font-bold text-stone-800">{card.value?.toFixed(2) || '0.00'}</p>
                  {card.count !== undefined && (
                    <p className="text-xs text-stone-400 mt-1">{card.count} {t('paymentCount') || 'ödeme'}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Filtreler */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1 bg-stone-100 rounded-lg p-0.5">
                {dateOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setHistoryFilter(f => ({ ...f, dateRange: opt.key }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all
                      ${historyFilter.dateRange === opt.key ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <select
                value={historyFilter.paymentMethod}
                onChange={e => setHistoryFilter(f => ({ ...f, paymentMethod: e.target.value }))}
                className="text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white"
              >
                <option value="">{t('allMethods') || 'Tüm Yöntemler'}</option>
                <option value="cash">{t('cash') || 'Nakit'}</option>
                <option value="card">{t('card') || 'Kart'}</option>
                <option value="online">{t('online') || 'Online'}</option>
                <option value="free">{t('freePayment') || 'Ücretsiz'}</option>
              </select>

              <select
                value={historyFilter.status}
                onChange={e => setHistoryFilter(f => ({ ...f, status: e.target.value }))}
                className="text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white"
              >
                <option value="">{t('allStatuses') || 'Tüm Durumlar'}</option>
                <option value="active">{t('active') || 'Aktif'}</option>
                <option value="refunded">{t('refunded') || 'İade Edildi'}</option>
              </select>

              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={historyFilter.search}
                  onChange={e => setHistoryFilter(f => ({ ...f, search: e.target.value }))}
                  placeholder={t('searchCustomer') || 'Müşteri ara...'}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                />
              </div>

              <button
                onClick={handleExportExcel}
                disabled={!history.length}
                className="flex items-center gap-1 px-3 py-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200 disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{t('exportPayments') || 'Excel'}</span>
              </button>
            </div>
          </div>

          {/* Tablo */}
          {historyLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
              <History className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500">{t('noPaymentHistory') || 'Ödeme geçmişi bulunmuyor'}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="text-left px-4 py-3 font-semibold text-stone-600">{t('date') || 'Tarih'}</th>
                      <th className="text-left px-4 py-3 font-semibold text-stone-600">{t('customer') || 'Müşteri'}</th>
                      <th className="text-left px-4 py-3 font-semibold text-stone-600">{t('service') || 'Hizmet'}</th>
                      <th className="text-right px-4 py-3 font-semibold text-stone-600">{t('amount') || 'Tutar'}</th>
                      <th className="text-center px-4 py-3 font-semibold text-stone-600">{t('paymentMethod') || 'Yöntem'}</th>
                      <th className="text-left px-4 py-3 font-semibold text-stone-600">{t('expert') || 'Uzman'}</th>
                      <th className="text-center px-4 py-3 font-semibold text-stone-600">{t('status') || 'Durum'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(p => {
                      const ms = METHOD_STYLES[p.payment_method] || METHOD_STYLES.cash;
                      const MIcon = ms.icon;

                      return (
                        <tr key={p.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                          <td className="px-4 py-3 text-stone-600">
                            {new Date(p.created_at).toLocaleDateString('tr-TR')}
                            <br />
                            <span className="text-xs text-stone-400">
                              {new Date(p.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-stone-800">{p.appointments?.customers?.name || '-'}</p>
                            {p.appointments?.customers?.phone && (
                              <p className="text-xs text-stone-400">{p.appointments.customers.phone}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-stone-600">{p.company_services?.description || '-'}</td>
                          <td className="px-4 py-3 text-right font-bold text-stone-800">
                            {parseFloat(p.amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${ms.bg} ${ms.color} ${ms.border} border`}>
                              <MIcon className="w-3 h-3" />
                              {methodLabels[p.payment_method] || p.payment_method}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-stone-600">{p.appointments?.company_users?.name || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            {p.is_refunded ? (
                              <span className="inline-flex items-center gap-1 text-xs text-purple-600 font-medium">
                                <Undo2 className="w-3 h-3" /> {t('refunded') || 'İade'}
                              </span>
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: Ayarlar ────────────────────────────────────────────────── */}
      {activeTab === 2 && (
        <div className="max-w-2xl space-y-6">
          {settingsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : settings ? (
            <>
              {/* Aktif Ödeme Yöntemleri */}
              <div className="bg-white rounded-xl border border-stone-200 p-6">
                <h3 className="font-semibold text-stone-800 mb-4">
                  {t('enabledPaymentMethods') || 'Aktif Ödeme Yöntemleri'}
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'cash_enabled', icon: Banknote, label: t('cash') || 'Nakit', color: 'emerald' },
                    { key: 'card_enabled', icon: CreditCard, label: t('card') || 'Kredi/Banka Kartı', color: 'blue' },
                    { key: 'online_enabled', icon: Globe, label: t('online') || 'Online (Havale/EFT)', color: 'purple' },
                    { key: 'free_enabled', icon: Gift, label: t('freePayment') || 'Ücretsiz (İkram/Kampanya)', color: 'amber' },
                  ].map(m => (
                    <label key={m.key} className="flex items-center gap-3 p-3 rounded-lg hover:bg-stone-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={settings[m.key]}
                        onChange={e => setSettings(s => ({ ...s, [m.key]: e.target.checked }))}
                        className={`w-4 h-4 rounded accent-${m.color}-600`}
                      />
                      <m.icon className={`w-5 h-5 text-${m.color}-600`} />
                      <span className="text-sm font-medium text-stone-700">{m.label}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-stone-100">
                  <label className="text-sm font-medium text-stone-600 block mb-2">
                    {t('defaultPaymentMethod') || 'Varsayılan Yöntem'}
                  </label>
                  <select
                    value={settings.default_payment_method}
                    onChange={e => setSettings(s => ({ ...s, default_payment_method: e.target.value }))}
                    className="text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white w-full max-w-xs"
                  >
                    <option value="cash">{t('cash') || 'Nakit'}</option>
                    <option value="card">{t('card') || 'Kart'}</option>
                    <option value="online">{t('online') || 'Online'}</option>
                    <option value="free">{t('freePayment') || 'Ücretsiz'}</option>
                  </select>
                </div>
              </div>

              {/* Genel Ayarlar */}
              <div className="bg-white rounded-xl border border-stone-200 p-6">
                <h3 className="font-semibold text-stone-800 mb-4">
                  {t('generalSettings') || 'Genel Ayarlar'}
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.auto_create_transaction}
                      onChange={e => setSettings(s => ({ ...s, auto_create_transaction: e.target.checked }))}
                      className="w-4 h-4 rounded accent-emerald-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-stone-700">
                        {t('autoCreateTransaction') || 'Otomatik muhasebe kaydı oluştur'}
                      </span>
                      <p className="text-xs text-stone-400">
                        {t('autoCreateTransactionDesc') || 'Ödeme alındığında muhasebe modülüne otomatik gelir kaydı oluşturulur'}
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.require_full_payment}
                      onChange={e => setSettings(s => ({ ...s, require_full_payment: e.target.checked }))}
                      className="w-4 h-4 rounded accent-emerald-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-stone-700">
                        {t('requireFullPayment') || 'Sadece tam ödeme kabul et'}
                      </span>
                      <p className="text-xs text-stone-400">
                        {t('requireFullPaymentDesc') || 'Parçalı ödeme devre dışı, sadece tam tutar kabul edilir'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* KDV */}
              <div className="bg-white rounded-xl border border-stone-200 p-6">
                <h3 className="font-semibold text-stone-800 mb-4">
                  {t('vatSettings') || 'KDV Ayarları'}
                </h3>
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={settings.vat_enabled}
                    onChange={e => setSettings(s => ({ ...s, vat_enabled: e.target.checked }))}
                    className="w-4 h-4 rounded accent-emerald-600"
                  />
                  <span className="text-sm font-medium text-stone-700">
                    {t('vatEnabled') || 'KDV hesapla'}
                  </span>
                </label>
                {settings.vat_enabled && (
                  <div>
                    <label className="text-sm font-medium text-stone-600 block mb-2">
                      {t('vatRate') || 'KDV Oranı (%)'}
                    </label>
                    <input
                      type="number"
                      value={settings.vat_rate}
                      onChange={e => setSettings(s => ({ ...s, vat_rate: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      max="100"
                      className="text-sm border border-stone-200 rounded-lg px-3 py-2 w-24"
                    />
                  </div>
                )}
              </div>

              {/* Kaydet */}
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold
                  hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {settingsSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('save') || 'Kaydet'}
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Ödeme Modal */}
      <PaymentCollectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        appointmentId={selectedAppointmentId}
        companyId={company?.id}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
};

export default PaymentsPage;
