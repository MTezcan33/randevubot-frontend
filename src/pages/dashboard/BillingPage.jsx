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

  // Her render'da güncel çevirilerle planları oluştur
  const getPlans = () => [
    {
      name: t('planFree'),
      price: 0,
      originalPrice: 0,
      duration: t('durationFree'),
      features: [
        t('feature1Expert'),
        t('feature247Assistant'),
        t('featureMultilingual'),
        t('featureReminder')
      ],
      planKey: "Free",
      stripeLink: null
    },
    {
      name: t('planStandard'),
      price: 19,
      originalPrice: 19,
      duration: t('durationMonthly'),
      features: [
        t('feature1Expert'),
        t('feature247Assistant'),
        t('featureMultilingual'),
        t('featureReminder')
      ],
      planKey: "Standard",
      stripeLink: "https://buy.stripe.com/test_bIeeV7b1Achn0nz9K7"
    },
    {
      name: t('planStandardPlus'),
      price: 39,
      originalPrice: 39,
      duration: t('durationMonthly'),
      features: [
        t('feature3Expert'),
        t('feature247Assistant'),
        t('featureMultilingual'),
        t('featureReminder')
      ],
      planKey: "Standard Plus",
      stripeLink: "https://buy.stripe.com/test_3cI7sF8Ts817fit4pNa"
    },
    {
      name: t('planPro'),
      price: 69,
      originalPrice: 69,
      duration: t('durationMonthly'),
      features: [
        t('feature6Expert'),
        t('feature247Assistant'),
        t('featureMultilingual'),
        t('featureReminder')
      ],
      planKey: "Pro",
      stripeLink: "https://buy.stripe.com/test_3cI28l8Ts5SZ4DPe0n"
    },
    {
      name: t('planProPlus'),
      price: 89,
      originalPrice: 89,
      duration: t('durationMonthly'),
      features: [
        t('feature9Expert'),
        t('feature247Assistant'),
        t('featureMultilingual'),
        t('featureReminder')
      ],
      planKey: "Pro Plus",
      stripeLink: "https://buy.stripe.com/test_aIgaFf0v80NP8U08wG"
    }
  ];

  const [discountedPlans, setDiscountedPlans] = useState([]);

  const handleApplyCoupon = async () => {
    if (!couponCode) {
      toast({ title: t('warning'), description: t('enterCouponWarning'), variant: "destructive" });
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
        toast({ title: t('error'), description: t('invalidCoupon'), variant: "destructive" });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      if (data.expiry_date && data.expiry_date < today) {
        toast({ title: t('error'), description: t('couponExpired'), variant: "destructive" });
        return;
      }

      if (data.plan_override) {
        const { error: updateError } = await supabase
          .from('companies')
          .update({ subscription_plan: data.plan_override })
          .eq('id', company.id);

        if (updateError) throw updateError;

        await refreshCompany();
        toast({ title: t('congratulations'), description: t('planUpgraded', { plan: data.plan_override }) });
      } else {
        const discountPercentage = data.discount_percentage;
        setDiscount(discountPercentage);

        const plans = getPlans();
        setDiscountedPlans(plans.map(p => ({
          ...p,
          price: p.originalPrice > 0 ? (p.originalPrice * (1 - discountPercentage / 100)).toFixed(2) : 0,
        })));

        toast({ title: t('success'), description: t('discountApplied', { discount: discountPercentage }) });
      }

    } catch (error) {
      toast({ title: t('error'), description: t('couponError'), variant: "destructive" });
    }
  };

  const handleUpgrade = (link) => {
    if (link) {
      window.location.href = link;
    } else {
      toast({ title: t('error'), description: t('noPaymentLink'), variant: "destructive" });
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('billingTitle')} | RandevuBot</title>
        <meta name="description" content={t('billingSubtitle')} />
      </Helmet>

      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{t('billingTitle')}</h1>
          <p className="text-sm text-slate-600">{t('billingSubtitle')}</p>
        </div>

        {/* Mevcut Plan */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">{t('currentPlan')}</h2>
              <p className="text-sm text-slate-600">{company?.subscription_plan || 'Free'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600">{t('expertCalendarLimit')}</p>
              <p className="text-xl font-bold text-blue-600">{company?.expert_limit || 1}</p>
            </div>
          </div>
        </div>

        {/* Kupon Kodu */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="text-base font-semibold mb-3 flex items-center">
            <Ticket className="w-4 h-4 mr-2" /> {t('couponCode')}
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t('enterCouponCode')}
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button onClick={handleApplyCoupon} size="sm">{t('apply')}</Button>
          </div>
        </div>

        {/* Planlar - 5 Sütun */}
        <div className="grid grid-cols-5 gap-3">
          {(discountedPlans.length > 0 ? discountedPlans : getPlans()).map((plan, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg shadow-sm border p-4 flex flex-col transition-all hover:shadow-md ${
                company?.subscription_plan === plan.planKey ? 'ring-2 ring-blue-500 shadow-md' : ''
              }`}
            >
              {/* Plan Başlığı */}
              <h3 className="text-base font-bold mb-1">{plan.name}</h3>

              {/* Fiyat */}
              <div className="mb-3">
                {discount > 0 && plan.originalPrice > 0 && (
                  <span className="text-sm line-through text-slate-400 mr-1">
                    ${plan.originalPrice}
                  </span>
                )}
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-slate-900">
                    {plan.price > 0 ? `$${plan.price}` : t('free')}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-xs text-slate-500 ml-1">{t('perMonth')}</span>
                  )}
                </div>
              </div>

              {/* Özellikler */}
              <ul className="space-y-1.5 mb-4 flex-grow">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start text-xs text-slate-700">
                    <Check className="w-3 h-3 text-green-500 mr-1.5 flex-shrink-0 mt-0.5" />
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Buton */}
              <Button
                className="w-full mt-auto"
                size="sm"
                variant={company?.subscription_plan === plan.planKey ? "outline" : "default"}
                disabled={company?.subscription_plan === plan.planKey || !plan.stripeLink}
                onClick={() => handleUpgrade(plan.stripeLink)}
              >
                {company?.subscription_plan === plan.planKey ? t('currentPlanBadge') : t('upgrade')}
              </Button>
            </div>
          ))}
        </div>

        {/* Fatura Geçmişi */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="text-base font-semibold mb-2">{t('invoiceHistory')}</h2>
          <p className="text-sm text-slate-600">{t('noInvoicesYet')}</p>
        </div>
      </div>
    </>
  );
};

export default BillingPage;