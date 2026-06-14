// frontend/src/components/layout/Header.tsx

import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Flex, Text, Heading, Image, IconButton, useColorModeValue } from "@chakra-ui/react";
import { AppIcon } from '../AppIcon';
import { useIntegratedColorMode } from '../../hooks/useIntegratedColorMode';
import { BorderedContainer } from '../shared/BorderedContainer';
import { ScriptSyncIcon, ScriptSyncIconRef } from '../shared/ScriptSyncIcon';
import { useScriptSyncContextOptional } from '../../contexts/ScriptSyncContext';
import { useAuth } from '../../hooks/useAuth';

const DarkModeSwitch: React.FC = () => {
  const { colorMode, toggleColorMode } = useIntegratedColorMode();

  return (
    <IconButton
      aria-label="Toggle dark mode"
      icon={
        <AppIcon
          name={colorMode === 'light' ? 'moon' : 'sun'}
          color={colorMode === 'light' ? 'blue.400' : 'orange.400'}
          boxSize="20px"
        />
      }
      onClick={toggleColorMode}
      variant="ghost"
      isRound={true}
      _focus={{ boxShadow: 'none' }}
      _hover={{ bg: "transparent" }}
    />
  );
};

// TypeScript interfaces

interface HeaderProps {
  onMenuOpen: () => void;
  isMenuOpen: boolean;
}


const Header: React.FC<HeaderProps> = ({ onMenuOpen, isMenuOpen }) => {
  const scriptSyncIconRef = useRef<ScriptSyncIconRef>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleMenuOpen = (): void => {
    onMenuOpen();
  };

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

  const headerBgColor = useColorModeValue('white', 'gray.800');

  return (
    <Flex
      as="header"
      width="100%"
      align="center"
      justify="space-between"
      borderBottom="1px solid"
      borderColor="gray.200"
      _dark={{ borderColor: 'gray.700' }}
      pl={{ base: 4, md: 6 }}
      pr="2rem"
      py={3}
      bg={headerBgColor}
      boxShadow="sm"
      boxSizing="border-box"
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

      {isAuthenticated && (
        <Flex align="center" gap="4">

          {/* This group is now ALWAYS visible */}
          <Flex align="center" gap="4">
            <BorderedContainer>
              <DarkModeSwitch />
            </BorderedContainer>
            <BorderedContainer>
              <ScriptSyncIcon
                ref={scriptSyncIconRef}
                isConnected={syncData?.isConnected || false}
                isConnecting={syncData?.isConnecting || false}
                connectionCount={syncData?.connectionCount || 0}
                connectionError={syncData?.connectionError}
              />
            </BorderedContainer>
            <BorderedContainer>
              <IconButton
                aria-label="Account"
                icon={<AppIcon name='user' boxSize="20px" />}
                onClick={() => navigate('/user-profile')}
                variant="ghost"
                isRound={true}
                _focus={{ boxShadow: 'none' }}
                _hover={{ bg: 'transparent' }}
              />
            </BorderedContainer>
          </Flex>

          {/* This button is visible ONLY on mobile screens */}
          <IconButton
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            icon={<AppIcon name='hamburger' />}
            fontSize="20px"
            borderRadius="full"
            border="3px solid"
            borderColor="blue.400"
            bg="inherit"
            _hover={{ borderColor: 'orange.400' }}
            _focus={{ boxShadow: 'none' }}
            display={{ base: 'flex', lg: 'none' }}
            onClick={handleMenuOpen}
          />

        </Flex>
      )}
    </Flex>
  );
};

export default Header;
