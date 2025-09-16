// frontend/src/main.tsx
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import chakraTheme from './ChakraTheme'

import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import { PreferencesProvider } from './contexts/PreferencesContext'

const PK = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string
if (!PK) throw new Error('Missing Publishable Key')

const signInUrl = import.meta.env.VITE_CLERK_SIGN_IN_URL || '/sign-in'
const signUpUrl = import.meta.env.VITE_CLERK_SIGN_UP_URL || '/sign-up'
const afterIn = import.meta.env.VITE_CLERK_AFTER_SIGN_IN_URL || '/dashboard'
const afterUp = import.meta.env.VITE_CLERK_AFTER_SIGN_UP_URL || '/dashboard'
const frontendApi = import.meta.env.VITE_CLERK_FRONTEND_API // optional (e.g., clerk.cuebe.app)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ClerkProvider
    publishableKey={PK}
    {...(frontendApi ? { frontendApi } : {})}
    signInUrl={signInUrl}
    signUpUrl={signUpUrl}
    afterSignInUrl={afterIn}
    afterSignUpUrl={afterUp}
  >
    <BrowserRouter>
      <ChakraProvider theme={chakraTheme} toastOptions={{
        defaultOptions: { status: 'info', duration: 3000, isClosable: true, position: 'bottom', variant: 'left-accent' },
      }}>
        <PreferencesProvider>
          <App />
        </PreferencesProvider>
      </ChakraProvider>
    </BrowserRouter>
  </ClerkProvider>
)
