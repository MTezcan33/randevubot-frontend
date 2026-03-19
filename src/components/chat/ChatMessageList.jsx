import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatTypingIndicator from './ChatTypingIndicator';

// Kaydirilabilir mesaj listesi
const ChatMessageList = ({ messages, isLoading, messagesEndRef }) => {
  const { t } = useTranslation();
  const containerRef = useRef(null);

  // Yeni mesajda en alta kaydir
  useEffect(() => {
    if (messagesEndRef?.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, messagesEndRef]);

  // Bos durum
  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
          <MessageSquare className="w-6 h-6 text-emerald-500" />
        </div>
        <p className="text-sm text-stone-500">
          {t('chatEmptyState', 'Henuz mesaj yok. Bir soru sorarak baslayabilirsiniz.')}
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto py-3 space-y-1 scroll-smooth">
      {messages.map((msg, index) => (
        <ChatMessage key={msg.id || index} message={msg} />
      ))}

      {/* Yazma gostergesi */}
      {isLoading && <ChatTypingIndicator />}

      {/* Otomatik kaydirma icin referans noktasi */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessageList;
