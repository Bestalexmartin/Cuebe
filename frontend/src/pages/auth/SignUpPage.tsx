// frontend/src/pages/auth/SignUpPage.tsx
//
// Full-page sign-up, Blok 017 self-hosted auth. Renders the SignUpForm inside
// the shared AuthLayout. Form-to-form navigation (back to sign in) opens the
// auth modal, which is mounted in the app shell.

import React from 'react';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import AuthLayout from '../../components/blok-017/AuthLayout';
import { SignUpForm } from '../../components/blok-017/auth';

const SignUpPage: React.FC = () => {
  return (
    <ErrorBoundary context="Sign Up Page">
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </ErrorBoundary>
  );
};

export default SignUpPage;
