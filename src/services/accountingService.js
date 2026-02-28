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
