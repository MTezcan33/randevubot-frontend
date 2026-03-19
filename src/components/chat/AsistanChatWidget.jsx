import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatWindow from './ChatWindow';

// Ana yuzey chat widget'i - sayfanin sag alt kosesinde sabit buton
const AsistanChatWidget = ({ isPublic = false }) => {
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Pencereyi ac/kapa
  const toggleChat = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) setUnreadCount(0);
      return !prev;
    });
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Yeni sohbet oturumu baslat
  const handleStartSession = useCallback(
    (initialMessage) => {
      const newSession = {
        id: Date.now().toString(),
        started_at: new Date().toISOString(),
      };
      setSession(newSession);
      setMessages([]);
      setError(null);

      // Karsilama mesaji
      const welcomeMsg = {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: t(
          'chatSessionWelcome',
          'Merhaba! Size nasil yardimci olabilirim? Randevu, ayarlar veya herhangi bir konuda soru sorabilirsiniz.'
        ),
        created_at: new Date().toISOString(),
      };
      setMessages([welcomeMsg]);

      // Hizli islemden geldiyse mesaji gonder
      if (initialMessage) {
        const userMsg = {
          id: `usr-${Date.now()}`,
          role: 'user',
          content: initialMessage,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);
        // TODO: Burada backend'e mesaj gonderilecek
        simulateResponse(initialMessage);
      }
    },
    [t]
  );

  // Sohbeti sonlandir
  const handleCloseSession = useCallback(() => {
    const systemMsg = {
      id: `sys-${Date.now()}`,
      role: 'system',
      content: t('chatSessionEnded', 'Sohbet sonlandirildi.'),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, systemMsg]);
    setSession(null);
  }, [t]);

  // Mesaj gonder
  const handleSendMessage = useCallback(
    (content) => {
      const userMsg = {
        id: `usr-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setError(null);

      // TODO: Burada backend'e mesaj gonderilecek
      simulateResponse(content);
    },
    []
  );

  // Gecici: simule edilmis yanit (backend entegrasyonuna kadar)
  const simulateResponse = (userContent) => {
    setIsLoading(true);
    setTimeout(() => {
      const response = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: `Bu bir test yanitidir. Gercek backend entegrasyonu yakilmasinda eklenecek.\n\nSorunuz: **${userContent}**`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, response]);
      setIsLoading(false);

      // Pencere kapali ise okunmamis sayisini artir
      setUnreadCount((prev) => (document.hidden ? prev + 1 : prev));
    }, 1500);
  };

  return (
    <>
      {/* Chat penceresi */}
      <ChatWindow
        isOpen={isOpen}
        onClose={closeChat}
        session={session}
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSendMessage={handleSendMessage}
        onStartSession={handleStartSession}
        onCloseSession={handleCloseSession}
        isPublic={isPublic}
      />

      {/* Yuzey butonu */}
      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-4 right-4 z-50
                   w-14 h-14 rounded-full
                   bg-gradient-to-br from-emerald-600 to-teal-600
                   text-white shadow-lg shadow-emerald-300/40
                   flex items-center justify-center
                   hover:shadow-xl hover:shadow-emerald-300/50
                   transition-shadow duration-200"
        aria-label={t('openChat', 'Sohbeti Ac')}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Okunmamis mesaj sayisi */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5
                           bg-red-500 text-white text-[11px] font-bold
                           rounded-full flex items-center justify-center
                           shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </motion.button>
    </>
  );
};

export default AsistanChatWidget;
