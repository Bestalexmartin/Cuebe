// frontend/src/pages/UserProfilePage.tsx
//
// Blok 017 self-hosted auth profile page. Replaces the former Clerk
// <UserProfile/> widget with a read-only summary of the current account plus
// a sign-out action. Richer self-service editing (password, MFA, avatar) lives
// in the Blok 017 account settings flow.

import React from 'react';
import { Box, Button, Heading, Text, VStack, HStack, Divider, Badge, CloseButton } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuth } from '../hooks/useAuth';

const Row: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <HStack justify="space-between" w="100%">
    <Text fontSize="sm" color="gray.500">{label}</Text>
    <Text fontSize="sm" fontWeight="medium">{value || 'N/A'}</Text>
  </HStack>
);

const UserProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <ErrorBoundary context="User Profile Page">
      <Box position="relative" maxW="480px" mx="auto" mt={10} p={6} borderWidth="1px" borderRadius="xl">
        <CloseButton
          aria-label="Back to dashboard"
          position="absolute"
          top={3}
          right={3}
          onClick={() => navigate('/dashboard')}
        />
        <Heading size="lg" mb={4} textAlign="center">Account</Heading>
        <VStack spacing={3} align="stretch">
          <Row label="Name" value={user?.display_name} />
          <Row label="Email" value={user?.email} />
          <Row label="Username" value={user?.username} />
          <Row label="Phone" value={user?.phone} />
          <HStack justify="space-between" w="100%">
            <Text fontSize="sm" color="gray.500">Email verified</Text>
            <Badge colorScheme={user?.email_verified ? 'green' : 'orange'}>
              {user?.email_verified ? 'Verified' : 'Unverified'}
            </Badge>
          </HStack>
          <HStack justify="space-between" w="100%">
            <Text fontSize="sm" color="gray.500">MFA</Text>
            <Badge colorScheme={user?.mfa_enabled ? 'green' : 'gray'}>
              {user?.mfa_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </HStack>
          <Divider my={2} />
          <Button variant="primary" onClick={() => { void logout(); }} w="100%">
            Sign Out
          </Button>
        </VStack>
      </Box>
    </ErrorBoundary>
  );
};

export default UserProfilePage;
