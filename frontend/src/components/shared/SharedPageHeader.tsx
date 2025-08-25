// frontend/src/components/shared/SharedPageHeader.tsx

import React from 'react';
import {
  Flex,
  Heading,
  Text,
  Image,
  Avatar,
  useColorModeValue
} from '@chakra-ui/react';
import { BorderedContainer } from './BorderedContainer';

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
      bg={cardBgColor}
      boxShadow="sm"
    >
      <Flex align="center">
        <Image boxSize={{ base: "40px", md: "50px" }} src="/cuebe.svg" alt="Cuebe Logo" />
        <Heading as="h1" size={{ base: "md", md: "lg" }}>
          <Text as="span" color="orange.400">
            Cue
          </Text>
          <Text as="span" color="blue.400">
            be
          </Text>
          <Text as="span" color="#48BB78" ml={2}>
            Share
          </Text>
        </Heading>
      </Flex>

      <Flex align="center" gap={4}>
        {/* Dark mode switch, sync icon, and user profile */}
        {children}

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