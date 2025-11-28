import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { 
    Building2, 
    Clock, 
    Users, 
    Scissors, 
    Sparkles, 
    Loader2, 
    ArrowRight, 
    Check,
    MessageCircle,
    Rocket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { triggerCreateInstanceWebhook } from '@/services/whatsappService';

// Sadeleştirilmiş adımlar - sadece welcome ve company
const steps = [
    { id: 1, name: 'welcome', icon: Sparkles },
    { id: 2, name: 'company', icon: Building2 },
];

// --- Feature kartları için data ---
const getFeatures = (t) => [
    {
        icon: Clock,
        title: t('onboarding.features.workingHours', 'Çalışma Saatleri'),
        description: t('onboarding.features.workingHoursDesc', 'Ayarlar menüsünden düzenleyebilirsiniz')
    },
    {
        icon: Users,
        title: t('onboarding.features.staff', 'Personel Yönetimi'),
        description: t('onboarding.features.staffDesc', 'Uzmanlarınızı sonradan ekleyebilirsiniz')
    },
    {
        icon: Scissors,
        title: t('onboarding.features.services', 'Hizmetler'),
        description: t('onboarding.features.servicesDesc', 'Hizmetlerinizi panel üzerinden tanımlayın')
    },
    {
        icon: MessageCircle,
        title: t('onboarding.features.whatsapp', 'WhatsApp'),
        description: t('onboarding.features.whatsappDesc', 'QR kod ile bağlantı kurun')
    }
];

// --- Welcome Step Component ---
const WelcomeStep = ({ companyName, onNext, t }) => {
    const features = getFeatures(t);
    
    return (
        <div className="text-center w-full max-w-2xl mx-auto">
            {/* Animated Icon */}
            <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 3 }}
                transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
                className="mb-8"
            >
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-lg shadow-orange-200/50">
                    <Sparkles className="w-12 h-12 text-white" />
                </div>
            </motion.div>

            {/* Title */}
            <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4"
            >
                {t('onboarding.welcomeTitle', 'RandevuBot\'a Hoş Geldiniz!')}
            </motion.h2>

            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-slate-600 mb-8 max-w-md mx-auto"
            >
                {t('onboarding.welcomeDescription', 'WhatsApp üzerinden AI destekli randevu sisteminiz hazır. Hızlıca kurulumu tamamlayalım.')}
            </motion.p>

            {/* Feature Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 gap-4 mb-8"
            >
                {features.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + index * 0.1 }}
                            className="bg-slate-50 rounded-xl p-4 text-left border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-200 cursor-default"
                        >
                            <IconComponent className="w-6 h-6 text-blue-600 mb-2" />
                            <h3 className="font-semibold text-slate-800 text-sm">{feature.title}</h3>
                            <p className="text-xs text-slate-500 mt-1">{feature.description}</p>
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* CTA Button */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
            >
                <Button
                    size="lg"
                    onClick={onNext}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/50 transition-all duration-200"
                >
                    {t('onboarding.startSetup', 'Kuruluma Başla')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
            </motion.div>
        </div>
    );
};

// --- Company Info Step Component ---
const CompanyInfoStep = ({ company, onSave, loading, t }) => {
    const [name, setName] = useState(company?.name || '');

    const handleSave = () => {
        if (!name.trim()) {
            return;
        }
        onSave({ name: name.trim() });
    };

    return (
        <div className="w-full max-w-lg mx-auto">
            {/* Icon */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mb-8 text-center"
            >
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200/50">
                    <Building2 className="w-10 h-10 text-white" />
                </div>
            </motion.div>

            {/* Title */}
            <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2 text-center"
            >
                {t('onboarding.companyNameTitle', 'İşletmenizin Adı')}
            </motion.h2>

            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-slate-600 mb-8 text-center"
            >
                {t('onboarding.companyNameDescription', 'Müşterileriniz sizi bu isimle görecek')}
            </motion.p>

            {/* Input */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-8"
            >
                <Input
                    type="text"
                    placeholder={t('onboarding.companyNamePlaceholder', 'Örn: MT Güzellik Salonu')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-6 text-lg border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && name.trim()) {
                            handleSave();
                        }
                    }}
                />
            </motion.div>

            {/* Info Box - Sonra yapılacak ayarlar */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 mb-8 border border-blue-100"
            >
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Rocket className="w-5 h-5" />
                    {t('onboarding.laterSettingsTitle', 'Sonra Tamamlayacağınız Ayarlar:')}
                </h4>
                <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {t('onboarding.laterItem1', 'Çalışma saatleri ve tatil günleri')}
                    </li>
                    <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {t('onboarding.laterItem2', 'Personel ve uzman bilgileri')}
                    </li>
                    <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {t('onboarding.laterItem3', 'Sunduğunuz hizmetler ve fiyatlar')}
                    </li>
                    <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {t('onboarding.laterItem4', 'WhatsApp bağlantısı (QR kod)')}
                    </li>
                </ul>
            </motion.div>

            {/* Save Button */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
            >
                <Button
                    size="lg"
                    onClick={handleSave}
                    disabled={loading || !name.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg rounded-xl shadow-lg shadow-emerald-200/50 hover:shadow-xl hover:shadow-emerald-300/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                            {t('loading', 'Yükleniyor...')}
                        </>
                    ) : (
                        <>
                            {t('onboarding.completeSetup', 'Kurulumu Tamamla')}
                            <Check className="ml-2 w-5 h-5" />
                        </>
                    )}
                </Button>
            </motion.div>
        </div>
    );
};


// --- Main OnboardingPage Component ---
const OnboardingPage = () => {
    const { company, refreshCompany } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        if (company) {
            setPageLoading(false);
            if (company.onboarding_completed) {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [company, navigate]);

    const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
    const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleSkip = () => {
        navigate('/dashboard', { replace: true });
    };

    // Instance name oluşturma fonksiyonu
    const generateInstanceName = (companyName, sectorCode) => {
        if (!companyName) return null;
        
        // 1. Boşlukları _ ile değiştir
        let instanceName = companyName.trim().replace(/\s+/g, '_');
        
        // 2. İngilizce dışı karakterleri 0 ile değiştir
        // Sadece a-z, A-Z, 0-9 ve _ karakterlerine izin ver
        instanceName = instanceName.replace(/[^a-zA-Z0-9_]/g, '0');
        
        // 3. Sector code varsa ekle
        if (sectorCode) {
            instanceName = `${instanceName}_${sectorCode}`;
        }
        
        return instanceName;
    };

    // Firma bilgisini kaydet ve onboarding'i tamamla
    const saveCompanyAndComplete = async (data) => {
        setLoading(true);
        try {
            // Instance name oluştur
            const instanceName = generateInstanceName(data.name, company.sector_code);
            
            // 1. Firma bilgisini güncelle
            const { error: updateError } = await supabase
                .from('companies')
                .update({ 
                    name: data.name,
                    instance_name: instanceName,
                    onboarding_completed: true
                })
                .eq('id', company.id);

            if (updateError) throw updateError;

            // 2. Company verisini yenile
            const refreshedCompany = await refreshCompany();

            // 3. WhatsApp instance oluştur (opsiyonel - hata olursa devam et)
            try {
                if (refreshedCompany && refreshedCompany.whatsapp_number) {
                    await triggerCreateInstanceWebhook(refreshedCompany);
                    toast({ 
                        title: t('success', 'Başarılı'), 
                        description: t('onboarding.whatsappRequestSent', 'WhatsApp bağlantı isteğiniz gönderildi.') 
                    });
                }
            } catch (whatsappError) {
                console.warn('WhatsApp instance creation skipped:', whatsappError);
            }

            // 4. Başarı mesajı
            toast({ 
                title: t('onboarding.setupCompleteTitle', 'Kurulum Tamamlandı!'), 
                description: t('onboarding.redirectingToDashboard', 'Dashboard\'a yönlendiriliyorsunuz...') 
            });

            // 5. Dashboard'a yönlendir - replace: true ile beyaz ekran sorununu çöz
            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 500);

        } catch (error) {
            console.error('Onboarding error:', error);
            toast({ 
                title: t('error', 'Hata'), 
                description: error.message || t('onboarding.setupError', 'Kurulum sırasında bir hata oluştu'), 
                variant: 'destructive' 
            });
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return <WelcomeStep companyName={company?.name} onNext={handleNext} t={t} />;
            case 2:
                return <CompanyInfoStep company={company} onSave={saveCompanyAndComplete} loading={loading} t={t} />;
            default:
                return null;
        }
    };

    // Loading state
    if (pageLoading || !company) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600">{t('loading', 'Yükleniyor...')}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{t('onboarding.title', 'Hoş Geldiniz')} - RandevuBot</title>
            </Helmet>

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col">
                {/* Progress Bar */}
                <div className="w-full bg-white/50 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-10">
                    <div className="max-w-4xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            {/* Steps Indicator */}
                            <div className="flex items-center gap-3">
                                {steps.map((step, index) => {
                                    const StepIcon = step.icon;
                                    return (
                                        <React.Fragment key={step.id}>
                                            <div
                                                className={`
                                                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                                                    transition-all duration-300 shadow-sm
                                                    ${currentStep > step.id
                                                        ? 'bg-emerald-500 text-white'
                                                        : currentStep === step.id
                                                            ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                                                            : 'bg-white text-slate-400 border-2 border-slate-200'
                                                    }
                                                `}
                                            >
                                                {currentStep > step.id ? (
                                                    <Check className="w-5 h-5" />
                                                ) : (
                                                    <StepIcon className="w-5 h-5" />
                                                )}
                                            </div>
                                            {index < steps.length - 1 && (
                                                <div
                                                    className={`w-12 h-1 rounded-full transition-all duration-300 ${
                                                        currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-200'
                                                    }`}
                                                />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            {/* Skip Button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSkip}
                                className="text-slate-500 hover:text-slate-700"
                            >
                                {t('skip', 'Atla')}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
                    <div className="w-full max-w-2xl">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4 }}
                                className="bg-white rounded-3xl shadow-xl shadow-blue-100/50 p-8 sm:p-12 border border-slate-100"
                            >
                                {renderStepContent()}
                            </motion.div>
                        </AnimatePresence>

                        {/* Back Button - sadece 2. adımda göster */}
                        {currentStep > 1 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-6 text-center"
                            >
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    disabled={loading}
                                    className="text-slate-500 hover:text-slate-700"
                                >
                                    {t('back', 'Geri')}
                                </Button>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center py-6 text-sm text-slate-500">
                    {t('onboarding.footer', 'Tüm ayarları daha sonra kullanıcı panelinizden düzenleyebilirsiniz.')}
                </div>
            </div>
        </>
    );
};

export default OnboardingPage;