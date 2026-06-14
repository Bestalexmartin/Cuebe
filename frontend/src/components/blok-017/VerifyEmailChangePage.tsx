// frontend/src/components/blok-017/VerifyEmailChangePage.tsx
//
// Blok 017 email change verification landing page, rebranded for Cuebe. Full
// page with AuthLayout, reached from the confirmation link in the email-change
// notification.

import { useEffect, useState } from 'react';
import { Heading, Text } from '@chakra-ui/react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../services/authApi';
import AuthLayout from './AuthLayout';

export default function VerifyEmailChangePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token provided.');
      return;
    }

    authApi
      .verifyEmailChange(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Verification failed');
      });
  }, [token]);

  return (
    <AuthLayout>
      {status === 'loading' && (
        <>
          <Heading size="md" mb={4} textAlign="center">
            Verifying...
          </Heading>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Please wait while we verify your new email.
          </Text>
        </>
      )}

      {status === 'success' && (
        <>
          <Heading size="md" mb={4} textAlign="center">
            Email Changed
          </Heading>
          <Text fontSize="sm" color="gray.500" textAlign="center" mb={6}>
            Your email has been updated successfully.
          </Text>
          <Text textAlign="center">
            <Link to="/">
              <Text as="span" color="blue.400" fontSize="sm" _hover={{ textDecoration: 'underline' }}>
                Continue to dashboard
              </Text>
            </Link>
          </Text>
        </>
      )}

      {status === 'error' && (
        <>
          <Heading size="md" mb={4} textAlign="center">
            Verification Failed
          </Heading>
          <Text fontSize="sm" color="red.400" textAlign="center" mb={6}>
            {errorMessage}
          </Text>
          <Text textAlign="center">
            <Link to="/sign-in">
              <Text as="span" color="blue.400" fontSize="sm" _hover={{ textDecoration: 'underline' }}>
                Back to sign in
              </Text>
            </Link>
          </Text>
        </>
      )}
    </AuthLayout>
  );
}
