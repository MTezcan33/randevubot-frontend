import React, { useState } from 'react';
import { Bot } from 'lucide-react';

// Basit markdown destegi: **bold** ve satir sonu
const formatContent = (text) => {
  if (!text) return '';
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Satir sonlarini <br /> ile degistir
    return part.split('\n').map((line, j, arr) => (
      <React.Fragment key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </React.Fragment>
    ));
  });
};

// Zaman damgasini formatla
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Tek mesaj baloncugu
const ChatMessage = ({ message }) => {
  const [showTime, setShowTime] = useState(false);
  const { role, content, created_at } = message;

  // Sistem mesaji
  if (role === 'system') {
    return (
      <div className="flex justify-center px-4 py-1">
        <span className="text-xs text-stone-400 italic bg-stone-50 px-3 py-1 rounded-full">
          {content}
        </span>
      </div>
    );
  }

  const isUser = role === 'user';

  return (
    <div
      className={`flex items-end gap-2 px-4 py-1 ${isUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      {/* Bot avatar - sadece asistan mesajlarinda */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="flex flex-col gap-0.5 max-w-[75%]">
        {/* Mesaj baloncugu */}
        <div
          className={`px-3.5 py-2.5 text-sm leading-relaxed break-words ${
            isUser
              ? 'bg-emerald-600 text-white rounded-2xl rounded-br-sm'
              : 'bg-white border border-stone-200 text-stone-800 rounded-2xl rounded-tl-sm shadow-sm'
          }`}
        >
          {formatContent(content)}
        </div>

        {/* Zaman damgasi - hover'da gorunur */}
        {showTime && created_at && (
          <span
            className={`text-[10px] text-stone-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}
          >
            {formatTime(created_at)}
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
