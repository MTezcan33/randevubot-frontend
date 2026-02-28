import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Ticket, Info } from 'lucide-react';
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
      name: t('planStarter'),
      price: 29,
      originalPrice: 29,
      duration: t('durationMonthly'),
      expertLimit: 1,
      features: [
        t('feature1Expert'),
        t('featureWhatsApp'),
        t('feature247Assistant'),
        t('featureMultilingual'),
        t('featureAccounting'),
      ],
      planKey: "Starter",
      stripeLink: "https://buy.stripe.com/test_fZudR3b1Achn7Q1bSfaIM04",
      highlighted: false,
    },
    {
      name: t('planSalon'),
      price: 49,
      originalPrice: 49,
      duration: t('durationMonthly'),
      expertLimit: 3,
      features: [
        t('feature3Expert'),
        t('featureWhatsApp'),
        t('feature247Assistant'),
        t('featureMultilingual'),
        t('featureAccounting'),
        t('featureFeedback'),
      ],
      planKey: "Salon",
      stripeLink: "https://buy.stripe.com/test_aFa5kx1r01CJb2d4pNaIM06",
      highlighted: true, // En popüler plan
    },
    {
      name: t('planPremium'),
      price: 79,
      originalPrice: 79,
      duration: t('durationMonthly'),
      expertLimit: 6,
      features: [
        t('feature6Expert'),
        t('featureWhatsApp'),
        t('feature247Assistant'),
        t('featureMultilingual'),
        t('featureAccounting'),
        t('featureFeedback'),
        t('featurePdf'),
      ],
      planKey: "Premium",
      stripeLink: "https://buy.stripe.com/test_00w5kx8Tsepvdalf4raIM07",
      highlighted: false,
    },
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
          price: (p.originalPrice * (1 - discountPercentage / 100)).toFixed(2),
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

  const activePlans = discountedPlans.length > 0 ? discountedPlans : getPlans();

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

        {/* Trial ve Şube İndirimi Bilgisi */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 space-y-0.5">
            <p>{t('trialInfoText')}</p>
            <p>{t('branchDiscountText')}</p>
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

        {/* Planlar - 3 Sütun */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activePlans.map((plan, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg shadow-sm border p-5 flex flex-col transition-all hover:shadow-md relative ${
                company?.subscription_plan === plan.planKey
                  ? 'ring-2 ring-blue-500 shadow-md'
                  : plan.highlighted
                  ? 'ring-2 ring-purple-500'
                  : ''
              }`}
            >
              {/* En Popüler rozeti */}
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    En Popüler
                  </span>
                </div>
              )}

              {/* Plan Başlığı */}
              <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
              <p className="text-xs text-slate-500 mb-3">{plan.expertLimit} uzman</p>

              {/* Fiyat */}
              <div className="mb-4">
                {discount > 0 && (
                  <span className="text-sm line-through text-slate-400 mr-1">
                    ${plan.originalPrice}
                  </span>
                )}
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-slate-900">${plan.price}</span>
                  <span className="text-sm text-slate-500 ml-1">{t('perMonth')}</span>
                </div>
              </div>

              {/* Özellikler */}
              <ul className="space-y-2 mb-5 flex-grow">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start text-sm text-slate-700">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Buton */}
              <Button
                className="w-full mt-auto"
                size="sm"
                variant={company?.subscription_plan === plan.planKey ? "outline" : plan.highlighted ? "default" : "outline"}
                disabled={company?.subscription_plan === plan.planKey}
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
