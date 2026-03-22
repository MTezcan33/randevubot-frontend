import { supabase } from '../lib/supabase';

// ============================================================
// ALAN (SPACE) YÖNETİMİ
// ============================================================

/**
 * Şirkete ait tüm alanları getir
 */
export const getSpaces = async (companyId) => {
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
};

/**
 * Yeni alan oluştur
 */
export const createSpace = async (companyId, spaceData) => {
  const { data, error } = await supabase
    .from('spaces')
    .insert([{ company_id: companyId, ...spaceData }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

/**
 * Alan güncelle
 */
export const updateSpace = async (spaceId, spaceData) => {
  const { data, error } = await supabase
    .from('spaces')
    .update(spaceData)
    .eq('id', spaceId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

/**
 * Alan sil (soft delete — is_active = false)
 */
export const deleteSpace = async (spaceId) => {
  const { error } = await supabase
    .from('spaces')
    .update({ is_active: false })
    .eq('id', spaceId);
  if (error) throw error;
};

// ============================================================
// ALAN ÇALIŞMA SAATLERİ
// ============================================================

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

/**
 * Bir alanın çalışma saatlerini getir
 */
export const getSpaceWorkingHours = async (companyId, spaceId) => {
  const { data, error } = await supabase
    .from('space_working_hours')
    .select('*')
    .eq('company_id', companyId)
    .eq('space_id', spaceId)
    .order('id');
  if (error) throw error;
  return data || [];
};

/**
 * Bir alanın çalışma saatlerini toplu kaydet (upsert)
 */
export const setSpaceWorkingHours = async (companyId, spaceId, hours) => {
  // hours: [{ day, is_open, start_time, end_time }]
  const rows = hours.map(h => ({
    company_id: companyId,
    space_id: spaceId,
    day: h.day,
    is_open: h.is_open,
    start_time: h.start_time || '09:00',
    end_time: h.end_time || '21:00',
  }));

  // Mevcut kayıtları sil ve yeniden ekle
  await supabase
    .from('space_working_hours')
    .delete()
    .eq('company_id', companyId)
    .eq('space_id', spaceId);

  if (rows.length > 0) {
    const { error } = await supabase
      .from('space_working_hours')
      .insert(rows);
    if (error) throw error;
  }
};

/**
 * Varsayılan çalışma saatleri oluştur (tüm günler 09:00-21:00)
 */
export const createDefaultWorkingHours = async (companyId, spaceId) => {
  const rows = DAYS.map(day => ({
    company_id: companyId,
    space_id: spaceId,
    day,
    is_open: true,
    start_time: '09:00',
    end_time: '21:00',
  }));
  const { error } = await supabase
    .from('space_working_hours')
    .insert(rows);
  if (error) throw error;
};

// ============================================================
// EKİPMAN YÖNETİMİ
// ============================================================

/**
 * Şirkete ait tüm ekipmanları getir
 */
export const getEquipment = async (companyId) => {
  const { data, error } = await supabase
    .from('equipment')
    .select('*, spaces(name)')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data || [];
};

/**
 * Yeni ekipman oluştur
 */
export const createEquipment = async (companyId, equipmentData) => {
  const { data, error } = await supabase
    .from('equipment')
    .insert([{ company_id: companyId, ...equipmentData }])
    .select('*, spaces(name)')
    .single();
  if (error) throw error;
  return data;
};

/**
 * Ekipman güncelle
 */
export const updateEquipment = async (equipmentId, equipmentData) => {
  const { data, error } = await supabase
    .from('equipment')
    .update(equipmentData)
    .eq('id', equipmentId)
    .select('*, spaces(name)')
    .single();
  if (error) throw error;
  return data;
};

/**
 * Ekipman sil (soft delete)
 */
export const deleteEquipment = async (equipmentId) => {
  const { error } = await supabase
    .from('equipment')
    .update({ is_active: false })
    .eq('id', equipmentId);
  if (error) throw error;
};

// ============================================================
// UZMAN-ALAN İLİŞKİSİ
// ============================================================

/**
 * Bir uzmanın atanmış alanlarını getir
 */
export const getExpertSpaces = async (companyId, expertId) => {
  const { data, error } = await supabase
    .from('expert_spaces')
    .select('*, spaces(name, color)')
    .eq('company_id', companyId)
    .eq('expert_id', expertId);
  if (error) throw error;
  return data || [];
};

/**
 * Tüm uzman-alan atamalarını getir (toplu)
 */
export const getAllExpertSpaces = async (companyId) => {
  const { data, error } = await supabase
    .from('expert_spaces')
    .select('expert_id, space_id, is_preferred')
    .eq('company_id', companyId);
  if (error) throw error;
  return data || [];
};

/**
 * Uzman-alan atamalarını güncelle (delete + re-insert pattern)
 */
export const setExpertSpaces = async (companyId, expertId, spaceAssignments) => {
  // spaceAssignments: [{ space_id, is_preferred }]
  await supabase
    .from('expert_spaces')
    .delete()
    .eq('company_id', companyId)
    .eq('expert_id', expertId);

  if (spaceAssignments.length > 0) {
    const rows = spaceAssignments.map(sa => ({
      company_id: companyId,
      expert_id: expertId,
      space_id: sa.space_id,
      is_preferred: sa.is_preferred || false,
    }));
    const { error } = await supabase
      .from('expert_spaces')
      .insert(rows);
    if (error) throw error;
  }
};

// ============================================================
// HİZMET-KAYNAK GEREKSİNİMLERİ
// ============================================================

/**
 * Bir hizmetin kaynak gereksinimlerini getir
 */
export const getServiceResourceRequirements = async (serviceId) => {
  const { data, error } = await supabase
    .from('service_resource_requirements')
    .select('*, spaces:resource_id(name, color)')
    .eq('service_id', serviceId);
  if (error) throw error;
  return data || [];
};

/**
 * Tüm hizmetlerin kaynak gereksinimlerini getir (toplu)
 */
export const getAllServiceResourceRequirements = async (companyId) => {
  const { data, error } = await supabase
    .from('service_resource_requirements')
    .select('service_id, resource_type, resource_id, is_required')
    .eq('company_id', companyId);
  if (error) throw error;
  return data || [];
};

/**
 * Hizmet-kaynak gereksinimlerini güncelle
 */
export const setServiceResourceRequirements = async (companyId, serviceId, requirements) => {
  // requirements: [{ resource_type, resource_id, is_required }]
  await supabase
    .from('service_resource_requirements')
    .delete()
    .eq('service_id', serviceId);

  if (requirements.length > 0) {
    const rows = requirements.map(r => ({
      company_id: companyId,
      service_id: serviceId,
      resource_type: r.resource_type,
      resource_id: r.resource_id,
      is_required: r.is_required !== undefined ? r.is_required : true,
    }));
    const { error } = await supabase
      .from('service_resource_requirements')
      .insert(rows);
    if (error) throw error;
  }
};

// ============================================================
// RANDEVU KAYNAKLARI
// ============================================================

/**
 * Randevuya kaynak ata
 */
export const setAppointmentResources = async (appointmentId, resources) => {
  // resources: [{ resource_type, resource_id }]
  if (resources.length > 0) {
    const rows = resources.map(r => ({
      appointment_id: appointmentId,
      resource_type: r.resource_type,
      resource_id: r.resource_id,
    }));
    const { error } = await supabase
      .from('appointment_resources')
      .insert(rows);
    if (error) throw error;
  }
};

/**
 * Randevunun kaynaklarını getir
 */
export const getAppointmentResources = async (appointmentId) => {
  const { data, error } = await supabase
    .from('appointment_resources')
    .select('*')
    .eq('appointment_id', appointmentId);
  if (error) throw error;
  return data || [];
};

// ============================================================
// KAYNAK MÜSAİTLİK KONTROLÜ (RPC)
// ============================================================

/**
 * Kaynak müsaitlik kontrolü — Supabase RPC fonksiyonunu çağırır
 */
export const checkResourceAvailability = async ({
  companyId, date, startTime, duration,
  spaceId = null, expertId = null,
  equipmentIds = [], excludeAppointmentId = null
}) => {
  const { data, error } = await supabase.rpc('check_resource_availability', {
    p_company_id: companyId,
    p_date: date,
    p_start_time: startTime,
    p_duration: duration,
    p_space_id: spaceId,
    p_expert_id: expertId,
    p_equipment_ids: equipmentIds,
    p_exclude_appointment_id: excludeAppointmentId,
  });
  if (error) throw error;
  return data; // { available: bool, conflicts: [...] }
};

// ============================================================
// RANDEVU-KAYNAK ILISKISI (TARIH BAZLI)
// ============================================================

/**
 * Belirli bir tarihteki tum appointment_resources kayitlarini getir
 * Room Calendar gorunumu icin kullanilir
 */
export const getAppointmentResourcesByDate = async (companyId, date) => {
  const { data, error } = await supabase
    .from('appointment_resources')
    .select(`
      id,
      appointment_id,
      resource_type,
      resource_id
    `)
    .in('appointment_id',
      supabase
        .from('appointments')
        .select('id')
        .eq('company_id', companyId)
        .eq('date', date)
        .neq('status', 'iptal')
    );

  // Supabase nested IN sorgusu desteklemedigi icin alternatif yol
  // Once randevulari al, sonra kaynaklari al
  const { data: appIds, error: appError } = await supabase
    .from('appointments')
    .select('id')
    .eq('company_id', companyId)
    .eq('date', date)
    .neq('status', 'iptal');

  if (appError) throw appError;
  if (!appIds || appIds.length === 0) return [];

  const ids = appIds.map(a => a.id);
  const { data: resources, error: resError } = await supabase
    .from('appointment_resources')
    .select('id, appointment_id, resource_type, resource_id')
    .in('appointment_id', ids);

  if (resError) throw resError;
  return resources || [];
};
