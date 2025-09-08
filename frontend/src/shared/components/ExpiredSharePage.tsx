import React from 'react';
import { 
  Box, 
  Flex,
  Heading, 
  Text, 
  Button
} from '@chakra-ui/react';
import { AppIcon } from '../../components/AppIcon';

export const ExpiredSharePage: React.FC = () => {
  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      justifyContent="center"
      alignItems="flex-start"
      pt="33vh"
    >
      <Flex direction="column" align="center" justify="center" gap="4">
        <AppIcon name="warning" boxSize="40px" color="amber" />
        
        <Heading as="h1" size="lg" color="red.500" textAlign="center">
          Access Expired
        </Heading>
        
        <Text color="gray.500" textAlign="center" maxW="400px" mb="2">
          Your access to this shared content has expired or been revoked. 
          Please contact the show administrator for a new invitation link.
        </Text>
        
        <Button
          variant="primary"
          size="sm"
          onClick={() => window.location.href = '/'}
        >
          Return to Home
        </Button>
      </Flex>
    </Box>
  );
};