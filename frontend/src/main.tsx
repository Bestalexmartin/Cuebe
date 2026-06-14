// frontend/src/main.tsx
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import chakraTheme from './ChakraTheme'

import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import { PreferencesProvider } from './contexts/PreferencesContext'
import { AuthProvider } from './contexts/AuthContext'
import { AuthModalProvider } from './contexts/AuthModalContext'
import { AuthToastContainer } from './utils/authToast'

// Blok 017 self-hosted auth. AuthProvider manages session state via HttpOnly
// cookies; AuthModalProvider drives the sign-in / sign-up modal flow.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ChakraProvider theme={chakraTheme} toastOptions={{
      defaultOptions: { status: 'info', duration: 3000, isClosable: true, position: 'bottom', variant: 'left-accent' },
    }}>
      <AuthProvider>
        <AuthModalProvider>
          <PreferencesProvider>
            <App />
            <AuthToastContainer />
          </PreferencesProvider>
        </AuthModalProvider>
      </AuthProvider>
    </ChakraProvider>
  </BrowserRouter>
)
