// frontend/src/App.jsx

import { useEffect } from "react";
import { Routes, Route, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import Dashboard from "./Dashboard";
import SignInPage from "./SignInPage";

// A helper component to redirect to the sign-in page
function SignInRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/sign-in');
  }, [navigate]);
  return null;
}

// A helper component to handle redirects for the root path
function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    // If a signed-in user lands on the root, send them to their dashboard
    // If a signed-out user lands on the root, send them to sign-in
    navigate('/user');
  }, [navigate]);
  return null;
}

function App() {
  return (
    <>
      {/* The header is always visible, but the UserButton only appears when signed in. */}
      <header style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>

      <main>
        <Routes>
          {/* Public routes, accessible to signed-out users */}
          <Route path="/sign-in" element={<SignInPage />} />

          {/* Private routes, only accessible to signed-in users */}
          {/* Clerk's <SignedIn> component acts as a guard */}
          <Route 
            path="/*" // This will match all other routes
            element={
              <SignedIn>
                <Routes>
                  <Route path="/user" element={<Dashboard />} />
                  <Route path="/" element={<IndexRedirect />} />
                </Routes>
              </SignedIn>
            } 
          />
          
          {/* A catch-all for signed-out users on any other path */}
          <Route 
            path="*"
            element={
              <SignedOut>
                <SignInRedirect />
              </SignedOut>
            }
          />
        </Routes>
      </main>
    </>
  );
}

export default App;