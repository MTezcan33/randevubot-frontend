
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Plus, Edit, Trash2, Phone, Mail, FileText, Users, Search, User,
  Download, Upload, ChevronLeft, ChevronRight, X, FileSpreadsheet,
  Eye, Star, Calendar, Clock, CreditCard, Tag, MessageSquare,
  Crown, Filter, Send, ChevronDown, ChevronUp, Wallet, Scissors,
  CalendarCheck, CalendarX, CalendarClock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  getCustomerAppointments, getCustomerFeedback, respondToFeedback,
  recalculateStats, updateCustomerProfile, toggleVip, updateCustomerTags,
} from '@/services/customerService';

const ITEMS_PER_PAGE = 20;

// Etiket renk haritası
const TAG_COLORS = {
  VIP: 'bg-amber-100 text-amber-800 border-amber-300',
  Düzenli: 'bg-green-100 text-green-800 border-green-300',
  Yeni: 'bg-blue-100 text-blue-800 border-blue-300',
  Risk: 'bg-red-100 text-red-800 border-red-300',
};
const PREDEFINED_TAGS = ['VIP', 'Düzenli', 'Yeni', 'Risk'];

// Yıldız puanı gösterimi
const StarRating = ({ rating, size = 'sm' }) => {
  const s = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${s} ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
      ))}
    </div>
  );
};

