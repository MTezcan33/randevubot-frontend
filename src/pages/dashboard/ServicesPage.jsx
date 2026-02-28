import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Plus, Edit, Trash2, Clock, DollarSign, Search,
  LayoutGrid, List, FileText, Upload, Briefcase,
  MoreVertical, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/use-toast';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';

// Güzellik sektörüne ait ön tanımlı kategoriler
const BEAUTY_CATEGORIES = [
  'Saç Bakımı', 'Cilt Bakımı', 'Tırnak Bakımı',
  'Makyaj', 'Masaj', 'Epilasyon', 'Kirpik & Kaş', 'Diğer',
];

// Takvim rengi ön tanımlıları
const COLOR_PRESETS = [
  '#9333EA', '#E91E8C', '#D4AF37', '#10B981',
  '#3B82F6', '#F97316', '#EF4444', '#64748B',
];

// ─── ServiceCard Bileşeni ─────────────────────────────────────────────────────
function ServiceCard({ service, onEdit, onDelete, onToggleActive }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden
        transition-all hover:shadow-md ${!service.is_active ? 'opacity-60' : ''}`}
      style={{ borderTop: `3px solid ${service.color || '#9333EA'}` }}
    >
      {/* Kart Başlığı */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <div className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: service.color || '#9333EA' }} />
            {service.category && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full
                bg-pink-50 text-pink-700 border border-pink-200">
                {service.category}
              </span>
            )}
            {!service.is_active && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full
                bg-red-50 text-red-600 border border-red-200">
                {t('serviceInactive')}
              </span>
            )}
          </div>
          {/* Aksiyon Menü */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400
                hover:text-slate-600 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(service)}>
                <Edit className="w-4 h-4 mr-2" />
                {t('editService')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => onToggleActive(service, e)}>
                {service.is_active
                  ? <><EyeOff className="w-4 h-4 mr-2" />{t('serviceInactive')} yap</>
                  : <><Eye className="w-4 h-4 mr-2" />{t('serviceActive')} yap</>
                }
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(service)}
                className="text-red-600 focus:text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Hizmet Adı ve Uzman */}
        <h3 className="font-semibold text-slate-800 text-base leading-snug mb-1">
          {service.description}
        </h3>
        {service.expert && (
          <p className="text-sm text-slate-500">
            <span className="inline-flex items-center gap-1">
              <div className="w-2 h-2 rounded-full"
                style={{ backgroundColor: service.expert.color || '#9333EA' }} />
              {service.expert.name}
            </span>
          </p>
        )}
      </div>

      {/* Süre ve Fiyat */}
      <div className="px-4 py-3 border-t border-slate-50 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-sm text-slate-600">
          <Clock className="w-4 h-4 text-slate-400" />
          {service.duration} dk
        </span>
        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <DollarSign className="w-4 h-4 text-slate-400" />
          {service.price != null
            ? `${Number(service.price).toLocaleString('tr-TR')} TL`
            : <span className="text-slate-400 font-normal">{t('priceNotSpecified')}</span>
          }
        </span>
      </div>

      {/* Notlar (varsa) */}
      {service.notes && (
        <div className="px-4 pb-3">
          <p className="text-xs text-slate-500 line-clamp-1">{service.notes}</p>
        </div>
      )}

      {/* PDF ve Alt Aksiyonlar */}
      <div className="px-4 pb-4 flex items-center justify-between gap-2 border-t border-slate-50 pt-3">
        {service.pdf_url ? (
          <a href={service.pdf_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#9333EA] hover:underline">
            <FileText className="w-3.5 h-3.5" />
            {t('viewPdf')}
          </a>
        ) : <div />}
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(service)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600
              hover:bg-blue-50 transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(service)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600
              hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── ServiceListView Bileşeni ─────────────────────────────────────────────────
function ServiceListView({ services, onEdit, onDelete, onToggleActive }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t('serviceName')}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
              {t('serviceCategory')}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
              {t('serviceExpert')}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t('serviceDuration')}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t('servicePrice')}
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {/* actions */}
            </th>
          </tr>
        </thead>
        <tbody>
          {services.map((service, idx) => (
            <tr key={service.id}
              className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors
                ${!service.is_active ? 'opacity-60' : ''}
                ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: service.color || '#9333EA' }} />
                  <span className="font-medium text-slate-800 text-sm">{service.description}</span>
                  {!service.is_active && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
                      {t('serviceInactive')}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                {service.category
                  ? <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                      {service.category}
                    </span>
                  : <span className="text-slate-400 text-xs">—</span>
                }
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell">
                {service.expert?.name || <span className="text-slate-400">—</span>}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{service.duration} dk</td>
              <td className="px-4 py-3 text-sm font-medium text-slate-700">
                {service.price != null
                  ? `${Number(service.price).toLocaleString('tr-TR')} TL`
                  : <span className="text-slate-400 font-normal text-xs">{t('priceNotSpecified')}</span>
                }
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {service.pdf_url && (
                    <a href={service.pdf_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                      <FileText className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => onEdit(service)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(service)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── ServicesPage Ana Bileşeni ─────────────────────────────────────────────────
const ServicesPage = () => {
  const { company, staff } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Sayfa state'leri
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  // Form state'i
  const [serviceData, setServiceData] = useState({
    description: '',   // hizmet adı — DB'de 'description' kolonu
    category: '',
    expert_id: '',
    duration: 30,
    price: '',         // '' = null (opsiyonel)
    notes: '',
    color: '#9333EA',
    is_active: true,
    pdf_url: '',
  });

  // PDF upload state'i
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  useEffect(() => {
    if (company) {
      fetchServices();
    }
  }, [company]);

  // Hizmetleri Supabase'den çek
  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('company_services')
      .select('*, expert:expert_id(id, name, color)')
      .eq('company_id', company.id)
      .order('is_active', { ascending: false })
      .order('category', { ascending: true })
      .order('description', { ascending: true });

    if (error) {
      toast({ title: t('error'), description: t('serviceFetchError'), variant: 'destructive' });
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  // Yeni hizmet için modal aç
  const openModalForCreate = () => {
    setEditingService(null);
    setServiceData({
      description: '', category: '', expert_id: '',
      duration: 30, price: '', notes: '', color: '#9333EA',
      is_active: true, pdf_url: '',
    });
    setPdfFile(null);
    setIsCustomCategory(false);
    setIsModalOpen(true);
  };

  // Düzenleme için modal aç
  const openModalForEdit = (service) => {
    setEditingService(service);
    setServiceData({
      description: service.description || '',
      category: service.category || '',
      expert_id: service.expert_id || '',
      duration: service.duration || 30,
      price: service.price != null ? String(service.price) : '',
      notes: service.notes || '',
      color: service.color || '#9333EA',
      is_active: service.is_active !== false,
      pdf_url: service.pdf_url || '',
    });
    setPdfFile(null);
    setIsCustomCategory(
      service.category && !BEAUTY_CATEGORIES.includes(service.category)
    );
    setIsModalOpen(true);
  };

  // Kategori seçim mantığı — özel kategori desteği
  const handleCategoryChange = (value) => {
    if (value === '__custom__') {
      setIsCustomCategory(true);
      setServiceData({ ...serviceData, category: '' });
    } else if (value === '__none__') {
      setIsCustomCategory(false);
      setServiceData({ ...serviceData, category: '' });
    } else {
      setIsCustomCategory(false);
      setServiceData({ ...serviceData, category: value });
    }
  };

  // PDF dosyası validasyonu
  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast({ title: t('error'), description: t('pdfOnlyError'), variant: 'destructive' });
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: t('error'), description: t('pdfSizeError'), variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setPdfFile(file);
  };

  // Hizmet kaydet (yeni veya güncelle)
  const handleSaveService = async () => {
    if (!serviceData.description.trim() || !serviceData.duration) {
      toast({ title: t('error'), description: t('pleaseFillAllFields'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    let finalPdfUrl = serviceData.pdf_url;

    // PDF yükleme
    if (pdfFile) {
      setUploadingPdf(true);
      const safeName = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `services/${company.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('public-files')
        .upload(filePath, pdfFile, { upsert: true, contentType: 'application/pdf' });
      if (uploadError) {
        toast({ title: t('error'), description: t('pdfUploadError'), variant: 'destructive' });
        setSaving(false);
        setUploadingPdf(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('public-files').getPublicUrl(filePath);
      finalPdfUrl = publicUrl;
      setUploadingPdf(false);
    }

    const payload = {
      company_id: company.id,
      description: serviceData.description.trim(),
      category: serviceData.category || null,
      expert_id: (serviceData.expert_id && serviceData.expert_id !== '__none__') ? serviceData.expert_id : null,
      duration: parseInt(serviceData.duration),
      price: serviceData.price === '' ? null : parseFloat(serviceData.price),
      notes: serviceData.notes || null,
      color: serviceData.color || '#9333EA',
      is_active: serviceData.is_active,
      pdf_url: finalPdfUrl || null,
    };

    let error;
    if (editingService) {
      ({ error } = await supabase.from('company_services').update(payload).eq('id', editingService.id));
    } else {
      ({ error } = await supabase.from('company_services').insert(payload));
    }

    if (error) {
      toast({ title: t('error'), description: t('serviceSaveError', { error: error.message }), variant: 'destructive' });
    } else {
      toast({ title: t('success'), description: t('serviceSaved') });
      setIsModalOpen(false);
      fetchServices();
    }
    setSaving(false);
  };

  // Aktif/pasif durumunu değiştir
  const handleToggleActive = async (service, e) => {
    e.stopPropagation();
    const { error } = await supabase.from('company_services')
      .update({ is_active: !service.is_active }).eq('id', service.id);
    if (!error) {
      setServices(prev => prev.map(s =>
        s.id === service.id ? { ...s, is_active: !s.is_active } : s
      ));
      toast({
        title: t('success'),
        description: service.is_active ? t('serviceDeactivated') : t('serviceActivated'),
      });
    } else {
      toast({ title: t('error'), description: t('serviceToggleError'), variant: 'destructive' });
    }
  };

  // Silme onay dialogunu aç
  const confirmDelete = (service) => {
    setServiceToDelete(service);
    setIsDeleteDialogOpen(true);
  };

  // Hizmet sil
  const handleDelete = async () => {
    if (!serviceToDelete) return;
    const { error } = await supabase.from('company_services').delete().eq('id', serviceToDelete.id);
    if (error) {
      toast({ title: t('error'), description: t('serviceDeleteError'), variant: 'destructive' });
    } else {
      toast({ title: t('success'), description: t('serviceDeleted') });
      setServices(prev => prev.filter(s => s.id !== serviceToDelete.id));
    }
    setIsDeleteDialogOpen(false);
    setServiceToDelete(null);
  };

  // Arama ve kategori filtresi
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        s.description.toLowerCase().includes(q) ||
        (s.category?.toLowerCase().includes(q)) ||
        (s.notes?.toLowerCase().includes(q));
      const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, searchQuery, activeCategory]);

  // Mevcut kategorileri listele
  const uniqueCategories = useMemo(() =>
    [...new Set(services.map(s => s.category).filter(Boolean))].sort(),
  [services]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('servicesTitle')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('servicesSubtitle')}</p>
        </div>
        <Button onClick={openModalForCreate}
          className="bg-[#E91E8C] hover:bg-[#C91A7A] text-white shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          {t('addService')}
        </Button>
      </div>

      {/* Arama + Görünüm Seçimi */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm
              focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-[#E91E8C]"
            placeholder={t('searchServices')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white">
          <button onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors ${viewMode === 'grid'
              ? 'bg-pink-50 text-[#E91E8C]' : 'text-slate-400 hover:text-slate-600'}`}
            title={t('gridView')}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-2 transition-colors ${viewMode === 'list'
              ? 'bg-pink-50 text-[#E91E8C]' : 'text-slate-400 hover:text-slate-600'}`}
            title={t('listView')}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kategori Filtre Chip'leri */}
      {uniqueCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
              ${activeCategory === 'all'
                ? 'bg-[#E91E8C] text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-pink-300'}`}>
            {t('allCategories')} ({services.length})
          </button>
          {uniqueCategories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                ${activeCategory === cat
                  ? 'bg-[#E91E8C] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-pink-300'}`}>
              {cat} ({services.filter(s => s.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* İçerik */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-pink-200 border-t-[#E91E8C] rounded-full animate-spin" />
        </div>
      ) : filteredServices.length === 0 ? (
        /* Boş Durum */
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-[#E91E8C]" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            {searchQuery || activeCategory !== 'all' ? 'Sonuç bulunamadı' : t('noService')}
          </h3>
          {!searchQuery && activeCategory === 'all' && (
            <Button onClick={openModalForCreate}
              className="mt-4 bg-[#E91E8C] hover:bg-[#C91A7A] text-white">
              <Plus className="w-4 h-4 mr-2" />
              {t('addFirstService')}
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Izgara Görünümü */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map(service => (
            <ServiceCard key={service.id} service={service}
              onEdit={openModalForEdit}
              onDelete={confirmDelete}
              onToggleActive={handleToggleActive} />
          ))}
        </div>
      ) : (
        /* Liste Görünümü */
        <ServiceListView services={filteredServices}
          onEdit={openModalForEdit}
          onDelete={confirmDelete}
          onToggleActive={handleToggleActive} />
      )}

      {/* Hizmet Oluştur / Düzenle Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? t('editService') : t('newService')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* BÖLÜM 1: Temel Bilgiler */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 pb-1 border-b border-slate-100">
                Temel Bilgiler
              </h4>

              {/* Hizmet Adı */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  {t('serviceName')} *
                </label>
                <Input
                  placeholder={t('serviceName')}
                  value={serviceData.description}
                  onChange={(e) => setServiceData({ ...serviceData, description: e.target.value })}
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  {t('serviceCategory')}
                </label>
                <Select
                  value={isCustomCategory ? '__custom__' : (serviceData.category || '__none__')}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('selectCategory')}</SelectItem>
                    {BEAUTY_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">{t('customCategory')}</SelectItem>
                  </SelectContent>
                </Select>
                {isCustomCategory && (
                  <Input
                    className="mt-2"
                    placeholder={t('customCategoryPlaceholder')}
                    value={serviceData.category}
                    onChange={(e) => setServiceData({ ...serviceData, category: e.target.value })}
                  />
                )}
              </div>

              {/* Uzman (opsiyonel) */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  {t('serviceExpert')} <span className="text-slate-400 font-normal">(opsiyonel)</span>
                </label>
                <Select
                  value={serviceData.expert_id || '__none__'}
                  onValueChange={(v) => setServiceData({ ...serviceData, expert_id: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Uzman Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Uzman Seçin</SelectItem>
                    {staff.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* BÖLÜM 2: Süre ve Fiyat */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 pb-1 border-b border-slate-100">
                Süre &amp; Fiyat
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    {t('serviceDuration')} *
                  </label>
                  <Input
                    type="number"
                    min="5"
                    step="5"
                    value={serviceData.duration}
                    onChange={(e) => setServiceData({ ...serviceData, duration: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    {t('servicePrice')} <span className="text-slate-400 font-normal">(opsiyonel)</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={t('priceNotSpecified')}
                    value={serviceData.price}
                    onChange={(e) => setServiceData({ ...serviceData, price: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* BÖLÜM 3: Takvim Rengi */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 pb-1 border-b border-slate-100">
                {t('calendarColor')}
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setServiceData({ ...serviceData, color })}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110
                      ${serviceData.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <input
                  type="color"
                  value={serviceData.color}
                  onChange={(e) => setServiceData({ ...serviceData, color: e.target.value })}
                  className="w-8 h-8 rounded-full border-2 border-slate-200 cursor-pointer"
                  title="Özel renk"
                />
              </div>
            </div>

            {/* BÖLÜM 4: Notlar */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 pb-1 border-b border-slate-100">
                {t('serviceNotes')}
              </h4>
              <textarea
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-[#E91E8C]
                  resize-none min-h-[80px]"
                placeholder={t('serviceNotesPlaceholder')}
                value={serviceData.notes}
                onChange={(e) => setServiceData({ ...serviceData, notes: e.target.value })}
              />
            </div>

            {/* BÖLÜM 5: PDF Broşür */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 pb-1 border-b border-slate-100">
                {t('servicePdf')}
              </h4>
              {serviceData.pdf_url && !pdfFile && (
                <a href={serviceData.pdf_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#9333EA] hover:underline">
                  <FileText className="w-4 h-4" />
                  Mevcut PDF'yi görüntüle
                </a>
              )}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4
                hover:border-pink-300 transition-colors">
                <label className="cursor-pointer block">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="w-6 h-6 text-slate-400" />
                    {pdfFile ? (
                      <span className="text-sm text-green-600 font-medium">
                        ✓ {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    ) : (
                      <>
                        <span className="text-sm text-slate-600">{t('uploadPdf')}</span>
                        <span className="text-xs text-slate-400">PDF, maks 10MB</span>
                      </>
                    )}
                  </div>
                  <input type="file" accept=".pdf" className="hidden" onChange={handlePdfChange} />
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
            <Button
              onClick={handleSaveService}
              disabled={saving || uploadingPdf}
              className="bg-[#E91E8C] hover:bg-[#C91A7A] text-white"
            >
              {(saving || uploadingPdf)
                ? (uploadingPdf ? t('uploadingPdf') : `${t('save')}...`)
                : t('save')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialogu */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteServiceConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteServiceConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServicesPage;
