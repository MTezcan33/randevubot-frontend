import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Plus, Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

const CustomersPage = () => {
  const { company } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  useEffect(() => {
    if (company) {
      fetchCustomers();
    }
  }, [company]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', company.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      toast({ title: t('error'), description: t('customerFetchError'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openModal = (customer = null) => {
    setEditingCustomer(customer);
    if (customer) {
      setCustomerData(customer);
    } else {
      setCustomerData({ name: '', phone: '', email: '', notes: '' });
    }
    setIsModalOpen(true);
  };
  
  const handleNameInputChange = (e) => {
    setCustomerData({...customerData, name: e.target.value.toUpperCase()});
  };

  const handleSave = async () => {
    if (!customerData.name) {
      toast({ title: t('missingInfo'), description: t('pleaseFillAllFields'), variant: "destructive" });
      return;
    }
    try {
      let error;
      if (editingCustomer) {
        ({ error } = await supabase.from('customers').update(customerData).eq('id', editingCustomer.id));
      } else {
        ({ error } = await supabase.from('customers').insert([{ ...customerData, company_id: company.id }]));
      }

      if (error) throw error;
      toast({ title: t('success'), description: t('customerSaved') });
      setIsModalOpen(false);
      fetchCustomers();
    } catch (error) {
      toast({ title: t('error'), description: t('customerSaveError'), variant: "destructive" });
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('customersTitle')} | RandevuBot</title>
        <meta name="description" content={t('customersSubtitle')} />
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('customersTitle')}</h1>
            <p className="text-slate-600">{t('customersSubtitle')}</p>
          </div>
          <Button onClick={() => openModal()}>
            <Plus className="w-4 h-4 mr-2" />
            {t('addCustomer')}
          </Button>
        </div>

        <div className="glass-effect rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4">{t('customerName')}</th>
                  <th className="p-4">{t('customerPhone')}</th>
                  <th className="p-4">{t('customerEmail')}</th>
                  <th className="p-4">{t('customerNotes')}</th>
                  <th className="p-4 text-right">{t('edit')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center p-8">{t('loading')}</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan="5" className="text-center p-8">{t('noCustomer')}</td></tr>
                ) : (
                  customers.map(customer => (
                    <tr key={customer.id} className="border-b">
                      <td className="p-4 font-medium">{customer.name}</td>
                      <td className="p-4">{customer.phone}</td>
                      <td className="p-4">{customer.email}</td>
                      <td className="p-4 truncate max-w-xs">{customer.notes}</td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => openModal(customer)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? t('editCustomer') : t('newCustomer')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <input type="text" placeholder={t('customerName')} value={customerData.name} onChange={handleNameInputChange} className="w-full px-4 py-3 rounded-xl border" />
            <input type="tel" placeholder={t('customerPhone')} value={customerData.phone} onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
            <input type="email" placeholder={t('customerEmail')} value={customerData.email} onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
            <textarea placeholder={t('customerNotes')} value={customerData.notes} onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomersPage;