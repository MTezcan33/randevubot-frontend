import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

const CreateAppointmentModal = ({ isOpen, onClose, experts, currentDate, onAppointmentCreated }) => {
  const { company } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedExpert, setSelectedExpert] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(currentDate);
  const [appointmentTime, setAppointmentTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && company) {
      const fetchDropdownData = async () => {
        const [customerRes, serviceRes] = await Promise.all([
          supabase.from('customers').select('*').eq('company_id', company.id),
          supabase.from('company_services').select('*').eq('company_id', company.id),
        ]);
        if (customerRes.data) setCustomers(customerRes.data);
        if (serviceRes.data) setServices(serviceRes.data);
      };
      fetchDropdownData();
      setAppointmentDate(currentDate);
    }
  }, [isOpen, company, currentDate]);

  const handleCreateAppointment = async () => {
    setIsSubmitting(true);
    let customerId = selectedCustomer;

    try {
      if (selectedCustomer === 'new') {
        if (!newCustomerName || !newCustomerPhone) {
          toast({ title: t('error'), description: t('newCustomerRequired'), variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            company_id: company.id,
            name: newCustomerName,
            phone: newCustomerPhone,
          })
          .select()
          .single();
        
        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      if (!customerId || !selectedService || !selectedExpert || !appointmentDate || !appointmentTime) {
        toast({ title: t('error'), description: t('allFieldsRequired'), variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      const { error: appointmentError } = await supabase.from('appointments').insert({
        company_id: company.id,
        customer_id: customerId,
        service_id: selectedService,
        expert_id: selectedExpert,
        date: appointmentDate.toISOString().split('T')[0],
        time: appointmentTime,
        status: 'confirmed',
      });

      if (appointmentError) throw appointmentError;

      toast({ title: t('success'), description: t('appointmentCreatedSuccess') });
      onAppointmentCreated();
      handleClose();
    } catch (error) {
      toast({ title: t('error'), description: `${t('appointmentCreateError')}: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCustomer('');
    setNewCustomerName('');
    setNewCustomerPhone('');
    setSelectedService('');
    setSelectedExpert('');
    setAppointmentTime('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('newAppointment')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Select onValueChange={setSelectedCustomer} value={selectedCustomer}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectCustomer')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">{t('addNewCustomer')}</SelectItem>
              {customers.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name} - {c.phone}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCustomer === 'new' && (
            <>
              <Input
                placeholder={t('newCustomerNamePlaceholder')}
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
              />
              <Input
                placeholder={t('newCustomerPhonePlaceholder')}
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
              />
            </>
          )}

          <Select onValueChange={setSelectedService} value={selectedService}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectService')} />
            </SelectTrigger>
            <SelectContent>
              {services.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={setSelectedExpert} value={selectedExpert}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectExpert')} />
            </SelectTrigger>
            <SelectContent>
              {experts.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                    type="date"
                    value={appointmentDate.toISOString().split('T')[0]}
                    onChange={(e) => setAppointmentDate(new Date(e.target.value))}
                    className="pl-9"
                />
            </div>
            <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="pl-9"
                />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">{t('cancel')}</Button>
          </DialogClose>
          <Button type="submit" onClick={handleCreateAppointment} disabled={isSubmitting}>
            {isSubmitting ? t('creating') : t('createAppointment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAppointmentModal;