// frontend/src/UserProfilePage.tsx

import React from 'react';
import { UserProfile } from "@clerk/clerk-react";
import { ErrorBoundary } from '../components/ErrorBoundary';

const UserProfilePage: React.FC = () => {
  return (
    <ErrorBoundary context="User Profile Page">
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100vw',
        height: '100vh'
      }}>
        <UserProfile path="/user-profile" routing="path" />
      </div>
    </ErrorBoundary>
  );
};

export default UserProfilePage;