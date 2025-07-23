// frontend/src/UserProfilePage.tsx

import React from 'react';
import { UserProfile } from "@clerk/clerk-react";

const UserProfilePage: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100vw',
      height: '100vh'
    }}>
      <UserProfile path="/user-profile" routing="path" />
    </div>
  );
};

export default UserProfilePage;