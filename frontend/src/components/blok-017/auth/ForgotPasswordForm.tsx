// frontend/src/components/blok-017/auth/ForgotPasswordForm.tsx
//
// Blok 017 forgot-password form, rebranded for Cuebe. Requests a reset email.
// Renders inside AuthModal (no AuthLayout wrapper).

import { useState } from 'react';
import { Box, Button, FormControl, FormLabel, Input, Text } from '@chakra-ui/react';
import { authApi } from '../../../services/authApi';
import { toaster } from '../../../utils/authToast';
import { useAuthModal } from '../../../contexts/AuthModalContext';

export default function ForgotPasswordForm() {
  const { openModal } = useAuthModal();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      toaster.create({ title: 'Error', description: message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Box textAlign="center">
        <Text fontSize="2xl" fontWeight="bold" mb={4}>
          Check Your Email
        </Text>
        <Text fontSize="sm" color="gray.500" mb={6}>
          If an account with that email exists, we sent a password reset link.
        </Text>
        <Text
          color="blue.400"
          fontSize="sm"
          cursor="pointer"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => openModal('signin')}
        >
          Back to sign in
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Text fontSize="2xl" fontWeight="bold" mb={2} textAlign="center">
        Forgot Password
      </Text>
      <Text fontSize="sm" color="gray.500" textAlign="center" mb={6}>
        Enter your email and we'll send you a reset link.
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

        <Button
          type="submit"
          variant="primary"
          w="100%"
          isLoading={isSubmitting}
          loadingText="Sending..."
        >
          Send Reset Link
        </Button>
      </Box>

      <Text mt={6} textAlign="center" fontSize="sm" color="gray.500">
        <Text
          as="span"
          color="blue.400"
          cursor="pointer"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => openModal('signin')}
        >
          Back to sign in
        </Text>
      </Text>
    </>
  );
}
