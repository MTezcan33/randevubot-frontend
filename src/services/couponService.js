import { supabase } from '../lib/supabase';

// Plan hiyerarsisi — min_plan kontrolu icin
const PLAN_HIERARCHY = {
  starter: 1,
  salon: 2,
  premium: 3,
};

/**
 * Kupon dogrulama
 * @param {string} code - Kupon kodu
 * @param {string} companyId - Sirket ID
 * @param {string} currentPlan - Mevcut plan (starter, salon, premium)
 * @returns {{ valid: boolean, coupon: object|null, error: string|null, discount: number|null }}
 */
export const validateCoupon = async (code, companyId, currentPlan) => {
  try {
    // 1. Kuponu bul
    const { data: coupon, error: fetchError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .single();

    if (fetchError || !coupon) {
      return { valid: false, coupon: null, error: 'Gecersiz kupon kodu', discount: null };
    }

    // 2. Aktif mi kontrol et
    if (!coupon.is_active) {
      return { valid: false, coupon: null, error: 'Bu kupon artik aktif degil', discount: null };
    }

    // 3. Suresi gecmis mi kontrol et
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return { valid: false, coupon: null, error: 'Bu kupon henuz gecerli degil', discount: null };
    }
    if (coupon.expiry_date && new Date(coupon.expiry_date) < now) {
      return { valid: false, coupon: null, error: 'Bu kuponun suresi dolmus', discount: null };
    }

    // 4. max_uses asilmis mi kontrol et
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      return { valid: false, coupon: null, error: 'Bu kupon maksimum kullanim sayisina ulasmis', discount: null };
    }

    // 5. Bu sirket daha once kullanmis mi (coupon_usage) kontrol et
    const { data: existingUsage, error: usageError } = await supabase
      .from('coupon_usage')
      .select('id')
      .eq('coupon_id', coupon.id)
      .eq('company_id', companyId);

    if (usageError) {
      console.error('Kupon kullanim kontrolu hatasi:', usageError);
      return { valid: false, coupon: null, error: 'Kupon dogrulanamadi', discount: null };
    }

    if (existingUsage && existingUsage.length >= (coupon.max_uses_per_company || 1)) {
      return { valid: false, coupon: null, error: 'Bu kuponu zaten kullandiniz', discount: null };
    }

    // 6. min_plan uygun mu kontrol et
    if (coupon.min_plan) {
      const planLevel = PLAN_HIERARCHY[currentPlan?.toLowerCase()] || 0;
      const minLevel = PLAN_HIERARCHY[coupon.min_plan.toLowerCase()] || 0;
      if (planLevel < minLevel) {
        return {
          valid: false,
          coupon: null,
          error: `Bu kupon en az "${coupon.min_plan}" plani gerektirir`,
          discount: null,
        };
      }
    }

    // 7. applicable_plans uygun mu kontrol et
    if (coupon.applicable_plans && coupon.applicable_plans.length > 0) {
      if (!coupon.applicable_plans.includes(currentPlan?.toLowerCase())) {
        return {
          valid: false,
          coupon: null,
          error: `Bu kupon mevcut planiniz icin gecerli degil`,
          discount: null,
        };
      }
    }

    // 8. Indirim miktarini hesapla
    let discount = 0;
    if (coupon.coupon_type === 'percentage') {
      discount = coupon.discount_percentage || 0;
    } else if (coupon.coupon_type === 'fixed') {
      discount = coupon.discount_percentage || 0; // fixed amount olarak kullanilir
    } else if (coupon.coupon_type === 'plan_override') {
      discount = 100; // Plan degisikligi — ozel islem
    }

    return { valid: true, coupon, error: null, discount };
  } catch (err) {
    console.error('Kupon dogrulama hatasi:', err);
    return { valid: false, coupon: null, error: 'Beklenmeyen bir hata olustu', discount: null };
  }
};

/**
 * Kuponu uygula — usage kaydi olustur ve current_uses artir
 * @param {string} couponId - Kupon UUID
 * @param {string} companyId - Sirket UUID
 * @param {number} discountApplied - Uygulanan indirim miktari
 */
