import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import DayDetailRoomList from './DayDetailRoomList';

export default function DayDetailServiceList({
  company, date, selectedService, onSelectService,
  selectedRoom, onSelectRoom, selectedUnit, onSelectUnit,
  spaces, experts,
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

  const expertSvcs = services.filter(s => s.requires_expert !== false);
  const selfSvcs = services.filter(s => s.requires_expert === false);

  const formatPrice = (p) => p ? Number(p).toLocaleString('tr-TR') : '';

  const renderItem = (svc) => {
    const isS = selectedService?.id === svc.id;
    const isSelf = svc.requires_expert === false;

    return (
      <div key={svc.id}>
        <div
          onClick={() => onSelectService(isS ? null : svc)}
          style={{
            borderBottom: '1px solid #C8D9CF', padding: '6px 12px', cursor: 'pointer',
            transition: 'all 0.12s',
            background: isS ? '#E0DCF5' : undefined,
            borderLeft: isS ? '3px solid #7F77DD' : '3px solid transparent',
            paddingLeft: isS ? '9px' : '12px',
          }}
          onMouseEnter={e => { if (!isS) e.currentTarget.style.background = '#DDE8E1'; }}
          onMouseLeave={e => { if (!isS) e.currentTarget.style.background = ''; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#0F3D2A' }}>{svc.description}</span>
            <span style={{
              fontSize: 12, color: isS ? '#7F77DD' : '#8ABFA2',
              transition: 'transform 0.15s',
              display: 'inline-block',
              transform: isS ? 'rotate(90deg)' : 'none',
            }}>›</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            {isSelf && (
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: '#FAC775', color: '#633806', fontWeight: 600 }}>
                Self Servis
              </span>
            )}
            <span style={{ fontSize: 10, color: '#1D9E75' }}>{svc.duration} dk</span>
            {svc.price > 0 && (
              <span style={{ fontSize: 10, fontWeight: 500, color: '#0F6E56' }}>{formatPrice(svc.price)} TL</span>
            )}
          </div>
        </div>

        {/* Seçiliyse altında odalar */}
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

  return (
    <div>
      {/* Hizmetler kategori */}
      {expertSvcs.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 12px 6px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#534AB7' }} />
            <span style={{ fontSize: 10, fontWeight: 500, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Hizmetler</span>
          </div>
          {expertSvcs.map(renderItem)}
        </>
      )}

      {/* Self Servis kategori */}
      {selfSvcs.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 12px 6px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D9E75' }} />
            <span style={{ fontSize: 10, fontWeight: 500, color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Self servis</span>
          </div>
          {selfSvcs.map(renderItem)}
        </>
      )}
    </div>
  );
}
