// frontend/src/shared/components/SharedPageHeader.tsx

import React, { useRef, useEffect } from 'react';
import {
  Flex,
  Heading,
  Text,
  Image,
  Avatar,
  useColorModeValue
} from '@chakra-ui/react';
import { BorderedContainer } from '../../components/shared/BorderedContainer';
import { ScriptSyncIcon, ScriptSyncIconRef } from '../../components/shared/ScriptSyncIcon';
import { useScriptSyncContextOptional } from '../../contexts/ScriptSyncContext';

interface SharedPageHeaderProps {
  userName?: string;
  userProfileImage?: string;
  children?: React.ReactNode; // For the dark mode switch and sync icon
}

export const SharedPageHeader: React.FC<SharedPageHeaderProps> = ({
  userName,
  userProfileImage,
  children
}) => {
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const scriptSyncIconRef = useRef<ScriptSyncIconRef>(null);

  const syncContext = useScriptSyncContextOptional();
  const syncData = syncContext?.syncData;

  // Wire up the context triggerRotation to the actual icon
  useEffect(() => {
    if (syncData?.triggerRotation) {
      syncData.triggerRotation.current = () => {
        scriptSyncIconRef.current?.triggerRotation();
      };
    }
  }, [syncData]);

  return (
    <Flex
      as="header"
      width="100%"
      align="center"
      justify="space-between"
      borderBottom="1px solid"
      borderColor="gray.200"
      _dark={{ borderColor: 'gray.700' }}
      pl={{ base: 0.5, sm: 5 }}
      pr={{ base: 3.5, sm: 7 }}
      py={{ base: 1, sm: 3 }}
      bg={cardBgColor}
      boxShadow="sm"
    >
      <Flex align="center">
        <Image boxSize="60px" src="/cuebe.svg" alt="Cuebe Logo" />
        <Heading as="h1" size="xl" id="app-title">
          <Text as="span" color="orange.400">
            Cue
          </Text>
          <Text as="span" color="blue.400">
            be
          </Text>
        </Heading>
      </Flex>

      <Flex align="center" gap={4}>
        {/* Dark mode switch and other controls */}
        {children}

        {/* Script Sync Icon - now handled in header like main Header */}
        <BorderedContainer>
          <ScriptSyncIcon
            ref={scriptSyncIconRef}
            isConnected={syncData?.isConnected || false}
            isConnecting={syncData?.isConnecting || false}
            connectionCount={syncData?.connectionCount || 0}
            connectionError={syncData?.connectionError}
          />
        </BorderedContainer>

        {/* Shared user profile */}
        <BorderedContainer>
          <Avatar
            size="sm"
            w="28px"
            h="28px"
            name={userName || 'Guest User'}
            src={userProfileImage}
            fontWeight="bold"
            display="flex"
            alignItems="center"
            justifyContent="center"
          />
        </BorderedContainer>
      </Flex>
    </Flex>
  );
};
