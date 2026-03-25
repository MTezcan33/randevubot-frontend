import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight } from 'lucide-react';
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
      {/* Ozet bilgi */}
      <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0 flex-wrap">
        <span className="font-semibold text-slate-800">{service?.description}</span>
        <span className="text-slate-300">·</span>
        <span className="font-medium">{expert?.name}</span>
        <span className="text-slate-300">·</span>
        <span className="font-semibold text-slate-800">{startTime}-{endTime}</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">{duration}dk</span>
        {room && (
          <>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">{room.name}</span>
          </>
        )}
        <span className="text-slate-300">·</span>
        <span className="flex items-center gap-1 text-purple-500">
          <ArrowLeftRight className="w-3 h-3" />
          <span className="text-[10px] font-medium">{t('dragToMove')}</span>
        </span>
      </div>

      {/* Butonlar */}
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          {t('cancelBooking')}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'px-5 py-2 rounded-lg text-xs font-semibold text-white transition-colors',
            loading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
          )}
        >
          {loading ? '...' : t('confirmBooking')}
        </button>
      </div>
    </div>
  );
}
