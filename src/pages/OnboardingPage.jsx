
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Building, Clock, Users, Scissors, Calendar, Sparkles, Loader2, Save, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { triggerCreateInstanceWebhook } from '@/services/whatsappService';

// Define steps with components
const steps = [
    { id: 1, name: 'welcome', icon: Sparkles },
    { id: 2, name: 'company', icon: Building },
    { id: 3, name: 'workingHours', icon: Clock },
    { id: 4, name: 'staff', icon: Users },
    { id: 5, name: 'services', icon: Scissors },
    { id: 6, name: 'finish', icon: Calendar },
];

// --- Sub-components for each step ---

const WelcomeStep = ({ companyName, onNext }) => {
    const { t } = useTranslation();
    return (
        <div className="text-center">
            <Sparkles className="w-16 h-16 mx-auto text-yellow-400 mb-6" />
            <h2 className="text-3xl font-bold text-slate-800">{t('welcomeOnboard', { companyName })}</h2>
            <p className="text-slate-600 mt-4 max-w-lg mx-auto">{t('onboardIntro')}</p>
            <Button size="lg" className="mt-8" onClick={onNext}>{t('startSetup')} <ArrowRight className="ml-2 w-5 h-5" /></Button>
        </div>
    );
};

const CompanyInfoStep = ({ company, onUpdate, onSave, loading }) => {
    const { t } = useTranslation();
    const [name, setName] = useState(company?.name || '');
    const [address, setAddress] = useState(company?.address || '');

    const handleSave = () => {
        onSave({ name, address });
    };

    return (
        <div className="w-full max-w-lg mx-auto">
            <h2 className="text-2xl font-bold mb-6">{t('companyInfo')}</h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="companyName" className="font-medium text-slate-700">{t('companyName')}</label>
                    <Input id="companyName" value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
                </div>
                <div>
                    <label htmlFor="companyAddress" className="font-medium text-slate-700">{t('address')}</label>
                    <Input id="companyAddress" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-2" />
                </div>
            </div>
            <Button className="w-full mt-8" onClick={handleSave} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 w-4 h-4" /> {t('saveAndContinue')}</>}
            </Button>
        </div>
    );
};

const WorkingHoursStep = ({ workingHours, companyId, onSave, loading }) => {
    const { t } = useTranslation();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const [hours, setHours] = useState(workingHours);

    useEffect(() => {
        if (workingHours.length === 0) {
            const defaultHours = days.map(day => ({
                day,
                is_open: day !== 'Sunday',
                start_time: '09:00',
                end_time: '18:00',
                company_id: companyId
            }));
            setHours(defaultHours);
        } else {
            const existingDays = workingHours.map(h => h.day);
            const missingDays = days.filter(d => !existingDays.includes(d));
            const newHours = missingDays.map(day => ({
                day,
                is_open: day !== 'Sunday',
                start_time: '09:00',
                end_time: '18:00',
                company_id: companyId
            }));
            setHours([...workingHours, ...newHours].sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day)));
        }
    }, [workingHours, companyId]);

    const handleTimeChange = (day, field, value) => {
        setHours(currentHours =>
            currentHours.map(h => (h.day === day ? { ...h, [field]: value } : h))
        );
    };

    const toggleDay = (day) => {
        setHours(currentHours =>
            currentHours.map(h => (h.day === day ? { ...h, is_open: !h.is_open } : h))
        );
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">{t('workingHoursTitle')}</h2>
            <div className="space-y-3">
                {hours.map(({ day, is_open, start_time, end_time }) => (
                    <div key={day} className={`p-4 rounded-lg flex items-center justify-between transition-colors ${is_open ? 'bg-white' : 'bg-slate-100'}`}>
                        <div className="flex items-center">
                            <input type="checkbox" checked={is_open} onChange={() => toggleDay(day)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className={`ml-4 font-medium ${is_open ? 'text-slate-800' : 'text-slate-500'}`}>{t(`days.${day.toLowerCase()}`)}</span>
                        </div>
                        <div className={`flex items-center gap-2 ${!is_open && 'opacity-50'}`}>
                            <Input type="time" value={start_time || '09:00'} onChange={e => handleTimeChange(day, 'start_time', e.target.value)} disabled={!is_open} className="w-32" />
                            <span>-</span>
                            <Input type="time" value={end_time || '18:00'} onChange={e => handleTimeChange(day, 'end_time', e.target.value)} disabled={!is_open} className="w-32" />
                        </div>
                    </div>
                ))}
            </div>
            <Button className="w-full mt-8" onClick={() => onSave(hours)} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 w-4 h-4" /> {t('saveAndContinue')}</>}
            </Button>
        </div>
    );
};

