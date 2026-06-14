// frontend/src/contexts/AuthModalContext.tsx
//
// Blok 017 auth modal context, ported for Cuebe. Tracks which auth form is
// shown in the modal overlay. Additive to the existing Cuebe context layer.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type AuthModalView = 'signin' | 'signup' | 'forgot-password' | 'reset-password' | null;

export interface AuthModalContextType {
  activeView: AuthModalView;
  modalData: Record<string, string>;
  openModal: (view: NonNullable<AuthModalView>, data?: Record<string, string>) => void;
  closeModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<AuthModalView>(null);
  const [modalData, setModalData] = useState<Record<string, string>>({});

  const openModal = useCallback(
    (view: NonNullable<AuthModalView>, data?: Record<string, string>) => {
      setModalData(data ?? {});
      setActiveView(view);
    },
    [],
  );

  const closeModal = useCallback(() => {
    setActiveView(null);
    setModalData({});
  }, []);

  const value = useMemo<AuthModalContextType>(
    () => ({ activeView, modalData, openModal, closeModal }),
    [activeView, modalData, openModal, closeModal],
  );

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal(): AuthModalContextType {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}
