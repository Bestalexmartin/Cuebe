// frontend/src/components/shared/TestCardWrapper.tsx

import React from 'react';
import { Box } from '@chakra-ui/react';

interface TestCardWrapperProps {
  children: React.ReactNode;
  maxWidth?: string;
}

export const TestCardWrapper: React.FC<TestCardWrapperProps> = ({ 
  children, 
  maxWidth = "620px" 
}) => {
  return (
    <Box
      maxWidth={maxWidth}
      mx="auto"
      mt={0}
    >
      <Box
        p={4}
        borderWidth="2px"
        borderColor="gray.600"
        borderRadius="md"
        bg="card.background"
        height="fit-content"
      >
        {children}
      </Box>
    </Box>
  );
};