/**
 * Availability Engine Service
 * Çok boyutlu kaynak müsaitlik kontrolü (uzman + alan + ekipman)
 * Randevu oluşturmadan önce tüm kaynakların uygunluğunu doğrular.
 */

import { supabase } from '../lib/supabase';

// ─── Yardımcı Fonksiyonlar ───────────────────────────────────────────────────

/**
 * "HH:MM" formatındaki zamanı dakikaya çevirir
 * @param {string} time - "HH:MM" formatında zaman
 * @returns {number} Dakika cinsinden değer
 */
export function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Dakikayı "HH:MM" formatına çevirir
 * @param {number} min - Dakika cinsinden değer
 * @returns {string} "HH:MM" formatında zaman
 */
export function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * İki zaman aralığının çakışıp çakışmadığını kontrol eder
 * @param {number} start1 - İlk aralığın başlangıcı (dakika)
 * @param {number} end1 - İlk aralığın bitişi (dakika)
 * @param {number} start2 - İkinci aralığın başlangıcı (dakika)
 * @param {number} end2 - İkinci aralığın bitişi (dakika)
 * @returns {boolean} Çakışma var mı
 */
export function timesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

// ─── Servis Gereksinimleri ───────────────────────────────────────────────────

/**
 * Bir hizmet için gerekli kaynakları (alan + ekipman) getirir
 * @param {string} serviceId - Hizmet ID'si
 * @returns {Promise<{spaces: Array, equipment: Array}>}
 */
export async function getServiceRequirements(serviceId) {
  // Gereksinim kayıtlarını al
  const { data: requirements, error } = await supabase
    .from('service_resource_requirements')
    .select('id, service_id, resource_type, resource_id, is_required')
    .eq('service_id', serviceId);

  if (error) {
    console.error('Servis gereksinimleri alınamadı:', error);
    return { spaces: [], equipment: [] };
  }

  const spaceIds = [];
  const equipmentIds = [];
  const reqMap = {}; // resource_id → is_required mapping

  for (const req of (requirements || [])) {
    reqMap[req.resource_id] = req.is_required;
    if (req.resource_type === 'space') spaceIds.push(req.resource_id);
    else if (req.resource_type === 'equipment') equipmentIds.push(req.resource_id);
  }

  // Alan ve ekipman detaylarını ayrı ayrı çek
  let spaces = [];
  let equipment = [];

  if (spaceIds.length > 0) {
    const { data: spaceData } = await supabase
      .from('spaces')
      .select('id, name, capacity, booking_mode, buffer_minutes, is_active')
      .in('id', spaceIds);
    spaces = (spaceData || []).map(s => ({ ...s, is_required: reqMap[s.id] ?? true }));
  }

  if (equipmentIds.length > 0) {
    const { data: eqData } = await supabase
      .from('equipment')
      .select('id, name, quantity, location_type, is_active')
      .in('id', equipmentIds);
    equipment = (eqData || []).map(e => ({ ...e, is_required: reqMap[e.id] ?? true }));
  }

  return { spaces, equipment };
}

// ─── Mevcut Randevuları Getir ────────────────────────────────────────────────

/**
 * Belirli bir tarih ve şirket için aktif randevuları getirir
 * İptal edilmiş randevular hariç tutulur
 * @param {string} companyId - Şirket ID'si
 * @param {string} date - Tarih (YYYY-MM-DD)
 * @param {string|null} excludeAppointmentId - Hariç tutulacak randevu ID'si (düzenleme durumunda)
 * @returns {Promise<Array>}
 */
