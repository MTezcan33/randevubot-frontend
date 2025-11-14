import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Ticket } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BillingPage = () => {
  const { company, refreshCompany } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);

  const initialPlans = [
    { 
        name: "Ücretsiz", 
        price: 0, 
        originalPrice: 0, 
        duration: "14 Gün Ücretsiz", 
        features: [
            "1 Uzman için randevu takvimi", 
            "7/24 çalışan randevu asistanı", 
            "Müşterinin dilinde cevap vererek randevu oluşturma",
            "Müşteri hatırlatma"
        ], 
        planKey: "Free", 
        stripeLink: null 
    },
    { 
        name: "Standard", 
        price: 19, 
        originalPrice: 19, 
        duration: "/ ay", 
        features: [
            "1 Uzman için randevu takvimi",
            "7/24 çalışan randevu asistanı",
            "Müşterinin dilinde cevap vererek randevu oluşturma",
            "Müşteri hatırlatma"
        ], 
        planKey: "Standard", 
        stripeLink: "https://buy.stripe.com/test_bJeeV7b1Achn0nz9K7" 
    },
    { 
        name: "Standard Plus", 
        price: 39, 
        originalPrice: 39, 
        duration: "/ ay", 
        features: [
            "3 Uzman için randevu takvimi",
            "7/24 çalışan randevu asistanı",
            "Müşterinin dilinde cevap vererek randevu oluşturma",
            "Müşteri hatırlatma"
        ], 
        planKey: "Standard Plus", 
        stripeLink: "https://buy.stripe.com/test_3cI7sF8Ts817fit4pNa" 
    },
    { 
        name: "Pro", 
        price: 69, 
        originalPrice: 69, 
        duration: "/ ay", 
        features: [
            "6 Uzman için randevu takvimi",
            "7/24 çalışan randevu asistanı",
            "Müşterinin dilinde cevap vererek randevu oluşturma",
            "Müşteri hatırlatma"
        ], 
        planKey: "Pro", 
        stripeLink: "https://buy.stripe.com/test_3cI28l8Ts5SZ4DPe0n" 
    },
    { 
        name: "Pro Plus", 
        price: 89, 
        originalPrice: 89, 
        duration: "/ ay", 
        features: [
            "9 Uzman için randevu takvimi",
            "7/24 çalışan randevu asistanı",
            "Müşterinin dilinde cevap vererek randevu oluşturma",
            "Müşteri hatırlatma"
        ], 
        planKey: "Pro Plus", 
        stripeLink: "https://buy.stripe.com/test_aIgaFf0v80NP8U08wG" 
    }
  ];
  
  const [dynamicPlans, setDynamicPlans] = useState(initialPlans);

  const handleApplyCoupon = async () => {
    if (!couponCode) {
      toast({ title: "Uyarı", description: "Lütfen bir kupon kodu girin.", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode)
        .eq('is_active', true)
        .single();
        
      if (error || !data) {
        toast({ title: "Hata", description: "Geçersiz veya süresi dolmuş kupon.", variant: "destructive" });
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      if (data.expiry_date && data.expiry_date < today) {
         toast({ title: "Hata", description: "Bu kuponun süresi dolmuş.", variant: "destructive" });
         return;
      }
      
      if (data.plan_override) {
        const { error: updateError } = await supabase
          .from('companies')
          .update({ subscription_plan: data.plan_override })
          .eq('id', company.id);
        
        if (updateError) throw updateError;
        
        await refreshCompany();
        toast({ title: "Tebrikler!", description: `Planınız ${data.plan_override} olarak güncellendi!` });
      } else {
        const discountPercentage = data.discount_percentage;
        setDiscount(discountPercentage);
        
        setDynamicPlans(initialPlans.map(p => ({
          ...p,
          price: p.originalPrice > 0 ? (p.originalPrice * (1 - discountPercentage / 100)).toFixed(2) : 0,
        })));
        
        toast({ title: "Başarılı!", description: `%${discountPercentage} indirim uygulandı.` });
      }

    } catch (error) {
      toast({ title: "Hata", description: "Kupon uygulanırken bir sorun oluştu.", variant: "destructive" });
    }
  };

  const handleUpgrade = (link) => {
    if (link) {
      window.location.href = link;
    } else {
      toast({ title: "Hata", description: "Bu plan için bir ödeme bağlantısı bulunamadı.", variant: "destructive" });
    }
  };


  return (
    <>
      <Helmet>
        <title>Abonelik | RandevuBot</title>
        <meta name="description" content="Abonelik ve fatura yönetimi" />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('billing')}</h1>
          <p className="text-slate-600">Plan yönetimi ve fatura geçmişi</p>
        </div>

        <div className="glass-effect rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Mevcut Plan</h2>
              <p className="text-slate-600">{company?.subscription_plan || 'Free'} Plan</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Uzman Takvim Limiti</p>
              <p className="text-2xl font-bold text-blue-600">{company?.expert_limit || 1}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-effect rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center"><Ticket className="w-5 h-5 mr-2" /> Kupon Kodu</h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Kupon kodunuzu girin" 
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200"
            />
            <Button onClick={handleApplyCoupon}>Uygula</Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dynamicPlans.map((plan, index) => (
            <div key={index} className={`glass-effect rounded-2xl p-6 flex flex-col ${company?.subscription_plan === plan.planKey ? 'ring-2 ring-blue-500' : ''}`}>
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-4">
                {discount > 0 && plan.originalPrice > 0 && (
                   <span className="text-lg line-through text-slate-500 mr-2">${plan.originalPrice}</span>
                )}
                <span className="text-3xl font-bold">{plan.price > 0 ? `$${plan.price}` : "Ücretsiz"}</span>
                {plan.price > 0 && <span className="text-slate-600">{plan.duration}</span>}
              </div>
              <ul className="space-y-2 mb-6 flex-grow">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full mt-auto" 
                variant={company?.subscription_plan === plan.planKey ? "outline" : "default"}
                disabled={company?.subscription_plan === plan.planKey || !plan.stripeLink}
                onClick={() => handleUpgrade(plan.stripeLink)}
              >
                {company?.subscription_plan === plan.planKey ? "Mevcut Plan" : "Yükselt"}
              </Button>
            </div>
          ))}
        </div>

        <div className="glass-effect rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Fatura Geçmişi</h2>
          <p className="text-slate-600">Henüz fatura bulunmuyor</p>
        </div>
      </div>
    </>
  );
};

export default BillingPage;