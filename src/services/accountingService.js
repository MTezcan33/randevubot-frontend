import { supabase } from '../lib/supabase';

// ============================================================
// GELİR / GİDER İŞLEMLERİ
// ============================================================

/**
 * Yeni gelir veya gider kaydı ekle
 * @param {string} companyId
 * @param {Object} data - { type, category_id, amount, payment_method, description, transaction_date, appointment_id?, receipt_url? }
 */
export const addTransaction = async (companyId, data) => {
  const { data: result, error } = await supabase
    .from('transactions')
    .insert([{ company_id: companyId, ...data }])
    .select('*, transaction_categories(name, icon, color, type)')
    .single();
  if (error) throw error;
  return result;
};

/**
 * İşlemleri filtreli getir
 * @param {string} companyId
 * @param {Object} filters - { startDate, endDate, type, categoryId, paymentMethod }
 */
export const getTransactions = async (companyId, filters = {}) => {
  let query = supabase
    .from('transactions')
    .select('*, transaction_categories(name, icon, color, type)')
    .eq('company_id', companyId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.startDate) query = query.gte('transaction_date', filters.startDate);
  if (filters.endDate) query = query.lte('transaction_date', filters.endDate);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * İşlem sil
 */
export const deleteTransaction = async (transactionId) => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);
  if (error) throw error;
};

// ============================================================
// KATEGORİ YÖNETİMİ
// ============================================================

/**
 * Şirkete ait kategorileri getir
 */
export const getCategories = async (companyId) => {
  const { data, error } = await supabase
    .from('transaction_categories')
    .select('*')
    .eq('company_id', companyId)
    .order('type')
    .order('name');
  if (error) throw error;
  return data || [];
};

/**
 * Yeni kategori ekle
 */
export const addCategory = async (companyId, data) => {
  const { data: result, error } = await supabase
    .from('transaction_categories')
    .insert([{ company_id: companyId, ...data }])
    .select()
    .single();
  if (error) throw error;
  return result;
};

/**
 * Kategori sil (is_default=true ise veya işlem varsa reddeder)
 */
export const deleteCategory = async (categoryId) => {
  // Kategoriye ait işlem var mı kontrol et
  const { data: txns } = await supabase
    .from('transactions')
    .select('id')
    .eq('category_id', categoryId)
    .limit(1);

  if (txns && txns.length > 0) {
    throw new Error('Bu kategoriye ait işlem kayıtları var. Önce işlemleri silin.');
  }

  const { error } = await supabase
    .from('transaction_categories')
    .delete()
    .eq('id', categoryId)
    .eq('is_default', false); // Varsayılan kategoriler silinemez

  if (error) throw error;
};

// ============================================================
// GÜNLÜK KASA YÖNETİMİ
// ============================================================

/**
 * Bugünkü kasa kaydını getir, yoksa oluştur
 */
export const getTodayCashRegister = async (companyId) => {
  const today = new Date().toISOString().split('T')[0];

  // Bugünkü kaydı ara
  const { data: existing, error: fetchError } = await supabase
    .from('daily_cash_register')
    .select('*')
    .eq('company_id', companyId)
    .eq('date', today)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing;

  // Dünkü kapanış bakiyesini bul (açılış olarak kullan)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const { data: prevDay } = await supabase
    .from('daily_cash_register')
    .select('closing_balance')
    .eq('company_id', companyId)
    .eq('date', yesterdayStr)
    .maybeSingle();

  const openingBalance = prevDay?.closing_balance ?? 0;

  // Yeni kasa kaydı oluştur
  const { data: newRegister, error: insertError } = await supabase
    .from('daily_cash_register')
    .insert([{
      company_id: companyId,
      date: today,
      opening_balance: openingBalance,
      status: 'open',
    }])
    .select()
    .single();

  if (insertError) throw insertError;
  return newRegister;
};

/**
 * Son N gün kasa kayıtlarını getir
 */
