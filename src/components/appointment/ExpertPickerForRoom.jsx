import React from 'react';
import { User, Check, AlertTriangle, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Secili oda icin musait uzman secim komponenti
 * Uzmanlar yetki, atama ve musaitlik durumuna gore siralanir
 */
const ExpertPickerForRoom = ({ experts, selectedExpertId, onSelect, loading }) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
        <span className="ml-2 text-xs text-slate-500">{t('loadingExperts') || 'Uzmanlar yükleniyor...'}</span>
      </div>
    );
  }

  if (!experts || experts.length === 0) {
    return (
      <div className="text-center py-3 text-slate-400 text-xs">
        <User className="w-6 h-6 mx-auto mb-1 text-slate-300" />
        <p>{t('noExpertsForRoom') || 'Bu oda için uygun uzman bulunamadı'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {experts.map(({ expert, available, isPreferred, reason }) => {
        const isSelected = selectedExpertId === expert.id;
        const color = expert.color || '#6B7280';

        return (
          <button
            key={expert.id}
            type="button"
            onClick={() => onSelect(expert.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
              isSelected
                ? 'text-white shadow-md'
                : available
                ? 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:shadow-sm'
                : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            }`}
            style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
          >
            {/* Avatar */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                isSelected ? 'bg-white/30 text-white' : 'text-white'
              }`}
              style={!isSelected ? { backgroundColor: color } : { backgroundColor: 'rgba(255,255,255,0.3)' }}
            >
              {expert.name?.charAt(0) || '?'}
            </div>

            {/* İsim */}
            <span className="font-medium truncate">{expert.name}</span>

            {/* Tercihli yıldız */}
            {isPreferred && (
              <Star className="w-3 h-3 flex-shrink-0 fill-current" style={{ color: isSelected ? '#fbbf24' : '#f59e0b' }} />
            )}

            {/* Seçildi işareti */}
            {isSelected && <Check className="w-4 h-4 text-white flex-shrink-0" />}

            {/* Uyarı */}
            {!available && !isSelected && (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ExpertPickerForRoom;
