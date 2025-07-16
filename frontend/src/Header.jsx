// frontend/src/Header.jsx

import { SignedIn, UserButton } from "@clerk/clerk-react";
import { Flex, Heading, Image, useColorMode, IconButton } from "@chakra-ui/react";
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { CiMenuBurger } from 'react-icons/ci';

function DarkModeSwitch() {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <IconButton
      aria-label="Toggle dark mode"
      icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
      onClick={toggleColorMode}
      variant="ghost"
      isRound={true}
      _focus={{ boxShadow: 'none' }}
      _hover={{ bg: "transparent", color: "initial" }}
    />
  );
}

const Header = ({ onMenuOpen, isMenuOpen }) => {
  return (
    <Flex
      as="header"
      width="100%"
      align="center"
      justify="space-between"
      borderBottom="1px"
      borderColor="ui.border"
      paddingX="4"
      paddingY="2"
      boxSizing="border-box"
    >
      <Flex align="center" gap="3">
        <Image boxSize="50px" src="/callmaster.svg" alt="CallMaster Logo" />
        <Heading as="h1" size="lg">
          Call•Master
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
            icon={<CiMenuBurger />}
            fontSize="20px"
            borderRadius="full"
            border="3px solid"
            borderColor="blue.400"
            bg="inherit"
            _hover={{ borderColor: 'orange.400' }}
            _focus={{ boxShadow: 'none' }}
            display={{ base: 'flex', lg: 'none' }}
            onClick={onMenuOpen}
          />

        </Flex>
      </SignedIn>
    </Flex>
  );
};

export default Header;