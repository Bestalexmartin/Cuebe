// frontend/src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import chakraTheme from './ChakraTheme';

import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <ChakraProvider
          theme={chakraTheme}
          toastOptions={{
            defaultOptions: {
              status: 'info',
              duration: 3000,
              isClosable: true,
              position: 'bottom',
              variant: 'left-accent',
            },
          }}
        >
          <App />
        </ChakraProvider>
      </ClerkProvider>
    </BrowserRouter>
  </React.StrictMode>
);