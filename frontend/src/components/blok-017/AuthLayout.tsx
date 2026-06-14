// frontend/src/components/blok-017/AuthLayout.tsx
//
// Blok 017 auth layout, rebranded for Cuebe. Dark full-screen backdrop with a
// centered card and the Cuebe logo. Used by the full-page email verification
// flows (not by the modal-based sign-in/up flows).

import { Box, Flex, Heading, Image } from '@chakra-ui/react';

interface AuthLayoutProps {
  children: React.ReactNode;
  maxW?: string;
}

export default function AuthLayout({ children, maxW = '400px' }: AuthLayoutProps) {
  return (
    <Box
      position="fixed"
      inset={0}
      bg="gray.800"
      zIndex={999}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        bg="page.background"
        border="1px solid"
        borderColor="gray.600"
        borderRadius="xl"
        p={8}
        w="full"
        maxW={maxW}
        mx={4}
      >
        <Flex direction="column" align="center" mb={6}>
          <Box w="105px" h="105px" mb={3}>
            <Image src="/cuebe-icon.svg" alt="Cuebe" w="100%" h="100%" />
          </Box>
          <Heading fontSize="3xl" fontWeight="700">
            Cuebe
          </Heading>
        </Flex>

        {children}
      </Box>
    </Box>
  );
}
