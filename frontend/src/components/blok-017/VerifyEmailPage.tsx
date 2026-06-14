// frontend/src/components/blok-017/VerifyEmailPage.tsx
//
// Blok 017 email verification landing page, rebranded for Cuebe. Full page with
// AuthLayout, reached from the verification link in the signup email.

import { useEffect, useState } from 'react';
import { Heading, Text } from '@chakra-ui/react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../services/authApi';
import AuthLayout from './AuthLayout';

export default function VerifyEmailPage() {
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
      .verifyEmail(token)
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
            Please wait while we verify your email.
          </Text>
        </>
      )}

      {status === 'success' && (
        <>
          <Heading size="md" mb={4} textAlign="center">
            Email Verified
          </Heading>
          <Text fontSize="sm" color="gray.500" textAlign="center" mb={6}>
            Your email has been verified successfully.
          </Text>
          <Text textAlign="center">
            <Link to="/sign-in">
              <Text as="span" color="blue.400" fontSize="sm" _hover={{ textDecoration: 'underline' }}>
                Continue to sign in
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
