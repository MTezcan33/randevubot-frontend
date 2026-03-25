import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DayDetailConfirmBar({
  service,
  expert,
  startTime,
  endTime,
  duration,
  room,
  unit,
  onConfirm,
  onCancel,
  loading,
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2 text-xs text-slate-600 min-w-0">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: service?.color || '#9333EA' }}
        />
        <span className="font-medium truncate">{service?.description}</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-500 truncate">{expert?.name}</span>
        <span className="text-slate-400">·</span>
        <span className="font-medium text-slate-700">
          {startTime} - {endTime}
        </span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-500">{duration}dk</span>
        {room && (
          <>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500 truncate">{room.name}</span>
          </>
        )}
        {unit && (
          <>
            <span className="text-slate-400">›</span>
            <span className="text-slate-500 truncate">{unit.name}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          {t('cancelBooking')}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-colors',
            loading
              ? 'bg-emerald-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700'
          )}
        >
          <Check className="w-3.5 h-3.5" />
          {loading ? '...' : t('confirmBooking')}
        </button>
      </div>
    </div>
  );
}
