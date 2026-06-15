// frontend/src/pages/auth/SignInPage.tsx
//
// Full-page sign-in, Blok 017 self-hosted auth. Renders the SignInForm inside
// the shared AuthLayout. Form-to-form navigation (sign up, forgot password)
// opens the auth modal, which is mounted in the app shell.

import React from 'react';
import { Navigate } from 'react-router-dom';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import AuthLayout from '../../components/blok-017/AuthLayout';
import { SignInForm } from '../../components/blok-017/auth';
import { useAuth } from '../../hooks/useAuth';

const SignInPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // On the dedicated /sign-in route a successful login only flips auth state;
  // send the now-authenticated user to the dashboard (the modal flow closes
  // itself, but the full-page route needs an explicit redirect).
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ErrorBoundary context="Sign In Page">
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </ErrorBoundary>
  );
};

export default SignInPage;
