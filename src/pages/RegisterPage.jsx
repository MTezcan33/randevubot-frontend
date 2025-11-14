import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Mail, Lock, User, Building, Phone, ArrowLeft, Briefcase } from 'lucide-react';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [sectors, setSectors] = useState([]);
  const [subSectors, setSubSectors] = useState([]);
  const [formData, setFormData] = useState({
    sectorId: '',
    otherSector: '',
    subSectorId: '',
    otherSubSector: '',
    companyName: '',
    fullName: '',
    phone: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    const fetchSectors = async () => {
      const { data, error } = await supabase.from('sectors').select('*').order('name');
      if (error) {
        toast({ title: t('error'), description: t('serviceFetchError'), variant: "destructive" });
      } else {
        setSectors(data);
      }
    };
    fetchSectors();
  }, [toast, t]);

  const handleSectorChange = async (sectorId) => {
    setFormData({ ...formData, sectorId: sectorId, subSectorId: '', otherSubSector: '' });
    if (sectorId && sectorId !== 'DİĞER') {
      const { data, error } = await supabase.from('sub_sectors').select('*').eq('sector_id', sectorId).order('name');
      if (error) {
        toast({ title: t('error'), description: "Alt sektörler yüklenemedi.", variant: "destructive" });
      } else {
        setSubSectors(data);
      }
    } else {
      setSubSectors([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password.length < 8) {
      toast({ title: t('passwordTooShort'), description: t('passwordTooShort'), variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      let currentSectorId = formData.sectorId;
      let sectorName, subSectorName, sectorCode, subSectorCode;
      
      if (formData.sectorId === 'DİĞER') {
        sectorName = formData.otherSector.trim().toUpperCase();
        if (!sectorName) throw new Error("Yeni sektör adı boş olamaz.");
        const { data: newSector, error } = await supabase.from('sectors').insert({ name: sectorName, code: 'ZZ' }).select().single();
        if (error) throw error;
        sectorCode = 'ZZ';
        currentSectorId = newSector.id;
      } else {
        const selectedSector = sectors.find(s => s.id === formData.sectorId);
        if (!selectedSector) throw new Error("Lütfen geçerli bir sektör seçin.");
        sectorName = selectedSector.name;
        sectorCode = selectedSector.code;
      }

      if (formData.subSectorId === 'DİĞER') {
        subSectorName = formData.otherSubSector.trim();
        if (!subSectorName) throw new Error("Yeni alt sektör adı boş olamaz.");
        const { data: newSubSector, error } = await supabase.from('sub_sectors').insert({ sector_id: currentSectorId, name: subSectorName, code: '99' }).select().single();
        if (error) throw error;
        subSectorCode = '99';
      } else {
        const selectedSubSector = subSectors.find(ss => ss.id === formData.subSectorId);
        if (!selectedSubSector) throw new Error("Lütfen geçerli bir alt sektör seçin.");
        subSectorName = selectedSubSector.name;
        subSectorCode = selectedSubSector.code;
      }
      
      const companySectorCode = `${sectorCode}${subSectorCode}`;

      const { data: signUpData, error: signUpError } = await signUp(formData.email, formData.password, {
        full_name: formData.fullName.toUpperCase(),
        company_name: formData.companyName,
        phone: formData.phone,
        sector: sectorName,
        sub_sector: subSectorName,
        sector_code: companySectorCode
      });
      
      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
            throw new Error(t('emailAlreadyExists'));
        }
        throw signUpError;
      }

      if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        throw new Error(t('emailAlreadyExists'));
      }
      
      toast({ title: t('registerSuccess'), description: t('verificationEmailSent') });
      setTimeout(() => navigate('/login', { replace: true }), 2000);

    } catch (error) {
      toast({ title: t('registerError'), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('registerTitle')}</title>
        <meta name="description" content={t('registerDescription')} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="glass-effect rounded-3xl p-8">
            <Link to="/" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" /> {t('backToHome')}
            </Link>
            <div className="flex items-center justify-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center mb-2">{t('createAccount')}</h1>
            <p className="text-slate-600 text-center mb-8">{t('tryFree')}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('sector')}</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select required value={formData.sectorId} onChange={(e) => handleSectorChange(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="" disabled>{t('selectSector')}</option>
                    {sectors.map(sector => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
                     <option value="DİĞER">{t('otherSpecify')}</option>
                  </select>
                </div>
              </div>

              {formData.sectorId === 'DİĞER' && (
                <input type="text" required value={formData.otherSector} onChange={(e) => setFormData({ ...formData, otherSector: e.target.value })} className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('newSectorPlaceholder')}/>
              )}

              {formData.sectorId && formData.sectorId !== 'DİĞER' && (
                <div>
                  <label className="block text-sm font-medium mb-2">{t('subSector')}</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select required value={formData.subSectorId} onChange={(e) => setFormData({ ...formData, subSectorId: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="" disabled>{t('selectSubSector')}</option>
                      {subSectors.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                      <option value="DİĞER">{t('otherSpecify')}</option>
                    </select>
                  </div>
                </div>
              )}
              
              {formData.subSectorId === 'DİĞER' && (
                <input type="text" required value={formData.otherSubSector} onChange={(e) => setFormData({ ...formData, otherSubSector: e.target.value })} className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('newSubSectorPlaceholder')}/>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">{t('companyName')}</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" required value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('companyName')}/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('fullName')}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('fullName')}/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('phoneNumber')}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+90 555 123 4567"/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('emailAddress')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ornek@email.com"/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('passwordMinChar')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="password" required minLength={8} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••"/>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? t('registering') : t('register')}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-slate-600">{t('alreadyHaveAccount')} </span>
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">{t('login')}</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default RegisterPage;