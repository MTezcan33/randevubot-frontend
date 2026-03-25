/**
 * useMonthlyOccupancy Hook
 * Aylik doluluk verisi cekme ve hesaplama
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchMonthlyAppointments, computeDailyOccupancy } from '../services/monthlyCalendarService';

export function useMonthlyOccupancy(companyId, monthDate, workingHours, experts, spaces) {
  const [occupancyMap, setOccupancyMap] = useState({});
  const [loading, setLoading] = useState(false);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const appointments = await fetchMonthlyAppointments(companyId, year, month);
      const occ = computeDailyOccupancy(appointments, workingHours || [], experts || [], spaces || []);
      setOccupancyMap(occ);
    } catch (err) {
      console.error('Doluluk hesaplanamadi:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, year, month, workingHours, experts, spaces]);

  // Ilk yukleme ve ay degisikliginde yenile
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription — randevu degisikliklerinde otomatik yenile
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`monthly-occupancy-${companyId}-${year}-${month}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `company_id=eq.${companyId}`,
      }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, year, month, refresh]);

  return { occupancyMap, loading, refresh };
}
