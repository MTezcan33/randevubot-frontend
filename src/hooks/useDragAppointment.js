/**
 * useDragAppointment Hook
 * Surukle-birak ile randevu tasima
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export function useDragAppointment({
  newAppointment,
  slotsNeeded,
  bookedSlots,
  experts,
  cellRefs,
  totalSlots,
  onDrop,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragState, setDragState] = useState(null); // { targetCol, targetSlot, isValid }
  const ghostRef = useRef(null);
  const startPosRef = useRef(null);

  const canFit = useCallback((col, startSlot, count) => {
    if (!bookedSlots) return false;
    for (let k = 0; k < count; k++) {
      const s = startSlot + k;
      if (s >= totalSlots || s < 0) return false;
      // Kendi mevcut konumunu atla
      const key = `${col}-${s}`;
      const booked = bookedSlots[key];
      if (booked) return false;
    }
    return true;
  }, [bookedSlots, totalSlots]);

  const handleDragStart = useCallback((e) => {
    if (!newAppointment || e.button !== 0) return;
    startDrag(e, newAppointment.serviceName || 'Randevu');
  }, [newAppointment]);

  // Dogrudan surukle — state beklemeden (mevcut randevu suruklemede kullanilir)
  const startDrag = useCallback((e, label) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };

    // Ghost element olustur
    const ghost = document.createElement('div');
    ghost.className = 'fixed z-[9999] pointer-events-none rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-lg';
    ghost.style.backgroundColor = 'rgba(124, 58, 237, 0.9)';
    ghost.style.left = `${e.clientX + 12}px`;
    ghost.style.top = `${e.clientY + 12}px`;
    ghost.textContent = label || 'Randevu';
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
  }, []);

  const handleDragMove = useCallback((e) => {
    if (!isDragging || !ghostRef.current) return;

    // Ghost konumunu guncelle
    ghostRef.current.style.left = `${e.clientX + 12}px`;
    ghostRef.current.style.top = `${e.clientY + 12}px`;

    // Hedef hucreyi bul
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el?.closest?.('[data-col]');

    if (!target) {
      setDragState(null);
      return;
    }

    const col = parseInt(target.dataset.col);
    const slot = parseInt(target.dataset.slot);

    if (isNaN(col) || isNaN(slot)) {
      setDragState(null);
      return;
    }

    const isValid = canFit(col, slot, slotsNeeded);
    setDragState({ targetCol: col, targetSlot: slot, isValid });
  }, [isDragging, slotsNeeded, canFit]);

  const handleDragEnd = useCallback((e) => {
    // Ghost kaldir
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }

    setIsDragging(false);

    // Hedef bul
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el?.closest?.('[data-col]');

    if (target && dragState?.isValid) {
      const col = parseInt(target.dataset.col);
      const slot = parseInt(target.dataset.slot);
      if (!isNaN(col) && !isNaN(slot)) {
        onDrop?.(col, slot);
      }
    }

    setDragState(null);
  }, [dragState, onDrop]);

  // Global mouse event'leri
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e) => handleDragMove(e);
    const onUp = (e) => handleDragEnd(e);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Cleanup ghost on unmount
  useEffect(() => {
    return () => {
      if (ghostRef.current) {
        ghostRef.current.remove();
        ghostRef.current = null;
      }
    };
  }, []);

  return {
    isDragging,
    dragState,
    handleDragStart,
    startDrag,
  };
}
