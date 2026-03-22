import React from 'react';
import { DoorOpen, Lock, Users, Droplets, Check, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Gorsel oda secim komponenti
 * Musait odalar yesil kenarli, dolu odalar gri/kirmizi
 */
const RoomPicker = ({ rooms, selectedRoomId, onSelect, loading }) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
        <span className="ml-2 text-sm text-slate-500">{t('loadingRooms') || 'Odalar yükleniyor...'}</span>
      </div>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <div className="text-center py-4 text-slate-400 text-sm">
        <DoorOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <p>{t('noRoomsAvailable') || 'Bu hizmet için uygun oda bulunamadı'}</p>
      </div>
    );
  }

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'private': return <Lock className="w-3 h-3" />;
      case 'shared': return <Users className="w-3 h-3" />;
      case 'group_private': return <Droplets className="w-3 h-3" />;
      default: return null;
    }
  };

  const getModeLabel = (mode) => {
    switch (mode) {
      case 'private': return t('bookingModePrivate') || 'Özel';
      case 'shared': return t('bookingModeShared') || 'Paylaşımlı';
      case 'group_private': return t('bookingModeGroupPrivate') || 'Grup Özel';
      default: return '';
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {rooms.map(({ space, available, currentOccupancy, reason }) => {
        const isSelected = selectedRoomId === space.id;
        const color = space.color || '#94a3b8';

        return (
          <button
            key={space.id}
            type="button"
            onClick={() => available && onSelect(space.id)}
            disabled={!available}
            className={`relative p-3 rounded-xl border-2 text-left transition-all ${
              isSelected
                ? 'border-emerald-500 bg-emerald-50 shadow-md'
                : available
                ? 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm cursor-pointer'
                : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
            }`}
          >
            {/* Seçildi işareti */}
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}

            {/* Oda rengi + isim */}
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="font-semibold text-sm text-slate-800 truncate">{space.name}</span>
            </div>

            {/* Mode + kapasite */}
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-0.5">
                {getModeIcon(space.booking_mode)}
                {getModeLabel(space.booking_mode)}
              </span>
              {space.capacity > 1 && (
                <span className="text-slate-400">
                  {space.booking_mode === 'shared'
                    ? `${currentOccupancy}/${space.capacity}`
                    : `${space.capacity} kişi`
                  }
                </span>
              )}
            </div>

            {/* Müsait değil uyarısı */}
            {!available && reason && (
              <div className="flex items-center gap-1 mt-1.5 text-[9px] text-amber-600">
                <AlertTriangle className="w-3 h-3" />
                <span className="truncate">{reason}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default RoomPicker;
