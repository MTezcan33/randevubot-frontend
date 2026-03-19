import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as chatService from '../services/asistanChatService';

/**
 * Sohbet oturumu yonetimi icin React hook.
 * Oturum olusturma, mesaj gonderme, hata yonetimi ve otomatik temizlik saglar.
 */
export function useChatSession() {
  const { user, company } = useAuth();

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Otomatik kaydirma icin ref
  const messagesEndRef = useRef(null);

  // Aktif oturum takibi (unmount sirasinda kapatmak icin)
  const activeSessionRef = useRef(null);

  // Hata zamanlayicisi ref'i (temizlik icin)
  const errorTimerRef = useRef(null);

  /**
   * Hatayi ayarlar ve rate limit hatalari icin 3 saniye sonra temizler.
   */
  const setErrorWithAutoClean = useCallback((errorMessage) => {
    setError(errorMessage);

    // Onceki zamanlayiciyi temizle
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }

    // Rate limit hatalarini 3 saniye sonra otomatik temizle
    if (errorMessage && (
      errorMessage.includes('bekle') ||
      errorMessage.includes('fazla mesaj')
    )) {
      errorTimerRef.current = setTimeout(() => {
        setError(null);
        errorTimerRef.current = null;
      }, 3000);
    }
  }, []);

  /**
   * Hatayi temizler.
   */
  const clearError = useCallback(() => {
    setError(null);
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  }, []);

  /**
   * Yeni bir sohbet oturumu baslatir.
   * @param {boolean} isPublic - Herkese acik mi
   */
  const startSession = useCallback(async (isPublic = false) => {
    if (!company?.id || !user?.id) {
      setErrorWithAutoClean('Oturum bilgileri yuklenemedi.');
      return;
    }

    try {
      setIsLoading(true);
      clearError();

      const newSession = await chatService.createSession(company.id, user.id, isPublic);
      setSession(newSession);
      setMessages([]);
      activeSessionRef.current = newSession.id;
    } catch (err) {
      setErrorWithAutoClean(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, user?.id, clearError, setErrorWithAutoClean]);

  /**
   * Mesaj gonderir ve asistan yanitini alir.
   * @param {string} content - Mesaj icerigi
   */
  const sendMessage = useCallback(async (content) => {
    if (!session?.id || !content.trim()) return;

    const trimmedContent = content.trim();

    // Kullanici mesajini hemen ekle (iyimser guncelleme)
    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      session_id: session.id,
      role: 'user',
      content: trimmedContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      setIsLoading(true);
      clearError();

      const assistantMessage = await chatService.sendMessage(
        session.id,
        trimmedContent,
        company.id,
        user.id
      );

      // Asistan yanitini ekle
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setErrorWithAutoClean(err.message);

      // Rate limit hatasinda gecici kullanici mesajini kaldir
      if (err.message.includes('bekle') || err.message.includes('fazla mesaj')) {
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      }
    } finally {
      setIsLoading(false);
    }
  }, [session?.id, company?.id, user?.id, clearError, setErrorWithAutoClean]);

  /**
   * Aktif oturumu kapatir.
   */
  const closeSession = useCallback(async () => {
    if (!session?.id) return;

    try {
      await chatService.closeSession(session.id);
    } catch (err) {
      console.error('Oturum kapatma hatasi:', err);
    } finally {
      activeSessionRef.current = null;
      setSession(null);
      setMessages([]);
      clearError();
    }
  }, [session?.id, clearError]);

  // Component unmount oldugunda aktif oturumu kapat
  useEffect(() => {
    return () => {
      if (activeSessionRef.current) {
        chatService.closeSession(activeSessionRef.current).catch(() => {});
      }
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
    };
  }, []);

  return {
    session,
    messages,
    isLoading,
    error,
    messagesEndRef,
    startSession,
    sendMessage,
    closeSession,
    clearError,
  };
}
