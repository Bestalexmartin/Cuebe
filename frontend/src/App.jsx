// frontend/src/App.jsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useDisclosure } from '@chakra-ui/react';
import Header from './Header';
import DashboardPage from './DashboardPage';
import SignInPage from "./SignInPage";
import SignUpPage from "./SignUpPage";
import UserProfilePage from "./UserProfilePage";

function App() {
  // The state for the mobile menu drawer now lives in the top-level App
  const { isOpen: isMenuOpen, onOpen: onMenuOpen, onClose: onMenuClose } = useDisclosure();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
      {/* The Header receives the function to open the menu */}
      <Header onMenuOpen={onMenuOpen} />

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', padding: '2rem', boxSizing: 'border-box' }}>
        <Routes>
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />

          {/* We now pass the menu state down to the DashboardPage */}
          <Route path="/dashboard" element={
            <>
              <SignedIn>
                <DashboardPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} />
              </SignedIn>
              <SignedOut> <Navigate to="/sign-in" replace /> </SignedOut>
            </>
          } />

          <Route path="/user-profile/*" element={
            <>
              <SignedIn> <UserProfilePage /> </SignedIn>
              <SignedOut> <Navigate to="/sign-in" replace /> </SignedOut>
            </>
          } />

          <Route path="*" element={
            <>
              <SignedIn> <Navigate to="/dashboard" replace /> </SignedIn>
              <SignedOut> <Navigate to="/sign-in" replace /> </SignedOut>
            </>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;