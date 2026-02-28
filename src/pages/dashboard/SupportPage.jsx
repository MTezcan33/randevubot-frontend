import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { HelpCircle, Mail, Star, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

// Yıldız göstergesi bileşeni
const StarRating = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star
        key={i}
        className={`w-4 h-4 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`}
      />
    ))}
  </div>
);

// Durum badge renkleri
const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
};

const SupportPage = () => {
  const { t } = useTranslation();
  const { company } = useAuth();
  const { toast } = useToast();

  // Aktif sekme: 'feedback' | 'faq'
  const [activeTab, setActiveTab] = useState('feedback');
  // Filtre: 'all' | 'new' | 'reviewing' | 'resolved'
  const [filter, setFilter] = useState('all');
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  // Yanıt düzenleme state'i
  const [editingId, setEditingId] = useState(null);
  const [responseText, setResponseText] = useState('');

  // Geri bildirimleri çek
  const fetchFeedbacks = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    let query = supabase
      .from('customer_feedback')
      .select(`
        *,
        customers (name, phone),
        appointments (date, time)
      `)
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (filter !== 'all') query = query.eq('status', filter);

    const { data, error } = await query;
    if (error) {
      console.error('Geri bildirim getirme hatası:', error);
    } else {
      setFeedbacks(data || []);
    }
    setLoading(false);
  }, [company, filter]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Ortalama puan hesapla
  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
    : null;

  // Durum güncelle
  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from('customer_feedback')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    }
  };

  // Admin yanıtı kaydet
  const saveResponse = async (id) => {
    const { error } = await supabase
      .from('customer_feedback')
      .update({ admin_response: responseText, status: 'resolved' })
      .eq('id', id);

    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('success'), description: t('feedbackResponseSaved') });
      setFeedbacks(prev => prev.map(f =>
        f.id === id ? { ...f, admin_response: responseText, status: 'resolved' } : f
      ));
      setEditingId(null);
      setResponseText('');
    }
  };

  const handleSupportClick = () => {
    window.location.href = `mailto:info@randevubot.net?subject=${t('createSupportTicket')}`;
  };

  const filterOptions = [
    { key: 'all', label: t('feedbackAll') },
    { key: 'new', label: t('feedbackNew') },
    { key: 'reviewing', label: t('feedbackReviewing') },
    { key: 'resolved', label: t('feedbackResolved') },
  ];

  return (
    <>
      <Helmet>
        <title>{t('supportTitle')} | RandevuBot</title>
        <meta name="description" content={t('supportSubtitle')} />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('supportTitle')}</h1>
          <p className="text-slate-600 text-sm">{t('supportSubtitle')}</p>
        </div>

        {/* Sekme seçici */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'feedback'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Star className="w-4 h-4 inline mr-1" />
            {t('feedbackTitle')}
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'faq'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <HelpCircle className="w-4 h-4 inline mr-1" />
            {t('faq')}
          </button>
        </div>

        {/* GERİ BİLDİRİM SEKMESİ */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            {/* Ortalama puan */}
            {avgRating && (
              <div className="bg-white rounded-lg border p-4 flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-500">{avgRating}</p>
                  <p className="text-xs text-slate-500">{t('feedbackAvgRating')}</p>
                </div>
                <StarRating rating={Math.round(parseFloat(avgRating))} />
                <p className="text-sm text-slate-500 ml-2">({feedbacks.length} {t('feedbackRating')})</p>
              </div>
            )}

            {/* Filtre butonları */}
            <div className="flex flex-wrap gap-2">
              {filterOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filter === opt.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Geri bildirim listesi */}
            {loading ? (
              <div className="text-center py-8 text-slate-400">Yükleniyor...</div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">{t('feedbackNoData')}</div>
            ) : (
              <div className="space-y-3">
                {feedbacks.map(fb => (
                  <div key={fb.id} className="bg-white rounded-lg border p-4 space-y-3">
                    {/* Üst satır */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-medium text-sm">{fb.customers?.name || '—'}</p>
                        {fb.appointments && (
                          <p className="text-xs text-slate-400">
                            {fb.appointments.date} {fb.appointments.time}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <StarRating rating={fb.rating || 0} />
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[fb.status] || ''}`}>
                          {t(`feedback${fb.status.charAt(0).toUpperCase() + fb.status.slice(1)}`)}
                        </span>
                        <p className="text-xs text-slate-400">
                          {new Date(fb.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Yorum */}
                    {fb.comment && (
                      <p className="text-sm text-slate-600 bg-slate-50 rounded p-2">{fb.comment}</p>
                    )}

                    {/* Admin yanıtı */}
                    {fb.admin_response && (
                      <div className="bg-blue-50 rounded p-2">
                        <p className="text-xs text-blue-600 font-medium mb-1">{t('feedbackAdminResponse')}</p>
                        <p className="text-sm text-blue-800">{fb.admin_response}</p>
                      </div>
                    )}

                    {/* Aksiyon butonları */}
                    <div className="flex flex-wrap gap-2">
                      {fb.status === 'new' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => updateStatus(fb.id, 'reviewing')}
                        >
                          {t('feedbackMarkReviewing')}
                        </Button>
                      )}
                      {fb.status !== 'resolved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => {
                            setEditingId(fb.id);
                            setResponseText(fb.admin_response || '');
                          }}
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          {t('feedbackSaveResponse')}
                        </Button>
                      )}
                    </div>

                    {/* Yanıt yazma alanı */}
                    {editingId === fb.id && (
                      <div className="space-y-2">
                        <textarea
                          value={responseText}
                          onChange={e => setResponseText(e.target.value)}
                          placeholder={t('feedbackAddResponse')}
                          className="w-full text-sm border rounded-lg p-2 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="text-xs h-7" onClick={() => saveResponse(fb.id)}>
                            {t('feedbackSaveResponse')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => { setEditingId(null); setResponseText(''); }}
                          >
                            {t('cancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SSS SEKMESİ */}
        {activeTab === 'faq' && (
          <div className="space-y-4">
            <div className="glass-effect rounded-2xl p-6">
              <div className="space-y-3">
                <details className="glass-effect p-4 rounded-xl">
                  <summary className="font-semibold cursor-pointer">{t('faqQuestion1')}</summary>
                  <p className="mt-2 text-slate-600 text-sm">{t('faqAnswer1')}</p>
                </details>
                <details className="glass-effect p-4 rounded-xl">
                  <summary className="font-semibold cursor-pointer">{t('faqQuestion2')}</summary>
                  <p className="mt-2 text-slate-600 text-sm">{t('faqAnswer2')}</p>
                </details>
                <details className="glass-effect p-4 rounded-xl">
                  <summary className="font-semibold cursor-pointer">{t('faqQuestion3')}</summary>
                  <p className="mt-2 text-slate-600 text-sm">{t('faqAnswer3')}</p>
                </details>
              </div>
            </div>

            <div className="glass-effect rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                {t('createSupportTicket')}
              </h2>
              <p className="text-slate-600 text-sm mb-4">{t('cantSolve')}</p>
              <Button onClick={handleSupportClick}>
                {t('createTicketButton')}
              </Button>
              <p className="text-sm text-slate-500 mt-3">{t('emailSupport')}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SupportPage;
