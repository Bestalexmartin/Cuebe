// frontend/src/components/blok-017/ProtectedRoute.tsx
//
// Blok 017 auth gate, rebranded for Cuebe. Wraps routes that require an
// authenticated user: opens the sign-in modal and redirects to / when the
// visitor is not authenticated.

import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Flex, Text } from '@chakra-ui/react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthModal } from '../../contexts/AuthModalContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { openModal } = useAuthModal();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openModal('signin');
    }
  }, [isLoading, isAuthenticated, openModal]);

  if (isLoading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="page.background">
        <Text fontSize="sm" color="gray.500">
          Loading...
        </Text>
      </Flex>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
