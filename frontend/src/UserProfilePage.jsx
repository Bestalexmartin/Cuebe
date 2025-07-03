// frontend/src/UserProfilePage.jsx

import { UserProfile } from "@clerk/clerk-react";

const UserProfilePage = () => {
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