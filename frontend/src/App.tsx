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
import { EditShowPage } from './features/shows/pages/EditShowPage';
import { ManageScriptPage } from './pages/ManageScriptPage';
import { EditVenuePage } from './features/venues/pages/EditVenuePage';
import { EditDepartmentPage } from './features/departments/pages/EditDepartmentPage';
import { EditCrewPage } from './features/crew/pages/EditCrewPage';
import { TutorialPage } from './pages/TutorialPage';
import { TestToolsPage } from './pages/TestToolsPage';
import { ApiDocsPage } from './pages/ApiDocsPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { ErrorBoundary } from './components/ErrorBoundary';

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
    <ErrorBoundary context="Application Root">
      <Routes>
        {/* All routes with Header Layout */}
        <Route path="*" element={
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

                {/* Script management route - elevated from edit hierarchy */}
                <Route path="/scripts/:scriptId/manage" element={
                  <ProtectedRoute>
                    <ManageScriptPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} />
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
                    <ApiDocsPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} />
                  </ProtectedRoute>
                } />

                <Route path="/documentation" element={
                  <ProtectedRoute>
                    <DocumentationPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} />
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
        } />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;