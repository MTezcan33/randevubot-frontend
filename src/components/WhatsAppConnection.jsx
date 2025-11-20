import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { QrCode, CheckCircle, XCircle, AlertTriangle, Loader2, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const WhatsAppConnection = () => {
  const { company, refreshCompany } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [instanceStatus, setInstanceStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (company) {
      setInstanceStatus(company.status || 'disconnected');
      setQrCode(company.qr_code);
      setPhoneNumber(company.whatsapp_number);
    }
  }, [company]);
  
  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel(`company-updates-${company.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'companies',
          filter: `id=eq.${company.id}`,
        },
        (payload) => {
          const newCompanyData = payload.new;
          setInstanceStatus(newCompanyData.status);
          setQrCode(newCompanyData.qr_code);
          setPhoneNumber(newCompanyData.whatsapp_number);
          
          if (newCompanyData.status !== 'pending' && isConnecting) {
            setIsConnecting(false);
          }
          if (newCompanyData.status !== company.status || newCompanyData.qr_code !== company.qr_code) {
             refreshCompany();
          }
          if (newCompanyData.status === 'connected' && company.status !== 'connected') {
            toast({
              title: t('connectionSuccessful'),
              description: t('whatsappConnected'),
              className: "bg-green-100 text-green-800"
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, isConnecting, refreshCompany, t, toast, company?.status, company?.qr_code]);

  const handleConnect = async () => {
      // This button click will be handled by the form submission which triggers the DB trigger.
      // We just need to give user feedback.
      setIsConnecting(true);
      toast({
        title: "İstek Gönderildi",
        description: "WhatsApp bağlantı isteğiniz işleniyor. Lütfen ayarları kaydedin.",
      });
      // The actual logic is now in the form's handleSubmit and the database trigger.
      // We set a timeout to reset the button in case the user doesn't save.
      setTimeout(() => setIsConnecting(false), 15000); 
  };
  
  const renderStatus = () => {
    if (loading || isConnecting && instanceStatus !== 'pending') {
      return <div className="flex items-center text-slate-500"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('processing')}...</div>;
    }
    switch (instanceStatus) {
      case 'disconnected':
        return <div className="flex items-center text-red-600"><XCircle className="w-4 h-4 mr-2" /> {t('notConnected')}</div>;
      case 'pending':
        return <div className="flex items-center text-yellow-600"><AlertTriangle className="w-4 h-4 mr-2" /> {t('scanQRCode')}</div>;
      case 'connected':
        return <div className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-2" /> {t('connected')} ({phoneNumber})</div>;
      default:
        return <div className="flex items-center text-slate-500"><XCircle className="w-4 h-4 mr-2" /> {t('notConnected')}</div>;
    }
  };

  return (
    <div className="glass-effect rounded-2xl p-8 space-y-6">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-xl font-bold flex items-center">
                    <MessageCircle className="w-6 h-6 mr-3 text-green-500" />
                    {t('whatsappIntegration')}
                </h2>
                <p className="text-slate-600 mt-1">{t('whatsappHelp')}</p>
            </div>
            <div className="text-sm font-semibold p-2 rounded-lg bg-slate-100">
                {renderStatus()}
            </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 p-6 bg-slate-50 rounded-xl min-h-[280px]">
            {(!instanceStatus || instanceStatus === 'disconnected') && (
                <div className="text-center">
                    <QrCode className="w-24 h-24 mx-auto text-slate-300 mb-4" />
                     <p className="text-sm font-medium text-slate-600">
                        {t('whatsappNumber')} alanını doldurup ayarları kaydederek QR kodu alabilirsiniz.
                     </p>
                    <p className="text-xs text-slate-500 mt-2">QR kodu oluşturmak için numarayı girin ve kaydedin.</p>
                </div>
            )}

            {instanceStatus === 'pending' && (
                <div className="text-center">
                    {qrCode ? (
                        <img src={`data:image/png;base64,${qrCode}`} alt="WhatsApp QR Code" className="w-64 h-64 rounded-lg shadow-md" />
                    ) : (
                        <div className="w-64 h-64 flex items-center justify-center bg-slate-200 rounded-lg">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                            <p className='ml-4'>{t('loading')} QR...</p>
                        </div>
                    )}
                    <p className="font-semibold mt-4">{t('whatsappInstructions')}</p>
                    <p className="text-xs text-slate-500">Ayarlar &gt; Bağlı Cihazlar &gt; Cihaz Bağla</p>
                </div>
            )}

            {instanceStatus === 'connected' && (
                <div className="text-center">
                    <CheckCircle className="w-24 h-24 mx-auto text-green-500 mb-4" />
                    <h3 className="text-2xl font-bold text-slate-800">{t('connectionSuccessful')}</h3>
                    <p className="text-slate-600">Randevu botunuz <span className="font-bold">{phoneNumber}</span> numarası üzerinden aktif.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default WhatsAppConnection;