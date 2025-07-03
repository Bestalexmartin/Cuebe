// frontend/src/SignInPage.jsx

import { SignIn } from "@clerk/clerk-react";

const SignInPage = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100vw',
      height: '100vh'
    }}>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
};

export default SignInPage;