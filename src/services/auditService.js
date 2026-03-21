/**
 * Audit Log Service — Immutable islem kayit sistemi
 * Tum kritik islemler burada loglanir: randevu, odeme, transaction, hizmet degisikligi
 * audit_log tablosu UPDATE/DELETE RLS politikasi olmadan calisir — silinemez!
 */

import { supabase } from '../lib/supabase';

/**
 * Kritik bir islemi audit_log tablosuna kaydet
 * @param {string} companyId - Sirket ID
 * @param {Object} params
 * @param {string} params.userId - Islemi yapan kullanici ID (company_users.id)
 * @param {string} params.userName - Islemi yapan kullanici adi
 * @param {string} params.action - Islem turu (appointment_create, payment_collect, transaction_void vb.)
 * @param {string} params.entityType - Varlik turu (appointment, transaction, payment, service)
 * @param {string} params.entityId - Varlik ID
 * @param {Object} params.details - Ek detaylar (before/after, reason, amount vb.)
 */
export const logAction = async (companyId, { userId, userName, action, entityType, entityId, details }) => {
  try {
    await supabase.from('audit_log').insert([{
      company_id: companyId,
      user_id: userId || null,
      user_name: userName || 'Sistem',
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details || {},
    }]);
  } catch (err) {
    // Audit log hatasi ana islemi engellemememeli
    console.error('Audit log hatasi:', err);
  }
};

/**
 * Belirli bir sirketin audit loglarini getir
 * @param {string} companyId
 * @param {Object} filters - { startDate, endDate, action, entityType, userId }
 * @param {number} limit - Maksimum kayit sayisi
 */
export const getAuditLogs = async (companyId, filters = {}, limit = 100) => {
  let query = supabase
    .from('audit_log')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate + 'T23:59:59');
  if (filters.action) query = query.eq('action', filters.action);
  if (filters.entityType) query = query.eq('entity_type', filters.entityType);
  if (filters.userId) query = query.eq('user_id', filters.userId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Belirli bir varligin tum audit gecmisini getir
 * @param {string} entityType - appointment, transaction, payment
 * @param {string} entityId - Varlik ID
 */
export const getEntityHistory = async (entityType, entityId) => {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Action sabitleri
export const AUDIT_ACTIONS = {
  // Randevu
  APPOINTMENT_CREATE: 'appointment_create',
  APPOINTMENT_UPDATE: 'appointment_update',
  APPOINTMENT_CANCEL: 'appointment_cancel',
  APPOINTMENT_SERVICE_CHANGE: 'appointment_service_change',
  APPOINTMENT_EXPERT_REASSIGN: 'expert_reassign',
  APPOINTMENT_REORDER: 'appointment_reorder',

  // Odeme
  PAYMENT_COLLECT: 'payment_collect',
  PAYMENT_REFUND: 'payment_refund',

  // Transaction
  TRANSACTION_CREATE: 'transaction_create',
  TRANSACTION_VOID: 'transaction_void',

  // Hizmet
  SERVICE_CREATE: 'service_create',
  SERVICE_UPDATE: 'service_update',
  SERVICE_DELETE: 'service_delete',
};