// ==================== DRAWER COMPONENT ====================
const CustomerDetailDrawer = ({ customer, isOpen, onClose, company, staff, t, toast, onCustomerUpdated }) => {
  const [activeTab, setActiveTab] = useState('history');
  const [appointments, setAppointments] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(true);
  const [respondingFeedbackId, setRespondingFeedbackId] = useState(null);
  const [adminResponseText, setAdminResponseText] = useState('');
  const [expandedApptId, setExpandedApptId] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all'); // all, upcoming, completed, cancelled

  // Bilgiler tab state
  const [profileEdit, setProfileEdit] = useState({});
  const [selectedTags, setSelectedTags] = useState([]);
  const [vipStatus, setVipStatus] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (customer && isOpen) {
      setActiveTab('history');
      fetchDrawerData();
      // Bilgiler tab state'ini hazırla
      setProfileEdit({
        birthday: customer.birthday || '',
        gender: customer.gender || '',
        preferred_expert_id: customer.preferred_expert_id || '',
        address: customer.address || '',
        tckn: customer.tckn || '',
        notes: customer.notes || '',
      });
      setSelectedTags(customer.tags || []);
      setVipStatus(customer.is_vip || false);
    }
  }, [customer, isOpen]);

  const fetchDrawerData = async () => {
    setDrawerLoading(true);
    try {
      // İstatistikleri yenile
      await recalculateStats(customer.id);

      const [appts, fbs] = await Promise.all([
        getCustomerAppointments(customer.id, company.id),
        getCustomerFeedback(customer.id, company.id),
      ]);
      setAppointments(appts);
      setFeedbacks(fbs);
    } catch (err) {
      console.error('Drawer veri hatası:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // İstatistikler
  const stats = useMemo(() => {
    const completedAppts = appointments.filter(a => a.status === 'onaylandı');
    const avgRating = feedbacks.length > 0
      ? (feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
      : null;
    const totalSpent = completedAppts.reduce((sum, a) => {
      const services = a.appointment_services?.length > 0
        ? a.appointment_services
        : (a.company_services ? [{ company_services: a.company_services }] : []);
      return sum + services.reduce((s, as) => s + (as.company_services?.price || 0), 0);
    }, 0);
    const memberMonths = customer ? Math.max(1, Math.floor((Date.now() - new Date(customer.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000))) : 0;

    return {
      totalVisits: completedAppts.length,
      totalSpent,
      avgRating,
      memberMonths,
    };
  }, [appointments, feedbacks, customer]);

  // Admin geri bildirim yanıtı
  const handleFeedbackRespond = async (feedbackId) => {
    if (!adminResponseText.trim()) return;
    try {
      await respondToFeedback(feedbackId, adminResponseText.trim(), 'resolved');
      toast({ title: t('success'), description: t('feedbackRespondSuccess') });
      setRespondingFeedbackId(null);
      setAdminResponseText('');
      fetchDrawerData();
    } catch {
      toast({ title: t('error'), description: t('operationFailed'), variant: 'destructive' });
    }
  };

  // Profil kaydet
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateCustomerProfile(customer.id, {
        ...profileEdit,
        birthday: profileEdit.birthday || null,
        gender: profileEdit.gender || null,
        preferred_expert_id: profileEdit.preferred_expert_id || null,
      });
      await updateCustomerTags(customer.id, selectedTags);
      await toggleVip(customer.id, vipStatus);
      toast({ title: t('success'), description: t('customerProfileSaved') });
      onCustomerUpdated();
    } catch {
      toast({ title: t('error'), description: t('customerProfileSaveError'), variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Durum renkleri
  const statusColors = {
    'onaylandı': 'bg-green-100 text-green-700',
    'beklemede': 'bg-amber-100 text-amber-700',
    'iptal': 'bg-red-100 text-red-700',
  };

  const feedbackStatusColors = {
    'new': 'bg-blue-100 text-blue-700',
    'reviewing': 'bg-amber-100 text-amber-700',
    'resolved': 'bg-green-100 text-green-700',
  };

  if (!customer) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white">
              <button onClick={onClose} className="absolute right-4 top-4 text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                  {customer.name?.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{customer.name}</h2>
                    {(vipStatus || customer.is_vip) && (
                      <span className="bg-amber-400 text-amber-900 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <Crown className="w-3 h-3" /> VIP
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-white/80 text-sm">
                    {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{customer.phone}</span>}
                    {customer.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{customer.email}</span>}
                  </div>
                </div>
              </div>

              {/* İstatistik barı */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="bg-white/15 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold">{stats.totalVisits}</p>
                  <p className="text-[10px] text-white/70">{t('totalVisits')}</p>
                </div>
                <div className="bg-white/15 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold">{stats.totalSpent > 0 ? `${stats.totalSpent.toLocaleString()}` : '0'}</p>
                  <p className="text-[10px] text-white/70">{t('totalSpent')}</p>
                </div>
                <div className="bg-white/15 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold">{stats.avgRating || '-'}</p>
                  <p className="text-[10px] text-white/70">{t('avgRating')}</p>
                </div>
                <div className="bg-white/15 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold">{stats.memberMonths}</p>
                  <p className="text-[10px] text-white/70">{t('memberSince')}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              {['history', 'feedback', 'info'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'history' && t('customerHistory')}
                  {tab === 'feedback' && t('customerFeedbackTab')}
                  {tab === 'info' && t('customerInfo')}
                </button>
              ))}
            </div>

            {/* Tab içeriği */}
            <div className="flex-1 overflow-y-auto p-4">
              {drawerLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
                </div>
              ) : (
                <>
                  {/* GEÇMİŞ TAB — Detaylı Randevu Kayıtları */}
                  {activeTab === 'history' && (() => {
                    const today = new Date().toISOString().split('T')[0];
                    const upcomingCount = appointments.filter(a => a.date >= today && a.status !== 'iptal').length;
                    const completedCount = appointments.filter(a => a.status === 'onaylandı' && a.date < today).length;
                    const cancelledCount = appointments.filter(a => a.status === 'iptal').length;

                    const filteredAppts = appointments.filter(a => {
                      if (historyFilter === 'upcoming') return a.date >= today && a.status !== 'iptal';
                      if (historyFilter === 'completed') return a.status === 'onaylandı' && a.date < today;
                      if (historyFilter === 'cancelled') return a.status === 'iptal';
                      return true;
                    });

                    const paymentMethodLabels = {
                      cash: t('cash') || 'Nakit',
                      card: t('card') || 'Kart',
                      transfer: t('transfer') || 'Havale',
                      other: t('otherPayment') || 'Diğer',
                    };

                    return (
                      <div className="space-y-3">
                        {/* Özet sayaçlar */}
                        <div className="grid grid-cols-3 gap-2 mb-1">
                          <button
                            onClick={() => setHistoryFilter(historyFilter === 'upcoming' ? 'all' : 'upcoming')}
                            className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                              historyFilter === 'upcoming' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200'
                            }`}
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                            <span>{upcomingCount}</span>
                            <span className="hidden sm:inline">{t('upcoming') || 'Yaklaşan'}</span>
                          </button>
                          <button
                            onClick={() => setHistoryFilter(historyFilter === 'completed' ? 'all' : 'completed')}
                            className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                              historyFilter === 'completed' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-slate-200 text-slate-600 hover:border-green-200'
                            }`}
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                            <span>{completedCount}</span>
                            <span className="hidden sm:inline">{t('completed') || 'Tamamlanan'}</span>
                          </button>
                          <button
                            onClick={() => setHistoryFilter(historyFilter === 'cancelled' ? 'all' : 'cancelled')}
                            className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                              historyFilter === 'cancelled' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-600 hover:border-red-200'
                            }`}
                          >
                            <CalendarX className="w-3.5 h-3.5" />
                            <span>{cancelledCount}</span>
                            <span className="hidden sm:inline">{t('cancelledAppointments') || 'İptal'}</span>
                          </button>
                        </div>

                        {filteredAppts.length === 0 ? (
                          <div className="text-center py-8">
                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">{t('noAppointmentHistory')}</p>
                          </div>
                        ) : (
                          /* Timeline */
                          <div className="relative">
                            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200" />
                            <div className="space-y-3">
                              {filteredAppts.map(appt => {
                                const isExpanded = expandedApptId === appt.id;
                                const serviceList = appt.appointment_services?.length > 0
                                  ? appt.appointment_services.map(as => as.company_services).filter(Boolean)
                                  : (appt.company_services ? [appt.company_services] : []);
                                const serviceNames = serviceList.map(s => s.description).filter(Boolean);
                                const totalPrice = serviceList.reduce((s, svc) => s + (svc.price || 0), 0);
                                const duration = appt.total_duration || appt.company_services?.duration || 0;
                                const isUpcoming = appt.date >= today && appt.status !== 'iptal';
                                const endTime = appt.time && duration > 0
                                  ? (() => { const [h, m] = appt.time.split(':').map(Number); const end = h * 60 + m + duration; return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`; })()
                                  : null;

                                return (
                                  <div key={appt.id} className="relative pl-9">
                                    {/* Timeline dot */}
                                    <div className={`absolute left-[9px] top-3 w-3 h-3 rounded-full border-2 border-white z-10 ${
                                      appt.status === 'iptal' ? 'bg-red-400' : isUpcoming ? 'bg-blue-400' : 'bg-green-400'
                                    }`} />

                                    <div
                                      className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${
                                        isExpanded ? 'border-pink-300 shadow-sm' : 'border-slate-200 hover:border-pink-200'
                                      } ${isUpcoming ? 'bg-blue-50/30' : ''}`}
                                      onClick={() => setExpandedApptId(isExpanded ? null : appt.id)}
                                    >
                                      {/* Özet satır */}
                                      <div className="p-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-800">
                                              {new Date(appt.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                            <span className="text-sm text-slate-500">{appt.time?.slice(0, 5)}{endTime ? ` - ${endTime}` : ''}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColors[appt.status] || 'bg-slate-100 text-slate-600'}`}>
                                              {appt.status}
                                            </span>
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                          </div>
                                        </div>

                                        <p className="text-sm font-medium text-slate-700">{serviceNames.join(' + ') || t('unknownService')}</p>

                                        <div className="flex items-center justify-between mt-1.5">
                                          <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                            {appt.company_users && (
                                              <>
                                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: appt.company_users.color || '#9333EA' }} />
                                                {appt.company_users.name}
                                              </>
                                            )}
                                          </span>
                                          <div className="flex items-center gap-2 text-xs">
                                            {duration > 0 && <span className="text-slate-400">{duration} dk</span>}
                                            {totalPrice > 0 && <span className="font-bold text-slate-800">{totalPrice.toLocaleString()} TL</span>}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Genişletilmiş detay */}
                                      <AnimatePresence>
                                        {isExpanded && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                          >
                                            <div className="px-3 pb-3 pt-0 border-t border-slate-100">
                                              {/* Hizmet detayları — her biri ayrı satır */}
                                              {serviceList.length > 0 && (
                                                <div className="mt-2.5 mb-2">
                                                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">{t('services') || 'Hizmetler'}</p>
                                                  <div className="space-y-1.5">
                                                    {serviceList.map((svc, idx) => (
                                                      <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-1.5">
                                                        <div className="flex items-center gap-2">
                                                          <Scissors className="w-3.5 h-3.5 text-purple-400" />
                                                          <span className="text-xs font-medium text-slate-700">{svc.description}</span>
                                                          {svc.category && <span className="text-[10px] text-slate-400">({svc.category})</span>}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                          <span>{svc.duration || 0} dk</span>
                                                          {svc.price > 0 && <span className="font-semibold text-slate-700">{svc.price.toLocaleString()} TL</span>}
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                              {/* Uzman bilgisi */}
                                              {appt.company_users && (
                                                <div className="flex items-center gap-2 mb-2 text-xs text-slate-600">
                                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                                  <span>{t('expert') || 'Uzman'}:</span>
                                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: appt.company_users.color || '#9333EA' }} />
                                                  <span className="font-medium">{appt.company_users.name}</span>
                                                </div>
                                              )}

                                              {/* Ödeme bilgisi */}
                                              {appt.payment && (
                                                <div className="flex items-center gap-2 mb-2 text-xs text-slate-600">
                                                  <Wallet className="w-3.5 h-3.5 text-green-500" />
                                                  <span>{t('payment') || 'Ödeme'}:</span>
                                                  <span className="font-medium text-green-700">{Number(appt.payment.amount).toLocaleString()} TL</span>
                                                  <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                                    {paymentMethodLabels[appt.payment.payment_method] || appt.payment.payment_method}
                                                  </span>
                                                </div>
                                              )}
                                              {!appt.payment && totalPrice > 0 && appt.status !== 'iptal' && (
                                                <div className="flex items-center gap-2 mb-2 text-xs text-amber-600">
                                                  <Wallet className="w-3.5 h-3.5" />
                                                  <span>{t('paymentNotRecorded') || 'Ödeme kaydı yok'}</span>
                                                </div>
                                              )}

                                              {/* Süre özeti */}
                                              <div className="flex items-center gap-2 mb-2 text-xs text-slate-600">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{t('totalDuration')}: <span className="font-medium">{duration} dk</span></span>
                                                {serviceList.length > 1 && <span className="text-slate-400">({serviceList.length} {t('services') || 'hizmet'})</span>}
                                              </div>

                                              {/* Notlar */}
                                              {appt.notes && (
                                                <div className="mt-2 bg-amber-50 rounded-lg p-2 text-xs text-amber-800">
                                                  <span className="font-medium">{t('customerNotes')}:</span> {appt.notes}
                                                </div>
                                              )}

                                              {/* Oluşturulma tarihi */}
                                              <div className="mt-2 text-[10px] text-slate-400">
                                                {t('createdAt') || 'Kayıt'}: {new Date(appt.created_at).toLocaleString('tr-TR')}
                                              </div>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* YORUMLAR TAB */}
                  {activeTab === 'feedback' && (
                    <div className="space-y-3">
                      {feedbacks.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500">{t('noFeedbackYet')}</p>
                        </div>
                      ) : (
                        feedbacks.map(fb => (
                          <div key={fb.id} className="border rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <StarRating rating={fb.rating} />
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${feedbackStatusColors[fb.status] || 'bg-slate-100'}`}>
                                  {fb.status === 'new' ? t('feedbackNew') : fb.status === 'reviewing' ? t('feedbackReviewing') : t('feedbackResolved')}
                                </span>
                                <span className="text-xs text-slate-400">{new Date(fb.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            {fb.comment && <p className="text-sm text-slate-700 mb-2">{fb.comment}</p>}
                            {fb.appointments && (
                              <p className="text-xs text-slate-400 mb-2">
                                {new Date(fb.appointments.date).toLocaleDateString()} - {fb.appointments.company_services?.description || ''}
                              </p>
                            )}
                            {/* Admin yanıtı */}
                            {fb.admin_response ? (
                              <div className="bg-purple-50 rounded-lg p-2 mt-2 border border-purple-100">
                                <p className="text-xs font-medium text-purple-700 mb-1">{t('adminResponse')}:</p>
                                <p className="text-sm text-purple-900">{fb.admin_response}</p>
                              </div>
                            ) : (
                              respondingFeedbackId === fb.id ? (
                                <div className="mt-2 space-y-2">
                                  <textarea
                                    value={adminResponseText}
                                    onChange={e => setAdminResponseText(e.target.value)}
                                    placeholder={t('respondToFeedback')}
                                    rows={2}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleFeedbackRespond(fb.id)} className="bg-purple-600 hover:bg-purple-700 text-xs h-7">
                                      {t('save')}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => { setRespondingFeedbackId(null); setAdminResponseText(''); }} className="text-xs h-7">
                                      {t('cancel')}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setRespondingFeedbackId(fb.id)}
                                  className="text-xs text-purple-600 hover:text-purple-800 font-medium mt-1"
                                >
                                  {t('respondToFeedback')}
                                </button>
                              )
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* BİLGİLER TAB */}
                  {activeTab === 'info' && (
                    <div className="space-y-4">
                      {/* VIP Toggle */}
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <div className="flex items-center gap-2">
                          <Crown className="w-5 h-5 text-amber-600" />
                          <span className="font-medium text-amber-900">{t('vipCustomer')}</span>
                        </div>
                        <button
                          onClick={() => setVipStatus(!vipStatus)}
                          className={`w-11 h-6 rounded-full transition-colors ${vipStatus ? 'bg-amber-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${vipStatus ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>

                      {/* Etiketler */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t('customerTags')}</label>
                        <div className="flex flex-wrap gap-2">
                          {PREDEFINED_TAGS.map(tag => (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${
                                selectedTags.includes(tag)
                                  ? TAG_COLORS[tag] || 'bg-slate-100 text-slate-700 border-slate-300'
                                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              {selectedTags.includes(tag) ? '✓ ' : ''}{tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Doğum günü */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('customerBirthday')}</label>
                        <input
                          type="date"
                          value={profileEdit.birthday || ''}
                          onChange={e => setProfileEdit({ ...profileEdit, birthday: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                        />
                      </div>

                      {/* Cinsiyet */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('customerGender')}</label>
                        <select
                          value={profileEdit.gender || ''}
                          onChange={e => setProfileEdit({ ...profileEdit, gender: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                        >
                          <option value="">-</option>
                          <option value="female">{t('genderFemale')}</option>
                          <option value="male">{t('genderMale')}</option>
                          <option value="other">{t('genderOther')}</option>
                        </select>
                      </div>

                      {/* Tercih edilen uzman */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('preferredExpert')}</label>
                        <select
                          value={profileEdit.preferred_expert_id || ''}
                          onChange={e => setProfileEdit({ ...profileEdit, preferred_expert_id: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                        >
                          <option value="">-</option>
                          {staff?.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Adres */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('address')}</label>
                        <input
                          type="text"
                          value={profileEdit.address || ''}
                          onChange={e => setProfileEdit({ ...profileEdit, address: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                        />
                      </div>

                      {/* TC Kimlik No */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">TC / ID</label>
                        <input
                          type="text"
                          value={profileEdit.tckn || ''}
                          onChange={e => setProfileEdit({ ...profileEdit, tckn: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                        />
                      </div>

                      {/* Notlar */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('customerNotes')}</label>
                        <textarea
                          value={profileEdit.notes || ''}
                          onChange={e => setProfileEdit({ ...profileEdit, notes: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm resize-none"
                        />
                      </div>

                      {/* Kaydet */}
                      <Button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      >
                        {savingProfile ? '...' : t('save')}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Hızlı aksiyonlar (history/feedback tabında) */}
            {activeTab !== 'info' && (
              <div className="p-4 border-t bg-slate-50 flex gap-2">
                {customer.phone && (
                  <a
                    href={`https://wa.me/${customer.phone?.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full text-green-600 border-green-300 hover:bg-green-50">
                      <Send className="w-4 h-4 mr-2" /> WhatsApp
                    </Button>
                  </a>
                )}
                <Button variant="outline" onClick={() => setActiveTab('info')} className="flex-1">
                  <Edit className="w-4 h-4 mr-2" /> {t('editCustomer')}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ==================== ANA SAYFA ====================
const CustomersPage = () => {
  const { company, staff } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [customerData, setCustomerData] = useState({
    name: '', phone: '', email: '', notes: '',
  });
  const [fileToImport, setFileToImport] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDeleteId, setCustomerToDeleteId] = useState(null);

  // Drawer state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (company) fetchCustomers();
  }, [company]);

  useEffect(() => {
    let filtered = customers;

    // Arama filtresi
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }

    // Tag filtresi
    if (tagFilter === 'VIP') {
      filtered = filtered.filter(c => c.is_vip);
    } else if (tagFilter) {
      filtered = filtered.filter(c => c.tags && c.tags.includes(tagFilter));
    }

    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [searchQuery, tagFilter, customers]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    } catch {
      toast({ title: t('error'), description: t('customerFetchError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openModal = (customer = null) => {
    setEditingCustomer(customer);
    setCustomerData(customer
      ? { name: customer.name, phone: customer.phone || '', email: customer.email || '', notes: customer.notes || '' }
      : { name: '', phone: '', email: '', notes: '' }
    );
    setIsModalOpen(true);
  };

  const handleNameInputChange = (e) => {
    setCustomerData({ ...customerData, name: e.target.value.toUpperCase() });
  };

  const handleSave = async () => {
    if (!customerData.name) {
      toast({ title: t('missingInfo'), description: t('pleaseFillAllFields'), variant: 'destructive' });
      return;
    }
    try {
      let error;
      if (editingCustomer) {
        ({ error } = await supabase.from('customers').update(customerData).eq('id', editingCustomer.id));
      } else {
        ({ error } = await supabase.from('customers').insert([{ ...customerData, company_id: company.id }]));
      }
      if (error) throw error;
      toast({ title: t('success'), description: t('customerSaved') });
      setIsModalOpen(false);
      fetchCustomers();
    } catch {
      toast({ title: t('error'), description: t('customerSaveError'), variant: 'destructive' });
    }
  };

  const handleDeleteClick = (customerId) => {
    setCustomerToDeleteId(customerId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!customerToDeleteId) return;
    try {
      const { error } = await supabase.from('customers').delete().eq('id', customerToDeleteId);
      if (error) throw error;
      toast({ title: t('success'), description: t('customerDeleted') });
      fetchCustomers();
      if (selectedCustomer?.id === customerToDeleteId) {
        setIsDrawerOpen(false);
        setSelectedCustomer(null);
      }
    } catch {
      toast({ title: t('error'), description: t('customerDeleteError'), variant: 'destructive' });
    } finally {
      setIsDeleteDialogOpen(false);
      setCustomerToDeleteId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['İsim', 'Telefon', 'E-posta', 'Notlar', 'Kayıt Tarihi'];
    const csvData = filteredCustomers.map(c => ({
      'İsim': c.name,
      'Telefon': c.phone || '',
      'E-posta': c.email || '',
      'Notlar': c.notes || '',
      'Kayıt Tarihi': new Date(c.created_at).toLocaleDateString(),
    }));
    const worksheet = XLSX.utils.json_to_sheet(csvData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Müşteriler');
    XLSX.writeFile(workbook, `musteriler_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) setFileToImport(e.target.files[0]);
  };

  const handleImport = async () => {
    if (!fileToImport) {
      toast({ title: t('error'), description: t('selectFileToImport'), variant: 'destructive' });
      return;
    }
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        const newCustomers = json.map(row => ({
          company_id: company.id,
          name: String(row['İsim'] || row['Name'] || '').toUpperCase(),
          phone: String(row['Telefon'] || row['Phone'] || ''),
          email: String(row['E-posta'] || row['Email'] || ''),
          notes: String(row['Notlar'] || row['Notes'] || ''),
        })).filter(c => c.name);

        if (newCustomers.length > 0) {
          const { error } = await supabase.from('customers').insert(newCustomers);
          if (error) throw error;
          toast({ title: t('success'), description: `${newCustomers.length} ${t('customersImported')}` });
          fetchCustomers();
          closeImportModal();
        } else {
          toast({ title: t('warning'), description: t('noCustomersFoundInFile'), variant: 'default' });
        }
      } catch {
        toast({ title: t('error'), description: t('fileImportError'), variant: 'destructive' });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(fileToImport);
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setFileToImport(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openDrawer = (customer) => {
    setSelectedCustomer(customer);
    setIsDrawerOpen(true);
  };

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

  return (
    <>
      <Helmet>
        <title>{t('customersTitle')} | RandevuBot</title>
        <meta name="description" content={t('customersSubtitle')} />
      </Helmet>

      <div className="space-y-6">
        {/* Başlık */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              {t('customersTitle')}
            </h1>
            <p className="text-slate-600">{t('customersSubtitle')}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-pink-50 rounded-lg border border-pink-200">
              <Users className="w-5 h-5 text-pink-600" />
              <span className="font-semibold text-pink-900">{filteredCustomers.length}</span>
            </div>
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />{t('import')}
            </Button>
            <Button variant="outline" onClick={exportToCSV} disabled={filteredCustomers.length === 0}>
              <Download className="w-4 h-4 mr-2" />{t('export')}
            </Button>
            <Button onClick={() => openModal()} className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />{t('addCustomer')}
            </Button>
          </div>
        </div>

        {/* Arama + Filtre */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchCustomers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="appearance-none pl-9 pr-8 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm bg-white"
            >
              <option value="">{t('filterAll')}</option>
              <option value="VIP">VIP</option>
              <option value="Düzenli">{t('tagRegular')}</option>
              <option value="Yeni">{t('tagNew')}</option>
              <option value="Risk">{t('tagAtRisk')}</option>
            </select>
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Tablo */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                {searchQuery || tagFilter ? t('noSearchResults') : t('noCustomer')}
              </h3>
              <p className="text-slate-500">
                {searchQuery || tagFilter ? t('tryDifferentSearch') : t('addFirstCustomer')}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('customerName')}</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('customerPhone')}</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden lg:table-cell">{t('lastVisit')}</th>
                      <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider hidden md:table-cell">{t('totalVisits')}</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider hidden lg:table-cell">{t('totalSpent')}</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden xl:table-cell">{t('customerTags')}</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentCustomers.map((customer, index) => (
                      <tr
                        key={customer.id}
                        className={`hover:bg-pink-50/50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                        onClick={(e) => {
                          // Aksiyonlara tıklama olayını engelleme
                          if (e.target.closest('[data-action]')) return;
                          openDrawer(customer);
                        }}
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-semibold text-sm">{customer.name?.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-slate-900">{customer.name}</p>
                                {customer.is_vip && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                              </div>
                              {customer.email && <p className="text-xs text-slate-400 truncate max-w-[160px]">{customer.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {customer.phone ? (
                            <span className="flex items-center gap-2 text-sm text-slate-700">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />{customer.phone}
                            </span>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap hidden lg:table-cell">
                          <span className="text-sm text-slate-600">
                            {customer.last_visit_date ? new Date(customer.last_visit_date).toLocaleDateString() : '-'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center hidden md:table-cell">
                          {customer.total_visits > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                              {customer.total_visits}
                            </span>
                          ) : <span className="text-slate-300">0</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                          <span className="text-sm font-medium text-slate-700">
                            {customer.total_spent > 0 ? `${Number(customer.total_spent).toLocaleString()} TL` : '-'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 hidden xl:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {customer.tags?.map(tag => (
                              <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TAG_COLORS[tag] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1" data-action>
                            <Button variant="ghost" size="sm" onClick={() => openDrawer(customer)} className="hover:bg-pink-100 hover:text-pink-700 h-8 w-8 p-0">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openModal(customer)} className="hover:bg-blue-100 hover:text-blue-700 h-8 w-8 p-0">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(customer.id)} className="hover:bg-red-100 hover:text-red-700 h-8 w-8 p-0">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-slate-50 border-t flex items-center justify-between">
                  <div className="text-sm text-slate-600">{t('showing')} {startIndex + 1}-{Math.min(endIndex, filteredCustomers.length)} {t('of')} {filteredCustomers.length}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /></Button>
                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                          return (
                            <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(pageNum)}
                              className={currentPage === pageNum ? 'bg-gradient-to-r from-pink-500 to-purple-600' : ''}>{pageNum}</Button>
                          );
                        } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                          return <span key={pageNum} className="px-2">...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Müşteri Ekleme/Düzenleme Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              {editingCustomer ? t('editCustomer') : t('newCustomer')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('customerName')} *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder={t('customerName')} value={customerData.name} onChange={handleNameInputChange}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('customerPhone')}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="tel" placeholder="+90 555 123 4567" value={customerData.phone} onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('customerEmail')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="email" placeholder="ornek@email.com" value={customerData.email} onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('customerNotes')}</label>
              <textarea placeholder={t('customerNotesPlaceholder')} value={customerData.notes} onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })}
                rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* İçe Aktarma Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={closeImportModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              {t('importCustomers')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">{t('importCustomersDesc')}</p>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-pink-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileChange} />
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              {fileToImport ? <p className="font-semibold text-slate-800">{fileToImport.name}</p> : <p className="text-slate-500">{t('selectOrDragFile')}</p>}
            </div>
            {fileToImport && (
              <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg">
                <span className="text-sm font-medium text-slate-700 truncate">{fileToImport.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setFileToImport(null)}><X className="w-4 h-4" /></Button>
              </div>
            )}
            <a href="/Musteri_Iceri_Aktarma_Sablonu.xlsx" download className="text-sm text-pink-600 hover:underline">{t('downloadTemplate')}</a>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeImportModal}>{t('cancel')}</Button>
            <Button onClick={handleImport} disabled={!fileToImport || isImporting} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
              {isImporting ? t('importing') : t('import')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('areYouAbsolutelySure')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteCustomerConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Müşteri Detay Drawer */}
      <CustomerDetailDrawer
        customer={selectedCustomer}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        company={company}
        staff={staff}
        t={t}
        toast={toast}
        onCustomerUpdated={() => {
          fetchCustomers();
          // Drawer'daki müşteriyi de güncelle
          if (selectedCustomer) {
            supabase.from('customers').select('*').eq('id', selectedCustomer.id).single().then(({ data }) => {
              if (data) setSelectedCustomer(data);
            });
          }
        }}
      />
    </>
  );
};

export default CustomersPage;
