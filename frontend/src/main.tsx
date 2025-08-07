// frontend/src/main.tsx

import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import chakraTheme from './ChakraTheme';

import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';

const PUBLISHABLE_KEY: string | undefined = (import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
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
);