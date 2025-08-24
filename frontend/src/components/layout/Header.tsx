// frontend/src/components/layout/Header.tsx

import React from "react";
import { SignedIn, UserButton } from "@clerk/clerk-react";
import { Flex, Text, Heading, Image, IconButton, useColorModeValue } from "@chakra-ui/react";
import { AppIcon } from '../AppIcon';
import { useIntegratedColorMode } from '../../hooks/useIntegratedColorMode';
import { BorderedContainer } from '../shared/BorderedContainer';
import { ScriptSyncIcon } from '../shared/ScriptSyncIcon';
import { useScriptSyncContextOptional } from '../../contexts/ScriptSyncContext';

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
  const handleMenuOpen = (): void => {
    onMenuOpen();
  };

  const syncContext = useScriptSyncContextOptional();
  const syncData = syncContext?.syncData;

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
      px={{ base: 4, md: 6 }}
      py={3}
      bg={headerBgColor}
      boxShadow="sm"
      boxSizing="border-box"
    >
      <Flex align="center">
        <Image boxSize="50px" src="/cuebe.svg" alt="Cuebe Logo" />
        <Heading as="h1" size="lg">
          <Text as="span" color="orange.400">
            Cue
          </Text>
          <Text as="span" color="blue.400">
            be
          </Text>
        </Heading>
      </Flex>

      <SignedIn>
        <Flex align="center" gap="4">

          {/* This group is now ALWAYS visible */}
          <Flex align="center" gap="4">
            <BorderedContainer>
              <DarkModeSwitch />
            </BorderedContainer>
            <BorderedContainer>
              <ScriptSyncIcon
                isConnected={syncData?.isConnected || false}
                isConnecting={syncData?.isConnecting || false}
                connectionCount={syncData?.connectionCount || 0}
                connectionError={syncData?.connectionError}
                userType={syncData?.userType || 'stage_manager'}
                shouldRotate={syncData?.shouldRotate || false}
              />
            </BorderedContainer>
            <BorderedContainer>
              <UserButton />
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
      </SignedIn>
    </Flex>
  );
};

export default Header;