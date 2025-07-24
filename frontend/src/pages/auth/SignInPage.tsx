// frontend/src/SignInPage.tsx

import React from 'react';
import { SignIn } from "@clerk/clerk-react";
import { ErrorBoundary } from '../../components/ErrorBoundary';

const SignInPage: React.FC = () => {
  return (
    <ErrorBoundary context="Sign In Page">
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100vw',
        height: '100vh'
      }}>
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
      </div>
    </ErrorBoundary>
  );
};

export default SignInPage;