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
      <SignUp path="/sign-up" routing="path" />
    </div>
  );
};

export default SignUpPage;