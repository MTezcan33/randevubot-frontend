import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import ChatHeader from './ChatHeader';
import ChatMessageList from './ChatMessageList';
import ChatPreForm from './ChatPreForm';
import ChatInput from './ChatInput';

// Ana chat penceresi konteyneri
const ChatWindow = ({
  isOpen,
  onClose,
  session,
  messages,
  isLoading,
  error,
  onSendMessage,
  onStartSession,
  onCloseSession,
  isPublic,
}) => {
  const { t } = useTranslation();
  const messagesEndRef = useRef(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-20 right-4 z-50
                     w-96 h-[500px]
                     sm:w-96 sm:h-[500px] sm:bottom-20 sm:right-4 sm:rounded-2xl
                     max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:bottom-0 max-sm:right-0 max-sm:rounded-none
                     bg-white/95 backdrop-blur-xl
                     border border-stone-200 shadow-2xl shadow-stone-300/30
                     flex flex-col overflow-hidden
                     sm:rounded-2xl"
        >
          {/* Baslik */}
          <ChatHeader
            onClose={onClose}
            onEndChat={session ? onCloseSession : undefined}
            session={session}
          />

          {/* Hata bildirimi */}
          {error && (
            <div className="mx-3 mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Icerik: oturum yoksa on-form, varsa mesaj listesi */}
          {!session ? (
            <ChatPreForm onStartSession={onStartSession} isPublic={isPublic} />
          ) : (
            <ChatMessageList
              messages={messages}
              isLoading={isLoading}
              messagesEndRef={messagesEndRef}
            />
          )}

          {/* Mesaj girisi - sadece oturum aktifken */}
          {session && (
            <ChatInput
              onSendMessage={onSendMessage}
              isLoading={isLoading}
              disabled={!session}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatWindow;
