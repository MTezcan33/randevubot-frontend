import { supabase } from '../lib/supabase';

// ============================================================
// BEKLEYEN ÖDEMELER
// ============================================================

/**
 * Ödeme bekleyen randevuları getir
 * @param {string} companyId
 * @param {Object} filters - { date, startDate, endDate, expertId, status, search }
 */
export const getUnpaidAppointments = async (companyId, filters = {}) => {
  let query = supabase
    .from('appointments')
    .select(`
      id, date, time, status, payment_status, total_amount, paid_amount,
      expert_id, customer_id, service_id, space_id,
      company_users(id, name, color),
      customers(id, name, phone),
      appointment_services(
        id, service_id,
        company_services(id, description, price, duration, category)
      ),
      appointment_payments(
        id, amount, payment_method, service_id, note, is_refunded, refunded_at, refund_reason, created_at
      )
    `)
    .eq('company_id', companyId)
    .or('payment_status.eq.unpaid,payment_status.eq.partial,payment_status.is.null')
    .neq('status', 'iptal')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  // Filtreler
  if (filters.date) {
    query = query.eq('date', filters.date);
  }
  if (filters.startDate) {
    query = query.gte('date', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('date', filters.endDate);
  }
  if (filters.expertId) {
    query = query.eq('expert_id', filters.expertId);
  }
  if (filters.status) {
    query = query.eq('payment_status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  let results = data || [];

  // total_amount 0 olan randevuları appointment_services'dan hesapla ve DB'yi güncelle
  const fixPromises = results
    .filter(a => (!a.total_amount || parseFloat(a.total_amount) === 0) && a.appointment_services?.length > 0)
    .map(async (a) => {
      const total = a.appointment_services.reduce(
        (sum, as) => sum + (parseFloat(as.company_services?.price) || 0), 0
      );
      a.total_amount = total;
      // DB'yi de güncelle
      await supabase.from('appointments').update({
        total_amount: total,
        payment_status: a.payment_status || 'unpaid',
      }).eq('id', a.id);
    });
  await Promise.all(fixPromises);

  // payment_status null olanları 'unpaid' olarak normalize et
  results.forEach(a => {
    if (!a.payment_status) a.payment_status = 'unpaid';
  });

  // Müşteri adı/telefon arama
  if (filters.search) {
    const s = filters.search.toUpperCase();
    results = results.filter(a =>
      a.customers?.name?.toUpperCase().includes(s) ||
      a.customers?.phone?.includes(s)
    );
  }

  return results;
};

// ============================================================
// RANDEVU ÖDEME DETAYI
// ============================================================

/**
 * Tek randevunun ödeme detayını getir
 */
export const getAppointmentPaymentDetail = async (appointmentId) => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, date, time, status, payment_status, total_amount, paid_amount,
      expert_id, customer_id, service_id, space_id,
      company_users(id, name, color),
      customers(id, name, phone),
      appointment_services(
        id, service_id, expert_id,
        company_services(id, description, price, duration, category)
      ),
      appointment_payments(
        id, amount, payment_method, service_id, note, is_refunded,
        refunded_at, refund_reason, transaction_id, created_at
      )
    `)
    .eq('id', appointmentId)
    .single();

  if (error) throw error;

  // total_amount DB'de 0 veya null ise appointment_services'dan hesapla
  let totalAmount = parseFloat(data.total_amount) || 0;
  if (totalAmount === 0 && data.appointment_services?.length > 0) {
    totalAmount = data.appointment_services.reduce(
      (sum, as) => sum + (parseFloat(as.company_services?.price) || 0), 0
    );
    // DB'yi de güncelle
    await supabase
      .from('appointments')
      .update({ total_amount: totalAmount })
      .eq('id', appointmentId);
  }
  const paidAmount = parseFloat(data.paid_amount) || 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  return {
    ...data,
    totalAmount,
    paidAmount,
    remainingAmount,
  };
};

// ============================================================
// ÖDEME TAHSİLAT
// ============================================================

/**
 * Ödeme kaydet (parçalı ödeme destekli)
 * @param {string} companyId
 * @param {Object} params - { appointmentId, amount, paymentMethod, serviceId?, note?, collectedBy? }
 */
export const collectPayment = async (companyId, {
  appointmentId,
  amount,
  paymentMethod,
  serviceId = null,
  note = null,
  collectedBy = null,
}) => {
  // 1. Ödeme kaydı oluştur
  const { data: payment, error: paymentError } = await supabase
    .from('appointment_payments')
    .insert([{
      company_id: companyId,
      appointment_id: appointmentId,
      amount: parseFloat(amount),
      payment_method: paymentMethod,
      service_id: serviceId,
      note,
      collected_by: collectedBy,
    }])
    .select()
    .single();

  if (paymentError) throw paymentError;

  // 2. Otomatik muhasebe kaydı oluştur (ücretsiz değilse)
  // Uzman bazlı gelir takibi: her hizmetin fiyatını o hizmeti yapan uzmanın gelirine yaz
  let transaction = null;
  const transactions = [];
  if (paymentMethod !== 'free') {
    try {
      const txMethod = paymentMethod === 'online' ? 'transfer' : paymentMethod;
      const today = new Date().toISOString().split('T')[0];

      // Randevunun hizmet-uzman eşleşmelerini al
      const { data: appServices } = await supabase
        .from('appointment_services')
        .select('service_id, expert_id, company_services(description, price)')
        .eq('appointment_id', appointmentId);

      if (appServices && appServices.length > 0) {
        // Toplam fiyat ve ödeme oranını hesapla (kısmi ödeme desteği)
        const totalServicePrice = appServices.reduce(
          (sum, as) => sum + (parseFloat(as.company_services?.price) || 0), 0
        );
        const paymentRatio = totalServicePrice > 0 ? parseFloat(amount) / totalServicePrice : 1;

        // Her hizmet için ayrı transaction oluştur (uzman bazlı)
        const txInserts = appServices.map(as => ({
          company_id: companyId,
          type: 'income',
          amount: Math.round((parseFloat(as.company_services?.price) || 0) * paymentRatio * 100) / 100,
          payment_method: txMethod,
          description: `${as.company_services?.description || 'Hizmet'} — ${note || 'Randevu ödemesi'}`,
          appointment_id: appointmentId,
          expert_id: as.expert_id || null,
          transaction_date: today,
        }));

        // Yuvarlama farkını düzelt — toplam tam olarak ödenen miktara eşit olsun
        const txTotal = txInserts.reduce((s, t) => s + t.amount, 0);
        const diff = parseFloat(amount) - txTotal;
        if (Math.abs(diff) > 0.001 && txInserts.length > 0) {
          txInserts[0].amount = Math.round((txInserts[0].amount + diff) * 100) / 100;
        }

        const { data: txDataArr, error: txError } = await supabase
          .from('transactions')
          .insert(txInserts)
          .select();

        if (!txError && txDataArr?.length > 0) {
          transactions.push(...txDataArr);
          transaction = txDataArr[0]; // İlk transaction'ı referans olarak sakla
          // Ödeme kaydına ilk transaction_id bağla
          await supabase
            .from('appointment_payments')
            .update({ transaction_id: txDataArr[0].id })
            .eq('id', payment.id);
        }
      } else {
        // appointment_services yoksa eski yöntemle tek transaction oluştur
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .insert([{
            company_id: companyId,
            type: 'income',
            amount: parseFloat(amount),
            payment_method: txMethod,
            description: note || 'Randevu ödemesi',
            appointment_id: appointmentId,
            transaction_date: today,
          }])
          .select()
          .single();

        if (!txError && txData) {
          transaction = txData;
          await supabase
            .from('appointment_payments')
            .update({ transaction_id: txData.id })
            .eq('id', payment.id);
        }
      }
    } catch (err) {
      console.error('Otomatik transaction oluşturma hatası:', err);
    }
  }

  // 3. Güncel randevu bilgisini döndür
  const updatedAppointment = await getAppointmentPaymentDetail(appointmentId);

  return { payment, transaction, updatedAppointment };
};

// ============================================================
// İADE İŞLEMLERİ
// ============================================================

/**
 * Tekil ödeme iade et
 */
export const refundPayment = async (paymentId, reason = null) => {
  // Ödeme bilgisini al
  const { data: payment, error: fetchError } = await supabase
    .from('appointment_payments')
    .select('*, transactions:transaction_id(*)')
    .eq('id', paymentId)
    .single();

  if (fetchError) throw fetchError;

  // İade işaretle
  const { error: updateError } = await supabase
    .from('appointment_payments')
    .update({
      is_refunded: true,
      refunded_at: new Date().toISOString(),
      refund_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (updateError) throw updateError;

  // İlişkili transaction varsa, eksi transaction oluştur
  if (payment.transaction_id) {
    try {
      await supabase
        .from('transactions')
        .insert([{
          company_id: payment.company_id,
          type: 'expense',
          amount: parseFloat(payment.amount),
          payment_method: payment.payment_method === 'online' ? 'transfer' : payment.payment_method,
          description: `İade: ${reason || 'Ödeme iadesi'}`,
          appointment_id: payment.appointment_id,
          transaction_date: new Date().toISOString().split('T')[0],
        }]);
    } catch (err) {
      console.error('İade transaction oluşturma hatası:', err);
    }
  }

  return true;
};

/**
 * Toplu iade — bir randevunun tüm ödemelerini iade et
 */
export const refundAllPayments = async (appointmentId, reason = null) => {
  // Aktif (iade edilmemiş) ödemeleri al
  const { data: payments, error } = await supabase
    .from('appointment_payments')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('is_refunded', false);

  if (error) throw error;

  // Her birini iade et
  for (const p of (payments || [])) {
    await refundPayment(p.id, reason);
  }

  return true;
};

// ============================================================
// ÖDEME GEÇMİŞİ
// ============================================================

/**
 * Ödeme geçmişi getir (filtrelenebilir)
 */
export const getPaymentHistory = async (companyId, filters = {}) => {
  let query = supabase
    .from('appointment_payments')
    .select(`
      id, amount, payment_method, service_id, note, is_refunded,
      refunded_at, refund_reason, created_at,
      appointments(
        id, date, time, expert_id,
        company_users(name, color),
        customers(name, phone)
      ),
      company_services(description)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  // Tarih filtresi
  if (filters.startDate) {
    query = query.gte('created_at', `${filters.startDate}T00:00:00`);
  }
  if (filters.endDate) {
    query = query.lte('created_at', `${filters.endDate}T23:59:59`);
  }

  // Ödeme yöntemi
  if (filters.paymentMethod) {
    query = query.eq('payment_method', filters.paymentMethod);
  }

  // Durum: aktif veya iade
  if (filters.status === 'active') {
    query = query.eq('is_refunded', false);
  } else if (filters.status === 'refunded') {
    query = query.eq('is_refunded', true);
  }

  const { data, error } = await query;
  if (error) throw error;

  let results = data || [];

  // Müşteri arama
  if (filters.search) {
    const s = filters.search.toUpperCase();
    results = results.filter(p =>
      p.appointments?.customers?.name?.toUpperCase().includes(s) ||
      p.appointments?.customers?.phone?.includes(s)
    );
  }

  return results;
};

/**
 * Ödeme özeti (summary kartları için)
 */
export const getPaymentSummary = async (companyId, startDate, endDate) => {
  const { data, error } = await supabase
    .from('appointment_payments')
    .select('amount, payment_method, is_refunded')
    .eq('company_id', companyId)
    .eq('is_refunded', false)
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`);

  if (error) throw error;

  const summary = {
    totalAmount: 0,
    byCash: 0,
    byCard: 0,
    byOnline: 0,
    byFree: 0,
    totalCount: (data || []).length,
  };

  (data || []).forEach(p => {
    const amt = parseFloat(p.amount) || 0;
    summary.totalAmount += amt;
    if (p.payment_method === 'cash') summary.byCash += amt;
    else if (p.payment_method === 'card') summary.byCard += amt;
    else if (p.payment_method === 'online') summary.byOnline += amt;
    else if (p.payment_method === 'free') summary.byFree += amt;
  });

  return summary;
};

// ============================================================
// ÖDEME AYARLARI
// ============================================================

/**
 * Şirket ödeme ayarlarını getir (yoksa default oluştur)
 */
export const getPaymentSettings = async (companyId) => {
  const { data: existing, error: fetchError } = await supabase
    .from('payment_settings')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing;

  // Varsayılan oluştur
  const { data: newSettings, error: insertError } = await supabase
    .from('payment_settings')
    .insert([{ company_id: companyId }])
    .select()
    .single();

  if (insertError) throw insertError;
  return newSettings;
};

/**
 * Ödeme ayarlarını güncelle
 */
export const updatePaymentSettings = async (companyId, settings) => {
  const { data, error } = await supabase
    .from('payment_settings')
    .update({
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', companyId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Randevu total_amount güncelle (hizmet fiyatlarından)
 */
export const recalculateAppointmentTotal = async (appointmentId) => {
  // appointment_services'dan toplam fiyat hesapla
  const { data: services } = await supabase
    .from('appointment_services')
    .select('company_services(price)')
    .eq('appointment_id', appointmentId);

  let total = 0;
  if (services && services.length > 0) {
    total = services.reduce((sum, s) => sum + (parseFloat(s.company_services?.price) || 0), 0);
  } else {
    // Doğrudan service_id'den al
    const { data: apt } = await supabase
      .from('appointments')
      .select('service_id, company_services(price)')
      .eq('id', appointmentId)
      .single();
    total = parseFloat(apt?.company_services?.price) || 0;
  }

  const { error } = await supabase
    .from('appointments')
    .update({ total_amount: total })
    .eq('id', appointmentId);

  if (error) throw error;
  return total;
};