export const getRecentCashRegisters = async (companyId, days = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);

  const { data, error } = await supabase
    .from('daily_cash_register')
    .select('*')
    .eq('company_id', companyId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Kasayı kapat (gün sonu)
 */
export const closeCashRegister = async (registerId, closingBalance, notes, totals) => {
  const { data, error } = await supabase
    .from('daily_cash_register')
    .update({
      closing_balance: closingBalance,
      status: 'closed',
      notes: notes || null,
      closed_at: new Date().toISOString(),
      total_cash: totals?.cash || 0,
      total_card: totals?.card || 0,
      total_transfer: totals?.transfer || 0,
      total_expense: totals?.expense || 0,
    })
    .eq('id', registerId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================================
// RAPORLAMA
// ============================================================

/**
 * Tarih aralığında işlemleri getir (grafik ve rapor için)
 */
export const getTransactionsByDateRange = async (companyId, startDate, endDate) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, transaction_categories(name, icon, color, type)')
    .eq('company_id', companyId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Haftalık özet
 */
export const getWeeklySummary = async (companyId, startDate) => {
  const end = new Date(startDate);
  end.setDate(end.getDate() + 6);
  return getTransactionsByDateRange(companyId, startDate, end.toISOString().split('T')[0]);
};

/**
 * Aylık özet
 */
export const getMonthlySummary = async (companyId, month, year) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  return getTransactionsByDateRange(companyId, startDate, endDate);
};

/**
 * Uzman bazlı ciro (randevuya bağlı gelirler)
 */
export const getExpertRevenue = async (companyId, startDate, endDate) => {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      amount,
      payment_method,
      appointments!inner(
        expert_id,
        company_users!inner(name, color)
      )
    `)
    .eq('company_id', companyId)
    .eq('type', 'income')
    .not('appointment_id', 'is', null)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (error) {
    console.error('Uzman ciro hatası:', error);
    return [];
  }
  return data || [];
};

/**
 * Hizmet bazlı ciro (randevuya bağlı gelirler)
 */
export const getServiceRevenue = async (companyId, startDate, endDate) => {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      amount,
      payment_method,
      appointments!inner(
        service_id,
        company_services!inner(description)
      )
    `)
    .eq('company_id', companyId)
    .eq('type', 'income')
    .not('appointment_id', 'is', null)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (error) {
    console.error('Hizmet ciro hatası:', error);
    return [];
  }
  return data || [];
};

// ============================================================
// OTOMATİK GELİR KAYDI (RANDEVU ONAYLANDIKTAN SONRA)
// ============================================================

/**
 * Randevu onaylandığında otomatik gelir kaydı oluştur
 * @param {Object} params - { companyId, appointmentId, amount, paymentMethod, description }
 */
export const createIncomeFromAppointment = async ({ companyId, appointmentId, amount, paymentMethod = 'cash', description }) => {
  if (!amount || amount <= 0) return null;

  // Aynı randevu için daha önce kayıt oluşturulmuş mu?
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('appointment_id', appointmentId)
    .maybeSingle();

  if (existing) return null; // Çift kayıt önle

  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      company_id: companyId,
      type: 'income',
      amount: parseFloat(amount),
      payment_method: paymentMethod,
      description: description || 'Randevu geliri',
      appointment_id: appointmentId,
      transaction_date: new Date().toISOString().split('T')[0],
    }])
    .select()
    .single();

  if (error) {
    console.error('Otomatik gelir kaydı hatası:', error);
    return null;
  }
  return data;
};

// ============================================================
// YARDIMCI FONKSİYONLAR
// ============================================================

/**
 * İşlemlerden özet hesapla: { totalIncome, totalExpense, netProfit, byCash, byCard, byTransfer }
 */
export const calculateSummary = (transactions) => {
  const summary = {
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    byCash: 0,
    byCard: 0,
    byTransfer: 0,
    byOther: 0,
  };

  transactions.forEach((tx) => {
    const amount = parseFloat(tx.amount) || 0;
    if (tx.type === 'income') {
      summary.totalIncome += amount;
      if (tx.payment_method === 'cash') summary.byCash += amount;
      else if (tx.payment_method === 'card') summary.byCard += amount;
      else if (tx.payment_method === 'transfer') summary.byTransfer += amount;
      else summary.byOther += amount;
    } else {
      summary.totalExpense += amount;
    }
  });

  summary.netProfit = summary.totalIncome - summary.totalExpense;
  return summary;
};

/**
 * Günlük gelir/gider verisi üret (grafik için)
 */
