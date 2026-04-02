import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import DayDetailRoomList from './DayDetailRoomList';

export default function DayDetailServiceList({
  company, date, selectedService, onSelectService,
  selectedRoom, onSelectRoom, selectedUnit, onSelectUnit,
  spaces, experts,
  filterType = 'services', // 'services' | 'packages' | 'facility'
}) {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [expertServicesMap, setExpertServicesMap] = useState(new Map());

  useEffect(() => {
    if (!company?.id) return;
    (async () => {
      const { data: svc } = await supabase.from('company_services').select('*')
        .eq('company_id', company.id).eq('is_active', true)
        .order('category').order('description');
      setServices(svc || []);
      const { data: es } = await supabase.from('expert_services').select('expert_id, service_id').eq('company_id', company.id);
      const map = new Map();
      (es || []).forEach(e => { if (!map.has(e.service_id)) map.set(e.service_id, new Set()); map.get(e.service_id).add(e.expert_id); });
      setExpertServicesMap(map);
    })();
  }, [company?.id]);

  // Filtre tipine gore hizmetleri ayir
  const filteredServices = services.filter(s => {
    if (filterType === 'facility') {
      // Tesis: self-servis hizmetler (sauna, buhar banyosu vb.)
      return s.requires_expert === false;
    } else if (filterType === 'packages') {
      // Paketler: category icinde 'Paket' gecenler
      return s.requires_expert !== false && (s.category || '').toLowerCase().includes('paket');
    } else {
      // Hizmetler: normal uzman hizmetleri (paket olmayan)
      return s.requires_expert !== false && !(s.category || '').toLowerCase().includes('paket');
    }
  });

  const formatPrice = (p) => p ? Number(p).toLocaleString('tr-TR') : '';

  const renderItem = (svc) => {
    const isS = selectedService?.id === svc.id;
    const isSelf = svc.requires_expert === false;

    return (
      <div key={svc.id}>
        <div
          onClick={() => onSelectService(isS ? null : svc)}
          style={{
            borderBottom: '1px solid #e8e8e3', padding: '8px 10px', cursor: 'pointer',
            transition: 'all 0.12s',
            background: isS ? '#E0DCF5' : undefined,
            borderLeft: isS ? '3px solid #7F77DD' : '3px solid transparent',
            paddingLeft: isS ? '7px' : '10px',
          }}
          onMouseEnter={e => { if (!isS) e.currentTarget.style.background = '#f5f5f5'; }}
          onMouseLeave={e => { if (!isS) e.currentTarget.style.background = ''; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: '#1a1a1a' }}>{svc.description}</span>
            <span style={{
              fontSize: 10, color: isS ? '#7F77DD' : '#999',
              transition: 'transform 0.15s',
              display: 'inline-block',
              transform: isS ? 'rotate(90deg)' : 'none',
            }}>›</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 9, color: '#888' }}>{svc.duration} dk</span>
            {svc.price > 0 && (
              <span style={{ fontSize: 9, fontWeight: 500, color: '#1D9E75' }}>{formatPrice(svc.price)} TL</span>
            )}
          </div>
        </div>

        {/* Seciliyse altinda odalar */}
        {isS && (
          <DayDetailRoomList
            company={company} date={date} service={svc} spaces={spaces}
            experts={experts} expertServicesMap={expertServicesMap}
            selectedRoom={selectedRoom} onSelectRoom={onSelectRoom}
            selectedUnit={selectedUnit} onSelectUnit={onSelectUnit}
          />
        )}
      </div>
    );
  };

  if (filteredServices.length === 0) {
    const emptyMsg = filterType === 'facility' ? 'Tesis hizmeti bulunamadi'
      : filterType === 'packages' ? 'Paket bulunamadi'
      : 'Hizmet bulunamadi';
    return (
      <div style={{ padding: 16, color: '#999', fontSize: 10, textAlign: 'center' }}>
        {emptyMsg}
      </div>
    );
  }

  return (
    <div>
      {filteredServices.map(renderItem)}
    </div>
  );
}
