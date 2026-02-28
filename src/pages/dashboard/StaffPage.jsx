import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Plus, User, Edit, Trash2, MoreVertical, Mail, Phone, Search, Briefcase, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from 'react-i18next';

// Rastgele hoş renk üretme fonksiyonu
const getRandomColor = () => {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * (90 - 70 + 1)) + 70;
  const l = Math.floor(Math.random() * (80 - 70 + 1)) + 70;
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const StaffPage = () => {
  const { company, staff, refreshCompany } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Uzman',
    color: getRandomColor(),
  });

  // Hizmet seçimi state'leri
  const [allServices, setAllServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState(new Set());
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [staffServiceCounts, setStaffServiceCounts] = useState({});

  // Uzman kartlarında hizmet sayısını göstermek için toplu çek
  useEffect(() => {
    if (company && staff.length > 0) {
      fetchStaffServiceCounts();
    }
  }, [company, staff]);

  const fetchStaffServiceCounts = async () => {
    if (!company) return;
    const { data } = await supabase
      .from('expert_services')
      .select('expert_id')
      .eq('company_id', company.id);
    if (data) {
      const counts = {};
      data.forEach(row => {
        counts[row.expert_id] = (counts[row.expert_id] || 0) + 1;
      });
      setStaffServiceCounts(counts);
    }
  };

  // Modal açıldığında hizmetleri ve mevcut atamaları çek
  const fetchServicesForModal = async (expertId = null) => {
    if (!company) return;

    // Tüm aktif hizmetleri çek
    const { data: services } = await supabase
      .from('company_services')
      .select('id, description, category, duration, price, color')
      .eq('company_id', company.id)
      .eq('is_active', true)
      .order('category')
      .order('description');

    setAllServices(services || []);

    // Edit modunda mevcut atamaları çek
    if (expertId) {
      const { data: assigned } = await supabase
        .from('expert_services')
        .select('service_id')
        .eq('expert_id', expertId);
      setSelectedServiceIds(new Set(assigned?.map(a => a.service_id) || []));
    } else {
      setSelectedServiceIds(new Set());
    }
  };

  useEffect(() => {
    if (editingStaff) {
      setFormData({
        name: editingStaff.name,
        email: editingStaff.email || '',
        phone: editingStaff.phone || '',
        role: editingStaff.role,
        color: editingStaff.color || getRandomColor(),
      });
    } else {
      resetForm();
    }
  }, [editingStaff]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Uzman',
      color: getRandomColor(),
    });
    setSelectedServiceIds(new Set());
    setServiceSearchQuery('');
  };

  const handleOpenModal = (staffMember = null) => {
    setEditingStaff(staffMember);
    setIsModalOpen(true);
    fetchServicesForModal(staffMember?.id || null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    resetForm();
  };

  // Hizmet seçim toggle
  const toggleService = (serviceId) => {
    setSelectedServiceIds(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  };

  // Tümünü seç / kaldır
  const selectAllServices = () => {
    const filtered = filteredServices.map(s => s.id);
    setSelectedServiceIds(new Set([...selectedServiceIds, ...filtered]));
  };

  const deselectAllServices = () => {
    const filtered = new Set(filteredServices.map(s => s.id));
    setSelectedServiceIds(prev => {
      const next = new Set(prev);
      filtered.forEach(id => next.delete(id));
      return next;
    });
  };

  // Hizmetleri kategoriye göre grupla ve filtrele
  const filteredServices = useMemo(() => {
    if (!serviceSearchQuery) return allServices;
    const q = serviceSearchQuery.toLowerCase();
    return allServices.filter(s =>
      s.description.toLowerCase().includes(q) ||
      (s.category?.toLowerCase().includes(q))
    );
  }, [allServices, serviceSearchQuery]);

  const groupedServices = useMemo(() => {
    const groups = {};
    filteredServices.forEach(s => {
      const cat = s.category || 'Diğer';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredServices]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!company) return;
    setLoading(true);

    try {
      let expertId = editingStaff?.id;
      let error;

      if (editingStaff) {
        // Mevcut uzmanı güncelle
        const { error: updateError } = await supabase
          .from('company_users')
          .update({ ...formData })
          .eq('id', editingStaff.id);
        error = updateError;
      } else {
        // Yeni uzman oluştur
        const { data: newData, error: createError } = await supabase
          .from('company_users')
          .insert([{ ...formData, company_id: company.id }])
          .select()
          .single();
        error = createError;
        if (newData) expertId = newData.id;
      }

      if (error) throw error;

      // Hizmet atamalarını güncelle (expert_services junction tablosu)
      if (expertId) {
        // Mevcut atamaları temizle
        await supabase
          .from('expert_services')
          .delete()
          .eq('expert_id', expertId);

        // Yeni seçimleri ekle
        if (selectedServiceIds.size > 0) {
          const inserts = [...selectedServiceIds].map(serviceId => ({
            expert_id: expertId,
            service_id: serviceId,
            company_id: company.id,
          }));
          const { error: junctionError } = await supabase.from('expert_services').insert(inserts);
          if (junctionError) {
            console.error('Hizmet ataması hatası:', junctionError);
          }
        }
      }

      toast({
        title: t('success'),
        description: `${t('staffRoleExpert')} ${editingStaff ? t('updated') : t('added')}.`
      });

      await refreshCompany();
      await fetchStaffServiceCounts();
      handleCloseModal();
    } catch (error) {
      toast({
        title: t('error'),
        description: error.message || t('operationFailed'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteAlert = (staffMember) => {
    setStaffToDelete(staffMember);
    setIsDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!staffToDelete) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('company_users')
        .delete()
        .eq('id', staffToDelete.id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: `${staffToDelete.name} ${t('deleted')}.`
      });

      await refreshCompany();
      await fetchStaffServiceCounts();
      setIsDeleteAlertOpen(false);
      setStaffToDelete(null);
    } catch (error) {
      toast({
        title: t('error'),
        description: error.message || t('operationFailed'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('staffTitle')} | RandevuBot</title>
        <meta name="description" content={t('staffSubtitle')} />
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('staffTitle')}</h1>
            <p className="text-slate-600">{t('staffSubtitle')}</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            {t('addStaff')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((staffMember) => (
            <div key={staffMember.id} className="glass-effect p-6 rounded-2xl flex flex-col justify-between" style={{ borderTop: `4px solid ${staffMember.color || '#ccc'}` }}>
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center" style={{ backgroundColor: staffMember.color ? `${staffMember.color}40` : '#e2e8f0' }}>
                      <User className="w-8 h-8" style={{ color: staffMember.color || '#64748b' }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{staffMember.name}</h3>
                      <p className="text-sm text-slate-500">{staffMember.role === 'Yönetici' ? t('staffRoleAdmin') : t('staffRoleExpert')}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleOpenModal(staffMember)}>
                        <Edit className="w-4 h-4 mr-2" />
                        {t('edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteAlert(staffMember)} className="text-red-500">
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  {staffMember.email && (
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-slate-400" />
                      <span>{staffMember.email}</span>
                    </div>
                  )}
                  {staffMember.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-slate-400" />
                      <span>{staffMember.phone}</span>
                    </div>
                  )}
                  {/* Atanmış hizmet sayısı */}
                  {staffServiceCounts[staffMember.id] > 0 && (
                    <div className="flex items-center">
                      <Briefcase className="w-4 h-4 mr-2 text-slate-400" />
                      <span className="text-purple-600 font-medium">
                        {t('servicesAssigned', { count: staffServiceCounts[staffMember.id] })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Uzman Oluştur / Düzenle Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? t('editStaff') : t('addStaff')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            {/* Temel Bilgiler */}
            <div>
              <label className="block text-sm font-medium mb-2">{t('staffName')}</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2 rounded-lg border" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('email')}</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 rounded-lg border" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('phone')}</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 rounded-lg border" />
            </div>
            <div className='flex items-end gap-4'>
              <div className='flex-grow'>
                <label className="block text-sm font-medium mb-2">{t('role')}</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 rounded-lg border bg-white">
                  <option value="Uzman">{t('staffRoleExpert')}</option>
                  <option value="Yönetici">{t('staffRoleAdmin')}</option>
                </select>
              </div>
              <div className='flex flex-col items-center'>
                 <label htmlFor="color-picker" className="block text-sm font-medium mb-2 text-center">{t('color')}</label>
                 <input
                    id="color-picker"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-10 p-0 border-none rounded-lg cursor-pointer"
                  />
              </div>
            </div>

            {/* Hizmet Seçimi Bölümü */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">
                  {t('expertServices')}
                </h4>
                <span className="text-xs text-purple-600 font-medium">
                  {t('servicesSelected', { count: selectedServiceIds.size })}
                </span>
              </div>
              <p className="text-xs text-slate-500">{t('expertServicesSubtitle')}</p>

              {allServices.length === 0 ? (
                <div className="text-center py-4 bg-slate-50 rounded-xl">
                  <Briefcase className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">{t('noServicesYet')}</p>
                </div>
              ) : (
                <>
                  {/* Arama */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm
                        focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                      placeholder={t('searchServices')}
                      value={serviceSearchQuery}
                      onChange={(e) => setServiceSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Toplu seçim butonları */}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={selectAllServices}
                      className="text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1 rounded hover:bg-purple-50 transition-colors">
                      {t('selectAll')}
                    </button>
                    <span className="text-slate-300">|</span>
                    <button type="button" onClick={deselectAllServices}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-1 rounded hover:bg-slate-50 transition-colors">
                      {t('deselectAll')}
                    </button>
                  </div>

                  {/* Kategoriye göre gruplanmış hizmet listesi */}
                  <div className="max-h-[250px] overflow-y-auto space-y-3 pr-1 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                    {groupedServices.map(([category, services]) => (
                      <div key={category}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 px-1">
                          {category}
                        </p>
                        <div className="space-y-1">
                          {services.map(service => {
                            const isSelected = selectedServiceIds.has(service.id);
                            return (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => toggleService(service.id)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all
                                  ${isSelected
                                    ? 'bg-purple-50 border border-purple-300 text-purple-800'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:border-purple-200 hover:bg-purple-50/30'
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                                    ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-300'}`}>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: service.color || '#9333EA' }} />
                                  <span className="font-medium text-left">{service.description}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  <span className="text-xs text-slate-400">{service.duration} dk</span>
                                  {service.price != null && (
                                    <span className="text-xs text-slate-500">{Number(service.price).toLocaleString('tr-TR')} TL</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleCloseModal}>{t('cancel')}</Button>
              <Button type="submit" disabled={loading}
                className="bg-[#E91E8C] hover:bg-[#C91A7A] text-white">
                {loading ? `${t('save')}...` : t('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialogu */}
      <Dialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteStaff')}</DialogTitle>
          </DialogHeader>
          <p>
            <strong>{staffToDelete?.name}</strong> {t('deleteStaffConfirm')}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteAlertOpen(false)}>{t('cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? `${t('delete')}...` : t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StaffPage;
