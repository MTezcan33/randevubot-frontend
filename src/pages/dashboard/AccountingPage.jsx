import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Trash2,
  Download,
  Calculator,
  Tag,
  BarChart3,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import * as XLSX from 'xlsx';
import {
  addTransaction,
  getTransactions,
  deleteTransaction,
  getCategories,
  addCategory,
  deleteCategory,
  getTodayCashRegister,
  getRecentCashRegisters,
  closeCashRegister,
  getTransactionsByDateRange,
  calculateSummary,
  buildDailyChartData,
  buildCategoryChartData,
  getExpertRevenue,
  getServiceRevenue,
} from '@/services/accountingService';

// Pasta grafiği renkleri
const PIE_COLORS = ['#E91E8C', '#9333EA', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4'];

// Para formatı
const formatCurrency = (amount) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

// Tarih formatı
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR');
};

// Bugünden N gün önce YYYY-MM-DD
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

// ─── Özet Kart Bileşeni ────────────────────────────────────
const SummaryCard = ({ title, amount, icon, color, sub }) => (
  <div className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm`}>
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-slate-500">{title}</p>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900">${formatCurrency(amount)}</p>
    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
  </div>
);

// ─── Ana Bileşen ───────────────────────────────────────────
const AccountingPage = () => {
  const { company } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Aktif tab
  const [activeTab, setActiveTab] = useState('daily');

  // ── Tab 1: Günlük Kasa ──
  const [cashRegister, setCashRegister] = useState(null);
  const [recentRegisters, setRecentRegisters] = useState([]);
  const [todayTransactions, setTodayTransactions] = useState([]);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closingBalance, setClosingBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closingLoading, setClosingLoading] = useState(false);

  // ── Tab 2: İşlemler ──
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txFilters, setTxFilters] = useState({
    startDate: daysAgo(30),
    endDate: new Date().toISOString().split('T')[0],
    type: '',
    categoryId: '',
    paymentMethod: '',
  });
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [newTx, setNewTx] = useState({
    type: 'income',
    category_id: '',
    amount: '',
    payment_method: 'cash',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });
  const [txSaving, setTxSaving] = useState(false);

  // ── Tab 3: Raporlar ──
  const [reportRange, setReportRange] = useState({
    startDate: daysAgo(29),
    endDate: new Date().toISOString().split('T')[0],
  });
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [expertRevData, setExpertRevData] = useState([]);
  const [serviceRevData, setServiceRevData] = useState([]);

  // ── Tab 4: Kategoriler ──
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', type: 'income', icon: '💼', color: '#E91E8C' });
  const [catSaving, setCatSaving] = useState(false);

  // ────────────────────────────────────────────────────
  // VERİ YÜKLEME
  // ────────────────────────────────────────────────────

  // Günlük kasa
  const loadDailyData = useCallback(async () => {
    if (!company) return;
    try {
      const [reg, recent, txs] = await Promise.all([
        getTodayCashRegister(company.id),
        getRecentCashRegisters(company.id, 7),
        getTransactions(company.id, {
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        }),
      ]);
      setCashRegister(reg);
      setRecentRegisters(recent);
      setTodayTransactions(txs);
    } catch (err) {
      console.error('Günlük kasa hatası:', err);
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  }, [company, t, toast]);

  // İşlemler
  const loadTransactions = useCallback(async () => {
    if (!company) return;
    setTxLoading(true);
    try {
      const data = await getTransactions(company.id, txFilters);
      setTransactions(data);
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    } finally {
      setTxLoading(false);
    }
  }, [company, txFilters, t, toast]);

  // Raporlar
  const loadReportData = useCallback(async () => {
    if (!company) return;
    setReportLoading(true);
    try {
      const [txs, expertRev, serviceRev] = await Promise.all([
        getTransactionsByDateRange(company.id, reportRange.startDate, reportRange.endDate),
        getExpertRevenue(company.id, reportRange.startDate, reportRange.endDate),
        getServiceRevenue(company.id, reportRange.startDate, reportRange.endDate),
      ]);
      setReportData(txs);
      setExpertRevData(expertRev);
      setServiceRevData(serviceRev);
    } catch (err) {
      console.error('Rapor hatası:', err);
      setReportData([]);
    } finally {
      setReportLoading(false);
    }
  }, [company, reportRange]);

  // Kategoriler
  const loadCategories = useCallback(async () => {
    if (!company) return;
    setCatLoading(true);
    try {
      const data = await getCategories(company.id);
      setCategories(data);
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    } finally {
      setCatLoading(false);
    }
  }, [company, t, toast]);

  // Tab değiştiğinde veri yükle
  useEffect(() => {
    if (activeTab === 'daily') loadDailyData();
    if (activeTab === 'transactions') loadTransactions();
    if (activeTab === 'reports') loadReportData();
    if (activeTab === 'categories') loadCategories();
  }, [activeTab, loadDailyData, loadTransactions, loadReportData, loadCategories]);

  // ────────────────────────────────────────────────────
  // HANDLER'LAR
  // ────────────────────────────────────────────────────

  // Kasayı kapat
  const handleCloseRegister = async () => {
    if (!cashRegister) return;
    setClosingLoading(true);
    try {
      const summary = calculateSummary(todayTransactions);
      const balance = closingBalance !== '' ? parseFloat(closingBalance) : summary.totalIncome - summary.totalExpense + (cashRegister.opening_balance || 0);
      await closeCashRegister(cashRegister.id, balance, closeNotes, {
        cash: summary.byCash,
        card: summary.byCard,
        transfer: summary.byTransfer,
        expense: summary.totalExpense,
      });
      toast({ title: t('success'), description: t('cashRegisterClosed') });
      setCloseModalOpen(false);
      setClosingBalance('');
      setCloseNotes('');
      loadDailyData();
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    } finally {
      setClosingLoading(false);
    }
  };

  // İşlem ekle
  const handleAddTransaction = async () => {
    if (!newTx.amount || !newTx.transaction_date) {
      toast({ title: t('error'), description: t('allFieldsRequired'), variant: 'destructive' });
      return;
    }
    setTxSaving(true);
    try {
      await addTransaction(company.id, {
        ...newTx,
        amount: parseFloat(newTx.amount),
        category_id: newTx.category_id || null,
      });
      toast({ title: t('success'), description: t('transactionAdded') });
      setAddTxOpen(false);
      setNewTx({
        type: 'income',
        category_id: '',
        amount: '',
        payment_method: 'cash',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
      });
      loadTransactions();
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    } finally {
      setTxSaving(false);
    }
  };

  // İşlem sil
  const handleDeleteTransaction = async (id) => {
    if (!window.confirm(t('deleteTransactionConfirm'))) return;
    try {
      await deleteTransaction(id);
      toast({ title: t('success'), description: t('transactionDeleted') });
      loadTransactions();
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  };

  // İşlemleri Excel'e aktar
  const handleExportExcel = () => {
    const rows = transactions.map((tx) => ({
      [t('date')]: tx.transaction_date,
      [t('type')]: tx.type === 'income' ? t('income') : t('expense'),
      [t('category')]: tx.transaction_categories?.name || '-',
      [t('description')]: tx.description || '',
      [t('paymentMethod')]: tx.payment_method || '',
      [t('amount')]: parseFloat(tx.amount),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('transactions'));
    XLSX.writeFile(wb, `muhasebe-${txFilters.startDate}-${txFilters.endDate}.xlsx`);
  };

  // Kategori ekle
  const handleAddCategory = async () => {
    if (!newCat.name) {
      toast({ title: t('error'), description: t('allFieldsRequired'), variant: 'destructive' });
      return;
    }
    setCatSaving(true);
    try {
      await addCategory(company.id, newCat);
      toast({ title: t('success'), description: t('categoryAdded') });
      setAddCatOpen(false);
      setNewCat({ name: '', type: 'income', icon: '💼', color: '#E91E8C' });
      loadCategories();
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    } finally {
      setCatSaving(false);
    }
  };

  // Kategori sil
  const handleDeleteCategory = async (cat) => {
    if (cat.is_default) {
      toast({ title: t('error'), description: t('cannotDeleteDefault'), variant: 'destructive' });
      return;
    }
    if (!window.confirm(t('deleteCategoryConfirm'))) return;
    try {
      await deleteCategory(cat.id);
      toast({ title: t('success'), description: t('categoryDeleted') });
      loadCategories();
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  };

  // PDF İndir
  const handleDownloadPdf = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      const summary = calculateSummary(reportData);

      // Başlık
      doc.setFontSize(18);
      doc.text('RandevuBot - Finansal Rapor', 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`${company?.name || ''} | ${reportRange.startDate} - ${reportRange.endDate}`, 14, 30);

      // Özet tablosu
      autoTable(doc, {
        startY: 38,
        head: [['Ozet', 'Tutar']],
        body: [
          ['Toplam Gelir', `$${formatCurrency(summary.totalIncome)}`],
          ['Toplam Gider', `$${formatCurrency(summary.totalExpense)}`],
          ['Net Kar/Zarar', `$${formatCurrency(summary.netProfit)}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [233, 30, 140] },
      });

      // İşlem detayları
      const txRows = reportData.map((tx) => [
        tx.transaction_date,
        tx.type === 'income' ? 'Gelir' : 'Gider',
        tx.transaction_categories?.name || '-',
        tx.description || '',
        tx.payment_method || '',
        `$${formatCurrency(tx.amount)}`,
      ]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Tarih', 'Tip', 'Kategori', 'Aciklama', 'Odeme', 'Tutar']],
        body: txRows,
        theme: 'striped',
        headStyles: { fillColor: [147, 51, 234] },
      });

      doc.save(`rapor-${reportRange.startDate}-${reportRange.endDate}.pdf`);
      toast({ title: t('success'), description: t('pdfDownloaded') });
    } catch (err) {
      console.error('PDF hatası:', err);
      toast({ title: t('error'), description: 'PDF oluşturulurken hata oluştu', variant: 'destructive' });
    }
  };

  // ────────────────────────────────────────────────────
  // HESAPLAMALAR
  // ────────────────────────────────────────────────────
  const todaySummary = calculateSummary(todayTransactions);
  const currentBalance = (cashRegister?.opening_balance || 0) + todaySummary.totalIncome - todaySummary.totalExpense;
  const reportSummary = calculateSummary(reportData);
  const dailyChartData = buildDailyChartData(reportData, reportRange.startDate, reportRange.endDate);
  const incomePieData = buildCategoryChartData(reportData, 'income');
  const expensePieData = buildCategoryChartData(reportData, 'expense');

  // Uzman ciro özeti
  const expertSummary = expertRevData.reduce((acc, tx) => {
    const name = tx.appointments?.company_users?.name || 'Bilinmeyen';
    if (!acc[name]) acc[name] = 0;
    acc[name] += parseFloat(tx.amount) || 0;
    return acc;
  }, {});

  // Hizmet ciro özeti
  const serviceSummary = serviceRevData.reduce((acc, tx) => {
    const name = tx.appointments?.company_services?.description || 'Bilinmeyen';
    if (!acc[name]) acc[name] = 0;
    acc[name] += parseFloat(tx.amount) || 0;
    return acc;
  }, {});

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // ────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────
  const tabs = [
    { id: 'daily', label: t('dailyCash'), icon: <Wallet className="w-4 h-4" /> },
    { id: 'transactions', label: t('transactions'), icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'reports', label: t('reports'), icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'categories', label: t('categories'), icon: <Tag className="w-4 h-4" /> },
  ];

  return (
    <>
      <Helmet>
        <title>RandevuBot — {t('accounting')}</title>
      </Helmet>

      <div className="max-w-6xl mx-auto">
        {/* Sayfa başlığı */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-purple-600" />
            {t('accounting')}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t('accountingSubtitle')}</p>
        </div>

        {/* Tab navigasyonu */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══ TAB 1: GÜNLÜK KASA ══ */}
        {activeTab === 'daily' && (
          <div className="space-y-6">
            {/* Kasa durum başlığı */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${cashRegister?.status === 'closed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cashRegister?.status === 'closed' ? 'bg-red-500' : 'bg-green-500'}`} />
                  {cashRegister?.status === 'closed' ? t('closed') : t('open')}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadDailyData}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  {t('refresh')}
                </Button>
                {cashRegister?.status !== 'closed' && (
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                    onClick={() => setCloseModalOpen(true)}
                  >
                    {t('closeRegister')}
                  </Button>
                )}
              </div>
            </div>

            {/* Özet kartlar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard
                title={t('openingBalance')}
                amount={cashRegister?.opening_balance}
                icon={<Wallet className="w-5 h-5 text-blue-600" />}
                color="bg-blue-50"
              />
              <SummaryCard
                title={t('totalIncome')}
                amount={todaySummary.totalIncome}
                icon={<TrendingUp className="w-5 h-5 text-green-600" />}
                color="bg-green-50"
                sub={`Nakit: $${formatCurrency(todaySummary.byCash)} | Kart: $${formatCurrency(todaySummary.byCard)}`}
              />
              <SummaryCard
                title={t('totalExpense')}
                amount={todaySummary.totalExpense}
                icon={<TrendingDown className="w-5 h-5 text-red-600" />}
                color="bg-red-50"
              />
              <SummaryCard
                title={t('currentBalance')}
                amount={currentBalance}
                icon={<Calculator className="w-5 h-5 text-purple-600" />}
                color="bg-purple-50"
              />
            </div>

            {/* Bugünkü işlemler */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">{t('todayTransactions')}</h3>
              </div>
              {todayTransactions.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">{t('noTransactionsToday')}</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {todayTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                          {tx.type === 'income'
                            ? <TrendingUp className="w-4 h-4 text-green-600" />
                            : <TrendingDown className="w-4 h-4 text-red-600" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{tx.description || tx.transaction_categories?.name || '-'}</p>
                          <p className="text-xs text-slate-400">{tx.payment_method} · {tx.transaction_categories?.name || '-'}</p>
                        </div>
                      </div>
                      <p className={`font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Son 7 gün geçmişi */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">{t('last7Days')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-2 text-slate-500 font-medium">{t('date')}</th>
                      <th className="text-right px-5 py-2 text-slate-500 font-medium">{t('openingBalance')}</th>
                      <th className="text-right px-5 py-2 text-slate-500 font-medium">{t('closingBalance')}</th>
                      <th className="text-center px-5 py-2 text-slate-500 font-medium">{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentRegisters.map((reg) => (
                      <tr key={reg.id}>
                        <td className="px-5 py-3">{formatDate(reg.date)}</td>
                        <td className="text-right px-5 py-3">${formatCurrency(reg.opening_balance)}</td>
                        <td className="text-right px-5 py-3">{reg.closing_balance != null ? `$${formatCurrency(reg.closing_balance)}` : '-'}</td>
                        <td className="text-center px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${reg.status === 'closed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {reg.status === 'closed' ? t('closed') : t('open')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB 2: İŞLEMLER ══ */}
        {activeTab === 'transactions' && (
          <div className="space-y-5">
            {/* Filtreler + Butonlar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{t('startDate')}</label>
                  <input
                    type="date"
                    value={txFilters.startDate}
                    onChange={(e) => setTxFilters((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{t('endDate')}</label>
                  <input
                    type="date"
                    value={txFilters.endDate}
                    onChange={(e) => setTxFilters((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{t('type')}</label>
                  <select
                    value={txFilters.type}
                    onChange={(e) => setTxFilters((f) => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                  >
                    <option value="">{t('all')}</option>
                    <option value="income">{t('income')}</option>
                    <option value="expense">{t('expense')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{t('paymentMethod')}</label>
                  <select
                    value={txFilters.paymentMethod}
                    onChange={(e) => setTxFilters((f) => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                  >
                    <option value="">{t('all')}</option>
                    <option value="cash">{t('cash')}</option>
                    <option value="card">{t('card')}</option>
                    <option value="transfer">{t('transfer')}</option>
                    <option value="other">{t('other')}</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button size="sm" onClick={loadTransactions} disabled={txLoading} className="flex-1">
                    {txLoading ? t('loading') : t('filter')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Aksiyon butonları */}
            <div className="flex gap-3">
              <Button
                onClick={() => setAddTxOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white border-0"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('addTransaction')}
              </Button>
              <Button variant="outline" onClick={handleExportExcel} disabled={transactions.length === 0}>
                <Download className="w-4 h-4 mr-1" />
                {t('exportExcel')}
              </Button>
            </div>

            {/* Özet */}
            {transactions.length > 0 && (() => {
              const s = calculateSummary(transactions);
              return (
                <div className="grid grid-cols-3 gap-4">
                  <SummaryCard title={t('totalIncome')} amount={s.totalIncome} icon={<TrendingUp className="w-5 h-5 text-green-600" />} color="bg-green-50" />
                  <SummaryCard title={t('totalExpense')} amount={s.totalExpense} icon={<TrendingDown className="w-5 h-5 text-red-600" />} color="bg-red-50" />
                  <SummaryCard title={t('netProfit')} amount={s.netProfit} icon={<Calculator className="w-5 h-5 text-purple-600" />} color="bg-purple-50" />
                </div>
              );
            })()}

            {/* İşlem listesi */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {txLoading ? (
                <div className="p-8 text-center text-slate-400">{t('loading')}</div>
              ) : transactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">{t('noTransactions')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">{t('date')}</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">{t('type')}</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">{t('category')}</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">{t('description')}</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">{t('paymentMethod')}</th>
                        <th className="text-right px-4 py-3 text-slate-500 font-medium">{t('amount')}</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{formatDate(tx.transaction_date)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tx.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {tx.type === 'income' ? t('income') : t('expense')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{tx.transaction_categories?.name || '-'}</td>
                          <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{tx.description || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{tx.payment_method || '-'}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB 3: RAPORLAR ══ */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Tarih aralığı + PDF butonu */}
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t('startDate')}</label>
                <input
                  type="date"
                  value={reportRange.startDate}
                  onChange={(e) => setReportRange((r) => ({ ...r, startDate: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t('endDate')}</label>
                <input
                  type="date"
                  value={reportRange.endDate}
                  onChange={(e) => setReportRange((r) => ({ ...r, endDate: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
              <Button onClick={loadReportData} disabled={reportLoading}>
                {reportLoading ? t('loading') : t('generateReport')}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setReportRange({ startDate: daysAgo(29), endDate: new Date().toISOString().split('T')[0] })}>
                  {t('thisMonth')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const d = new Date();
                  setReportRange({ startDate: new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0], endDate: new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0] });
                }}>
                  {t('lastMonth')}
                </Button>
              </div>
              <Button variant="outline" onClick={handleDownloadPdf} disabled={reportData.length === 0}>
                <Download className="w-4 h-4 mr-1" />
                {t('downloadPdf')}
              </Button>
            </div>

            {/* Özet kartlar */}
            <div className="grid grid-cols-3 gap-4">
              <SummaryCard title={t('totalIncome')} amount={reportSummary.totalIncome} icon={<TrendingUp className="w-5 h-5 text-green-600" />} color="bg-green-50" />
              <SummaryCard title={t('totalExpense')} amount={reportSummary.totalExpense} icon={<TrendingDown className="w-5 h-5 text-red-600" />} color="bg-red-50" />
              <SummaryCard title={t('netProfit')} amount={reportSummary.netProfit} icon={<Calculator className="w-5 h-5 text-purple-600" />} color="bg-purple-50" />
            </div>

            {/* Günlük bar chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">{t('dailyIncomeExpense')}</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dailyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `$${formatCurrency(v)}`} />
                  <Legend />
                  <Bar dataKey="income" name={t('income')} fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name={t('expense')} fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Kategori pasta grafikleri */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Gelir kategorileri */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-4">{t('incomeByCategory')}</h3>
                {incomePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={incomePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {incomePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `$${formatCurrency(v)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">{t('noData')}</div>
                )}
              </div>

              {/* Gider kategorileri */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-4">{t('expenseByCategory')}</h3>
                {expensePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {expensePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `$${formatCurrency(v)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">{t('noData')}</div>
                )}
              </div>
            </div>

            {/* Uzman ciro tablosu */}
            {Object.keys(expertSummary).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">{t('expertRevenue')}</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-2 text-slate-500 font-medium">{t('expert')}</th>
                      <th className="text-right px-5 py-2 text-slate-500 font-medium">{t('revenue')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Object.entries(expertSummary).sort((a, b) => b[1] - a[1]).map(([name, amt]) => (
                      <tr key={name}>
                        <td className="px-5 py-3 font-medium">{name}</td>
                        <td className="px-5 py-3 text-right text-green-600 font-semibold">${formatCurrency(amt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Hizmet ciro tablosu */}
            {Object.keys(serviceSummary).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">{t('serviceRevenue')}</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-2 text-slate-500 font-medium">{t('service')}</th>
                      <th className="text-right px-5 py-2 text-slate-500 font-medium">{t('revenue')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Object.entries(serviceSummary).sort((a, b) => b[1] - a[1]).map(([name, amt]) => (
                      <tr key={name}>
                        <td className="px-5 py-3">{name}</td>
                        <td className="px-5 py-3 text-right text-green-600 font-semibold">${formatCurrency(amt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB 4: KATEGORİLER ══ */}
        {activeTab === 'categories' && (
          <div className="space-y-5">
            <div className="flex justify-end">
              <Button
                onClick={() => setAddCatOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white border-0"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('addCategory')}
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Gelir kategorileri */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <h3 className="font-semibold text-gray-900">{t('incomeCategories')}</h3>
                </div>
                {catLoading ? (
                  <div className="p-5 text-center text-slate-400 text-sm">{t('loading')}</div>
                ) : incomeCategories.length === 0 ? (
                  <div className="p-5 text-center text-slate-400 text-sm">{t('noCategories')}</div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {incomeCategories.map((cat) => (
                      <li key={cat.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{cat.icon || '💼'}</span>
                          <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                          {cat.is_default && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t('default')}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          disabled={cat.is_default}
                          className={`text-slate-400 hover:text-red-500 transition-colors ${cat.is_default ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Gider kategorileri */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <h3 className="font-semibold text-gray-900">{t('expenseCategories')}</h3>
                </div>
                {catLoading ? (
                  <div className="p-5 text-center text-slate-400 text-sm">{t('loading')}</div>
                ) : expenseCategories.length === 0 ? (
                  <div className="p-5 text-center text-slate-400 text-sm">{t('noCategories')}</div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {expenseCategories.map((cat) => (
                      <li key={cat.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{cat.icon || '💸'}</span>
                          <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                          {cat.is_default && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t('default')}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          disabled={cat.is_default}
                          className={`text-slate-400 hover:text-red-500 transition-colors ${cat.is_default ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ MODAL: Kasayı Kapat ══ */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('closeRegister')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm text-slate-500 mb-3">
                {t('todayIncome')}: <strong className="text-green-600">${formatCurrency(todaySummary.totalIncome)}</strong>
                {' · '}
                {t('todayExpense')}: <strong className="text-red-600">${formatCurrency(todaySummary.totalExpense)}</strong>
                {' · '}
                {t('currentBalance')}: <strong>${formatCurrency(currentBalance)}</strong>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('closingBalance')}</label>
              <input
                type="number"
                step="0.01"
                placeholder={formatCurrency(currentBalance)}
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">{t('closingBalanceHint')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('notes')} ({t('optional')})</label>
              <textarea
                rows={2}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseModalOpen(false)}>{t('cancel')}</Button>
            <Button
              onClick={handleCloseRegister}
              disabled={closingLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white border-0"
            >
              {closingLoading ? t('saving') : t('closeRegister')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL: İşlem Ekle ══ */}
      <Dialog open={addTxOpen} onOpenChange={setAddTxOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addTransaction')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Tip */}
            <div className="flex gap-2">
              <button
                onClick={() => setNewTx((p) => ({ ...p, type: 'income', category_id: '' }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${newTx.type === 'income' ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-slate-600'}`}
              >
                {t('income')}
              </button>
              <button
                onClick={() => setNewTx((p) => ({ ...p, type: 'expense', category_id: '' }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${newTx.type === 'expense' ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-slate-600'}`}
              >
                {t('expense')}
              </button>
            </div>

            {/* Tutar */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('amount')} *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newTx.amount}
                onChange={(e) => setNewTx((p) => ({ ...p, amount: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('category')}</label>
              <select
                value={newTx.category_id}
                onChange={(e) => setNewTx((p) => ({ ...p, category_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">{t('noCategory')}</option>
                {categories.filter((c) => c.type === newTx.type).map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            {/* Ödeme yöntemi */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('paymentMethod')}</label>
              <select
                value={newTx.payment_method}
                onChange={(e) => setNewTx((p) => ({ ...p, payment_method: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="cash">{t('cash')}</option>
                <option value="card">{t('card')}</option>
                <option value="transfer">{t('transfer')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>

            {/* Açıklama */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('description')}</label>
              <input
                type="text"
                value={newTx.description}
                onChange={(e) => setNewTx((p) => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder={t('descriptionPlaceholder')}
              />
            </div>

            {/* Tarih */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('date')} *</label>
              <input
                type="date"
                value={newTx.transaction_date}
                onChange={(e) => setNewTx((p) => ({ ...p, transaction_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTxOpen(false)}>{t('cancel')}</Button>
            <Button
              onClick={handleAddTransaction}
              disabled={txSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white border-0"
            >
              {txSaving ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL: Kategori Ekle ══ */}
      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addCategory')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Tip */}
            <div className="flex gap-2">
              <button
                onClick={() => setNewCat((p) => ({ ...p, type: 'income' }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${newCat.type === 'income' ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-slate-600'}`}
              >
                {t('income')}
              </button>
              <button
                onClick={() => setNewCat((p) => ({ ...p, type: 'expense' }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${newCat.type === 'expense' ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-slate-600'}`}
              >
                {t('expense')}
              </button>
            </div>

            {/* İsim */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('categoryName')} *</label>
              <input
                type="text"
                value={newCat.name}
                onChange={(e) => setNewCat((p) => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder={t('categoryNamePlaceholder')}
              />
            </div>

            {/* İkon (emoji) */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('icon')}</label>
              <input
                type="text"
                value={newCat.icon}
                onChange={(e) => setNewCat((p) => ({ ...p, icon: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="💼"
                maxLength={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCatOpen(false)}>{t('cancel')}</Button>
            <Button
              onClick={handleAddCategory}
              disabled={catSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white border-0"
            >
              {catSaving ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AccountingPage;
