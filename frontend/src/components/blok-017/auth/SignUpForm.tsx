// frontend/src/components/blok-017/auth/SignUpForm.tsx
//
// Blok 017 sign-up form, rebranded for Cuebe. Renders inside AuthModal (no
// AuthLayout wrapper). Password strength meter included.
//
// Single-tenant note: Cuebe does not issue organization invites, so the invite
// path here is effectively dormant (no invites are ever minted). The invite
// token handling is retained so the form stays compatible if an invite link is
// ever opened, but standard registration assigns the default INDIVIDUAL_ORG_ID
// on the backend.

import { useState, useEffect } from 'react';
import { Box, Button, FormControl, FormLabel, Flex, Heading, Input, Text } from '@chakra-ui/react';
import { useSearchParams } from 'react-router-dom';
import { authApi } from '../../../services/authApi';
import { toaster } from '../../../utils/authToast';
import { useAuthModal } from '../../../contexts/AuthModalContext';
import type { InviteValidationResponse } from '../../../types/auth';

export default function SignUpForm() {
  const { modalData, openModal } = useAuthModal();
  const [searchParams] = useSearchParams();
  const inviteToken = modalData.invite || searchParams.get('invite');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Invite state.
  const [invite, setInvite] = useState<InviteValidationResponse | null>(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);
  const [inviteError, setInviteError] = useState('');

  const passwordStrength = getPasswordStrength(password);

  // Validate the invite token on mount, if present.
  useEffect(() => {
    if (!inviteToken) return;
    setInviteLoading(true);
    authApi
      .validateInvite(inviteToken)
      .then((data) => {
        setInvite(data);
        setEmail(data.email);
      })
      .catch((err) => {
        setInviteError(err instanceof Error ? err.message : 'Invalid invitation');
      })
      .finally(() => setInviteLoading(false));
  }, [inviteToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toaster.create({ title: 'Passwords do not match', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authApi.register(
        email,
        password,
        displayName,
        undefined,
        undefined,
        inviteToken || undefined,
      );
      setSuccessMessage(result.message);
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      toaster.create({ title: 'Registration failed', description: message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (inviteToken && inviteLoading) {
    return (
      <Box textAlign="center">
        <Heading size="md" mb={4}>
          Loading invitation...
        </Heading>
      </Box>
    );
  }

  if (inviteToken && inviteError) {
    return (
      <Box textAlign="center">
        <Heading size="md" mb={4}>
          Invalid Invitation
        </Heading>
        <Text fontSize="sm" color="red.400" mb={6}>
          {inviteError}
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

  if (success) {
    const isInvite = !!invite;
    return (
      <Box textAlign="center">
        <Heading size="md" mb={4}>
          {isInvite ? 'Account Created' : 'Check Your Email'}
        </Heading>
        <Text fontSize="sm" color="gray.500" mb={6}>
          {isInvite ? (
            successMessage || 'Your account has been created. You can now sign in.'
          ) : (
            <>
              We sent a verification link to <strong>{email}</strong>. Click the link to verify your
              account.
            </>
          )}
        </Text>
        <Text
          color="blue.400"
          fontSize="sm"
          cursor="pointer"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => openModal('signin')}
        >
          {isInvite ? 'Sign in now' : 'Back to sign in'}
        </Text>
      </Box>
    );
  }

  return (
    <>
      {invite && (
        <Box
          mb={4}
          p={3}
          bg="blue.50"
          borderRadius="md"
          border="1px solid"
          borderColor="blue.200"
          textAlign="center"
        >
          <Text fontSize="sm" color="blue.700">
            You've been invited to join <strong>{invite.org_name}</strong>
          </Text>
        </Box>
      )}

      <Text fontSize="2xl" fontWeight="bold" textAlign="center" mb={6}>
        Create Account
      </Text>

      <Box as="form" onSubmit={handleSubmit}>
        <FormControl mb={4} isRequired>
          <FormLabel>Display Name</FormLabel>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            autoFocus
          />
        </FormControl>

        <FormControl mb={4} isRequired>
          <FormLabel>Email</FormLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            isReadOnly={!!invite}
            opacity={invite ? 0.7 : 1}
          />
        </FormControl>

        <FormControl mb={4} isRequired>
          <FormLabel>Password</FormLabel>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 12 characters"
            minLength={12}
          />
          {password && (
            <Flex mt={1} gap={1}>
              {[1, 2, 3, 4].map((level) => (
                <Box
                  key={level}
                  flex={1}
                  h="3px"
                  borderRadius="full"
                  bg={level <= passwordStrength ? strengthColor(passwordStrength) : 'gray.200'}
                />
              ))}
            </Flex>
          )}
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
          mt={2}
          isLoading={isSubmitting}
          loadingText="Creating account..."
        >
          Create Account
        </Button>
      </Box>

      <Text mt={6} textAlign="center" fontSize="sm" color="gray.500">
        Already have an account?{' '}
        <Text
          as="span"
          color="blue.400"
          cursor="pointer"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => openModal('signin')}
        >
          Sign in
        </Text>
      </Text>
    </>
  );
}

function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) || /[^a-zA-Z0-9]/.test(password)) score++;
  return score;
}

function strengthColor(strength: number): string {
  switch (strength) {
    case 1:
      return 'red.400';
    case 2:
      return 'orange.400';
    case 3:
      return 'yellow.400';
    case 4:
      return 'green.400';
    default:
      return 'gray.200';
  }
}
