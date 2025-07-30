// frontend/src/components/base/ValidationErrors.tsx

import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { FieldError } from '../../types/validation';

export interface ValidationErrorsProps {
  errors: FieldError[];
  title?: string;
  show?: boolean;
}

export const ValidationErrors: React.FC<ValidationErrorsProps> = ({
  errors,
  title = 'Validation Errors:',
  show = true
}) => {
  // Don't render if no errors or if show is false
  if (!show || errors.length === 0) {
    return null;
  }

  return (
    <Box 
      p={3} 
      bg="red.500" 
      color="white" 
      borderRadius="md" 
      mx={6} 
      mb={6}
    >
      <Text fontWeight="semibold" mb={2}>
        {title}
      </Text>
      {errors.map((error, i) => (
        <Text key={i} fontSize="sm">
          • {error.message}
        </Text>
      ))}
    </Box>
  );
};