const StaffStep = ({ staff, companyId, onSave, loading }) => {
    const { t } = useTranslation();
    const [members, setMembers] = useState(staff.length > 0 ? staff : [{ name: '', email: '', role: 'Uzman', color: '#4BADE8' }]);

    const handleMemberChange = (index, field, value) => {
        const newMembers = [...members];
        newMembers[index][field] = value;
        setMembers(newMembers);
    };

    const addMember = () => {
        setMembers([...members, { name: '', email: '', role: 'Uzman', color: '#4BADE8' }]);
    };
    
    const removeMember = (index) => {
        const newMembers = members.filter((_, i) => i !== index);
        setMembers(newMembers);
    }
    
    const handleSave = () => {
        const preparedStaff = members.map(m => ({ ...m, company_id: companyId }));
        onSave(preparedStaff);
    };

    return (
        <div className="w-full max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">{t('manageStaffTitle')}</h2>
            <p className="text-slate-600 mb-6">{t('addStaffHelp')}</p>
            <div className="space-y-4">
                {members.map((member, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg flex items-center gap-4">
                        <Input type="color" value={member.color || '#4BADE8'} onChange={e => handleMemberChange(index, 'color', e.target.value)} className="w-14 h-12 p-1" />
                        <Input placeholder={t('fullName')} value={member.name} onChange={e => handleMemberChange(index, 'name', e.target.value)} />
                        <Input placeholder={t('emailAddress')} value={member.email} onChange={e => handleMemberChange(index, 'email', e.target.value)} />
                         <Button variant="ghost" size="icon" onClick={() => removeMember(index)} className={members.length === 1 ? 'invisible' : ''}>
                            <Users className="w-4 h-4 text-red-500" />
                        </Button>
                    </div>
                ))}
            </div>
            <Button variant="outline" className="mt-4" onClick={addMember}>{t('addStaff')}</Button>
            <Button className="w-full mt-8" onClick={handleSave} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 w-4 h-4" /> {t('saveAndContinue')}</>}
            </Button>
        </div>
    );
};

