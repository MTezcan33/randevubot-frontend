import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Plus, Edit, Trash2, DoorOpen, Wrench, Clock, Users,
  Search, MoreVertical, Star, MapPin, Package, Shield,
  BarChart3, CalendarDays, ChevronLeft, ChevronRight
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
import {
  getSpaces, createSpace, updateSpace, deleteSpace,
  getSpaceWorkingHours, setSpaceWorkingHours, createDefaultWorkingHours,
  getEquipment, createEquipment, updateEquipment, deleteEquipment
} from '../../services/resourceService';

// Renk seçenekleri
const COLOR_PRESETS = [
  '#E91E8C', '#9333EA', '#D4AF37', '#10B981',
  '#3B82F6', '#F97316', '#EF4444', '#06B6D4',
  '#8B5CF6', '#FB923C', '#F59E0B', '#64748B',
];

// Booking mode seçenekleri
const BOOKING_MODES = [
  { value: 'private', labelKey: 'bookingModePrivate' },
  { value: 'shared', labelKey: 'bookingModeShared' },
  { value: 'group_private', labelKey: 'bookingModeGroupPrivate' },
];

// Günler (Türkçe — mevcut pattern)
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const ResourcesPage = () => {
  const { company } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Tab state
  const [activeTab, setActiveTab] = useState('spaces');

  // Alanlar state
  const [spaces, setSpaces] = useState([]);
  const [spacesLoading, setSpacesLoading] = useState(true);
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [spaceToDelete, setSpaceToDelete] = useState(null);
  const [spaceSearchQuery, setSpaceSearchQuery] = useState('');

  // Ekipmanlar state
  const [equipment, setEquipment] = useState([]);
  const [equipmentLoading, setEquipmentLoading] = useState(true);
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState(null);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');

  // Form state'leri
  const [spaceForm, setSpaceForm] = useState({
    name: '', description: '', capacity: 1,
    booking_mode: 'private', buffer_minutes: 15,
    color: '#6366F1', sort_order: 0,
  });
  const [spaceWorkingHours, setSpaceWorkingHoursState] = useState(
    DAYS.map(day => ({ day, is_open: true, start_time: '09:00', end_time: '21:00' }))
  );

  const [equipmentForm, setEquipmentForm] = useState({
    name: '', description: '', quantity: 1,
    location_type: 'portable', fixed_space_id: null,
  });

  const [saving, setSaving] = useState(false);

  // Doluluk tab state
  const [occupancyDate, setOccupancyDate] = useState(new Date());
  const [dailyOccupancy, setDailyOccupancy] = useState([]);
  const [weeklyHeatmap, setWeeklyHeatmap] = useState([]);
  const [occupancyLoading, setOccupancyLoading] = useState(false);

  // ============================================================
  // VERİ YÜKLEME
  // ============================================================

  const fetchSpaces = async () => {
    if (!company) return;
    setSpacesLoading(true);
    try {
      const data = await getSpaces(company.id);
      setSpaces(data);
    } catch (err) {
      console.error('Alanlar yükleme hatası:', err);
    } finally {
      setSpacesLoading(false);
    }
  };

  const fetchEquipment = async () => {
    if (!company) return;
    setEquipmentLoading(true);
    try {
      const data = await getEquipment(company.id);
      setEquipment(data);
    } catch (err) {
      console.error('Ekipman yükleme hatası:', err);
    } finally {
      setEquipmentLoading(false);
    }
  };

  // ── Günlük doluluk zaman çizelgesi ──────────────────────────────────────
  const fetchDailyOccupancy = async (date) => {
    if (!company || spaces.length === 0) return;
    setOccupancyLoading(true);

    const dateStr = date.toISOString().split('T')[0];

    // O güne ait tüm randevuları al (space_id olanlar)
    const { data: apptData } = await supabase
      .from('appointments')
      .select('id, space_id, time, company_services(duration)')
      .eq('company_id', company.id)
      .eq('date', dateStr)
      .neq('status', 'iptal')
      .not('space_id', 'is', null);

    // Saat bazlı doluluk hesapla (08:00 - 22:00)
    const hours = [];
    for (let h = 8; h <= 22; h++) {
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      const hourMin = h * 60;

      const hourData = { hour: hourStr, spaces: {} };

      spaces.forEach(space => {
        let count = 0;
        if (apptData) {
          apptData.forEach(appt => {
            if (appt.space_id !== space.id) return;
            const [ah, am] = (appt.time || '00:00').substring(0, 5).split(':').map(Number);
            const startMin = ah * 60 + am;
            const endMin = startMin + (appt.company_services?.duration || 30);
            // Bu saat diliminde aktif mi?
            if (hourMin < endMin && hourMin + 60 > startMin) {
              count++;
            }
          });
        }
        hourData.spaces[space.id] = {
          count,
          capacity: space.capacity,
          percentage: space.capacity > 0 ? Math.round((count / space.capacity) * 100) : 0,
        };
      });

      hours.push(hourData);
    }

    setDailyOccupancy(hours);
    setOccupancyLoading(false);
  };

  // ── Haftalık ısı haritası ─────────────────────────────────────────────────
  const fetchWeeklyHeatmap = async () => {
    if (!company || spaces.length === 0) return;

    // Son 7 gün
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    const startDate = days[0].toISOString().split('T')[0];
    const endDate = days[6].toISOString().split('T')[0];

    const { data: apptData } = await supabase
      .from('appointments')
      .select('id, space_id, date, time, company_services(duration)')
      .eq('company_id', company.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .neq('status', 'iptal')
      .not('space_id', 'is', null);

    // Her gün × her alan için toplam kullanım süresi / toplam müsait süre
    const heatmapData = days.map(day => {
      const dayStr = day.toISOString().split('T')[0];
      const dayName = day.toLocaleDateString('tr-TR', { weekday: 'short' });
      const dayNum = day.getDate();

      const spaceData = {};
      spaces.forEach(space => {
        let totalUsedMinutes = 0;
        if (apptData) {
          apptData.forEach(appt => {
            if (appt.space_id !== space.id || appt.date !== dayStr) return;
            totalUsedMinutes += (appt.company_services?.duration || 30);
          });
        }
        // 14 saatlik gün (08:00-22:00 = 840 dk) varsayımı
        const totalAvailable = 840;
        spaceData[space.id] = {
          usedMinutes: totalUsedMinutes,
          percentage: Math.min(Math.round((totalUsedMinutes / totalAvailable) * 100), 100),
        };
      });

      return { date: dayStr, dayName, dayNum, spaces: spaceData };
    });

    setWeeklyHeatmap(heatmapData);
  };

  useEffect(() => {
    if (company) {
      fetchSpaces();
      fetchEquipment();
    }
  }, [company]);

  // Doluluk tab'ı açıldığında verileri yükle
  useEffect(() => {
    if (activeTab === 'occupancy' && spaces.length > 0) {
      fetchDailyOccupancy(occupancyDate);
      fetchWeeklyHeatmap();
    }
  }, [activeTab, spaces, occupancyDate]);

  // ============================================================
  // ALAN İŞLEMLERİ
  // ============================================================

  const handleOpenSpaceModal = async (space = null) => {
    if (space) {
      setEditingSpace(space);
      setSpaceForm({
        name: space.name,
        description: space.description || '',
        capacity: space.capacity || 1,
        booking_mode: space.booking_mode || 'private',
        buffer_minutes: space.buffer_minutes || 0,
        color: space.color || '#6366F1',
        sort_order: space.sort_order || 0,
      });
      // Çalışma saatlerini yükle
      try {
        const hours = await getSpaceWorkingHours(company.id, space.id);
        if (hours.length > 0) {
          setSpaceWorkingHoursState(
            DAYS.map(day => {
              const found = hours.find(h => h.day === day);
              return found
                ? { day, is_open: found.is_open, start_time: found.start_time || '09:00', end_time: found.end_time || '21:00' }
                : { day, is_open: true, start_time: '09:00', end_time: '21:00' };
            })
          );
        } else {
          setSpaceWorkingHoursState(
            DAYS.map(day => ({ day, is_open: true, start_time: '09:00', end_time: '21:00' }))
          );
        }
      } catch {
        setSpaceWorkingHoursState(
          DAYS.map(day => ({ day, is_open: true, start_time: '09:00', end_time: '21:00' }))
        );
      }
    } else {
      setEditingSpace(null);
      setSpaceForm({
        name: '', description: '', capacity: 1,
        booking_mode: 'private', buffer_minutes: 15,
        color: COLOR_PRESETS[spaces.length % COLOR_PRESETS.length],
        sort_order: spaces.length + 1,
      });
      setSpaceWorkingHoursState(
        DAYS.map(day => ({ day, is_open: true, start_time: '09:00', end_time: '21:00' }))
      );
    }
    setSpaceModalOpen(true);
  };

  const handleSaveSpace = async () => {
    if (!company || !spaceForm.name.trim()) return;
    setSaving(true);
    try {
      let spaceId;
      if (editingSpace) {
        await updateSpace(editingSpace.id, spaceForm);
        spaceId = editingSpace.id;
      } else {
        const created = await createSpace(company.id, spaceForm);
        spaceId = created.id;
      }
      // Çalışma saatlerini kaydet
      await setSpaceWorkingHours(company.id, spaceId, spaceWorkingHours);

      toast({
        title: t('success'),
        description: editingSpace ? t('spaceUpdated') : t('spaceCreated'),
      });
      setSpaceModalOpen(false);
      fetchSpaces();
    } catch (err) {
      toast({
        title: t('error'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSpace = async () => {
    if (!spaceToDelete) return;
    try {
      await deleteSpace(spaceToDelete.id);
      toast({ title: t('success'), description: t('spaceDeleted') });
      setSpaceToDelete(null);
      fetchSpaces();
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  };

  // ============================================================
  // EKİPMAN İŞLEMLERİ
  // ============================================================

  const handleOpenEquipmentModal = (eq = null) => {
    if (eq) {
      setEditingEquipment(eq);
      setEquipmentForm({
        name: eq.name,
        description: eq.description || '',
        quantity: eq.quantity || 1,
        location_type: eq.location_type || 'portable',
        fixed_space_id: eq.fixed_space_id || null,
      });
    } else {
      setEditingEquipment(null);
      setEquipmentForm({
        name: '', description: '', quantity: 1,
        location_type: 'portable', fixed_space_id: null,
      });
    }
    setEquipmentModalOpen(true);
  };

  const handleSaveEquipment = async () => {
    if (!company || !equipmentForm.name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...equipmentForm };
      if (payload.location_type === 'portable') payload.fixed_space_id = null;

      if (editingEquipment) {
        await updateEquipment(editingEquipment.id, payload);
      } else {
        await createEquipment(company.id, payload);
      }
      toast({
        title: t('success'),
        description: editingEquipment ? t('equipmentUpdated') : t('equipmentCreated'),
      });
      setEquipmentModalOpen(false);
      fetchEquipment();
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEquipment = async () => {
    if (!equipmentToDelete) return;
    try {
      await deleteEquipment(equipmentToDelete.id);
      toast({ title: t('success'), description: t('equipmentDeleted') });
      setEquipmentToDelete(null);
      fetchEquipment();
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  };

  // ============================================================
  // FİLTRELEME
  // ============================================================

  const filteredSpaces = useMemo(() => {
    if (!spaceSearchQuery) return spaces;
    const q = spaceSearchQuery.toLowerCase();
    return spaces.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
  }, [spaces, spaceSearchQuery]);

  const filteredEquipment = useMemo(() => {
    if (!equipmentSearchQuery) return equipment;
    const q = equipmentSearchQuery.toLowerCase();
    return equipment.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q)
    );
  }, [equipment, equipmentSearchQuery]);

  // ============================================================
  // BOOKING MODE ETİKETİ
  // ============================================================

  const getBookingModeLabel = (mode) => {
    switch (mode) {
      case 'shared': return t('bookingModeShared');
      case 'private': return t('bookingModePrivate');
      case 'group_private': return t('bookingModeGroupPrivate');
      default: return mode;
    }
  };

  const getBookingModeBadgeColor = (mode) => {
    switch (mode) {
      case 'shared': return 'bg-blue-100 text-blue-700';
      case 'private': return 'bg-purple-100 text-purple-700';
      case 'group_private': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // ============================================================
  // ÇALIŞMA SAATLERİ TOGGLE
  // ============================================================

  const toggleWorkingHour = (dayIndex) => {
    setSpaceWorkingHoursState(prev =>
      prev.map((h, i) => i === dayIndex ? { ...h, is_open: !h.is_open } : h)
    );
  };

  const updateWorkingHourTime = (dayIndex, field, value) => {
    setSpaceWorkingHoursState(prev =>
      prev.map((h, i) => i === dayIndex ? { ...h, [field]: value } : h)
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{t('resources')}</h1>
          <p className="text-sm text-stone-500 mt-1">{t('resourcesDescription')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('spaces')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'spaces'
              ? 'bg-white text-stone-800 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <DoorOpen className="w-4 h-4" />
          {t('spaces')} ({spaces.length})
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'equipment'
              ? 'bg-white text-stone-800 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <Wrench className="w-4 h-4" />
          {t('equipment')} ({equipment.length})
        </button>
        {spaces.length > 0 && (
          <button
            onClick={() => setActiveTab('occupancy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'occupancy'
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            {t('occupancy')}
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* ALANLAR TAB'I */}
      {/* ============================================================ */}
      {activeTab === 'spaces' && (
        <div className="space-y-4">
          {/* Arama + Ekle */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                placeholder={t('searchSpaces')}
                value={spaceSearchQuery}
                onChange={(e) => setSpaceSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => handleOpenSpaceModal()} className="gap-2 bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-800 hover:to-teal-700">
              <Plus className="w-4 h-4" />
              {t('addSpace')}
            </Button>
          </div>

          {/* Alan kartları */}
          {spacesLoading ? (
            <div className="flex items-center justify-center py-12 text-stone-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : filteredSpaces.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
              <DoorOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500 font-medium">{t('noSpacesYet')}</p>
              <p className="text-sm text-stone-400 mt-1">{t('noSpacesDescription')}</p>
              <Button
                onClick={() => handleOpenSpaceModal()}
                className="mt-4 gap-2 bg-gradient-to-r from-emerald-700 to-teal-600"
              >
                <Plus className="w-4 h-4" />
                {t('addFirstSpace')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSpaces.map((space, idx) => (
                <motion.div
                  key={space.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-xl border border-stone-200 p-4 hover:shadow-md transition-shadow"
                >
                  {/* Üst kısım: renk çizgi + isim */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: space.color + '20' }}
                      >
                        <DoorOpen className="w-5 h-5" style={{ color: space.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-800 text-sm">{space.name}</h3>
                        {space.description && (
                          <p className="text-xs text-stone-400 line-clamp-1 mt-0.5">{space.description}</p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-stone-100 text-stone-400">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenSpaceModal(space)}>
                          <Edit className="w-4 h-4 mr-2" /> {t('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSpaceToDelete(space)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Bilgi badge'leri */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-600">
                      <Users className="w-3 h-3" />
                      {t('capacity')}: {space.capacity}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getBookingModeBadgeColor(space.booking_mode)}`}>
                      <Shield className="w-3 h-3" />
                      {getBookingModeLabel(space.booking_mode)}
                    </span>
                    {space.buffer_minutes > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                        <Clock className="w-3 h-3" />
                        {space.buffer_minutes} dk
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* EKİPMANLAR TAB'I */}
      {/* ============================================================ */}
      {activeTab === 'equipment' && (
        <div className="space-y-4">
          {/* Arama + Ekle */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                placeholder={t('searchEquipment')}
                value={equipmentSearchQuery}
                onChange={(e) => setEquipmentSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => handleOpenEquipmentModal()} className="gap-2 bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-800 hover:to-teal-700">
              <Plus className="w-4 h-4" />
              {t('addEquipment')}
            </Button>
          </div>

          {/* Ekipman kartları */}
          {equipmentLoading ? (
            <div className="flex items-center justify-center py-12 text-stone-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
              <Wrench className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500 font-medium">{t('noEquipmentYet')}</p>
              <p className="text-sm text-stone-400 mt-1">{t('noEquipmentDescription')}</p>
              <Button
                onClick={() => handleOpenEquipmentModal()}
                className="mt-4 gap-2 bg-gradient-to-r from-emerald-700 to-teal-600"
              >
                <Plus className="w-4 h-4" />
                {t('addFirstEquipment')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEquipment.map((eq, idx) => (
                <motion.div
                  key={eq.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-xl border border-stone-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-800 text-sm">{eq.name}</h3>
                        {eq.description && (
                          <p className="text-xs text-stone-400 line-clamp-1 mt-0.5">{eq.description}</p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-stone-100 text-stone-400">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEquipmentModal(eq)}>
                          <Edit className="w-4 h-4 mr-2" /> {t('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setEquipmentToDelete(eq)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-600">
                      <Package className="w-3 h-3" />
                      {t('quantity')}: {eq.quantity}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      eq.location_type === 'fixed' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                    }`}>
                      <MapPin className="w-3 h-3" />
                      {eq.location_type === 'fixed' ? t('locationFixed') : t('locationPortable')}
                    </span>
                    {eq.location_type === 'fixed' && eq.spaces?.name && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                        <DoorOpen className="w-3 h-3" />
                        {eq.spaces.name}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* DOLULUK TAB'I */}
      {/* ============================================================ */}
      {activeTab === 'occupancy' && (
        <div className="space-y-6">
          {/* Günlük Zaman Çizelgesi */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-stone-800 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-purple-600" />
                {t('dailyTimeline')}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const prev = new Date(occupancyDate);
                    prev.setDate(prev.getDate() - 1);
                    setOccupancyDate(prev);
                  }}
                  className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-stone-700 min-w-[120px] text-center">
                  {occupancyDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => {
                    const next = new Date(occupancyDate);
                    next.setDate(next.getDate() + 1);
                    setOccupancyDate(next);
                  }}
                  className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {occupancyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
              </div>
            ) : dailyOccupancy.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('noSpacesForOccupancy')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-2 text-stone-500 font-medium sticky left-0 bg-white min-w-[100px]">
                        {t('spaces')}
                      </th>
                      {dailyOccupancy.map(h => (
                        <th key={h.hour} className="text-center py-2 px-1 text-stone-400 font-normal min-w-[44px]">
                          {h.hour.substring(0, 2)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {spaces.filter(s => s.is_active !== false).map(space => (
                      <tr key={space.id} className="border-t border-stone-50">
                        <td className="py-2 px-2 text-stone-700 font-medium sticky left-0 bg-white truncate max-w-[140px]">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: space.color || '#6366F1' }}
                            />
                            <span className="truncate">{space.name}</span>
                          </div>
                        </td>
                        {dailyOccupancy.map(h => {
                          const cell = h.spaces[space.id];
                          if (!cell) return <td key={h.hour} className="py-2 px-1" />;
                          const pct = cell.percentage;
                          const bg = pct === 0
                            ? 'bg-stone-50'
                            : pct >= 100
                              ? 'bg-red-400'
                              : pct >= 75
                                ? 'bg-orange-300'
                                : pct >= 50
                                  ? 'bg-amber-200'
                                  : pct >= 25
                                    ? 'bg-emerald-200'
                                    : 'bg-emerald-100';
                          const textColor = pct >= 75 ? 'text-white' : 'text-stone-600';

                          return (
                            <td key={h.hour} className="py-1 px-0.5">
                              <div
                                className={`w-full h-7 rounded flex items-center justify-center ${bg} ${textColor} font-medium`}
                                title={`${space.name} ${h.hour}: ${cell.count}/${cell.capacity}`}
                              >
                                {cell.count > 0 ? cell.count : ''}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Haftalık Isı Haritası */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h3 className="text-base font-semibold text-stone-800 flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              {t('weeklyHeatmap')}
            </h3>

            {weeklyHeatmap.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('noSpacesForOccupancy')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-2 text-stone-500 font-medium sticky left-0 bg-white min-w-[100px]">
                        {t('spaces')}
                      </th>
                      {weeklyHeatmap.map(day => (
                        <th key={day.date} className="text-center py-2 px-2 text-stone-500 font-medium min-w-[60px]">
                          <div className="flex flex-col items-center">
                            <span className="text-stone-400 font-normal">{day.dayName}</span>
                            <span className="text-stone-700">{day.dayNum}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {spaces.filter(s => s.is_active !== false).map(space => (
                      <tr key={space.id} className="border-t border-stone-50">
                        <td className="py-2 px-2 text-stone-700 font-medium sticky left-0 bg-white truncate max-w-[140px]">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: space.color || '#6366F1' }}
                            />
                            <span className="truncate">{space.name}</span>
                          </div>
                        </td>
                        {weeklyHeatmap.map(day => {
                          const cell = day.spaces[space.id];
                          if (!cell) return <td key={day.date} className="py-2 px-2" />;
                          const pct = cell.percentage;
                          // Renk yoğunluğu: 0% → beyaz, 100% → koyu
                          const bg = pct === 0
                            ? 'bg-stone-50'
                            : pct >= 80
                              ? 'bg-red-400'
                              : pct >= 60
                                ? 'bg-orange-300'
                                : pct >= 40
                                  ? 'bg-amber-200'
                                  : pct >= 20
                                    ? 'bg-emerald-200'
                                    : 'bg-emerald-100';
                          const textColor = pct >= 60 ? 'text-white' : 'text-stone-600';

                          return (
                            <td key={day.date} className="py-1 px-1">
                              <div
                                className={`w-full h-10 rounded-lg flex items-center justify-center ${bg} ${textColor} font-semibold`}
                                title={`${space.name} - ${day.dayName}: ${cell.usedMinutes} dk kullanım`}
                              >
                                {pct > 0 ? `${pct}%` : '-'}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Legend */}
                <div className="flex items-center gap-3 mt-4 text-xs text-stone-500">
                  <span>{t('utilizationRate')}:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-stone-50 border border-stone-200" />
                    <span>0%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-emerald-100" />
                    <span>1-20%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-emerald-200" />
                    <span>20-40%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-amber-200" />
                    <span>40-60%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-orange-300" />
                    <span>60-80%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-red-400" />
                    <span>80%+</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ALAN EKLEME/DÜZENLEME MODAL */}
      {/* ============================================================ */}
      <Dialog open={spaceModalOpen} onOpenChange={setSpaceModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-emerald-600" />
              {editingSpace ? t('editSpace') : t('addSpace')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* İsim */}
            <div>
              <label className="text-sm font-medium text-stone-700 mb-1 block">{t('spaceName')} *</label>
              <Input
                value={spaceForm.name}
                onChange={(e) => setSpaceForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t('spaceNamePlaceholder')}
              />
            </div>

            {/* Açıklama */}
            <div>
              <label className="text-sm font-medium text-stone-700 mb-1 block">{t('description')}</label>
              <textarea
                value={spaceForm.description}
                onChange={(e) => setSpaceForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t('spaceDescriptionPlaceholder')}
                rows={2}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Kapasite + Buffer */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-stone-700 mb-1 block">{t('capacity')}</label>
                <Input
                  type="number"
                  min={1}
                  value={spaceForm.capacity}
                  onChange={(e) => setSpaceForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 mb-1 block">{t('bufferMinutes')}</label>
                <Input
                  type="number"
                  min={0}
                  step={5}
                  value={spaceForm.buffer_minutes}
                  onChange={(e) => setSpaceForm(f => ({ ...f, buffer_minutes: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* Booking Mode */}
            <div>
              <label className="text-sm font-medium text-stone-700 mb-1 block">{t('bookingMode')}</label>
              <Select
                value={spaceForm.booking_mode}
                onValueChange={(val) => setSpaceForm(f => ({ ...f, booking_mode: val }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_MODES.map(bm => (
                    <SelectItem key={bm.value} value={bm.value}>
                      {t(bm.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-stone-400 mt-1">
                {spaceForm.booking_mode === 'shared' && t('bookingModeSharedDesc')}
                {spaceForm.booking_mode === 'private' && t('bookingModePrivateDesc')}
                {spaceForm.booking_mode === 'group_private' && t('bookingModeGroupPrivateDesc')}
              </p>
            </div>

            {/* Renk */}
            <div>
              <label className="text-sm font-medium text-stone-700 mb-1 block">{t('color')}</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setSpaceForm(f => ({ ...f, color: c }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      spaceForm.color === c ? 'border-stone-800 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Çalışma Saatleri */}
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('workingHours')}
              </label>
              <div className="space-y-2 bg-stone-50 rounded-lg p-3">
                {spaceWorkingHours.map((wh, idx) => (
                  <div key={wh.day} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleWorkingHour(idx)}
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-colors ${
                        wh.is_open
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-stone-200 text-stone-400'
                      }`}
                    >
                      {wh.day.charAt(0)}
                    </button>
                    <span className={`text-xs w-16 flex-shrink-0 ${wh.is_open ? 'text-stone-700' : 'text-stone-400'}`}>
                      {wh.day.slice(0, 3)}
                    </span>
                    {wh.is_open ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="time"
                          value={wh.start_time}
                          onChange={(e) => updateWorkingHourTime(idx, 'start_time', e.target.value)}
                          className="text-xs border border-stone-300 rounded px-2 py-1 w-24"
                        />
                        <span className="text-stone-400 text-xs">-</span>
                        <input
                          type="time"
                          value={wh.end_time}
                          onChange={(e) => updateWorkingHourTime(idx, 'end_time', e.target.value)}
                          className="text-xs border border-stone-300 rounded px-2 py-1 w-24"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400 italic">{t('closed')}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSpaceModalOpen(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveSpace}
              disabled={saving || !spaceForm.name.trim()}
              className="bg-gradient-to-r from-emerald-700 to-teal-600"
            >
              {saving ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* EKİPMAN EKLEME/DÜZENLEME MODAL */}
      {/* ============================================================ */}
      <Dialog open={equipmentModalOpen} onOpenChange={setEquipmentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-600" />
              {editingEquipment ? t('editEquipment') : t('addEquipment')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* İsim */}
            <div>
              <label className="text-sm font-medium text-stone-700 mb-1 block">{t('equipmentName')} *</label>
              <Input
                value={equipmentForm.name}
                onChange={(e) => setEquipmentForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t('equipmentNamePlaceholder')}
              />
            </div>

            {/* Açıklama */}
            <div>
              <label className="text-sm font-medium text-stone-700 mb-1 block">{t('description')}</label>
              <textarea
                value={equipmentForm.description}
                onChange={(e) => setEquipmentForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t('equipmentDescriptionPlaceholder')}
                rows={2}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Miktar */}
            <div>
              <label className="text-sm font-medium text-stone-700 mb-1 block">{t('quantity')}</label>
              <Input
                type="number"
                min={1}
                value={equipmentForm.quantity}
                onChange={(e) => setEquipmentForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>

            {/* Konum Tipi */}
            <div>
              <label className="text-sm font-medium text-stone-700 mb-1 block">{t('locationType')}</label>
              <Select
                value={equipmentForm.location_type}
                onValueChange={(val) => setEquipmentForm(f => ({ ...f, location_type: val }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portable">{t('locationPortable')}</SelectItem>
                  <SelectItem value="fixed">{t('locationFixed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sabit Alan (sadece fixed ise) */}
            {equipmentForm.location_type === 'fixed' && (
              <div>
                <label className="text-sm font-medium text-stone-700 mb-1 block">{t('fixedSpace')}</label>
                <Select
                  value={equipmentForm.fixed_space_id || 'none'}
                  onValueChange={(val) => setEquipmentForm(f => ({ ...f, fixed_space_id: val === 'none' ? null : val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('selectSpace')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('noSpace')}</SelectItem>
                    {spaces.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEquipmentModalOpen(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveEquipment}
              disabled={saving || !equipmentForm.name.trim()}
              className="bg-gradient-to-r from-emerald-700 to-teal-600"
            >
              {saving ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* SİLME ONAY DİALOGLARI */}
      {/* ============================================================ */}
      <AlertDialog open={!!spaceToDelete} onOpenChange={() => setSpaceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteSpace')}</AlertDialogTitle>
            <AlertDialogDescription>
              "{spaceToDelete?.name}" {t('deleteSpaceConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSpace} className="bg-red-600 hover:bg-red-700">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!equipmentToDelete} onOpenChange={() => setEquipmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteEquipment')}</AlertDialogTitle>
            <AlertDialogDescription>
              "{equipmentToDelete?.name}" {t('deleteEquipmentConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEquipment} className="bg-red-600 hover:bg-red-700">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ResourcesPage;
