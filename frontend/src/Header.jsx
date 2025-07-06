// frontend/src/Header.jsx

import { SignedIn, UserButton } from "@clerk/clerk-react";

const Header = () => {
  return (
    <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e2e8f0',
        width: '100vw',
        padding: '0rem 2rem 0rem 1rem',
        boxSizing: 'border-box'
    }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', padding: '1rem 1rem'}}>ShowMaster</h1>
      <SignedIn>
        {/* This div is now a perfect circle that centers the button */}
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '32px',  // Set a fixed width
            height: '32px', // Set a fixed height to make it a square
            borderRadius: '50%', // This makes the square a perfect circle
            padding: '1px', // Adjust padding as needed
            border: '3px solid #3b82f6', // The blue ring
        }}>
          <UserButton />
        </div>
      </SignedIn>
    </header>
  );
};

export default Header;