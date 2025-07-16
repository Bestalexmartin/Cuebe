// frontend/src/App.jsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useDisclosure, Box } from '@chakra-ui/react';
import Header from './Header';
import DashboardPage from './DashboardPage';
import SignInPage from "./SignInPage";
import SignUpPage from "./SignUpPage";
import UserProfilePage from "./UserProfilePage";
import { EditShowPage } from './EditShowPage';

// Protected Route Component - wraps any component that requires authentication
const ProtectedRoute = ({ children }) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut><Navigate to="/sign-in" replace /></SignedOut>
  </>
);

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
      <Header onMenuOpen={onMenuOpen} isMenuOpen={isMenuOpen} />

      <Box as="main" overflow="hidden">
        <Routes>
          {/* Public Routes */}
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />

          {/* Private Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} />
            </ProtectedRoute>
          } />

          <Route path="/shows/:showId/edit" element={
            <ProtectedRoute>
              <EditShowPage />
            </ProtectedRoute>
          } />

          <Route path="/user-profile/*" element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          } />

          <Route path="*" element={
            <>
              <SignedIn><Navigate to="/dashboard" replace /></SignedIn>
              <SignedOut><Navigate to="/sign-in" replace /></SignedOut>
            </>
          } />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;