// frontend/src/App.jsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useDisclosure, Box } from '@chakra-ui/react'; // <-- Import Box
import Header from './Header';
import DashboardPage from './DashboardPage';
import SignInPage from "./SignInPage";
import SignUpPage from "./SignUpPage";
import UserProfilePage from "./UserProfilePage";

function App() {
  const { isOpen: isMenuOpen, onOpen: onMenuOpen, onClose: onMenuClose } = useDisclosure();

  return (
    // This Box uses CSS Grid to define the page layout
    <Box
      display="grid"
      gridTemplateRows="auto 1fr" // 1st row (header) is auto-sized, 2nd row (main) takes the rest
      height="100vh"
      width="100vw"
    >
      {/* The Header is the first grid row */}
      <Header onMenuOpen={onMenuOpen} />

      {/* The main content area is the second grid row and handles its own overflow */}
      <Box as="main" overflow="hidden">
        <Routes>
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />

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
      </Box>
    </Box>
  );
}

export default App;