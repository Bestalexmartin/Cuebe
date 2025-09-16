// App.tsx
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
import { TestToolsPage } from './pages/TestToolsPage';
import { ApiDocsPage } from './pages/ApiDocsPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { TutorialsPage } from './pages/TutorialsPage';
import { SharedPage } from './shared/SharedPage';
import { ExpiredSharePage } from './shared/components/ExpiredSharePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScriptSyncProvider } from './contexts/ScriptSyncContext';

const ProtectedRoute: React.FC<React.PropsWithChildren> = ({ children }) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut><Navigate to="/sign-in" replace /></SignedOut>
  </>
);

// Layout used for “everything except shared/*”
const Shell: React.FC<{ isMenuOpen: boolean; onMenuOpen: () => void; onMenuClose: () => void; }> = ({ isMenuOpen, onMenuOpen, onMenuClose }) => (
  <Box display="grid" gridTemplateRows="auto 1fr" height="100vh" width="100vw" overflow="hidden">
    <Header onMenuOpen={onMenuOpen} isMenuOpen={isMenuOpen} />
    <Box as="main" overflow="hidden">
      <Routes>
        {/* Public */}
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />

        {/* Private */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} /></ProtectedRoute>} />
        <Route path="/shows/:showId/edit" element={<ProtectedRoute><EditShowPage /></ProtectedRoute>} />
        <Route path="/scripts/:scriptId/manage" element={<ProtectedRoute><ManageScriptPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} /></ProtectedRoute>} />
        <Route path="/user-profile/*" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
        <Route path="/venues/:venueId/edit" element={<ProtectedRoute><EditVenuePage /></ProtectedRoute>} />
        <Route path="/departments/:departmentId/edit" element={<ProtectedRoute><EditDepartmentPage /></ProtectedRoute>} />
        <Route path="/crew/:crewId/edit" element={<ProtectedRoute><EditCrewPage /></ProtectedRoute>} />
        <Route path="/test-tools" element={<ProtectedRoute><TestToolsPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} /></ProtectedRoute>} />
        <Route path="/api-documentation" element={<ProtectedRoute><ApiDocsPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} /></ProtectedRoute>} />
        <Route path="/documentation" element={<ProtectedRoute><DocumentationPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} /></ProtectedRoute>} />
        <Route path="/tutorials" element={<ProtectedRoute><TutorialsPage isMenuOpen={isMenuOpen} onMenuClose={onMenuClose} /></ProtectedRoute>} />

        {/* Catch-all inside shell */}
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

const App: React.FC = () => {
  const disc = useDisclosure();
  return (
    <ErrorBoundary context="Application Root">
      <ScriptSyncProvider>
        <Routes>
          {/* Routes without layout */}
          <Route path="/shared/:shareToken" element={<SharedPage />} />
          <Route path="/shared/expired" element={<ExpiredSharePage />} />

          {/* Everything else uses Shell */}
          <Route path="/*" element={<Shell isMenuOpen={disc.isOpen} onMenuOpen={disc.onOpen} onMenuClose={disc.onClose} />} />
        </Routes>
      </ScriptSyncProvider>
    </ErrorBoundary>
  );
};

export default App;
