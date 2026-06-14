// frontend/src/components/blok-017/MfaVerifyStep.tsx
//
// Blok 017 MFA verification step, rebranded for Cuebe. Shown during login.
// Renders inline (no AuthLayout wrapper) so it fits inside AuthModal.

import { useState } from 'react';
import { Box, Button, Flex, FormControl, FormLabel, Heading, Input, Text } from '@chakra-ui/react';

interface MfaVerifyStepProps {
  sessionToken: string;
  onVerify: (sessionToken: string, code: string) => Promise<void>;
  onBack: () => void;
}

export default function MfaVerifyStep({ sessionToken, onVerify, onBack }: MfaVerifyStepProps) {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onVerify(sessionToken, code);
    } catch {
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCodeChange(value: string) {
    setCode(value);
    // Auto-submit on the 6th digit for TOTP.
    if (!useBackupCode && value.length === 6 && /^\d{6}$/.test(value)) {
      setIsSubmitting(true);
      onVerify(sessionToken, value)
        .catch(() => setCode(''))
        .finally(() => setIsSubmitting(false));
    }
  }

  return (
    <>
      <Heading size="md" mb={2} textAlign="center">
        Two-Factor Authentication
      </Heading>
      <Text fontSize="sm" color="gray.500" textAlign="center" mb={6}>
        {useBackupCode
          ? 'Enter one of your backup codes'
          : 'Enter the 6-digit code from your authenticator app'}
      </Text>

      <Box as="form" onSubmit={handleSubmit}>
        <FormControl mb={4}>
          <FormLabel>{useBackupCode ? 'Backup Code' : 'Code'}</FormLabel>
          <Input
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder={useBackupCode ? 'Enter backup code' : '000000'}
            maxLength={useBackupCode ? 8 : 6}
            autoComplete="one-time-code"
            autoFocus
          />
        </FormControl>

        <Button
          type="submit"
          variant="primary"
          w="100%"
          isLoading={isSubmitting}
          loadingText="Verifying..."
        >
          Verify
        </Button>
      </Box>

      <Flex mt={4} justify="space-between">
        <Text
          fontSize="xs"
          color="blue.400"
          cursor="pointer"
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setCode('');
          }}
          _hover={{ textDecoration: 'underline' }}
        >
          {useBackupCode ? 'Use authenticator code' : 'Use backup code'}
        </Text>
        <Text
          fontSize="xs"
          color="gray.500"
          cursor="pointer"
          onClick={onBack}
          _hover={{ textDecoration: 'underline' }}
        >
          Back to login
        </Text>
      </Flex>
    </>
  );
}
