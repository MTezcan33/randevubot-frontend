import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, TrendingUp, TrendingDown, Calculator, Download,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import {
  getTransactionsByDateRange, calculateSummary,
  buildDailyChartData, buildCategoryChartData,
  getExpertRevenue, getExpertRevenueByDate, getServiceRevenue,
} from '@/services/accountingService';

const PIE_COLORS = ['#065f46', '#0f766e', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4'];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const SummaryCard = ({ title, amount, icon, color }) => (
  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-slate-500">{title}</p>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
    </div>
    <p className="text-2xl font-bold text-gray-900">${formatCurrency(amount)}</p>
  </div>
);

const ReportsPage = () => {
  const { company } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [reportRange, setReportRange] = useState({ startDate: daysAgo(29), endDate: new Date().toISOString().split('T')[0] });
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [expertRevData, setExpertRevData] = useState([]);
  const [expertRevDetailData, setExpertRevDetailData] = useState([]);
  const [expertPeriod, setExpertPeriod] = useState('daily');
  const [serviceRevData, setServiceRevData] = useState([]);

  const loadReportData = useCallback(async () => {
    if (!company) return;
    setReportLoading(true);
    try {
      const [txs, expertRev, expertRevDetail, serviceRev] = await Promise.all([
        getTransactionsByDateRange(company.id, reportRange.startDate, reportRange.endDate),
        getExpertRevenue(company.id, reportRange.startDate, reportRange.endDate),
        getExpertRevenueByDate(company.id, reportRange.startDate, reportRange.endDate),
        getServiceRevenue(company.id, reportRange.startDate, reportRange.endDate),
      ]);
      setReportData(txs);
      setExpertRevData(expertRev);
      setExpertRevDetailData(expertRevDetail);
      setServiceRevData(serviceRev);
    } catch (err) {
      console.error('Rapor hatası:', err);
      setReportData([]);
    } finally {
      setReportLoading(false);
    }
  }, [company, reportRange]);

  useEffect(() => { loadReportData(); }, [loadReportData]);

  // Hesaplamalar
  const reportSummary = calculateSummary(reportData);
  const dailyChartData = buildDailyChartData(reportData, reportRange.startDate, reportRange.endDate);
  const incomePieData = buildCategoryChartData(reportData, 'income');
  const expensePieData = buildCategoryChartData(reportData, 'expense');

  const serviceSummary = serviceRevData.reduce((acc, tx) => {
    const name = tx.appointments?.company_services?.description || 'Bilinmeyen';
    if (!acc[name]) acc[name] = 0;
    acc[name] += parseFloat(tx.amount) || 0;
    return acc;
  }, {});

  // PDF export
  const handleDownloadPdf = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      const summary = calculateSummary(reportData);
      doc.setFontSize(18);
      doc.text('RandevuBot - Finansal Rapor', 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`${company?.name || ''} | ${reportRange.startDate} - ${reportRange.endDate}`, 14, 30);
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
      const txRows = reportData.map((tx) => [
        tx.transaction_date, tx.type === 'income' ? 'Gelir' : 'Gider',
        tx.transaction_categories?.name || '-', tx.description || '',
        tx.payment_method || '', `$${formatCurrency(tx.amount)}`,
      ]);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Tarih', 'Tip', 'Kategori', 'Aciklama', 'Odeme', 'Tutar']],
        body: txRows, theme: 'striped',
        headStyles: { fillColor: [147, 51, 234] },
      });
      doc.save(`rapor-${reportRange.startDate}-${reportRange.endDate}.pdf`);
      toast({ title: t('success'), description: t('pdfDownloaded') || 'PDF indirildi' });
    } catch (err) {
      toast({ title: t('error'), description: 'PDF oluşturulurken hata oluştu', variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Başlık */}
      <div className="flex items-center gap-3">
        <BarChart3 className="w-7 h-7 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('reports') || 'Raporlar'}</h1>
          <p className="text-sm text-slate-500">{t('reportsSubtitle') || 'İşletme raporlarını görüntüleyin ve analiz edin.'}</p>
        </div>
      </div>

      {/* Tarih aralığı + PDF */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">{t('startDate') || 'Başlangıç'}</label>
          <input type="date" value={reportRange.startDate} onChange={(e) => setReportRange(r => ({ ...r, startDate: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">{t('endDate') || 'Bitiş'}</label>
          <input type="date" value={reportRange.endDate} onChange={(e) => setReportRange(r => ({ ...r, endDate: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <Button onClick={loadReportData} disabled={reportLoading}>
          {reportLoading ? t('loading') || 'Yükleniyor...' : t('generateReport') || 'Rapor Oluştur'}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setReportRange({ startDate: daysAgo(29), endDate: new Date().toISOString().split('T')[0] })}>
            {t('thisMonth') || 'Bu Ay'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const d = new Date();
            setReportRange({ startDate: new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0], endDate: new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0] });
          }}>
            {t('lastMonth') || 'Geçen Ay'}
          </Button>
        </div>
        <Button variant="outline" onClick={handleDownloadPdf} disabled={reportData.length === 0}>
          <Download className="w-4 h-4 mr-1" /> {t('downloadPdf') || 'PDF İndir'}
        </Button>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard title={t('totalIncome') || 'Toplam Gelir'} amount={reportSummary.totalIncome} icon={<TrendingUp className="w-5 h-5 text-green-600" />} color="bg-green-50" />
        <SummaryCard title={t('totalExpense') || 'Toplam Gider'} amount={reportSummary.totalExpense} icon={<TrendingDown className="w-5 h-5 text-red-600" />} color="bg-red-50" />
        <SummaryCard title={t('netProfit') || 'Net Kar'} amount={reportSummary.netProfit} icon={<Calculator className="w-5 h-5 text-emerald-700" />} color="bg-emerald-50" />
      </div>

      {/* Günlük bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-4">{t('dailyIncomeExpense') || 'Günlük Gelir/Gider'}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dailyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `$${formatCurrency(v)}`} />
            <Legend />
            <Bar dataKey="income" name={t('income') || 'Gelir'} fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name={t('expense') || 'Gider'} fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Kategori pasta grafikleri */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">{t('incomeByCategory') || 'Gelir Kategorileri'}</h3>
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
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">{t('noData') || 'Veri yok'}</div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">{t('expenseByCategory') || 'Gider Kategorileri'}</h3>
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
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">{t('noData') || 'Veri yok'}</div>
          )}
        </div>
      </div>

      {/* Uzman Bazlı Gelir Takip */}
      {expertRevDetailData.length > 0 && (() => {
        const expertTotals = {};
        expertRevDetailData.forEach(d => {
          if (!expertTotals[d.expert_id]) expertTotals[d.expert_id] = { name: d.expert_name, color: d.expert_color, total: 0, cash: 0, card: 0, online: 0, count: 0 };
          const e = expertTotals[d.expert_id];
          e.total += d.amount; e.count++;
          if (d.payment_method === 'cash') e.cash += d.amount;
          else if (d.payment_method === 'card') e.card += d.amount;
          else if (d.payment_method === 'transfer') e.online += d.amount;
        });
        const expertList = Object.entries(expertTotals).sort((a, b) => b[1].total - a[1].total);
        const groupByPeriod = (data) => {
          const groups = {};
          data.forEach(d => {
            let key = d.transaction_date;
            if (expertPeriod === 'weekly') { const dt = new Date(d.transaction_date); const ws = new Date(dt); ws.setDate(dt.getDate() - dt.getDay() + 1); key = ws.toISOString().split('T')[0]; }
            else if (expertPeriod === 'monthly') key = d.transaction_date.substring(0, 7);
            if (!groups[key]) groups[key] = {};
            if (!groups[key][d.expert_id]) groups[key][d.expert_id] = 0;
            groups[key][d.expert_id] += d.amount;
          });
          return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0])).map(([period, experts]) => ({ period, ...experts }));
        };
        const chartData = groupByPeriod(expertRevDetailData);
        const formatPeriodLabel = (val) => {
          if (expertPeriod === 'monthly') return val;
          const d = new Date(val + 'T00:00:00');
          return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`;
        };
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-semibold text-gray-900 text-lg">{t('expertRevenue') || 'Uzman Gelirleri'}</h3>
              <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                {[{ key: 'daily', label: t('daily') || 'Günlük' }, { key: 'weekly', label: t('weekly') || 'Haftalık' }, { key: 'monthly', label: t('monthly') || 'Aylık' }].map(opt => (
                  <button key={opt.key} onClick={() => setExpertPeriod(opt.key)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${expertPeriod === opt.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {expertList.map(([id, ex]) => (
                <div key={id} className="rounded-xl border-l-4 bg-slate-50 p-3" style={{ borderLeftColor: ex.color }}>
                  <p className="text-sm font-semibold text-slate-700 truncate">{ex.name}</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(ex.total)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ex.cash > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Nakit {formatCurrency(ex.cash)}</span>}
                    {ex.card > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Kart {formatCurrency(ex.card)}</span>}
                    {ex.online > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">Online {formatCurrency(ex.online)}</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{ex.count} {t('transaction') || 'işlem'}</p>
                </div>
              ))}
            </div>
            {chartData.length > 0 && (
              <div className="px-5 pb-5">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tickFormatter={formatPeriodLabel} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(value, name) => [formatCurrency(value), expertTotals[name]?.name || name]} labelFormatter={formatPeriodLabel} />
                    <Legend formatter={(value) => expertTotals[value]?.name || value} />
                    {expertList.map(([id, ex]) => (
                      <Bar key={id} dataKey={id} stackId="experts" fill={ex.color} name={id} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="border-t border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-2.5 text-slate-500 font-medium">{t('expert') || 'Uzman'}</th>
                    <th className="text-right px-3 py-2.5 text-slate-500 font-medium">{t('total') || 'Toplam'}</th>
                    <th className="text-right px-3 py-2.5 text-slate-500 font-medium hidden md:table-cell">Nakit</th>
                    <th className="text-right px-3 py-2.5 text-slate-500 font-medium hidden md:table-cell">Kart</th>
                    <th className="text-right px-3 py-2.5 text-slate-500 font-medium hidden md:table-cell">Online</th>
                    <th className="text-right px-5 py-2.5 text-slate-500 font-medium">{t('count') || 'Adet'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {expertList.map(([id, ex]) => (
                    <tr key={id} className="hover:bg-slate-50">
                      <td className="px-5 py-3"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: ex.color }} /><span className="font-medium text-slate-800">{ex.name}</span></div></td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-600">{formatCurrency(ex.total)}</td>
                      <td className="px-3 py-3 text-right text-slate-600 hidden md:table-cell">{ex.cash > 0 ? formatCurrency(ex.cash) : '-'}</td>
                      <td className="px-3 py-3 text-right text-slate-600 hidden md:table-cell">{ex.card > 0 ? formatCurrency(ex.card) : '-'}</td>
                      <td className="px-3 py-3 text-right text-slate-600 hidden md:table-cell">{ex.online > 0 ? formatCurrency(ex.online) : '-'}</td>
                      <td className="px-5 py-3 text-right text-slate-500">{ex.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Hizmet ciro tablosu */}
      {Object.keys(serviceSummary).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">{t('serviceRevenue') || 'Hizmet Gelirleri'}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-2 text-slate-500 font-medium">{t('service') || 'Hizmet'}</th>
                <th className="text-right px-5 py-2 text-slate-500 font-medium">{t('revenue') || 'Ciro'}</th>
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
  );
};

export default ReportsPage;
