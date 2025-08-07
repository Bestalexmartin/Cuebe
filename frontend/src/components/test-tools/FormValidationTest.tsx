// frontend/src/components/test-tools/FormValidationTest.tsx

import React from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Badge
} from '@chakra-ui/react';
import { useValidatedForm } from '../../hooks/useValidatedForm';
import { ValidationRules } from '../../types/validation';
import { FormInput, FormNumberInput } from '../form/FormField';
import { useEnhancedToast } from '../../utils/toastUtils';

export const FormValidationTest: React.FC = () => {
  const { showSuccess, showError } = useEnhancedToast();

  // Test form with validation
  const form = useValidatedForm(
    { email: '', name: '', age: undefined as number | undefined },
    {
      validationConfig: {
        email: {
          required: true,
          rules: [ValidationRules.email('Please enter a valid email address')]
        },
        name: {
          required: true,
          rules: [ValidationRules.minLength(4, 'Name must be at least 4 characters')]
        },
        age: {
          required: false,
          rules: [
            ValidationRules.min(18, 'Must be at least 18 years old'),
            ValidationRules.max(120, 'Age seems unrealistic')
          ]
        }
      },
      validateOnBlur: true
    }
  );

  // Check if required fields are filled
  const isFormValid = form.formData.name.trim() !== '' && form.formData.email.trim() !== '';

  // Test form validation
  const testFormValidation = async (e: React.FormEvent) => {
    e.preventDefault();

    // Manually trigger form validation
    const isValid = await form.validate();

    if (isValid) {
      // Form is valid - show success
      showSuccess(
        'Form Validation Passed!',
        `All fields are valid! Name: "${form.formData.name}", Email: "${form.formData.email}"${form.formData.age ? `, Age: ${form.formData.age}` : ''}`
      );

      // Optionally reset the form after successful submission
      setTimeout(() => {
        form.resetForm();
      }, 2000);
    } else {
      // Form has validation errors - show them
      showError(
        'Form Validation Failed',
        { description: `Found ${form.fieldErrors.length} validation error${form.fieldErrors.length === 1 ? '' : 's'}. Please check the fields below.` }
      );
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <HStack spacing={2}>
        <Badge colorScheme="blue" fontSize="sm" px={2} py={1}>FORM VALIDATION</Badge>
      </HStack>

      <Text color="cardText" fontSize="md" mt={-2}>
        Test field-level validation errors. Try submitting with invalid data to see validation in action.
      </Text>

      <Box
        mt={-2}
        p={6}
        bg="gray.50"
        _dark={{ bg: "gray.800", borderColor: "gray.500" }}
        border="2px solid"
        borderColor="gray.300"
        borderRadius="lg"
      >
        <form onSubmit={testFormValidation}>
          <VStack spacing={4} align="stretch">
            <FormInput
              form={form}
              name="name"
              label="Name"
              placeholder="Enter your name"
              isRequired
            />

            <FormInput
              form={form}
              name="email"
              label="Email"
              type="email"
              placeholder="Enter your email"
              isRequired
            />

            <FormNumberInput
              form={form}
              name="age"
              label="Age"
              min={0}
              max={150}
            />

            <HStack justify="flex-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => form.resetForm()}
                _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
              >
                Reset
              </Button>
              <Button
                size="sm"
                type="submit"
                bg={isFormValid ? "blue.400" : "transparent"}
                color={isFormValid ? "white" : "gray.400"}
                border={isFormValid ? "none" : "1px solid"}
                borderColor={isFormValid ? "transparent" : "gray.300"}
                _hover={isFormValid ? { bg: 'orange.400' } : {}}
                isLoading={form.isSubmitting}
                isDisabled={!isFormValid}
                cursor={isFormValid ? "pointer" : "not-allowed"}
                opacity={isFormValid ? 1 : 0.6}
              >
                Submit Form
              </Button>
            </HStack>

            {form.fieldErrors.length > 0 && (
              <Box p={4} bg="red.500" color="white" borderRadius="md">
                <Text fontWeight="semibold" fontSize="md">Validation Errors:</Text>
                {form.fieldErrors.map((error, i) => (
                  <Text key={i} fontSize="sm" mt={1}>
                    • {error.field}: {error.message}
                  </Text>
                ))}
              </Box>
            )}
          </VStack>
        </form>
      </Box>
    </VStack>
  );
};