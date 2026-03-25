import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import DayDetailRoomList from './DayDetailRoomList';

export default function DayDetailServiceList({
  company,
  date,
  selectedService,
  onSelectService,
  selectedRoom,
  onSelectRoom,
  selectedUnit,
  onSelectUnit,
  spaces,
  experts,
}) {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [expertServicesMap, setExpertServicesMap] = useState(new Map());

  useEffect(() => {
    if (!company?.id) return;
    const loadData = async () => {
      const { data: svcData } = await supabase
        .from('company_services')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('description', { ascending: true });
      setServices(svcData || []);

      const { data: esData } = await supabase
        .from('expert_services')
        .select('expert_id, service_id')
        .eq('company_id', company.id);
      const map = new Map();
      (esData || []).forEach(es => {
        if (!map.has(es.service_id)) map.set(es.service_id, new Set());
        map.get(es.service_id).add(es.expert_id);
      });
      setExpertServicesMap(map);
    };
    loadData();
  }, [company?.id]);

  const expertServicesList = services.filter(s => s.requires_expert !== false);
  const selfServicesList = services.filter(s => s.requires_expert === false);

  // Fiyat formatlama: 1500 → 1.500
  const formatPrice = (price) => {
    if (!price) return '';
    return Number(price).toLocaleString('tr-TR');
  };

  const renderServiceItem = (svc) => {
    const isSelected = selectedService?.id === svc.id;
    const isSelfService = svc.requires_expert === false;

    return (
      <div key={svc.id}>
        <div
          onClick={() => onSelectService(isSelected ? null : svc)}
          className={cn(
            'flex items-center px-3 py-2.5 cursor-pointer transition-colors border-b border-slate-100',
            isSelected && !isSelfService && 'bg-amber-50 border-l-[3px] border-l-amber-500',
            isSelected && isSelfService && 'bg-emerald-50 border-l-[3px] border-l-emerald-500',
            !isSelected && 'border-l-[3px] border-l-transparent hover:bg-slate-50'
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-slate-800">{svc.description}</span>
              {isSelfService && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500 text-white uppercase">
                  Self Servis
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-slate-500">{svc.duration} dk</span>
              {svc.price > 0 && (
                <span className="text-[11px] font-medium text-slate-600">{formatPrice(svc.price)} TL</span>
              )}
            </div>
          </div>
          <ChevronRight className={cn(
            'w-4 h-4 shrink-0 transition-transform',
            isSelected ? 'text-slate-600 rotate-90' : 'text-slate-300'
          )} />
        </div>

        {/* Secili hizmetin altinda oda listesi */}
        {isSelected && (
          <DayDetailRoomList
            company={company}
            date={date}
            service={svc}
            spaces={spaces}
            experts={experts}
            expertServicesMap={expertServicesMap}
            selectedRoom={selectedRoom}
            onSelectRoom={onSelectRoom}
            selectedUnit={selectedUnit}
            onSelectUnit={onSelectUnit}
          />
        )}
      </div>
    );
  };

  return (
    <div className="overflow-y-auto flex-1">
      {/* Uzman Hizmetleri */}
      {expertServicesList.length > 0 && expertServicesList.map(renderServiceItem)}

      {/* Self Servis ayirici */}
      {selfServicesList.length > 0 && (
        <>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/80 border-y border-slate-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              {t('selfServiceSection')}
            </span>
          </div>
          {selfServicesList.map(renderServiceItem)}
        </>
      )}

      {services.length === 0 && (
        <div className="flex items-center justify-center py-8 text-xs text-slate-400">
          {t('selectServiceFirst')}
        </div>
      )}
    </div>
  );
}
