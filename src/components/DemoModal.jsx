import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Send } from 'lucide-react';

const DemoModal = ({ open, onClose, contentType = 'law_office' }) => {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState(0);

  const getDemos = () => ({
    law_office: [
      { sender: 'user', text: t('lawOfficeUser1') },
      { sender: 'bot', text: t('lawOfficeBot1') },
      { sender: 'user', text: t('lawOfficeUser2') },
      { sender: 'bot', text: t('lawOfficeBot2') },
      { sender: 'user', text: t('lawOfficeUser3') },
      { sender: 'bot', text: t('lawOfficeBot3') },
      { sender: 'user', text: t('lawOfficeUser4') },
      { sender: 'bot', text: t('lawOfficeBot4') },
      { sender: 'user', text: t('lawOfficeUser5') },
      { sender: 'bot', text: t('lawOfficeBot5') },
      { sender: 'user', text: t('lawOfficeUser6') },
      { sender: 'bot', text: t('lawOfficeBot6') },
    ],
    klinik: [
      { sender: 'user', text: t('klinikDemoUser1') },
      { sender: 'bot', text: t('klinikDemoBot1') },
      { sender: 'user', text: t('klinikDemoUser2') },
      { sender: 'bot', text: t('klinikDemoBot2') },
      { sender: 'user', text: t('klinikDemoUser3') },
      { sender: 'bot', text: t('klinikDemoBot3') },
      { sender: 'user', text: t('klinikDemoUser4') },
      { sender: 'bot', text: t('klinikDemoBot4') },
      { sender: 'user', text: t('klinikDemoUser5') },
      { sender: 'bot', text: t('klinikDemoBot5') },      
    ],
    guzellik: [
      { sender: 'user', text: t('guzellikDemoUser1') },
      { sender: 'bot', text: t('guzellikDemoBot1') },
      { sender: 'user', text: t('guzellikDemoUser2') },
      { sender: 'bot', text: t('guzellikDemoBot2') },
      { sender: 'user', text: t('guzellikDemoUser3') },
      { sender: 'bot', text: t('guzellikDemoBot3') },
      { sender: 'user', text: t('guzellikDemoUser4') },
      { sender: 'bot', text: t('guzellikDemoBot4') },
      { sender: 'user', text: t('guzellikDemoUser5') },
      { sender: 'bot', text: t('guzellikDemoBot5') },
    ],
    servis: [
      { sender: 'user', text: t('servisDemoUser1') },
      { sender: 'bot', text: t('servisDemoBot1') },
      { sender: 'user', text: t('servisDemoUser2') },
      { sender: 'bot', text: t('servisDemoBot2') },
      { sender: 'user', text: t('servisDemoUser3') },
      { sender: 'bot', text: t('servisDemoBot3') },
      { sender: 'user', text: t('servisDemoUser4') },
      { sender: 'bot', text: t('servisDemoBot4') },
      { sender: 'user', text: t('servisDemoUser5') },
      { sender: 'bot', text: t('servisDemoBot5') },
      { sender: 'user', text: t('servisDemoUser6') },
      { sender: 'bot', text: t('servisDemoBot6') },
    ],
    ogretmen: [
      { sender: 'user', text: t('ogretmenDemoUser1') },
      { sender: 'bot', text: t('ogretmenDemoBot1') },
      { sender: 'user', text: t('ogretmenDemoUser2') },
      { sender: 'bot', text: t('ogretmenDemoBot2') },
      { sender: 'user', text: t('ogretmenDemoUser3') },
      { sender: 'bot', text: t('ogretmenDemoBot3') },
      { sender: 'user', text: t('ogretmenDemoUser4') },
      { sender: 'bot', text: t('ogretmenDemoBot4') },
      { sender: 'user', text: t('ogretmenDemoUser5') },
      { sender: 'bot', text: t('ogretmenDemoBot5') },
    ]
  });

  const demoFlow = getDemos()[contentType] || getDemos().law_office;

  useEffect(() => {
    if (open) {
      setMessages([]);
      setStep(0);
    }
  }, [open, contentType, i18n.language]);

  useEffect(() => {
    if (open && step < demoFlow.length) {
      const timer = setTimeout(() => {
        setMessages(prev => [...prev, demoFlow[step]]);
        setStep(prev => prev + 1);
      }, step === 0 ? 500 : 1500); // Adjusted delay for better flow

      return () => clearTimeout(timer);
    }
  }, [open, step, demoFlow]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl w-[580px] sm:w-[480px] overflow-hidden"
      >
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h3 className="font-semibold">{t('demoTitle')}</h3>
              <p className="text-xs opacity-90">{t('demoOnline')}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-[430px] overflow-y-auto p-4 space-y-4 bg-slate-50">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-green-500 text-white rounded-br-none'
                      : 'bg-white text-slate-900 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                  <p className="text-xs opacity-70 mt-1 text-right">
                    {new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="p-4 bg-white border-t flex items-center space-x-2">
          <input
            type="text"
            placeholder={t('demoPlaceholder')}
            className="flex-1 px-4 py-2 rounded-full bg-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled
          />
          <button className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors">
            <Send className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-blue-50 p-4 text-center border-t">
          <p className="text-sm text-blue-900">
            {t('demoDisclaimer')}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default DemoModal;