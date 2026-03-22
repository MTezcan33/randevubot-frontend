import React, { useState } from 'react';
import { User, GripVertical, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Suruklenebilir uzman listesi - Oda gorunumunde sol kenar cubugu
 * Uzmanlar buradan takvime suruklenip birakilir
 */
const StaffSidebar = ({ experts, onDragStart, onDragEnd, compact = false }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const filteredExperts = experts.filter(exp =>
    exp.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (collapsed) {
    return (
      <div className="w-10 flex-shrink-0 bg-slate-50 border-r flex flex-col items-center py-2">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 mb-2"
          title={t('showExperts') || 'Uzmanları göster'}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {/* Mini uzman avatarları */}
        {experts.map(exp => (
          <div
            key={exp.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'expert', expertId: exp.id, expertName: exp.name }));
              e.dataTransfer.effectAllowed = 'move';
              onDragStart?.(exp);
            }}
            onDragEnd={() => onDragEnd?.()}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white mb-1.5 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
            style={{ backgroundColor: exp.color || '#6B7280' }}
            title={exp.name}
          >
            {exp.name?.charAt(0) || '?'}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`${compact ? 'w-36' : 'w-48'} flex-shrink-0 bg-slate-50/80 border-r flex flex-col`}>
      {/* Header */}
      <div className="px-3 py-2 border-b bg-white/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-semibold text-slate-700">{t('experts') || 'Uzmanlar'}</span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded-full">{experts.length}</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-slate-100 text-slate-400"
        >
          <ChevronDown className="w-3.5 h-3.5 rotate-90" />
        </button>
      </div>

      {/* Arama */}
      {experts.length > 4 && (
        <div className="px-2 py-1.5 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('searchExpert') || 'Ara...'}
              className="w-full pl-6 pr-2 py-1 text-[11px] bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-300"
            />
          </div>
        </div>
      )}

      {/* Uzman Listesi */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-1">
        {filteredExperts.map(exp => (
          <div
            key={exp.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'expert',
                expertId: exp.id,
                expertName: exp.name,
                expertColor: exp.color,
              }));
              e.dataTransfer.effectAllowed = 'move';
              e.currentTarget.style.opacity = '0.4';
              onDragStart?.(exp);
            }}
            onDragEnd={(e) => {
              e.currentTarget.style.opacity = '1';
              onDragEnd?.();
            }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white border border-slate-100 cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-emerald-200 transition-all group"
          >
            {/* Grip ikonu */}
            <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-500 flex-shrink-0" />

            {/* Avatar */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: exp.color || '#6B7280' }}
            >
              {exp.name?.charAt(0) || '?'}
            </div>

            {/* İsim */}
            <span className="text-[11px] font-medium text-slate-700 truncate flex-1">
              {exp.name}
            </span>
          </div>
        ))}

        {filteredExperts.length === 0 && (
          <p className="text-[10px] text-slate-400 text-center py-3">
            {searchTerm ? (t('noResults') || 'Sonuç yok') : (t('noExperts') || 'Uzman yok')}
          </p>
        )}
      </div>
    </div>
  );
};

export default StaffSidebar;