export const buildDailyChartData = (transactions, startDate, endDate) => {
  const dateMap = {};

  // Tarih aralığındaki her günü hazırla
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const key = current.toISOString().split('T')[0];
    dateMap[key] = { date: key, income: 0, expense: 0 };
    current.setDate(current.getDate() + 1);
  }

  // İşlemleri günlere ekle
  transactions.forEach((tx) => {
    const day = tx.transaction_date;
    if (dateMap[day]) {
      const amount = parseFloat(tx.amount) || 0;
      if (tx.type === 'income') dateMap[day].income += amount;
      else dateMap[day].expense += amount;
    }
  });

  return Object.values(dateMap);
};

/**
 * Kategori bazlı özet (pasta grafik için)
 */
export const buildCategoryChartData = (transactions, type = 'income') => {
  const catMap = {};

  transactions
    .filter((tx) => tx.type === type)
    .forEach((tx) => {
      const catName = tx.transaction_categories?.name || 'Diğer';
      if (!catMap[catName]) catMap[catName] = { name: catName, value: 0 };
      catMap[catName].value += parseFloat(tx.amount) || 0;
    });

  return Object.values(catMap).sort((a, b) => b.value - a.value);
};

// ============================================================
// RAPOR SİSTEMİ (FAZ 4) — 7 Modül + Ayarlar
// ============================================================

/**
 * Rapor ayarlarını getir
 */
export const getReportSettings = async (companyId) => {
  const { data, error } = await supabase
    .from('companies')
    .select('report_settings')
    .eq('id', companyId)
    .single();
  if (error) throw error;
  return data?.report_settings || {
    enabled: false,
    frequency: 'weekly',
    day_of_week: 1,
    time: '09:00',
    channels: ['whatsapp'],
    modules: ['appointment_summary', 'revenue_breakdown', 'popular_services'],
    recipients: [],
  };
};

/**
 * Rapor ayarlarını güncelle
 */
export const updateReportSettings = async (companyId, settings) => {
  const { error } = await supabase
    .from('companies')
    .update({ report_settings: settings })
    .eq('id', companyId);
  if (error) throw error;
};

/**
 * Rapor gönderim loglarını getir
 */
export const getReportLogs = async (companyId, limit = 20) => {
  const { data, error } = await supabase
    .from('report_send_log')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
};

// --- 7 RAPOR MODÜLÜ ---

/**
 * Modül 1: Randevu özeti
 */
export const reportAppointmentSummary = async (companyId, startDate, endDate) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, status, date, time, expert_id, company_users(name)')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;
  const total = data?.length || 0;
  const confirmed = data?.filter(a => a.status === 'onaylandı').length || 0;
  const cancelled = data?.filter(a => a.status === 'iptal').length || 0;
  const pending = data?.filter(a => a.status === 'beklemede').length || 0;
  return { total, confirmed, cancelled, pending, cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0 };
};

/**
 * Modül 2: Gelir dağılımı
 */
export const reportRevenueBreakdown = async (companyId, startDate, endDate) => {
  const transactions = await getTransactionsByDateRange(companyId, startDate, endDate);
  const summary = calculateSummary(transactions);
  const dailyData = buildDailyChartData(transactions, startDate, endDate);
  return { ...summary, dailyData };
};

/**
 * Modül 3: Uzman performansı
 */
export const reportExpertPerformance = async (companyId, startDate, endDate) => {
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, expert_id, status, company_users(name)')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate);

  const expertMap = {};
  (appointments || []).forEach(a => {
    const name = a.company_users?.name || 'Bilinmiyor';
    if (!expertMap[a.expert_id]) expertMap[a.expert_id] = { name, total: 0, confirmed: 0, cancelled: 0 };
    expertMap[a.expert_id].total++;
    if (a.status === 'onaylandı') expertMap[a.expert_id].confirmed++;
    if (a.status === 'iptal') expertMap[a.expert_id].cancelled++;
  });

  const revenueData = await getExpertRevenue(companyId, startDate, endDate);
  const revenueMap = {};
  (revenueData || []).forEach(r => {
    const eid = r.appointments?.expert_id;
    if (eid) revenueMap[eid] = (revenueMap[eid] || 0) + parseFloat(r.amount);
  });

  return Object.entries(expertMap).map(([id, data]) => ({
    ...data,
    expertId: id,
    revenue: revenueMap[id] || 0,
    occupancyRate: data.total > 0 ? Math.round((data.confirmed / data.total) * 100) : 0,
  })).sort((a, b) => b.revenue - a.revenue);
};

