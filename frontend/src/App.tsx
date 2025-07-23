// frontend/src/App.tsx

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useDisclosure, Box } from '@chakra-ui/react';
import Header from './components/layout/Header';
import DashboardPage from './pages/DashboardPage';
import SignInPage from "./pages/auth/SignInPage";
import SignUpPage from "./pages/auth/SignUpPage";
import UserProfilePage from "./pages/UserProfilePage";
import { EditShowPage } from './pages/edit/EditShowPage';
import { EditScriptPage } from './pages/edit/EditScriptPage';
import { EditVenuePage } from './pages/edit/EditVenuePage';
import { EditDepartmentPage } from './pages/edit/EditDepartmentPage';
import { EditCrewPage } from './pages/edit/EditCrewPage';
import { TutorialPage } from './pages/TutorialPage';
import { TestToolsPage } from './pages/TestToolsPage';
import { ApiDocumentationPage } from './pages/ApiDocumentationPage';

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

          {/* Tutorial and Test Tools Routes */}
          <Route path="/tutorial" element={
            <ProtectedRoute>
              <TutorialPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} />
            </ProtectedRoute>
          } />

          <Route path="/test-tools" element={
            <ProtectedRoute>
              <TestToolsPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} />
            </ProtectedRoute>
          } />

          <Route path="/api-documentation" element={
            <ProtectedRoute>
              <ApiDocumentationPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} />
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