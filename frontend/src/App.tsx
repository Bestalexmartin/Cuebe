// frontend/src/App.tsx

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useDisclosure, Box } from '@chakra-ui/react';
import Header from './Header';
import DashboardPage from './DashboardPage';
import SignInPage from "./SignInPage";
import SignUpPage from "./SignUpPage";
import UserProfilePage from "./UserProfilePage";
import { EditShowPage } from './EditShowPage';
import { EditScriptPage } from './EditScriptPage';
import { EditVenuePage } from './EditVenuePage';
import { EditDepartmentPage } from './EditDepartmentPage';
import { EditCrewPage } from './EditCrewPage';

// TypeScript interfaces
interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Protected Route Component - wraps any component that requires authentication
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut><Navigate to="/sign-in" replace /></SignedOut>
  </>
);

const App: React.FC = () => {
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

          {/* Add this new route for script editing */}
          <Route path="/scripts/:scriptId/edit" element={
            <ProtectedRoute>
              <EditScriptPage />
            </ProtectedRoute>
          } />

          <Route path="/user-profile/*" element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          } />

          <Route path="/venues/:venueId/edit" element={
            <ProtectedRoute>
              <EditVenuePage />
            </ProtectedRoute>
          } />

          <Route path="/departments/:departmentId/edit" element={
            <ProtectedRoute>
              <EditDepartmentPage />
            </ProtectedRoute>
          } />
          <Route path="/crew/:crewId/edit" element={
            <ProtectedRoute>
              <EditCrewPage />
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
};

export default App;