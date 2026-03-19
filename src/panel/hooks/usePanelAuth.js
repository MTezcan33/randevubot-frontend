import { useContext } from 'react';
import PanelAuthContext from '../contexts/PanelAuthContext';

/**
 * Panel auth context hook'u
 * PanelAuthProvider içinde kullanılmalı
 */
export function usePanelAuth() {
  const context = useContext(PanelAuthContext);
  if (!context) {
    throw new Error('usePanelAuth must be used within a PanelAuthProvider');
  }
  return context;
}

export default usePanelAuth;
