// frontend/src/components/blok-017/auth/ResetPasswordForm.tsx
//
// Blok 017 reset-password form, rebranded for Cuebe. Sets a new password using
// a token from modalData. Renders inside AuthModal (no AuthLayout wrapper).

import { useState } from 'react';
import { Box, Button, FormControl, FormLabel, Heading, Input, Text } from '@chakra-ui/react';
import { authApi } from '../../../services/authApi';
import { toaster } from '../../../utils/authToast';
import { useAuthModal } from '../../../contexts/AuthModalContext';

export default function ResetPasswordForm() {
  const { modalData, openModal } = useAuthModal();
  const token = modalData.token;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (password !== confirmPassword) {
      toaster.create({ title: 'Passwords do not match', type: 'error' });
      return;
    }
    setIsSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reset failed';
      toaster.create({ title: 'Reset failed', description: message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <Box textAlign="center">
        <Heading size="md" mb={4}>
          Invalid Link
        </Heading>
        <Text fontSize="sm" color="red.400" mb={6}>
          No reset token provided.
        </Text>
        <Text
          color="blue.400"
          fontSize="sm"
          cursor="pointer"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => openModal('forgot-password')}
        >
          Request a new reset link
        </Text>
      </Box>
    );
  }

  if (success) {
    return (
      <Box textAlign="center">
        <Heading size="md" mb={4}>
          Password Reset
        </Heading>
        <Text fontSize="sm" color="gray.500" mb={6}>
          Your password has been reset. Please sign in with your new password.
        </Text>
        <Text
          color="blue.400"
          fontSize="sm"
          cursor="pointer"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => openModal('signin')}
        >
          Sign in
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Heading size="md" mb={6} textAlign="center">
        Set New Password
      </Heading>

      <Box as="form" onSubmit={handleSubmit}>
        <FormControl mb={4} isRequired>
          <FormLabel>New Password</FormLabel>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 12 characters"
            minLength={12}
            autoFocus
          />
        </FormControl>

        <FormControl mb={4} isRequired>
          <FormLabel>Confirm Password</FormLabel>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
          />
        </FormControl>

        <Button
          type="submit"
          variant="primary"
          w="100%"
          isLoading={isSubmitting}
          loadingText="Resetting..."
        >
          Reset Password
        </Button>
      </Box>
    </>
  );
}
