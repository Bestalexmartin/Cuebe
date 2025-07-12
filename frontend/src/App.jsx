// frontend/src/App.jsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useDisclosure, Box } from '@chakra-ui/react';
import Header from './Header';
import DashboardPage from './DashboardPage';
import SignInPage from "./SignInPage";
import SignUpPage from "./SignUpPage";
import UserProfilePage from "./UserProfilePage";
import { EditShowPage } from './EditShowPage'; // Make sure this is imported

function App() {
  const { isOpen: isMenuOpen, onOpen: onMenuOpen, onClose: onMenuClose } = useDisclosure();

  return (
    <Box
      display="grid"
      gridTemplateRows="auto 1fr"
      height="100vh"
      width="100vw"
      overflow="hidden"
    >
      <Header onMenuOpen={onMenuOpen} />

      <Box as="main" overflow="hidden">
        <Routes>
          {/* Public Routes */}
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />

          {/* Private Routes */}
          <Route path="/dashboard" element={
            <>
              <SignedIn>
                <DashboardPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} />
              </SignedIn>
              <SignedOut> <Navigate to="/sign-in" replace /> </SignedOut>
            </>
          } />

          <Route path="/shows/:showId/edit" element={
            <>
              <SignedIn>
                <EditShowPage />
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
      </Box>
    </Box>
  );
}

export default App;