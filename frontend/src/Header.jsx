// frontend/src/Header.jsx

import { SignedIn, UserButton } from "@clerk/clerk-react";
import { Flex, Heading, Image, Text, Box } from "@chakra-ui/react"; // Import Chakra components
import { useColorMode, IconButton } from '@chakra-ui/react';

function DarkModeSwitch() {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <IconButton
      aria-label="Toggle dark mode"
      icon={<Text fontSize="2xl">◐</Text>} 
      onClick={toggleColorMode}
      variant="ghost"
      isRound={true}
      _focus={{ boxShadow: 'none' }}
      _hover={{ bg: "transparent", color: "initial" }}
    />
  );
}

const Header = () => {
  return (
    <Flex
      as="header"
      width="100%"
      align="center"
      justify="space-between"
      borderBottom="1px"
      borderColor="ui.border"
      paddingX="8"
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
        {/* This Flex container holds the two separate icon groups */}
        <Flex align="center" gap="4">
          
          {/* Wrapper for the Dark Mode Switch */}
          <Flex
            justify="center"
            align="center"
            boxSize="40px"
            borderRadius="full"
            border="3px solid"
            borderColor="blue.400"
            _hover={{ borderColor: 'orange.400', bg: "transparent", color: "initial" }}
          >
            <DarkModeSwitch />
          </Flex>

          {/* Wrapper for the User Button */}
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
      </SignedIn>
    </Flex>
  );
};

export default Header;