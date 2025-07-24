// frontend/src/SignUpPage.tsx

import React from 'react';
import { SignUp } from "@clerk/clerk-react";
import { ErrorBoundary } from '../../components/ErrorBoundary';

const SignUpPage: React.FC = () => {
  return (
    <ErrorBoundary context="Sign Up Page">
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100vw',
        height: '100vh'
      }}>
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
      </div>
    </ErrorBoundary>
  );
};

export default SignUpPage;