import { supabase } from '../lib/supabase';

// N8N webhook URL — randevu mesaj olayları için
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

// =============================================================================
// ADMIN BİLDİRİM FONKSİYONLARI
// =============================================================================

/**
 * admin_notifications tablosuna yeni bildirim ekler.
 * @param {string} companyId
 * @param {string} type - 'new_appointment' | 'cancelled_appointment' | 'customer_complaint' | 'whatsapp_disconnected' | 'daily_summary' | 'payment_received' | 'trial_expiring'
 * @param {string} title
 * @param {string} message
 * @param {string|null} relatedId - İlgili randevu/müşteri ID'si
 */
export const createAdminNotification = async (companyId, type, title, message, relatedId = null) => {
  const { error } = await supabase.from('admin_notifications').insert({
    company_id: companyId,
    type,
    title,
    message,
    related_id: relatedId,
  });
  if (error) console.error('Admin bildirim oluşturma hatası:', error);
};

/**
 * Okunmamış admin bildirimlerini getirir.
 */
export const fetchAdminNotifications = async (companyId, limit = 20) => {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) console.error('Bildirim getirme hatası:', error);
  return data || [];
};

/**
 * Tüm bildirimleri okundu olarak işaretler.
 */
export const markAllNotificationsRead = async (companyId) => {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ is_read: true })
    .eq('company_id', companyId)
    .eq('is_read', false);

  if (error) console.error('Bildirim güncelleme hatası:', error);
};

/**
 * Tekil bildirimi okundu işaretler.
 */
export const markNotificationRead = async (notificationId) => {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) console.error('Bildirim güncelleme hatası:', error);
};

// =============================================================================
// WHATSAPP MESAJ GÖNDERİM FONKSİYONLARI (N8N üzerinden)
// =============================================================================

/**
 * N8N webhook aracılığıyla müşteriye WhatsApp mesajı gönderir.
 * @param {string} customerPhone - Uluslararası format (+90...)
 * @param {string} message - Gönderilecek mesaj metni
 * @param {string} companyId - Hangi şirketin WhatsApp hattından gidecek
 * @param {string} eventType - 'confirmation' | 'reminder_24h' | 'reminder_1h' | 'cancellation' | 'feedback_request'
 */
export const sendWhatsAppMessage = async (customerPhone, message, companyId, eventType) => {
  if (!N8N_WEBHOOK_URL) {
    console.error('VITE_N8N_WEBHOOK_URL tanımlı değil');
    return false;
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventType,
        company_id: companyId,
        phone: customerPhone,
        message,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('WhatsApp mesaj gönderme hatası:', error);
    return false;
  }
};

/**
 * Şablondaki değişkenleri gerçek değerlerle değiştirir.
 * {{customer_name}} → "Ayşe YILMAZ" gibi.
 */
const fillTemplate = (template, variables) => {
  return Object.entries(variables).reduce(
    (text, [key, value]) => text.replace(new RegExp(`{{${key}}}`, 'g'), value || ''),
    template
  );
};

/**
 * notification_templates tablosundan şablon çeker.
 * Şirket şablonu yoksa varsayılan (company_id = null) kullanılır.
 */
const getTemplate = async (companyId, type, language = 'tr') => {
  // Önce şirkete özel şablona bak
  const { data: companyTemplate } = await supabase
    .from('notification_templates')
    .select('template')
    .eq('company_id', companyId)
    .eq('type', type)
    .eq('language', language)
    .eq('is_active', true)
    .single();

  if (companyTemplate) return companyTemplate.template;

  // Varsayılan şablonlara düş
  const defaults = {
    appointment_confirmation: `Merhaba {{customer_name}}! ✅\n{{salon_name}}'da {{date}} tarihinde saat {{time}} için randevunuz oluşturuldu.\nHizmet: {{service_name}}\nUzman: {{expert_name}}\n\nİyi günler dileriz 😊`,
    reminder_24h: `Hatırlatma 📅\nMerhaba {{customer_name}}, yarın saat {{time}} için {{salon_name}}'da randevunuz var.\nHizmet: {{service_name}} - Uzman: {{expert_name}}\n\nGörüşmek üzere! 😊`,
    reminder_1h: `⏰ Hatırlatma\nMerhaba {{customer_name}}, bugün saat {{time}} için {{salon_name}}'da randevunuz var. 1 saat kaldı!\n\nSizi bekliyoruz 😊`,
    cancellation: `Merhaba {{customer_name}},\n{{date}} tarihinde saat {{time}} için olan randevunuz iptal edilmiştir.\n\nYeni randevu almak için bize yazabilirsiniz.`,
    feedback_request: `Merhaba {{customer_name}}! 😊\n{{salon_name}}'daki deneyiminizi nasıl değerlendirirsiniz?\n\n1️⃣ - Çok Kötü\n2️⃣ - Kötü\n3️⃣ - Orta\n4️⃣ - İyi\n5️⃣ - Mükemmel\n\nSadece rakamı yazmanız yeterli.`,
  };

  return defaults[type] || null;
};