export const applyCoupon = async (couponId, companyId, discountApplied) => {
  try {
    // coupon_usage'a kayit ekle
    const { error: usageError } = await supabase.from('coupon_usage').insert({
      coupon_id: couponId,
      company_id: companyId,
      discount_applied: discountApplied,
    });

    if (usageError) {
      console.error('Kupon kullanim kaydi hatasi:', usageError);
      return { success: false, error: usageError.message };
    }

    // coupons.current_uses++ (rpc veya manual increment)
    const { data: coupon, error: fetchErr } = await supabase
      .from('coupons')
      .select('current_uses')
      .eq('id', couponId)
      .single();

    if (fetchErr) {
      console.error('Kupon okuma hatasi:', fetchErr);
      return { success: false, error: fetchErr.message };
    }

    const { error: updateErr } = await supabase
      .from('coupons')
      .update({ current_uses: (coupon.current_uses || 0) + 1 })
      .eq('id', couponId);

    if (updateErr) {
      console.error('Kupon guncelleme hatasi:', updateErr);
      return { success: false, error: updateErr.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Kupon uygulama hatasi:', err);
    return { success: false, error: 'Beklenmeyen bir hata olustu' };
  }
};

// =========================================
// Referral Code Fonksiyonlari
// =========================================

/**
 * Sirket icin benzersiz referral kodu olustur
 * @param {string} companyId
 */
export const generateReferralCode = async (companyId) => {
  try {
    // Mevcut kodu kontrol et
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      return { data: existing, error: null };
    }

    // Benzersiz kod olustur (REF-XXXXX)
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `REF-${randomPart}`;

    const { data, error } = await supabase
      .from('referral_codes')
      .insert({
        company_id: companyId,
        code,
        reward_type: 'percentage',
        reward_amount: 10,
      })
      .select()
      .single();

    if (error) {
      console.error('Referral kodu olusturma hatasi:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Referral kodu hatasi:', err);
    return { data: null, error: 'Beklenmeyen bir hata olustu' };
  }
};

/**
 * Sirketin referral kodunu getir
 * @param {string} companyId
 */
export const getReferralCode = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Referral kodu okuma hatasi:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Referral kodu hatasi:', err);
    return { data: null, error: 'Beklenmeyen bir hata olustu' };
  }
};

/**
 * Referral kodunu uygula — yeni sirket kaydinda kullanilir
 * @param {string} code - Referral kodu
 * @param {string} newCompanyId - Yeni kayit olan sirketin ID'si
 */
export const applyReferralCode = async (code, newCompanyId) => {
  try {
    // Kodu bul
    const { data: referral, error: fetchErr } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .single();

    if (fetchErr || !referral) {
      return { success: false, error: 'Gecersiz referral kodu' };
    }

    // Kendi kendine referans kontrolu
    if (referral.company_id === newCompanyId) {
      return { success: false, error: 'Kendi referral kodunuzu kullanamazsiniz' };
    }

    // referral_count artir
    const { error: updateErr } = await supabase
      .from('referral_codes')
      .update({ referral_count: referral.referral_count + 1 })
      .eq('id', referral.id);

    if (updateErr) {
      console.error('Referral sayac guncelleme hatasi:', updateErr);
      return { success: false, error: updateErr.message };
    }

    return {
      success: true,
      error: null,
      reward_type: referral.reward_type,
      reward_amount: referral.reward_amount,
      referrer_company_id: referral.company_id,
    };
  } catch (err) {
    console.error('Referral uygulama hatasi:', err);
    return { success: false, error: 'Beklenmeyen bir hata olustu' };
  }
};

/**
 * Sirketin referral istatistiklerini getir
 * @param {string} companyId
 */
export const getReferralStats = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Referral istatistik hatasi:', error);
      return { data: null, error: error.message };
    }

    return {
      data: data
        ? {
            code: data.code,
            referral_count: data.referral_count,
            reward_type: data.reward_type,
            reward_amount: data.reward_amount,
            is_active: data.is_active,
            created_at: data.created_at,
          }
        : null,
      error: null,
    };
  } catch (err) {
    console.error('Referral istatistik hatasi:', err);
    return { data: null, error: 'Beklenmeyen bir hata olustu' };
  }
};
