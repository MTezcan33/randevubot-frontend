import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';

const ReportsPage = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-7 h-7 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('reports') || 'Raporlar'}</h1>
          <p className="text-sm text-slate-500">{t('reportsSubtitle') || 'İşletme raporlarını görüntüleyin ve analiz edin.'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">{t('reportsComingSoon') || 'Raporlar modülü yakında aktif olacak.'}</p>
        <p className="text-sm text-slate-400 mt-1">{t('reportsComingSoonDesc') || 'Uzman gelirleri, hizmet bazlı analizler ve iptal raporları burada yer alacak.'}</p>
      </div>
    </div>
  );
};

export default ReportsPage;