const ServicesStep = ({ services, companyId, staff, onSave, loading }) => {
    const { t } = useTranslation();
    const [serviceList, setServiceList] = useState(services.length > 0 ? services : [{ description: '', duration: 30, price: 0, expert_id: null }]);
    
    const experts = staff.filter(s => s.role === 'Uzman');

    const handleServiceChange = (index, field, value) => {
        const newServices = [...serviceList];
        newServices[index][field] = value;
        setServiceList(newServices);
    };

    const addService = () => {
        setServiceList([...serviceList, { description: '', duration: 30, price: 0, expert_id: null }]);
    };
    
    const removeService = (index) => {
        const newServices = serviceList.filter((_, i) => i !== index);
        setServiceList(newServices);
    }

    const handleSave = () => {
        const preparedServices = serviceList.map(s => ({ ...s, company_id: companyId, expert_id: s.expert_id === 'all' ? null : s.expert_id }));
        onSave(preparedServices);
    };

    return (
        <div className="w-full max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">{t('servicesTitle')}</h2>
            <p className="text-slate-600 mb-6">{t('addServicesHelp')}</p>
            <div className="space-y-4">
                {serviceList.map((service, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <Input placeholder={t('serviceName')} value={service.description} onChange={e => handleServiceChange(index, 'description', e.target.value)} className="md:col-span-2" />
                        <Input type="number" placeholder={t('durationMinutes')} value={service.duration} onChange={e => handleServiceChange(index, 'duration', parseInt(e.target.value, 10))} />
                        <Input type="number" placeholder={t('price')} value={service.price} onChange={e => handleServiceChange(index, 'price', parseFloat(e.target.value))} />
                         {experts.length > 0 && (
                            <select value={service.expert_id || 'all'} onChange={e => handleServiceChange(index, 'expert_id', e.target.value)} className="md:col-span-3 rounded-md border-gray-300">
                                <option value="all">{t('allExperts')}</option>
                                {experts.map(expert => <option key={expert.id} value={expert.id}>{expert.name}</option>)}
                            </select>
                        )}
                        <div className="md:col-span-1 flex justify-end">
                             <Button variant="ghost" size="icon" onClick={() => removeService(index)} className={serviceList.length === 1 ? 'invisible' : ''}>
                                <Scissors className="w-4 h-4 text-red-500" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
            <Button variant="outline" className="mt-4" onClick={addService}>{t('addService')}</Button>
            <Button className="w-full mt-8" onClick={handleSave} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 w-4 h-4" /> {t('saveAndContinue')}</>}
            </Button>
        </div>
    );
};

const FinishStep = ({ onFinish, loading }) => {
    const { t } = useTranslation();
    return (
        <div className="text-center">
            <Calendar className="w-16 h-16 mx-auto text-blue-500 mb-6" />
            <h2 className="text-3xl font-bold text-slate-800">{t('setupCompleteTitle')}</h2>
            <p className="text-slate-600 mt-4 max-w-lg mx-auto">{t('setupCompleteBody')}</p>
            <Button size="lg" className="mt-8" onClick={onFinish} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <>{t('goToDashboard')} <ArrowRight className="ml-2 w-5 h-5" /></>}
            </Button>
        </div>
    );
};


const OnboardingPage = () => {
    const { company, staff, services, workingHours, refreshCompany } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        if(company) {
            setPageLoading(false);
            if(company.onboarding_completed) {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [company, navigate]);

    const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
    const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));
    
    const saveCompanyInfo = async (data) => {
        setLoading(true);
        const { error } = await supabase.from('companies').update(data).eq('id', company.id);
        if (error) {
            toast({ title: t('error'), description: error.message, variant: 'destructive' });
        } else {
            await refreshCompany();
            toast({ title: t('success'), description: t('companyInfoUpdated') });
            handleNext();
        }
        setLoading(false);
    };

    const saveWorkingHours = async (data) => {
        setLoading(true);
        // Delete existing hours first to handle additions/removals correctly
        await supabase.from('company_working_hours').delete().eq('company_id', company.id);

        const upsertData = data.map(d => ({ ...d, company_id: company.id }));

        const { error } = await supabase.from('company_working_hours').upsert(upsertData, { onConflict: ['company_id', 'day'] });

        if (error) {
            toast({ title: t('error'), description: error.message, variant: 'destructive' });
        } else {
            await refreshCompany();
            toast({ title: t('success'), description: t('workingHoursUpdated') });
            handleNext();
        }
        setLoading(false);
    };
    
    const saveStaff = async (data) => {
        setLoading(true);
        
        // Let's get existing staff to compare
        const { data: existingStaff, error: fetchError } = await supabase.from('company_users').select('id').eq('company_id', company.id);
        if(fetchError){
            toast({ title: t('error'), description: fetchError.message, variant: 'destructive' });
            setLoading(false);
            return;
        }

        const existingIds = existingStaff.map(s => s.id);
        const newIds = data.map(s => s.id).filter(Boolean);
        const idsToDelete = existingIds.filter(id => !newIds.includes(id));
        
        // Delete removed staff
        if (idsToDelete.length > 0) {
            await supabase.from('company_users').delete().in('id', idsToDelete);
        }

        // Upsert current staff
        const { error } = await supabase.from('company_users').upsert(data, { onConflict: 'id' });
        if (error) {
            toast({ title: t('error'), description: error.message, variant: 'destructive' });
        } else {
            await refreshCompany();
            toast({ title: t('success'), description: t('staffUpdated') });
            handleNext();
        }
        setLoading(false);
    };
    
    const saveServices = async (data) => {
        setLoading(true);
        // Let's get existing services to compare
        const { data: existingServices, error: fetchError } = await supabase.from('company_services').select('id').eq('company_id', company.id);
        if(fetchError){
            toast({ title: t('error'), description: fetchError.message, variant: 'destructive' });
            setLoading(false);
            return;
        }
        
        const existingIds = existingServices.map(s => s.id);
        const newIds = data.map(s => s.id).filter(Boolean);
        const idsToDelete = existingIds.filter(id => !newIds.includes(id));

        // Delete removed services
        if (idsToDelete.length > 0) {
            await supabase.from('company_services').delete().in('id', idsToDelete);
        }

        // Upsert current services
        const { error } = await supabase.from('company_services').upsert(data, { onConflict: 'id' });
        if (error) {
            toast({ title: t('error'), description: error.message, variant: 'destructive' });
        } else {
            await refreshCompany();
            toast({ title: t('success'), description: t('servicesUpdated') });
            handleNext();
        }
        setLoading(false);
    };
    
    const completeOnboarding = async () => {
        setLoading(true);
        try {
            // Mark onboarding as completed
            const { error: updateError } = await supabase
                .from('companies')
                .update({ onboarding_completed: true })
                .eq('id', company.id);

            if (updateError) throw updateError;
            
            // Refresh company data to get the latest state including whatsapp_number
            const refreshedCompany = await refreshCompany();

            // Trigger WhatsApp instance creation if number exists
            if (refreshedCompany && refreshedCompany.whatsapp_number) {
                 await triggerCreateInstanceWebhook(refreshedCompany);
                 toast({ title: t('success'), description: "WhatsApp bağlantı isteğiniz gönderildi." });
            }

            toast({ title: t('setupCompleteTitle'), description: t('redirectingToDashboard') });
            navigate('/dashboard', { replace: true });
        } catch (error) {
            toast({ title: t('error'), description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };


    const renderStepContent = () => {
        switch (currentStep) {
            case 1: return <WelcomeStep companyName={company?.name} onNext={handleNext} />;
            case 2: return <CompanyInfoStep company={company} onSave={saveCompanyInfo} loading={loading} />;
            case 3: return <WorkingHoursStep workingHours={workingHours} companyId={company?.id} onSave={saveWorkingHours} loading={loading} />;
            case 4: return <StaffStep staff={staff} companyId={company?.id} onSave={saveStaff} loading={loading} />;
            case 5: return <ServicesStep services={services} companyId={company?.id} staff={staff} onSave={saveServices} loading={loading} />;
            case 6: return <FinishStep onFinish={completeOnboarding} loading={loading} />;
            default: return null;
        }
    };

    if (pageLoading || !company) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        );
    }
    
    return (
        <>
            <Helmet>
                <title>{t('onboardingTitle')} - RandevuBot</title>
            </Helmet>
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-4xl">
                    {/* Progress Bar */}
                    <div className="mb-8 px-4">
                         <div className="flex items-center justify-between">
                            {steps.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className="flex flex-col items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${currentStep >= step.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                                            <step.icon className="w-5 h-5" />
                                        </div>
                                        <p className={`text-xs mt-2 font-medium ${currentStep >= step.id ? 'text-blue-600' : 'text-slate-500'}`}>{t(`onboardSteps.${step.name}`)}</p>
                                    </div>
                                    {index < steps.length - 1 && <div className={`flex-1 h-1 mx-2 rounded-full ${currentStep > step.id ? 'bg-blue-600' : 'bg-slate-200'}`}></div>}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    
                    {/* Step Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white rounded-2xl shadow-lg p-8 md:p-12 min-h-[400px] flex items-center justify-center"
                        >
                            {renderStepContent()}
                        </motion.div>
                    </AnimatePresence>
                    
                    {/* Navigation */}
                    <div className="flex justify-between items-center mt-6 px-4">
                        <Button variant="ghost" onClick={handleBack} disabled={currentStep === 1 || loading}>{t('back')}</Button>
                        {currentStep < steps.length -1 && 
                            <Button variant="outline" onClick={handleNext} disabled={loading}>{t('skip')}</Button>
                        }
                    </div>
                </div>
            </div>
        </>
    );
};

export default OnboardingPage;
