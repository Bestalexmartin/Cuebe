// frontend/src/App.jsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import Header from './Header';
import SignInPage from "./SignInPage";
import SignUpPage from "./SignUpPage";
import UserProfilePage from "./UserProfilePage";
import DashboardPage from './DashboardPage';

function App() {
  return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        minHeight: '100vh'
      }}>
        {/* Header Page */}
        <Header />
      <main style={{
        flexGrow: 1,
        display: 'flex',
        width: '100%',
        padding: '2rem',
        boxSizing: 'border-box'
      }}>
        <Routes>
          {/* Sign-In/Up Elements */}
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          
          {/* Dashboard Page */}
          <Route 
            path="/dashboard/*"
            element={
              <>
                <SignedIn>
                 <DashboardPage />
                </SignedIn>
              </>
            }
          />
          {/* User Profile (currently no route to this - make the button go here?) */}
          <Route
            path="/user-profile/*"
            element={
              <>
                <SignedIn>
                  <UserProfilePage />
                </SignedIn>
                <SignedOut>
                  <Navigate to="/sign-in" replace />
                </SignedOut>
              </>
            }
          />
          
          <Route
            path="*"
            element={
              <>
                <SignedIn>
                  <Navigate to="/user-profile" replace />
                </SignedIn>
                <SignedOut>
                  <Navigate to="/sign-in" replace />
                </SignedOut>
              </>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;