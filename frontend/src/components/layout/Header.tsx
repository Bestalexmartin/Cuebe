// frontend/src/components/layout/Header.tsx

import React from "react";
import { SignedIn, UserButton } from "@clerk/clerk-react";
import { Flex, Text, Heading, Image, IconButton } from "@chakra-ui/react";
import { AppIcon } from '../AppIcon';
import { useIntegratedColorMode } from '../../hooks/useIntegratedColorMode';

// TypeScript interfaces

interface HeaderProps {
  onMenuOpen: () => void;
  isMenuOpen: boolean;
}

const DarkModeSwitch: React.FC = () => {
  const { colorMode, toggleColorMode } = useIntegratedColorMode();

  const handleToggle = (): void => {
    toggleColorMode();
  };

  return (
    <IconButton
      aria-label="Toggle dark mode"
      icon={<AppIcon name={colorMode === 'light' ? 'moon' : 'sun'} />}
      onClick={handleToggle}
      variant="ghost"
      isRound={true}
      _focus={{ boxShadow: 'none' }}
      _hover={{ bg: "transparent", color: "initial" }}
    />
  );
};

const Header: React.FC<HeaderProps> = ({ onMenuOpen, isMenuOpen }) => {
  const handleMenuOpen = (): void => {
    onMenuOpen();
  };

  return (
    <Flex
      as="header"
      width="100%"
      align="center"
      justify="space-between"
      borderBottom="0px"
      borderColor="ui.border"
      paddingX="6"
      paddingY="0"
      paddingTop="2"
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
            <Flex
              justify="center"
              align="center"
              boxSize="40px"
              borderRadius="full"
              border="3px solid"
              borderColor="blue.400"
              _hover={{ borderColor: 'orange.400' }}
            >
              <DarkModeSwitch />
            </Flex>
            <Flex
              justify="center"
              align="center"
              boxSize="40px"
              borderRadius="full"
              border="3px solid"
              borderColor="blue.400"
              _hover={{ borderColor: 'orange.400' }}
            >
              <UserButton />
            </Flex>
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