// frontend/src/Dashboard.jsx

import { UserProfile } from "@clerk/clerk-react";

const Dashboard = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh' }}>
      <UserProfile path="/user" routing="path" />
    </div>
  );
};

export default Dashboard;