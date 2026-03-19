import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2 } from 'lucide-react';

const MAX_CHARS = 500;

// Mesaj giris alani + gonder butonu
const ChatInput = ({ onSendMessage, isLoading, disabled }) => {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  const canSend = value.trim().length > 0 && !isLoading && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    onSendMessage(value.trim());
    setValue('');
    // Textarea yuksekligini sifirla
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    // Enter gonderir, Shift+Enter yeni satir
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    const text = e.target.value;
    if (text.length <= MAX_CHARS) {
      setValue(text);
    }
    // Otomatik yukseklik ayarla
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
    }
  };

  return (
    <div className="px-3 py-2.5 border-t border-stone-200 bg-white rounded-b-2xl">
      {/* Karakter sayaci */}
      {value.length > MAX_CHARS * 0.8 && (
        <div className="text-right text-[10px] text-stone-400 px-1 mb-1">
          {value.length}/{MAX_CHARS}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={t('chatPlaceholder', 'Mesajinizi yazin...')}
          className="flex-1 resize-none text-sm text-stone-800 placeholder:text-stone-400
                     bg-stone-50 border border-stone-200 rounded-xl px-3 py-2
                     focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400
                     disabled:opacity-50 disabled:cursor-not-allowed
                     max-h-[100px] leading-relaxed"
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                     bg-emerald-600 text-white hover:bg-emerald-700
                     disabled:bg-stone-200 disabled:text-stone-400
                     transition-colors duration-150"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
