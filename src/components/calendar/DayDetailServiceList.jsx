import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight } from 'lucide-react';
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

  // Hizmetleri ve uzman-hizmet iliskilerini yukle
  useEffect(() => {
    if (!company?.id) return;

    const loadData = async () => {
      // Hizmetler
      const { data: svcData } = await supabase
        .from('company_services')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('description', { ascending: true });

      setServices(svcData || []);

      // Uzman-Hizmet iliskileri
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

  // Hizmetleri kategoriye gore grupla
  const expertServices = services.filter(s => s.requires_expert !== false);
  const selfServices = services.filter(s => s.requires_expert === false);

  // Kategoriye gore gruplama
  const groupByCategory = (list) => {
    const groups = {};
    list.forEach(svc => {
      const cat = svc.category || t('noCategory');
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(svc);
    });
    return groups;
  };

  const expertGroups = groupByCategory(expertServices);
  const selfGroups = groupByCategory(selfServices);

  const renderServiceItem = (svc) => {
    const isSelected = selectedService?.id === svc.id;
    const expertCount = expertServicesMap.get(svc.id)?.size || 0;
    const isExpertType = svc.requires_expert !== false;

    return (
      <div key={svc.id}>
        <div
          onClick={() => onSelectService(isSelected ? null : svc)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors text-xs',
            'border-l-3',
            isSelected && isExpertType && 'bg-purple-50 border-l-purple-500',
            isSelected && !isExpertType && 'bg-emerald-50 border-l-emerald-500',
            !isSelected && 'border-l-transparent hover:bg-slate-50'
          )}
        >
          {isSelected ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}

          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: svc.color || (isExpertType ? '#9333EA' : '#10b981') }}
          />

          <div className="flex-1 min-w-0">
            <span className="font-medium text-slate-700 truncate block">
              {svc.description}
            </span>
            <span className="text-[10px] text-slate-400">
              {svc.duration}dk · {svc.price ? `${svc.price}₺` : ''}
            </span>
          </div>

          {isExpertType && expertCount > 0 && (
            <span className="text-[10px] text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">
              {expertCount} {t('qualifiedExperts').toLowerCase().split(' ')[0]}
            </span>
          )}
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
    <div className="overflow-y-auto">
      {/* Uzman Hizmetleri */}
      {Object.keys(expertGroups).length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-purple-50/50 border-b border-slate-100">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide">
              {t('expertServices')}
            </span>
          </div>
          {Object.entries(expertGroups).map(([category, svcs]) => (
            <div key={category}>
              {Object.keys(expertGroups).length > 1 && (
                <div className="px-3 py-1 bg-slate-50 border-b border-slate-100">
                  <span className="text-[10px] font-medium text-slate-500 uppercase">
                    {category}
                  </span>
                </div>
              )}
              {svcs.map(renderServiceItem)}
            </div>
          ))}
        </div>
      )}

      {/* Self Servis */}
      {Object.keys(selfGroups).length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50/50 border-b border-t border-slate-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
              {t('selfServiceSection')}
            </span>
          </div>
          {Object.entries(selfGroups).map(([category, svcs]) => (
            <div key={category}>
              {Object.keys(selfGroups).length > 1 && (
                <div className="px-3 py-1 bg-slate-50 border-b border-slate-100">
                  <span className="text-[10px] font-medium text-slate-500 uppercase">
                    {category}
                  </span>
                </div>
              )}
              {svcs.map(renderServiceItem)}
            </div>
          ))}
        </div>
      )}

      {services.length === 0 && (
        <div className="flex items-center justify-center py-8 text-xs text-slate-400">
          {t('selectServiceFirst')}
        </div>
      )}
    </div>
  );
}
