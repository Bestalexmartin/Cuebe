// frontend/src/SignUpPage.jsx

import { SignUp } from "@clerk/clerk-react";

const SignUpPage = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100vw',
      height: '100vh'
    }}>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
};

export default SignUpPage;