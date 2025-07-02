// frontend/src/SignInPage.jsx

import { SignIn } from "@clerk/clerk-react";

const SignInPage = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh' }}>
      <SignIn afterSignInUrl="/" afterSignUpUrl="/"routing="path" path="/sign-in" />
    </div>
  );
};

export default SignInPage;