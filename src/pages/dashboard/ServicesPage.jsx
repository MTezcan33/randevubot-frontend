import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Clock, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

const ServicesPage = () => {
  const { company, staff: experts } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceData, setServiceData] = useState({
    description: '',
    expert_id: '',
    duration: 30,
    price: 0
  });

  useEffect(() => {
    if (company) {
      fetchServices();
    }
  }, [company]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_services')
        .select('*, expert:expert_id(name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      toast({ title: t('error'), description: t('serviceFetchError'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openModalForCreate = () => {
    setEditingService(null);
    setServiceData({ description: '', expert_id: '', duration: 30, price: 0 });
    setIsModalOpen(true);
  };

  const openModalForEdit = (service) => {
    setEditingService(service);
    setServiceData({
      description: service.description,
      expert_id: service.expert_id,
      duration: service.duration,
      price: service.price
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('company_services').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('success'), description: t('serviceDeleted') });
      fetchServices();
    } catch (error) {
      toast({ title: t('error'), description: t('serviceDeleteError'), variant: "destructive" });
    }
  };

  const handleSaveService = async () => {
    if (!serviceData.description || !serviceData.duration || !serviceData.expert_id) {
      toast({ title: t('missingInfo'), description: t('pleaseFillAllFields'), variant: "destructive" });
      return;
    }

    try {
      let error;
      if (editingService) {
        ({ error } = await supabase.from('company_services').update(serviceData).eq('id', editingService.id));
      } else {
        ({ error } = await supabase.from('company_services').insert([{ ...serviceData, company_id: company.id }]));
      }

      if (error) throw error;

      toast({ title: t('success'), description: t('serviceSaved') });
      setIsModalOpen(false);
      fetchServices();
    } catch (error) {
      toast({ title: t('error'), description: t('serviceSaveError', { error: error.message }), variant: "destructive" });
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('servicesTitle')} | RandevuBot</title>
        <meta name="description" content={t('servicesSubtitle')} />
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('servicesTitle')}</h1>
            <p className="text-slate-600">{t('servicesSubtitle')}</p>
          </div>
          <Button onClick={openModalForCreate}>
            <Plus className="w-4 h-4 mr-2" />
            {t('addService')}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
        ) : services.length === 0 ? (
          <div className="glass-effect rounded-2xl p-12 text-center">
            <p className="text-slate-600 mb-4">{t('noService')}</p>
            <Button onClick={openModalForCreate}>{t('addFirstService')}</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-effect rounded-2xl p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">{service.description}</h3>
                  <div className="flex space-x-2">
                    <button onClick={() => openModalForEdit(service)} className="text-blue-600 hover:text-blue-700"><Edit className="w-5 h-5" /></button>
                    <button onClick={() => handleDelete(service.id)} className="text-red-600 hover:text-red-700"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <p className="font-medium">{t('serviceExpert')}: {service.expert?.name || t('unspecified')}</p>
                  <div className="flex items-center"><Clock className="w-4 h-4 mr-2" />{service.duration} {t('serviceDuration')}</div>
                  <div className="flex items-center"><DollarSign className="w-4 h-4 mr-2" />{service.price} TL</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? t('editService') : t('newService')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <input type="text" placeholder={t('serviceDescription')} value={serviceData.description} onChange={(e) => setServiceData({ ...serviceData, description: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
            <select value={serviceData.expert_id} onChange={(e) => setServiceData({ ...serviceData, expert_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-white">
              <option value="">{t('selectExpert')}</option>
              {experts.filter(e => e.role === 'Uzman').map(expert => <option key={expert.id} value={expert.id}>{expert.name}</option>)}
            </select>
            <input type="number" placeholder={t('serviceDuration')} value={serviceData.duration} onChange={(e) => setServiceData({ ...serviceData, duration: parseInt(e.target.value) })} className="w-full px-4 py-3 rounded-xl border" />
            <input type="number" placeholder={t('servicePrice')} value={serviceData.price} onChange={(e) => setServiceData({ ...serviceData, price: parseFloat(e.target.value) })} className="w-full px-4 py-3 rounded-xl border" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSaveService}>{editingService ? t('save') : t('addService')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ServicesPage;