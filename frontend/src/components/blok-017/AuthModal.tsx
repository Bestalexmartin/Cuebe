// frontend/src/components/blok-017/AuthModal.tsx
//
// Blok 017 auth modal, ported for Cuebe. Renders the active auth form inside
// Cuebe's BaseModal and auto-closes when the user becomes authenticated.

import { useEffect } from 'react';
import { BaseModal } from '../base/BaseModal';
import { useAuth } from '../../hooks/useAuth';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { SignInForm, SignUpForm, ForgotPasswordForm, ResetPasswordForm } from './auth';

export default function AuthModal() {
  const { isAuthenticated } = useAuth();
  const { activeView, closeModal } = useAuthModal();

  // Auto-close when the user becomes authenticated.
  useEffect(() => {
    if (isAuthenticated && activeView) {
      closeModal();
    }
  }, [isAuthenticated, activeView, closeModal]);

  return (
    <BaseModal
      isOpen={!!activeView}
      onClose={closeModal}
      showHeader={false}
      showFooter={false}
      showCloseButton
      isCentered
      size="sm"
    >
      {activeView === 'signin' && <SignInForm />}
      {activeView === 'signup' && <SignUpForm />}
      {activeView === 'forgot-password' && <ForgotPasswordForm />}
      {activeView === 'reset-password' && <ResetPasswordForm />}
    </BaseModal>
  );
}
