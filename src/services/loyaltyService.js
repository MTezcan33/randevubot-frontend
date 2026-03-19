import { supabase } from '../lib/supabase';

/**
 * Sirketin sadakat programi ayarlarini getir
 * @param {string} companyId
 */
export const getLoyaltySettings = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) {
      console.error('Sadakat ayarlari okuma hatasi:', error);
      return { data: null, error: error.message };
    }

    // Ayar yoksa varsayilan degerler dondur
    if (!data) {
      return {
        data: {
          company_id: companyId,
          is_active: false,
          points_per_appointment: 10,
          points_per_currency: 1,
          min_redeem_points: 100,
          discount_per_point: 0.1,
        },
        error: null,
      };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Sadakat ayarlari hatasi:', err);
    return { data: null, error: 'Beklenmeyen bir hata olustu' };
  }
};

/**
 * Sadakat programi ayarlarini guncelle (upsert)
 * @param {string} companyId
 * @param {object} settings - { is_active, points_per_appointment, points_per_currency, min_redeem_points, discount_per_point }
 */
export const updateLoyaltySettings = async (companyId, settings) => {
  try {
    const { data, error } = await supabase
      .from('loyalty_settings')
      .upsert(
        {
          company_id: companyId,
          ...settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Sadakat ayarlari guncelleme hatasi:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Sadakat ayarlari guncelleme hatasi:', err);
    return { data: null, error: 'Beklenmeyen bir hata olustu' };
  }
};

/**
 * Musterinin puan bilgisini getir
 * @param {string} companyId
 * @param {string} customerId
 */
export const getCustomerPoints = async (companyId, customerId) => {
  try {
    const { data, error } = await supabase
      .from('customer_loyalty_points')
      .select('*')
      .eq('company_id', companyId)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error) {
      console.error('Musteri puan okuma hatasi:', error);
      return { data: null, error: error.message };
    }

    // Kayit yoksa sifir dondur
    if (!data) {
      return {
        data: {
          company_id: companyId,
          customer_id: customerId,
          points: 0,
          total_earned: 0,
          total_redeemed: 0,
          last_earned_at: null,
        },
        error: null,
      };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Musteri puan hatasi:', err);
    return { data: null, error: 'Beklenmeyen bir hata olustu' };
  }
};

/**
 * Puan kazan — loyalty_transaction olustur + customer_loyalty_points upsert
 * @param {string} companyId
 * @param {string} customerId
 * @param {number} points - Kazanilacak puan miktari
 * @param {string} description - Aciklama (orn: "Randevu tamamlandi")
 * @param {string|null} appointmentId - Ilgili randevu ID'si
 */
export const earnPoints = async (companyId, customerId, points, description, appointmentId = null) => {
  try {
    if (points <= 0) {
      return { success: false, error: 'Puan miktari sifirdan buyuk olmali' };
    }

    // 1. Loyalty transaction olustur
    const { error: txError } = await supabase.from('loyalty_transactions').insert({
      company_id: companyId,
      customer_id: customerId,
      type: 'earn',
      points,
      description,
      appointment_id: appointmentId,
    });

    if (txError) {
      console.error('Puan islem kaydi hatasi:', txError);
      return { success: false, error: txError.message };
    }

    // 2. Mevcut puanlari oku
    const { data: existing } = await supabase
      .from('customer_loyalty_points')
      .select('*')
      .eq('company_id', companyId)
      .eq('customer_id', customerId)
      .maybeSingle();

    // 3. Upsert ile puan guncelle
    const currentPoints = existing?.points || 0;
    const currentEarned = existing?.total_earned || 0;

    const { data, error: upsertError } = await supabase
      .from('customer_loyalty_points')
      .upsert(
        {
          company_id: companyId,
          customer_id: customerId,
          points: currentPoints + points,
          total_earned: currentEarned + points,
          last_earned_at: new Date().toISOString(),
        },
        { onConflict: 'company_id,customer_id' }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Puan guncelleme hatasi:', upsertError);
      return { success: false, error: upsertError.message };
    }

    return { success: true, data, error: null };
  } catch (err) {
    console.error('Puan kazanma hatasi:', err);
    return { success: false, error: 'Beklenmeyen bir hata olustu' };
  }
};

/**
 * Puan harca — minimum puan ve bakiye kontrolu yapar
 * @param {string} companyId
 * @param {string} customerId
 * @param {number} points - Harcanacak puan miktari
 * @param {string} description - Aciklama (orn: "Indirim uygulandi")
 */
export const redeemPoints = async (companyId, customerId, points, description) => {
  try {
    if (points <= 0) {
      return { success: false, error: 'Puan miktari sifirdan buyuk olmali' };
    }

    // 1. Sadakat ayarlarini kontrol et — minimum harcama limiti
    const { data: settings } = await supabase
      .from('loyalty_settings')
      .select('min_redeem_points, is_active')
      .eq('company_id', companyId)
      .maybeSingle();

    if (!settings || !settings.is_active) {
      return { success: false, error: 'Sadakat programi aktif degil' };
    }

    if (points < settings.min_redeem_points) {
      return {
        success: false,
        error: `Minimum ${settings.min_redeem_points} puan harcanabilir`,
      };
    }

    // 2. Musteri bakiyesini kontrol et
    const { data: customerPoints } = await supabase
      .from('customer_loyalty_points')
      .select('*')
      .eq('company_id', companyId)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (!customerPoints || customerPoints.points < points) {
      return {
        success: false,
        error: `Yetersiz puan bakiyesi. Mevcut: ${customerPoints?.points || 0}`,
      };
    }

    // 3. Loyalty transaction olustur
    const { error: txError } = await supabase.from('loyalty_transactions').insert({
      company_id: companyId,
      customer_id: customerId,
      type: 'redeem',
      points: -points, // Negatif olarak kaydet
      description,
    });

    if (txError) {
      console.error('Puan harcama islem kaydi hatasi:', txError);
      return { success: false, error: txError.message };
    }

    // 4. Bakiyeyi guncelle
    const { data, error: updateError } = await supabase
      .from('customer_loyalty_points')
      .update({
        points: customerPoints.points - points,
        total_redeemed: (customerPoints.total_redeemed || 0) + points,
      })
      .eq('company_id', companyId)
      .eq('customer_id', customerId)
      .select()
      .single();

    if (updateError) {
      console.error('Puan bakiye guncelleme hatasi:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, data, error: null };
  } catch (err) {
    console.error('Puan harcama hatasi:', err);
    return { success: false, error: 'Beklenmeyen bir hata olustu' };
  }
};

/**
 * Musterinin puan gecmisini getir
 * @param {string} companyId
 * @param {string} customerId
 * @param {number} limit - Maksimum kayit sayisi (varsayilan 50)
 */
export const getPointsHistory = async (companyId, customerId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('company_id', companyId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Puan gecmisi okuma hatasi:', error);
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Puan gecmisi hatasi:', err);
    return { data: null, error: 'Beklenmeyen bir hata olustu' };
  }
};

/**
 * Sadakat puani siralamasi — en cok puana sahip musteriler
 * @param {string} companyId
 * @param {number} limit - Maksimum kayit sayisi (varsayilan 10)
 */
export const getLeaderboard = async (companyId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('customer_loyalty_points')
      .select('*, customers(name, phone, email)')
      .eq('company_id', companyId)
      .order('total_earned', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Sadakat siralamasi okuma hatasi:', error);
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Sadakat siralamasi hatasi:', err);
    return { data: null, error: 'Beklenmeyen bir hata olustu' };
  }
};
