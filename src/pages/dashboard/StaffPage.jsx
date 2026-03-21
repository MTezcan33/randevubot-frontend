import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Plus, User, Edit, Trash2, MoreVertical, Mail, Phone, Search, Briefcase, Check, DoorOpen, Star, Calendar, Shield, Clock, Key, ChevronDown } from 'lucide-react';
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

  // Tab state
  const [activeTab, setActiveTab] = useState('experts');
  // İzin yönetimi state
  const [leaves, setLeaves] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ staff_id: '', leave_type: 'annual', start_date: '', end_date: '', reason: '' });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Uzman',
    color: getRandomColor(),
    pin_code: '',
    panel_roles: [],
  });

  // Hizmet seçimi state'leri
  const [allServices, setAllServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState(new Set());
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [staffServiceCounts, setStaffServiceCounts] = useState({});

  // Alan ataması state'leri
  const [allSpaces, setAllSpaces] = useState([]);
  const [selectedSpaces, setSelectedSpaces] = useState({}); // { spaceId: { selected: bool, is_preferred: bool } }
  const [staffSpaceCounts, setStaffSpaceCounts] = useState({});

  // Uzman kartlarında hizmet sayısını göstermek için toplu çek
  useEffect(() => {
    if (company && staff.length > 0) {
      fetchStaffServiceCounts();
      fetchStaffSpaceCounts();
    }
  }, [company, staff]);

  // Alanları yükle (spaces tablosu varsa)
  useEffect(() => {
    if (company) {
      fetchAllSpaces();
    }
  }, [company]);

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

  // Alan sayılarını toplu çek (kartlarda göstermek için)
  const fetchStaffSpaceCounts = async () => {
    if (!company) return;
    const { data } = await supabase
      .from('expert_spaces')
      .select('expert_id')
      .eq('company_id', company.id);
    if (data) {
      const counts = {};
      data.forEach(row => {
        counts[row.expert_id] = (counts[row.expert_id] || 0) + 1;
      });
      setStaffSpaceCounts(counts);
    }
  };

  // Tüm aktif alanları çek
  const fetchAllSpaces = async () => {
    if (!company) return;
    const { data } = await supabase
      .from('spaces')
      .select('id, name, color, booking_mode')
      .eq('company_id', company.id)
      .eq('is_active', true)
      .order('sort_order');
    setAllSpaces(data || []);
  };

  // Modal açıldığında uzmanın alan atamalarını çek
  const fetchSpacesForModal = async (expertId = null) => {
    if (expertId && allSpaces.length > 0) {
      const { data: assigned } = await supabase
        .from('expert_spaces')
        .select('space_id, is_preferred')
        .eq('expert_id', expertId);
      const map = {};
      (assigned || []).forEach(a => {
        map[a.space_id] = { selected: true, is_preferred: a.is_preferred };
      });
      setSelectedSpaces(map);
    } else {
      setSelectedSpaces({});
    }
  };

  // Alan seçim toggle
  const toggleSpaceSelection = (spaceId) => {
    setSelectedSpaces(prev => {
      const current = prev[spaceId];
      if (current?.selected) {
        const next = { ...prev };
        delete next[spaceId];
        return next;
      }
      return { ...prev, [spaceId]: { selected: true, is_preferred: false } };
    });
  };

  // Tercih edilen alan toggle
  const togglePreferredSpace = (spaceId) => {
    setSelectedSpaces(prev => ({
      ...prev,
      [spaceId]: { ...prev[spaceId], is_preferred: !prev[spaceId]?.is_preferred },
    }));
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
        pin_code: editingStaff.pin_code || '',
        panel_roles: editingStaff.panel_roles || [],
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
      pin_code: '',
      panel_roles: [],
    });
    setSelectedServiceIds(new Set());
    setServiceSearchQuery('');
  };

  const handleOpenModal = (staffMember = null) => {
    setEditingStaff(staffMember);
    setIsModalOpen(true);
    fetchServicesForModal(staffMember?.id || null);
    fetchSpacesForModal(staffMember?.id || null);
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
      // Yeni uzman eklerken plan limitini kontrol et
      if (!editingStaff && formData.role === 'Uzman') {
        const currentExpertCount = staff.filter(s => s.role === 'Uzman').length;
        const expertLimit = company.expert_limit || 1;
        if (currentExpertCount >= expertLimit) {
          toast({
            title: t('error'),
            description: t('expertLimitReached') || `Uzman limitinize ulaştınız (${expertLimit}). Daha fazla uzman eklemek için planınızı yükseltin.`,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }

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

        // Alan atamalarını güncelle (expert_spaces)
        if (allSpaces.length > 0) {
          await supabase
            .from('expert_spaces')
            .delete()
            .eq('expert_id', expertId)
            .eq('company_id', company.id);

          const spaceInserts = Object.entries(selectedSpaces)
            .filter(([, v]) => v.selected)
            .map(([spaceId, v]) => ({
              expert_id: expertId,
              space_id: spaceId,
              company_id: company.id,
              is_preferred: v.is_preferred || false,
            }));

          if (spaceInserts.length > 0) {
            const { error: spaceError } = await supabase.from('expert_spaces').insert(spaceInserts);
            if (spaceError) {
              console.error('Alan ataması hatası:', spaceError);
            }
          }
        }
      }

      toast({
        title: t('success'),
        description: `${t('staffRoleExpert')} ${editingStaff ? t('updated') : t('added')}.`
      });

      await refreshCompany();
      await fetchStaffServiceCounts();
      await fetchStaffSpaceCounts();
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

  // ═══ İzin Yönetimi Fonksiyonları ═══
  const fetchLeaves = async () => {
    if (!company) return;
    setLeaveLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_leaves')
        .select('*, company_users!staff_leaves_staff_id_fkey(name, color)')
        .eq('company_id', company.id)
        .order('start_date', { ascending: false });
      if (error) throw error;
      setLeaves(data || []);
    } catch (err) {
      console.error('İzin listesi hatası:', err);
    } finally {
      setLeaveLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'leaves') fetchLeaves();
  }, [activeTab, company]);

  const handleAddLeave = async () => {
    if (!leaveForm.staff_id || !leaveForm.start_date || !leaveForm.end_date) return;
    const start = new Date(leaveForm.start_date);
    const end = new Date(leaveForm.end_date);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (days <= 0) { toast({ title: t('error'), description: 'Bitiş tarihi başlangıçtan sonra olmalı', variant: 'destructive' }); return; }

    try {
      const { error } = await supabase.from('staff_leaves').insert([{
        company_id: company.id,
        staff_id: leaveForm.staff_id,
        leave_type: leaveForm.leave_type,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        days,
        reason: leaveForm.reason || null,
        status: 'approved', // İşletme sahibi eklediğinde otomatik onay
      }]);
      if (error) throw error;
      toast({ title: t('success'), description: t('leaveAdded') || 'İzin kaydı eklendi' });
      setShowLeaveModal(false);
      setLeaveForm({ staff_id: '', leave_type: 'annual', start_date: '', end_date: '', reason: '' });
      fetchLeaves();
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!window.confirm(t('deleteLeaveConfirm') || 'Bu izin kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await supabase.from('staff_leaves').delete().eq('id', leaveId);
      toast({ title: t('success'), description: t('leaveDeleted') || 'İzin kaydı silindi' });
      fetchLeaves();
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  };

  // Uzman bazlı kullanılan izin günlerini hesapla
  const getUsedLeaveDays = (staffId) => {
    return leaves
      .filter(l => l.staff_id === staffId && l.status === 'approved')
      .reduce((sum, l) => sum + l.days, 0);
  };

  const leaveTypeLabels = {
    annual: t('leaveAnnual') || 'Yıllık İzin',
    sick: t('leaveSick') || 'Hastalık İzni',
    excuse: t('leaveExcuse') || 'Mazeret İzni',
    unpaid: t('leaveUnpaid') || 'Ücretsiz İzin',
  };

  const leaveTypeColors = {
    annual: 'bg-blue-100 text-blue-700',
    sick: 'bg-red-100 text-red-700',
    excuse: 'bg-amber-100 text-amber-700',
    unpaid: 'bg-stone-100 text-stone-600',
  };

  // Tab tanımları
  const tabs = [
    { id: 'experts', label: t('staffTitle') || 'Uzmanlar', icon: <User className="w-4 h-4" /> },
    { id: 'leaves', label: t('leaveManagement') || 'İzin Yönetimi', icon: <Calendar className="w-4 h-4" /> },
    { id: 'access', label: t('contactAccess') || 'İletişim & Erişim', icon: <Key className="w-4 h-4" /> },
  ];

  return (
    <>
      <Helmet>
        <title>{t('staffTitle')} | RandevuBot</title>
        <meta name="description" content={t('staffSubtitle')} />
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('staffTitle') || 'Personel'}</h1>
            <p className="text-slate-600">{t('staffSubtitle')}</p>
          </div>
          {activeTab === 'experts' && (
            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4 mr-2" />
              {t('addStaff')}
            </Button>
          )}
          {activeTab === 'leaves' && (
            <Button onClick={() => setShowLeaveModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('addLeave') || 'İzin Ekle'}
            </Button>
          )}
        </div>

        {/* Tab Seçici */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ TAB: Uzmanlar ═══ */}
        {activeTab === 'experts' && (
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
                      <span className="text-emerald-700 font-medium">
                        {t('servicesAssigned', { count: staffServiceCounts[staffMember.id] })}
                      </span>
                    </div>
                  )}
                  {/* Atanmış alan sayısı */}
                  {staffSpaceCounts[staffMember.id] > 0 && (
                    <div className="flex items-center">
                      <DoorOpen className="w-4 h-4 mr-2 text-slate-400" />
                      <span className="text-purple-700 font-medium">
                        {staffSpaceCounts[staffMember.id]} {t('assignedSpaces').toLowerCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* ═══ TAB: İzin Yönetimi ═══ */}
        {activeTab === 'leaves' && (
          <div className="space-y-4">
            {/* Uzman bazlı izin özeti kartları */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {staff.map(s => {
                const used = getUsedLeaveDays(s.id);
                const total = s.annual_leave_days || 14;
                const percentage = Math.min((used / total) * 100, 100);
                return (
                  <div key={s.id} className="bg-white rounded-xl border p-3" style={{ borderLeftColor: s.color, borderLeftWidth: 4 }}>
                    <p className="text-sm font-semibold text-slate-700 truncate">{s.name}</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-bold text-slate-800">{used}</span>
                      <span className="text-xs text-slate-400">/ {total} gün</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: percentage > 80 ? '#ef4444' : s.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* İzin listesi */}
            {leaveLoading ? (
              <div className="text-center py-8 text-slate-400">{t('loading')}</div>
            ) : leaves.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">{t('noLeaves') || 'Henüz izin kaydı yok'}</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">{t('staffMember') || 'Personel'}</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">{t('leaveType') || 'İzin Türü'}</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">{t('dates') || 'Tarih'}</th>
                      <th className="text-center px-4 py-3 font-medium text-slate-600">{t('days') || 'Gün'}</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">{t('reason') || 'Sebep'}</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leaves.map(leave => (
                      <tr key={leave.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: leave.company_users?.color || '#ccc' }} />
                            <span className="font-medium">{leave.company_users?.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${leaveTypeColors[leave.leave_type] || ''}`}>
                            {leaveTypeLabels[leave.leave_type] || leave.leave_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{leave.start_date} → {leave.end_date}</td>
                        <td className="px-4 py-3 text-center font-semibold">{leave.days}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[150px] truncate">{leave.reason || '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteLeave(leave.id)} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* İzin Ekle Modal */}
            {showLeaveModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowLeaveModal(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">{t('addLeave') || 'İzin Ekle'}</h3>
                  <div className="space-y-3">
                    <select value={leaveForm.staff_id} onChange={e => setLeaveForm({ ...leaveForm, staff_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border bg-white text-sm">
                      <option value="">{t('selectStaff') || '— Personel Seçin —'}</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select value={leaveForm.leave_type} onChange={e => setLeaveForm({ ...leaveForm, leave_type: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border bg-white text-sm">
                      {Object.entries(leaveTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">{t('startDate') || 'Başlangıç'}</label>
                        <input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">{t('endDate') || 'Bitiş'}</label>
                        <input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-sm" />
                      </div>
                    </div>
                    <input placeholder={t('reason') || 'Sebep (opsiyonel)'} value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border text-sm" />
                  </div>
                  <div className="flex justify-end gap-2 mt-5">
                    <Button variant="outline" onClick={() => setShowLeaveModal(false)}>{t('cancel')}</Button>
                    <Button onClick={handleAddLeave} disabled={!leaveForm.staff_id || !leaveForm.start_date || !leaveForm.end_date}>{t('save')}</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: İletişim & Erişim ═══ */}
        {activeTab === 'access' && (
          <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('name') || 'İsim'}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('phone') || 'Telefon'}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('email') || 'E-posta'}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('role') || 'Rol'}</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">PIN</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('panelRoles') || 'Panel Rolleri'}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staff.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color || '#ccc' }} />
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.phone || <span className="text-slate-300 text-xs">—</span>}</td>
                    <td className="px-4 py-3 text-slate-600">{s.email || <span className="text-slate-300 text-xs">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">{s.role}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.pin_code ? (
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">••••</span>
                      ) : (
                        <span className="text-xs text-red-400">Yok</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.panel_roles || []).map(r => (
                          <span key={r} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{r}</span>
                        ))}
                        {(!s.panel_roles || s.panel_roles.length === 0) && <span className="text-xs text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleOpenModal(s)} className="text-slate-400 hover:text-emerald-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

            {/* PIN ve Panel Rolleri */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-sm font-medium mb-2">{t('pinCode') || 'PIN Kodu'}</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="4 haneli PIN"
                  value={formData.pin_code}
                  onChange={(e) => setFormData({ ...formData, pin_code: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className="w-full px-4 py-2 rounded-lg border text-center tracking-widest font-mono text-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('panelRoles') || 'Panel Rolleri'}</label>
                <div className="flex flex-wrap gap-1.5">
                  {['uzman', 'resepsiyonist', 'kasa'].map(role => {
                    const isSelected = formData.panel_roles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            panel_roles: isSelected
                              ? prev.panel_roles.filter(r => r !== role)
                              : [...prev.panel_roles, role],
                          }));
                        }}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                          isSelected
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Hizmet Seçimi Bölümü */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">
                  {t('expertServices')}
                </h4>
                <span className="text-xs text-emerald-700 font-medium">
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
                        focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                      placeholder={t('searchServices')}
                      value={serviceSearchQuery}
                      onChange={(e) => setServiceSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Toplu seçim butonları */}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={selectAllServices}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-medium px-2 py-1 rounded hover:bg-emerald-50 transition-colors">
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
                                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/30'
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                                    ${isSelected ? 'bg-emerald-700 border-emerald-700' : 'border-slate-300'}`}>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: service.color || '#059669' }} />
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

            {/* Alan Ataması Bölümü — sadece alanlar tanımlıysa görünür */}
            {allSpaces.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <DoorOpen className="w-4 h-4 text-purple-600" />
                    {t('assignedSpaces')}
                  </h4>
                  <span className="text-xs text-purple-700 font-medium">
                    {Object.values(selectedSpaces).filter(v => v.selected).length} {t('spaces').toLowerCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {t('assignedSpacesDesc') || 'Bu uzmanın çalışabileceği alanları seçin. Yıldız ile tercih edilen alanı belirtin.'}
                </p>
                <div className="space-y-1.5 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  {allSpaces.map(space => {
                    const isSelected = selectedSpaces[space.id]?.selected;
                    const isPreferred = selectedSpaces[space.id]?.is_preferred;
                    return (
                      <div
                        key={space.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                          isSelected
                            ? 'bg-purple-50 border border-purple-300'
                            : 'bg-white border border-slate-200 hover:border-purple-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSpaceSelection(space.id)}
                          className="flex items-center gap-2 flex-1"
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                            ${isSelected ? 'bg-purple-700 border-purple-700' : 'border-slate-300'}`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: space.color || '#6366F1' }} />
                          <span className={`font-medium ${isSelected ? 'text-purple-800' : 'text-slate-700'}`}>
                            {space.name}
                          </span>
                        </button>
                        {isSelected && (
                          <button
                            type="button"
                            onClick={() => togglePreferredSpace(space.id)}
                            title={t('preferredSpace')}
                            className="p-1 rounded hover:bg-purple-100 transition-colors"
                          >
                            <Star className={`w-4 h-4 ${
                              isPreferred ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                            }`} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleCloseModal}>{t('cancel')}</Button>
              <Button type="submit" disabled={loading}
                className="bg-emerald-700 hover:bg-emerald-800 text-white">
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
