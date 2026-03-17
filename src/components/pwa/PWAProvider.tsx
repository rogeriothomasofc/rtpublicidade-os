import { createContext, useContext, ReactNode } from 'react';
import { usePWA } from '@/hooks/usePWA';

interface PWAContextValue {
  isOnline: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  needRefresh: boolean;
  install: () => Promise<boolean>;
  update: () => Promise<void>;
  dismissUpdate: () => void;
}

const PWAContext = createContext<PWAContextValue | null>(null);

/**
 * Singleton PWA provider — ensures a single set of event listeners
 * for online/offline, install prompt, and service worker updates.
 */
export function PWAProvider({ children }: { children: ReactNode }) {
  const pwa = usePWA();

  return (
    <PWAContext.Provider value={pwa}>
      {children}
    </PWAContext.Provider>
  );
}

export function usePWAContext() {
  const ctx = useContext(PWAContext);
  if (!ctx) {
    throw new Error('usePWAContext must be used within PWAProvider');
  }
  return ctx;
}