// =============================================================================
// OLAY BAZLI BİLDİRİM FONKSİYONLARI
// =============================================================================

/**
 * Yeni randevu oluşturulduğunda müşteriye WhatsApp onay mesajı gönderir.
 * @param {object} appointment - Randevu verisi (customer_phone, customer_name, date, time, service_name, expert_name, company_id, salon_name, id)
 */
export const sendAppointmentConfirmation = async (appointment) => {
  const template = await getTemplate(appointment.company_id, 'appointment_confirmation');
  if (!template) return;

  const message = fillTemplate(template, {
    customer_name: appointment.customer_name,
    salon_name: appointment.salon_name,
    date: appointment.date,
    time: appointment.time,
    service_name: appointment.service_name,
    expert_name: appointment.expert_name,
  });

  return sendWhatsAppMessage(appointment.customer_phone, message, appointment.company_id, 'confirmation');
};

/**
 * 24 saat veya 1 saat önce hatırlatma mesajı gönderir.
 * @param {object} appointment
 * @param {'reminder_24h'|'reminder_1h'} type
 */
export const sendReminder = async (appointment, type) => {
  const template = await getTemplate(appointment.company_id, type);
  if (!template) return;

  const message = fillTemplate(template, {
    customer_name: appointment.customer_name,
    salon_name: appointment.salon_name,
    date: appointment.date,
    time: appointment.time,
    service_name: appointment.service_name,
    expert_name: appointment.expert_name,
  });

  return sendWhatsAppMessage(appointment.customer_phone, message, appointment.company_id, type);
};

/**
 * Randevu iptal edildiğinde müşteriye bildirim gönderir.
 * @param {object} appointment
 */
export const sendCancellation = async (appointment) => {
  const template = await getTemplate(appointment.company_id, 'cancellation');
  if (!template) return;

  const message = fillTemplate(template, {
    customer_name: appointment.customer_name,
    date: appointment.date,
    time: appointment.time,
  });

  return sendWhatsAppMessage(appointment.customer_phone, message, appointment.company_id, 'cancellation');
};

/**
 * Randevu tamamlandıktan sonra memnuniyet anketi gönderir.
 * @param {object} appointment
 */
export const sendFeedbackRequest = async (appointment) => {
  const template = await getTemplate(appointment.company_id, 'feedback_request');
  if (!template) return;

  const message = fillTemplate(template, {
    customer_name: appointment.customer_name,
    salon_name: appointment.salon_name,
  });

  return sendWhatsAppMessage(appointment.customer_phone, message, appointment.company_id, 'feedback_request');
};

// =============================================================================
// GERİ BİLDİRİM FONKSİYONLARI
// =============================================================================

/**
 * customer_feedback tablosuna yeni geri bildirim kaydeder.
 * Rating ≤ 3 ise admin'e otomatik şikayet bildirimi gönderir.
 */
export const saveFeedback = async (companyId, customerId, appointmentId, rating, comment = '') => {
  const { error } = await supabase.from('customer_feedback').insert({
    company_id: companyId,
    customer_id: customerId,
    appointment_id: appointmentId,
    rating,
    comment,
    status: 'new',
  });

  if (error) {
    console.error('Geri bildirim kaydetme hatası:', error);
    return false;
  }

  // Düşük puan → admin'e şikayet bildirimi
  if (rating <= 3) {
    await createAdminNotification(
      companyId,
      'customer_complaint',
      '⚠️ Müşteri Şikayeti',
      `Müşteriden düşük puan alındı: ${rating}/5${comment ? ` — "${comment}"` : ''}`,
      appointmentId
    );
  }

  return true;
};
