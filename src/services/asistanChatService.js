import { supabase } from '../lib/supabase';

const ASISTAN_WEBHOOK_URL = import.meta.env.VITE_ASISTAN_WEBHOOK_URL_RB;

// Rate limiting ayarlari
const RATE_LIMIT = {
  minInterval: 2000,    // Mesajlar arasi minimum 2 saniye
  maxMessages: 30,      // 5 dakikalik pencerede maksimum 30 mesaj
  windowMs: 5 * 60000,  // 5 dakika
};

// Oturum bazli rate limit takibi (in-memory)
const rateLimitMap = new Map();

/**
 * Rate limit kontrolu yapar.
 * Her oturum icin son mesaj zamani ve pencere icindeki mesaj sayisini takip eder.
 */
function checkRateLimit(sessionId) {
  const now = Date.now();
  let tracker = rateLimitMap.get(sessionId);

  if (!tracker) {
    tracker = { lastMessageAt: 0, timestamps: [] };
    rateLimitMap.set(sessionId, tracker);
  }

  // Minimum aralik kontrolu
  if (now - tracker.lastMessageAt < RATE_LIMIT.minInterval) {
    throw new Error('Mesajlar arasi en az 2 saniye beklemelisiniz.');
  }

  // Pencere disindaki eski zamanlari temizle
  tracker.timestamps = tracker.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT.windowMs
  );

  // Maksimum mesaj sayisi kontrolu
  if (tracker.timestamps.length >= RATE_LIMIT.maxMessages) {
    throw new Error('Cok fazla mesaj gonderdiniz. Lutfen birkaç dakika bekleyin.');
  }

  // Takipciyi guncelle
  tracker.lastMessageAt = now;
  tracker.timestamps.push(now);
}

/**
 * Yeni bir sohbet oturumu olusturur.
 * @param {string} companyId - Sirket ID
 * @param {string} userId - Kullanici ID
 * @param {boolean} isPublic - Herkese acik mi
 * @returns {object} Olusturulan oturum
 */
export async function createSession(companyId, userId, isPublic = false) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      company_id: companyId,
      user_id: userId,
      is_public: isPublic,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('Oturum olusturma hatasi:', error);
    throw new Error('Sohbet oturumu olusturulamadi.');
  }

  return data;
}

/**
 * Oturumu kapatir.
 * @param {string} sessionId - Oturum ID
 */
export async function closeSession(sessionId) {
  if (!sessionId) return;

  const { error } = await supabase
    .from('chat_sessions')
    .update({
      status: 'closed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Oturum kapatma hatasi:', error);
    throw new Error('Oturum kapatilirken hata olustu.');
  }

  // Rate limit takibini temizle
  rateLimitMap.delete(sessionId);
}

/**
 * Oturuma ait tum mesajlari getirir.
 * @param {string} sessionId - Oturum ID
 * @returns {Array} Mesaj listesi
 */
export async function getSessionMessages(sessionId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Mesaj getirme hatasi:', error);
    throw new Error('Mesajlar yuklenemedi.');
  }

  return data || [];
}

/**
 * Mesaj gonderir, webhook'a iletir ve yaniti kaydeder.
 * @param {string} sessionId - Oturum ID
 * @param {string} content - Mesaj icerigi
 * @param {string} companyId - Sirket ID
 * @param {string} userId - Kullanici ID
 * @returns {object} Asistan yanit mesaji
 */
export async function sendMessage(sessionId, content, companyId, userId) {
  // Rate limit kontrolu
  checkRateLimit(sessionId);

  // Kullanici mesajini kaydet
  const { data: userMessage, error: userMsgError } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'user',
      content,
    })
    .select()
    .single();

  if (userMsgError) {
    console.error('Kullanici mesaji kaydetme hatasi:', userMsgError);
    throw new Error('Mesaj gonderilemedi.');
  }

  // N8N webhook'a POST gonder
  let assistantText;
  try {
    const response = await fetch(ASISTAN_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        message: content,
        company_id: companyId,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook hatasi: ${response.status}`);
    }

    const result = await response.json();
    assistantText = result.response || 'Yanit alinamadi.';
  } catch (fetchError) {
    console.error('Webhook baglanti hatasi:', fetchError);
    throw new Error('Asistan su anda yanitlamiyor. Lutfen tekrar deneyin.');
  }

  // Asistan yanitini kaydet
  const { data: assistantMessage, error: assistantMsgError } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'assistant',
      content: assistantText,
    })
    .select()
    .single();

  if (assistantMsgError) {
    console.error('Asistan yaniti kaydetme hatasi:', assistantMsgError);
    // Yaniti yine de dondur, kaydetme hatasi kullaniciyi engellemez
  }

  return assistantMessage || { role: 'assistant', content: assistantText, session_id: sessionId };
}

/**
 * Kullanicinin son oturumlarini getirir.
 * @param {string} companyId - Sirket ID
 * @param {string} userId - Kullanici ID
 * @param {number} limit - Maksimum sonuc sayisi
 * @returns {Array} Oturum listesi
 */
export async function getRecentSessions(companyId, userId, limit = 10) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Oturum listesi hatasi:', error);
    throw new Error('Gecmis oturumlar yuklenemedi.');
  }

  return data || [];
}

/**
 * Oturumu bir insana eskalasyon yapar.
 * @param {string} sessionId - Oturum ID
 * @param {string} companyId - Sirket ID
 * @param {string} reason - Eskalasyon nedeni
 */
export async function escalateSession(sessionId, companyId, reason) {
  // Eskalasyon kaydini olustur
  const { error: escError } = await supabase
    .from('chat_escalations')
    .insert({
      session_id: sessionId,
      company_id: companyId,
      reason,
    });

  if (escError) {
    console.error('Eskalasyon olusturma hatasi:', escError);
    throw new Error('Eskalasyon talebi gonderilemedi.');
  }

  // Oturum durumunu guncelle
  const { error: updateError } = await supabase
    .from('chat_sessions')
    .update({ status: 'escalated' })
    .eq('id', sessionId);

  if (updateError) {
    console.error('Oturum durumu guncelleme hatasi:', updateError);
  }
}

/**
 * Bilgi tabaninda arama yapar.
 * @param {string} query - Arama sorgusu
 * @param {string} language - Dil kodu (tr, en, ru, ar)
 * @param {number} limit - Maksimum sonuc sayisi
 * @returns {Array} Eslesenler
 */
export async function searchKnowledgeBase(query, language = 'tr', limit = 5) {
  const searchPattern = `%${query}%`;

  const { data, error } = await supabase
    .from('chatbot_knowledge_base')
    .select('*')
    .eq('language', language)
    .eq('is_active', true)
    .or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`)
    .limit(limit);

  if (error) {
    console.error('Bilgi tabani arama hatasi:', error);
    throw new Error('Arama yapilamadi.');
  }

  return data || [];
}
