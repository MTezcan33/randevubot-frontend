/**
 * Paket & Hediye Kartı Servis Katmanı
 * Paket tanımlama, satış, kullanım takibi, hediye kartı yönetimi
 */
import { supabase } from '../lib/supabase';

// ============================================================
// PAKET TANIMLARI
// ============================================================

/** İşletmenin paket tanımlarını getir */
export const getPackageDefinitions = async (companyId) => {
  const { data, error } = await supabase
    .from('service_packages')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

/** Yeni paket tanımla */
export const createPackageDefinition = async (companyId, packageData) => {
  const { data, error } = await supabase
    .from('service_packages')
    .insert([{ company_id: companyId, ...packageData }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

/** Paket tanımını güncelle */
export const updatePackageDefinition = async (packageId, updates) => {
  const { error } = await supabase
    .from('service_packages')
    .update(updates)
    .eq('id', packageId);
  if (error) throw error;
};

/** Paket tanımını sil (aktif satışı yoksa) */
export const deletePackageDefinition = async (packageId) => {
  // Aktif satış kontrolü
  const { data: activeSales } = await supabase
    .from('customer_packages')
    .select('id')
    .eq('package_id', packageId)
    .eq('status', 'active')
    .limit(1);

  if (activeSales && activeSales.length > 0) {
    throw new Error('Bu pakete ait aktif satışlar var. Önce satışları tamamlayın veya iptal edin.');
  }

  const { error } = await supabase
    .from('service_packages')
    .delete()
    .eq('id', packageId);
  if (error) throw error;
};

// ============================================================
// PAKET SATIŞ & KULLANIM
// ============================================================

/** Müşteriye paket sat */
export const purchasePackage = async (companyId, { customerId, packageId, paymentMethod, notes }) => {
  // Paket tanımını al
  const { data: pkg, error: pkgErr } = await supabase
    .from('service_packages')
    .select('*')
    .eq('id', packageId)
    .single();
  if (pkgErr) throw pkgErr;

  // Son kullanma tarihi hesapla
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + (pkg.validity_days || 365));

  const { data, error } = await supabase
    .from('customer_packages')
    .insert([{
      company_id: companyId,
      customer_id: customerId,
      package_id: packageId,
      expiry_date: expiryDate.toISOString().split('T')[0],
      total_sessions: pkg.total_sessions,
      total_price: pkg.price,
      payment_method: paymentMethod,
      notes,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

/** Müşterinin aktif paketlerini getir */
export const getCustomerPackages = async (customerId, companyId) => {
  const { data, error } = await supabase
    .from('customer_packages')
    .select('*, service_packages(name, description, services, total_sessions)')
    .eq('customer_id', customerId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

/** Paketten seans kullan */
export const usePackageSession = async (customerPackageId, appointmentId, serviceId) => {
  // Paketin durumunu kontrol et
  const { data: pkg, error: pkgErr } = await supabase
    .from('customer_packages')
    .select('id, used_sessions, total_sessions, status, expiry_date')
    .eq('id', customerPackageId)
    .single();
  if (pkgErr) throw pkgErr;

  if (pkg.status !== 'active') throw new Error('Bu paket aktif değil');
  if (new Date(pkg.expiry_date) < new Date()) throw new Error('Bu paketin süresi dolmuş');
  if (pkg.used_sessions >= pkg.total_sessions) throw new Error('Bu pakette kalan seans yok');

  // Kullanım kaydı oluştur
  await supabase.from('package_usage').insert([{
    customer_package_id: customerPackageId,
    appointment_id: appointmentId,
    service_id: serviceId,
  }]);

  // used_sessions güncelle
  const newUsed = pkg.used_sessions + 1;
  const newStatus = newUsed >= pkg.total_sessions ? 'completed' : 'active';
  await supabase.from('customer_packages').update({
    used_sessions: newUsed,
    status: newStatus,
  }).eq('id', customerPackageId);

  return { remaining: pkg.total_sessions - newUsed, status: newStatus };
};

// ============================================================
// HEDİYE KARTI
// ============================================================

/** Benzersiz hediye kartı kodu üret */
const generateGiftCardCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karışıklığa yol açan harfler çıkarıldı (I,O,0,1)
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code.substring(0, 4) + '-' + code.substring(4);
};

/** Hediye kartı oluştur */
export const createGiftCard = async (companyId, { amount, customerId, purchasedBy, recipientName, expiryDate }) => {
  let code = generateGiftCardCode();
  // Kod benzersizliği kontrolü
  const { data: existing } = await supabase
    .from('gift_cards')
    .select('id')
    .eq('company_id', companyId)
    .eq('code', code);
  if (existing && existing.length > 0) code = generateGiftCardCode(); // tekrar dene

  const { data, error } = await supabase
    .from('gift_cards')
    .insert([{
      company_id: companyId,
      code,
      customer_id: customerId || null,
      original_amount: amount,
      remaining_amount: amount,
      purchased_by: purchasedBy || null,
      recipient_name: recipientName || null,
      expiry_date: expiryDate || null,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

/** İşletmenin hediye kartlarını getir */
export const getGiftCards = async (companyId, filters = {}) => {
  let query = supabase
    .from('gift_cards')
    .select('*, customers(name, phone)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/** Müşterinin hediye kartlarını getir */
export const getCustomerGiftCards = async (customerId, companyId) => {
  const { data, error } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('customer_id', customerId)
    .eq('company_id', companyId)
    .in('status', ['active'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

/** Hediye kartından harcama (kısmi kullanım) */
export const redeemGiftCard = async (giftCardId, amount) => {
  const { data: card, error: fetchErr } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('id', giftCardId)
    .single();
  if (fetchErr) throw fetchErr;

  if (card.status !== 'active') throw new Error('Bu hediye kartı aktif değil');
  if (card.remaining_amount < amount) throw new Error('Yetersiz bakiye');

  const newRemaining = parseFloat(card.remaining_amount) - parseFloat(amount);
  const newStatus = newRemaining <= 0 ? 'used' : 'active';

  const { error } = await supabase
    .from('gift_cards')
    .update({ remaining_amount: newRemaining, status: newStatus })
    .eq('id', giftCardId);
  if (error) throw error;

  return { remaining: newRemaining, status: newStatus };
};

/** Hediye kartını kod ile bul */
export const findGiftCardByCode = async (companyId, code) => {
  const { data, error } = await supabase
    .from('gift_cards')
    .select('*, customers(name, phone)')
    .eq('company_id', companyId)
    .eq('code', code.toUpperCase().trim())
    .single();
  if (error) throw error;
  return data;
};
