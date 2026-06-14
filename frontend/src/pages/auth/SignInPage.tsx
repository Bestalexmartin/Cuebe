// frontend/src/pages/auth/SignInPage.tsx
//
// Full-page sign-in, Blok 017 self-hosted auth. Renders the SignInForm inside
// the shared AuthLayout. Form-to-form navigation (sign up, forgot password)
// opens the auth modal, which is mounted in the app shell.

import React from 'react';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import AuthLayout from '../../components/blok-017/AuthLayout';
import { SignInForm } from '../../components/blok-017/auth';

const SignInPage: React.FC = () => {
  return (
    <ErrorBoundary context="Sign In Page">
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </ErrorBoundary>
  );
};

export default SignInPage;
