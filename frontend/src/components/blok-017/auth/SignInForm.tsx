// frontend/src/components/blok-017/auth/SignInForm.tsx
//
// Blok 017 sign-in form, rebranded for Cuebe. Renders inside AuthModal (no
// AuthLayout wrapper). MFA verify and forced MFA setup render inline.

import { useState } from 'react';
import { Box, Button, FormControl, FormLabel, Input, Text } from '@chakra-ui/react';
import { useAuth } from '../../../hooks/useAuth';
import { authApi } from '../../../services/authApi';
import { toaster } from '../../../utils/authToast';
import { useAuthModal } from '../../../contexts/AuthModalContext';
import type { LoginResponse } from '../../../types/auth';
import MfaForcedSetupStep from '../MfaForcedSetupStep';
import MfaVerifyStep from '../MfaVerifyStep';

export default function SignInForm() {
  const { login, refreshUser } = useAuth();
  const { openModal, closeModal } = useAuthModal();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaState, setMfaState] = useState<{ sessionToken: string } | null>(null);
  const [mfaSetupState, setMfaSetupState] = useState<{ setupToken: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result: LoginResponse = await login(email, password);

      if (result.mfa_required && result.mfa_session_token) {
        setMfaState({ sessionToken: result.mfa_session_token });
      } else if (result.mfa_setup_required && result.mfa_setup_token) {
        setMfaSetupState({ setupToken: result.mfa_setup_token });
      } else {
        closeModal();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toaster.create({ title: 'Login failed', description: message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMfaComplete(sessionToken: string, code: string) {
    try {
      await authApi.mfaVerify(sessionToken, code);
      await refreshUser();
      closeModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MFA verification failed';
      toaster.create({ title: 'MFA failed', description: message, type: 'error' });
      throw err;
    }
  }

  if (mfaSetupState) {
    return (
      <MfaForcedSetupStep
        setupToken={mfaSetupState.setupToken}
        onComplete={async () => {
          await refreshUser();
          closeModal();
        }}
        onBack={() => setMfaSetupState(null)}
      />
    );
  }

  if (mfaState) {
    return (
      <MfaVerifyStep
        sessionToken={mfaState.sessionToken}
        onVerify={handleMfaComplete}
        onBack={() => setMfaState(null)}
      />
    );
  }

  return (
    <>
      <Text fontSize="2xl" fontWeight="bold" textAlign="center" mb={6}>
        Sign In
      </Text>

      <Box as="form" onSubmit={handleSubmit}>
        <FormControl mb={4} isRequired>
          <FormLabel textAlign="center">Email</FormLabel>
          <Input
            textAlign="center"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
          />
        </FormControl>

        <FormControl mb={4} isRequired>
          <FormLabel textAlign="center">Password</FormLabel>
          <Input
            textAlign="center"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
        </FormControl>

        <Button
          type="submit"
          variant="primary"
          w="100%"
          mt={2}
          isLoading={isSubmitting}
          loadingText="Signing in..."
        >
          Sign In
        </Button>
      </Box>

      <Text mt={6} textAlign="center" fontSize="sm" color="gray.500">
        Don't have an account?{' '}
        <Text
          as="span"
          color="blue.400"
          cursor="pointer"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => openModal('signup')}
        >
          Sign up
        </Text>
      </Text>

      <Text mt={2} textAlign="center" fontSize="xs" color="blue.400">
        <Text
          as="span"
          cursor="pointer"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => openModal('forgot-password')}
        >
          Forgot password?
        </Text>
      </Text>
    </>
  );
}
