// frontend/src/App.jsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import SignInPage from "./SignInPage";
import SignUpPage from "./SignUpPage";
import UserProfilePage from "./UserProfilePage";

function App() {
  return (
    <>
      <header style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <SignedIn>
          <UserButton afterSignOutUrl='/sign-in' />
        </SignedIn>
      </header>
      <main>
        <Routes>
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />

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
    </>
  );
}

export default App;