async function getExistingAppointments(companyId, date, excludeAppointmentId = null) {
  let query = supabase
    .from('appointments')
    .select('id, expert_id, space_id, date, time, total_duration, status')
    .eq('company_id', companyId)
    .eq('date', date)
    .neq('status', 'iptal');

  if (excludeAppointmentId) {
    query = query.neq('id', excludeAppointmentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Mevcut randevular alınamadı:', error);
    return [];
  }

  return data || [];
}

/**
 * Belirli bir tarih ve zaman aralığında kullanılan ekipmanları getirir
 * @param {string} companyId - Şirket ID'si
 * @param {string} date - Tarih (YYYY-MM-DD)
 * @param {string|null} excludeAppointmentId - Hariç tutulacak randevu ID'si
 * @returns {Promise<Array>}
 */
async function getExistingResourceAllocations(companyId, date, excludeAppointmentId = null) {
  // Önce o günkü aktif randevu ID'lerini al
  const appointments = await getExistingAppointments(companyId, date, excludeAppointmentId);
  const appointmentIds = appointments.map((a) => a.id);

  if (appointmentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('appointment_resources')
    .select('id, appointment_id, resource_type, resource_id')
    .in('appointment_id', appointmentIds);

  if (error) {
    console.error('Kaynak tahsisleri alınamadı:', error);
    return [];
  }

  // Her tahsise ilgili randevu zaman bilgisini ekle
  const appointmentMap = {};
  for (const apt of appointments) {
    appointmentMap[apt.id] = apt;
  }

  return (data || []).map((alloc) => ({
    ...alloc,
    appointment: appointmentMap[alloc.appointment_id] || null,
  }));
}

// ─── Uzman Müsaitlik Kontrolü ────────────────────────────────────────────────

/**
 * Uzmanın belirli zaman aralığında müsait olup olmadığını kontrol eder
 * @param {Array} existingAppointments - O günkü mevcut randevular
 * @param {string} expertId - Uzman ID'si
 * @param {number} startMin - Başlangıç zamanı (dakika)
 * @param {number} endMin - Bitiş zamanı (dakika)
 * @returns {{available: boolean, conflict: object|null}}
 */
function checkExpertAvailability(existingAppointments, expertId, startMin, endMin) {
  if (!expertId) {
    // Uzman gerektirmeyen hizmetler için kontrol atlanır
    return { available: true, conflict: null };
  }

  for (const apt of existingAppointments) {
    if (apt.expert_id !== expertId) continue;

    const aptStart = timeToMinutes(apt.time);
    const aptEnd = aptStart + (apt.total_duration || 0);

    if (timesOverlap(startMin, endMin, aptStart, aptEnd)) {
      return {
        available: false,
        conflict: {
          type: 'expert',
          name: `Uzman (${expertId})`,
          message: `Uzman ${formatMinutes(aptStart)}-${formatMinutes(aptEnd)} arasında başka bir randevuya sahip`,
        },
      };
    }
  }

  return { available: true, conflict: null };
}

// ─── Alan Müsaitlik Kontrolü ─────────────────────────────────────────────────

/**
 * Alanın belirli zaman aralığında müsait olup olmadığını kontrol eder
 * booking_mode ve buffer_minutes dikkate alınır
 * @param {Array} existingAppointments - O günkü mevcut randevular
 * @param {string} spaceId - Alan ID'si
 * @param {number} startMin - Başlangıç zamanı (dakika)
 * @param {number} endMin - Bitiş zamanı (dakika)
 * @param {object} spaceInfo - Alan bilgileri {capacity, booking_mode, buffer_minutes}
 * @returns {{available: boolean, conflict: object|null}}
 */
function checkSpaceAvailability(existingAppointments, spaceId, startMin, endMin, spaceInfo) {
  if (!spaceId || !spaceInfo) {
    return { available: true, conflict: null };
  }

  const { capacity = 1, booking_mode = 'private', buffer_minutes = 0 } = spaceInfo;

  // Buffer dahil zaman aralığı (alan için)
  const bufferedStart = startMin - buffer_minutes;
  const bufferedEnd = endMin + buffer_minutes;

  // O alanda çakışan randevuları bul
  const overlappingAppointments = existingAppointments.filter((apt) => {
    if (apt.space_id !== spaceId) return false;
    const aptStart = timeToMinutes(apt.time);
    const aptEnd = aptStart + (apt.total_duration || 0);
    // Alan buffer'ı dahil çakışma kontrolü
    return timesOverlap(bufferedStart, bufferedEnd, aptStart, aptEnd);
  });

  if (overlappingAppointments.length === 0) {
    return { available: true, conflict: null };
  }

  // booking_mode'a göre müsaitlik kontrolü
  switch (booking_mode) {
    case 'private':
      // Özel mod: aynı anda sadece 1 randevu olabilir (kapasite önemsiz)
      return {
        available: false,
        conflict: {
          type: 'space',
          name: spaceInfo.name || `Alan (${spaceId})`,
          message: `Bu alan özel kullanımdadır ve belirtilen zaman aralığında dolu`,
        },
      };

    case 'shared':
      // Paylaşımlı mod: kapasiteye kadar eşzamanlı randevu olabilir
      if (overlappingAppointments.length >= capacity) {
        return {
          available: false,
          conflict: {
            type: 'space',
            name: spaceInfo.name || `Alan (${spaceId})`,
            message: `Alan kapasitesi (${capacity}) dolu — ${overlappingAppointments.length} çakışan randevu var`,
          },
        };
      }
      return { available: true, conflict: null };

    case 'group_private':
      // Grup özel modu: aynı anda sadece 1 grup olabilir ama grupta birden fazla kişi olabilir
      // Eğer farklı bir randevu grubu varsa çakışma var demektir
      return {
        available: false,
        conflict: {
          type: 'space',
          name: spaceInfo.name || `Alan (${spaceId})`,
          message: `Bu alan grup özel modundadır ve belirtilen zaman aralığında başka bir grup tarafından kullanılıyor`,
        },
      };

    default:
      return { available: true, conflict: null };
  }
}

// ─── Ekipman Müsaitlik Kontrolü ──────────────────────────────────────────────

/**
 * Ekipmanların belirli zaman aralığında müsait olup olmadığını kontrol eder
 * Eşzamanlı kullanım, ekipman miktarına karşı karşılaştırılır
 * @param {Array} resourceAllocations - O günkü kaynak tahsisleri
 * @param {Array} equipmentIds - Kontrol edilecek ekipman ID'leri
 * @param {number} startMin - Başlangıç zamanı (dakika)
 * @param {number} endMin - Bitiş zamanı (dakika)
 * @returns {Promise<{available: boolean, conflicts: Array}>}
 */
async function checkEquipmentAvailability(resourceAllocations, equipmentIds, startMin, endMin) {
  if (!equipmentIds || equipmentIds.length === 0) {
    return { available: true, conflicts: [] };
  }

  // Ekipman bilgilerini getir
  const { data: equipmentData, error } = await supabase
    .from('equipment')
    .select('id, name, quantity')
    .in('id', equipmentIds);

  if (error) {
    console.error('Ekipman bilgileri alınamadı:', error);
    return { available: false, conflicts: [{ type: 'equipment', name: 'Bilinmeyen', message: 'Ekipman bilgileri alınamadı' }] };
  }

  const equipmentMap = {};
  for (const eq of (equipmentData || [])) {
    equipmentMap[eq.id] = eq;
  }

  const conflicts = [];

  for (const eqId of equipmentIds) {
    const eq = equipmentMap[eqId];
    if (!eq) continue;

    // Bu ekipmanın çakışan zaman aralığındaki kullanım sayısını hesapla
    let concurrentUsage = 0;

    for (const alloc of resourceAllocations) {
      if (alloc.resource_type !== 'equipment' || alloc.resource_id !== eqId) continue;
      if (!alloc.appointment) continue;

      const aptStart = timeToMinutes(alloc.appointment.time);
      const aptEnd = aptStart + (alloc.appointment.total_duration || 0);

      if (timesOverlap(startMin, endMin, aptStart, aptEnd)) {
        concurrentUsage += 1;
      }
    }

    // Yeni randevu için 1 adet daha gerekiyor
    if (concurrentUsage + 1 > eq.quantity) {
      conflicts.push({
        type: 'equipment',
        name: eq.name || `Ekipman (${eqId})`,
        message: `${eq.name} ekipmanı müsait değil — toplam ${eq.quantity} adet, ${concurrentUsage} adet kullanımda`,
      });
    }
  }

  return {
    available: conflicts.length === 0,
    conflicts,
  };
}

// ─── Ana Müsaitlik Kontrolü ─────────────────────────────────────────────────

/**
 * Belirli bir slot için tüm kaynakların müsaitliğini kontrol eder
 * Uzman + Alan + Ekipman kontrollerini bir arada yapar
 *
 * @param {string} companyId - Şirket ID'si
 * @param {string} date - Tarih (YYYY-MM-DD)
 * @param {string} startTime - Başlangıç zamanı ("HH:MM")
 * @param {number} duration - Süre (dakika)
 * @param {object} options - Opsiyonel parametreler
 * @param {string} [options.expertId] - Uzman ID'si
 * @param {string} [options.serviceId] - Hizmet ID'si (kaynak gereksinimlerini otomatik almak için)
 * @param {string} [options.spaceId] - Alan ID'si
 * @param {Array<string>} [options.equipmentIds] - Ekipman ID'leri
 * @param {string} [options.excludeAppointmentId] - Hariç tutulacak randevu ID'si (düzenleme sırasında)
 * @returns {Promise<{available: boolean, conflicts: Array}>}
 */
export async function checkSlotAvailability(companyId, date, startTime, duration, options = {}) {
  const {
    expertId = null,
    serviceId = null,
    spaceId = null,
    equipmentIds = [],
    excludeAppointmentId = null,
  } = options;

  const startMin = timeToMinutes(startTime);
  const endMin = startMin + duration;
  const conflicts = [];

  // Servis gereksinimlerini al (serviceId verilmişse)
  let requiredSpaces = [];
  let requiredEquipment = [];
  if (serviceId) {
    const requirements = await getServiceRequirements(serviceId);
    requiredSpaces = requirements.spaces;
    requiredEquipment = requirements.equipment;
  }

  // O günkü mevcut randevuları getir
  const existingAppointments = await getExistingAppointments(companyId, date, excludeAppointmentId);

  // 1) Uzman müsaitlik kontrolü
  const expertCheck = checkExpertAvailability(existingAppointments, expertId, startMin, endMin);
  if (!expertCheck.available) {
    conflicts.push(expertCheck.conflict);
  }

  // 2) Alan müsaitlik kontrolü
  // Önce doğrudan belirtilen alan kontrol edilir
  if (spaceId) {
    // Alan bilgilerini getir
    const { data: spaceData } = await supabase
      .from('spaces')
      .select('id, name, capacity, booking_mode, buffer_minutes')
      .eq('id', spaceId)
      .single();

    if (spaceData) {
      const spaceCheck = checkSpaceAvailability(existingAppointments, spaceId, startMin, endMin, spaceData);
      if (!spaceCheck.available) {
        conflicts.push(spaceCheck.conflict);
      }
    }
  } else if (requiredSpaces.length > 0) {
    // Servis gereksinimleri üzerinden zorunlu alan kontrolü
    for (const reqSpace of requiredSpaces) {
      if (!reqSpace.is_required) continue;

      const spaceCheck = checkSpaceAvailability(
        existingAppointments,
        reqSpace.id,
        startMin,
        endMin,
        reqSpace
      );
      if (!spaceCheck.available) {
        conflicts.push(spaceCheck.conflict);
      }
    }
  }

  // 3) Ekipman müsaitlik kontrolü
  // Kontrol edilecek ekipman listesini belirle
  let checkEquipmentIds = [...equipmentIds];

  // Servis gereksinimlerinden zorunlu ekipmanları ekle
  for (const reqEq of requiredEquipment) {
    if (reqEq.is_required && !checkEquipmentIds.includes(reqEq.id)) {
      checkEquipmentIds.push(reqEq.id);
    }
  }

  if (checkEquipmentIds.length > 0) {
    const resourceAllocations = await getExistingResourceAllocations(companyId, date, excludeAppointmentId);
    const equipmentCheck = await checkEquipmentAvailability(resourceAllocations, checkEquipmentIds, startMin, endMin);
    if (!equipmentCheck.available) {
      conflicts.push(...equipmentCheck.conflicts);
    }
  }

  return {
    available: conflicts.length === 0,
    conflicts,
  };
}

// ─── Otomatik Kaynak Atama ───────────────────────────────────────────────────

/**
 * Bir randevu için en uygun kaynakları (alan + ekipman) otomatik atar
 * Uzmanın tercih ettiği alanlar önceliklidir, ardından en küçük müsait alan seçilir
 *
 * @param {string} companyId - Şirket ID'si
 * @param {string} date - Tarih (YYYY-MM-DD)
 * @param {string} startTime - Başlangıç zamanı ("HH:MM")
 * @param {number} duration - Süre (dakika)
 * @param {string|null} expertId - Uzman ID'si
 * @param {string} serviceId - Hizmet ID'si
 * @returns {Promise<{space_id: string|null, equipment_ids: Array<string>} | {error: string}>}
 */
export async function autoAssignResources(companyId, date, startTime, duration, expertId, serviceId) {
  const startMin = timeToMinutes(startTime);
  const endMin = startMin + duration;

  // Servis gereksinimlerini al
  const requirements = await getServiceRequirements(serviceId);

  if (requirements.spaces.length === 0 && requirements.equipment.length === 0) {
    // Kaynak gereksinimi yok
    return { space_id: null, equipment_ids: [] };
  }

  // O günkü mevcut randevuları getir
  const existingAppointments = await getExistingAppointments(companyId, date);

  // ── Alan Seçimi ──

  let selectedSpaceId = null;

  if (requirements.spaces.length > 0) {
    // Uzmanın çalışabileceği alanları al
    let preferredSpaceIds = [];
    let expertSpaceIds = [];

    if (expertId) {
      const { data: expertSpaces } = await supabase
        .from('expert_spaces')
        .select('space_id, is_preferred')
        .eq('expert_id', expertId);

      if (expertSpaces) {
        preferredSpaceIds = expertSpaces
          .filter((es) => es.is_preferred)
          .map((es) => es.space_id);
        expertSpaceIds = expertSpaces.map((es) => es.space_id);
      }
    }

    // Gereksinim listesindeki alanları önceliklerine göre sırala
    // Tercih sırası: uzmanın tercih ettiği > uzmanın çalışabildiği > diğerleri
    // Aynı öncelikte: küçük kapasiteli alan önce
    const candidateSpaces = requirements.spaces
      .filter((s) => s.is_active !== false)
      .map((space) => ({
        ...space,
        isPreferred: preferredSpaceIds.includes(space.id),
        isExpertSpace: expertSpaceIds.includes(space.id),
      }))
      .sort((a, b) => {
        // Tercih edilen alanlar önce
        if (a.isPreferred && !b.isPreferred) return -1;
        if (!a.isPreferred && b.isPreferred) return 1;
        // Uzmanın çalışabildiği alanlar sonra
        if (a.isExpertSpace && !b.isExpertSpace) return -1;
        if (!a.isExpertSpace && b.isExpertSpace) return 1;
        // En küçük kapasiteli alan önce (gereksiz büyük alan tahsis etme)
        return (a.capacity || 1) - (b.capacity || 1);
      });

    // Müsait olan ilk alanı seç
    for (const space of candidateSpaces) {
      const check = checkSpaceAvailability(existingAppointments, space.id, startMin, endMin, space);
      if (check.available) {
        selectedSpaceId = space.id;
        break;
      }
    }

    // Zorunlu alan gereksinimi varsa ve müsait alan bulunamadıysa hata döndür
    const hasMandatorySpace = requirements.spaces.some((s) => s.is_required);
    if (hasMandatorySpace && !selectedSpaceId) {
      return { error: 'Bu hizmet için uygun müsait alan bulunamadı' };
    }
  }

  // ── Ekipman Seçimi ──

  const selectedEquipmentIds = [];

  if (requirements.equipment.length > 0) {
    const resourceAllocations = await getExistingResourceAllocations(companyId, date);

    for (const reqEq of requirements.equipment) {
      if (!reqEq.is_active) continue;

      // Bu ekipmanın çakışan zaman aralığındaki kullanım sayısını hesapla
      let concurrentUsage = 0;
      for (const alloc of resourceAllocations) {
        if (alloc.resource_type !== 'equipment' || alloc.resource_id !== reqEq.id) continue;
        if (!alloc.appointment) continue;

        const aptStart = timeToMinutes(alloc.appointment.time);
        const aptEnd = aptStart + (alloc.appointment.total_duration || 0);

        if (timesOverlap(startMin, endMin, aptStart, aptEnd)) {
          concurrentUsage += 1;
        }
      }

      if (concurrentUsage < reqEq.quantity) {
        selectedEquipmentIds.push(reqEq.id);
      } else if (reqEq.is_required) {
        return { error: `Zorunlu ekipman müsait değil: ${reqEq.name}` };
      }
      // Zorunlu olmayan ekipman müsait değilse sessizce atlanır
    }
  }

  return {
    space_id: selectedSpaceId,
    equipment_ids: selectedEquipmentIds,
  };
}