/**
 * Modül 4: Müşteri tutma oranı
 */
export const reportCustomerRetention = async (companyId, startDate, endDate) => {
  const { data: appointments } = await supabase
    .from('appointments')
    .select('customer_id, date, status')
    .eq('company_id', companyId)
    .eq('status', 'onaylandı')
    .gte('date', startDate)
    .lte('date', endDate);

  const customerVisits = {};
  (appointments || []).forEach(a => {
    if (!customerVisits[a.customer_id]) customerVisits[a.customer_id] = 0;
    customerVisits[a.customer_id]++;
  });

  const totalCustomers = Object.keys(customerVisits).length;
  const returningCustomers = Object.values(customerVisits).filter(v => v > 1).length;
  const newCustomers = totalCustomers - returningCustomers;

  return {
    totalCustomers,
    newCustomers,
    returningCustomers,
    retentionRate: totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0,
  };
};

/**
 * Modül 5: Popüler hizmetler
 */
export const reportPopularServices = async (companyId, startDate, endDate) => {
  const { data } = await supabase
    .from('appointment_services')
    .select('service_id, company_services(description, price, category), appointments!inner(date, company_id, status)')
    .eq('appointments.company_id', companyId)
    .eq('appointments.status', 'onaylandı')
    .gte('appointments.date', startDate)
    .lte('appointments.date', endDate);

  const serviceMap = {};
  (data || []).forEach(as => {
    const name = as.company_services?.description || 'Bilinmiyor';
    if (!serviceMap[name]) serviceMap[name] = { name, count: 0, revenue: 0, category: as.company_services?.category };
    serviceMap[name].count++;
    serviceMap[name].revenue += parseFloat(as.company_services?.price) || 0;
  });

  return Object.values(serviceMap).sort((a, b) => b.count - a.count);
};

/**
 * Modül 6: Yoğun saatler
 */
export const reportPeakHours = async (companyId, startDate, endDate) => {
  const { data } = await supabase
    .from('appointments')
    .select('time, date')
    .eq('company_id', companyId)
    .eq('status', 'onaylandı')
    .gte('date', startDate)
    .lte('date', endDate);

  const hourMap = {};
  const dayMap = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  (data || []).forEach(a => {
    const hour = parseInt(a.time?.split(':')[0]);
    if (!isNaN(hour)) {
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    }
    const dayIndex = new Date(a.date).getDay();
    dayMap[dayIndex]++;
  });

  const peakHours = Object.entries(hourMap)
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const peakDays = Object.entries(dayMap)
    .map(([day, count]) => ({ day: dayNames[day], count }))
    .sort((a, b) => b.count - a.count);

  return { peakHours, peakDays };
};

/**
 * Modül 7: Geri bildirim özeti
 */
export const reportFeedbackSummary = async (companyId, startDate, endDate) => {
  const { data } = await supabase
    .from('customer_feedback')
    .select('rating, status, created_at')
    .eq('company_id', companyId)
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`);

  const total = data?.length || 0;
  const avgRating = total > 0 ? data.reduce((s, f) => s + f.rating, 0) / total : 0;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  (data || []).forEach(f => { distribution[f.rating] = (distribution[f.rating] || 0) + 1; });
  const resolved = data?.filter(f => f.status === 'resolved').length || 0;

  return {
    total,
    avgRating: Math.round(avgRating * 10) / 10,
    distribution,
    resolved,
    resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
  };
};

/**
 * Tüm rapor modüllerini bir seferde çalıştır
 */
export const generateFullReport = async (companyId, startDate, endDate, modules = []) => {
  const allModules = {
    appointment_summary: reportAppointmentSummary,
    revenue_breakdown: reportRevenueBreakdown,
    expert_performance: reportExpertPerformance,
    customer_retention: reportCustomerRetention,
    popular_services: reportPopularServices,
    peak_hours: reportPeakHours,
    feedback_summary: reportFeedbackSummary,
  };

  const selectedModules = modules.length > 0 ? modules : Object.keys(allModules);
  const report = {};

  for (const mod of selectedModules) {
    if (allModules[mod]) {
      try {
        report[mod] = await allModules[mod](companyId, startDate, endDate);
      } catch (err) {
        console.error(`Rapor modülü hatası (${mod}):`, err);
        report[mod] = { error: err.message };
      }
    }
  }

  return report;
};
