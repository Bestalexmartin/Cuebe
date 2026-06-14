// frontend/src/components/blok-017/MfaForcedSetupStep.tsx
//
// Blok 017 forced MFA setup step, rebranded for Cuebe. Shown during login when
// MFA enforcement applies. Renders inline (no AuthLayout wrapper).

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { authApi } from '../../services/authApi';
import { toaster } from '../../utils/authToast';
import type { MfaSetupResponse } from '../../types/auth';

interface MfaForcedSetupStepProps {
  setupToken: string;
  onComplete: () => void;
  onBack: () => void;
}

export default function MfaForcedSetupStep({ setupToken, onComplete, onBack }: MfaForcedSetupStepProps) {
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [savedCodes, setSavedCodes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initSetup() {
      try {
        const data = await authApi.mfaForcedSetup(setupToken);
        setSetupData(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start MFA setup';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    initSetup();
  }, [setupToken]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await authApi.mfaForcedSetupVerify(setupToken, code);
      onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      toaster.create({ title: 'Invalid code', description: message, type: 'error' });
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <Spinner size="lg" color="blue.400" />
      </Box>
    );
  }

  if (error || !setupData) {
    return (
      <>
        <Heading size="md" mb={2} textAlign="center">
          Setup Error
        </Heading>
        <Text fontSize="sm" color="red.400" textAlign="center" mb={4}>
          {error || 'Unable to start MFA setup. Please try again.'}
        </Text>
        <Text
          fontSize="xs"
          color="gray.500"
          cursor="pointer"
          textAlign="center"
          onClick={onBack}
          _hover={{ textDecoration: 'underline' }}
        >
          Back to login
        </Text>
      </>
    );
  }

  return (
    <>
      <Heading size="md" mb={2} textAlign="center">
        MFA Setup Required
      </Heading>
      <Text fontSize="sm" color="gray.500" textAlign="center" mb={6}>
        Two-factor authentication is required for your account.
      </Text>

      <Text fontSize="sm" color="gray.500" mb={4}>
        Scan this QR code with your authenticator app.
      </Text>

      <Box mb={2} p={2} bg="white" borderRadius="md" display="flex" justifyContent="center">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=164x164&data=${encodeURIComponent(
            setupData.qr_uri,
          )}`}
          alt="TOTP QR Code"
          width={164}
          height={164}
        />
      </Box>

      <Text fontSize="xs" color="gray.500" mb={4}>
        Can't scan? Enter this code manually: <strong>{setupData.secret}</strong>
      </Text>

      <Box mb={4} p={3} border="1px solid" borderColor="gray.600" borderRadius="md">
        <Text fontSize="sm" fontWeight="medium" mb={2}>
          Backup Codes
        </Text>
        <Text fontSize="xs" color="gray.500" mb={2}>
          Save these codes in a safe place. Each can be used once if you lose access to your
          authenticator.
        </Text>
        <Box fontFamily="mono" fontSize="sm" display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
          {setupData.backup_codes.map((backupCode) => (
            <Text key={backupCode}>{backupCode}</Text>
          ))}
        </Box>
        <Flex mt={3} justify="center">
          <Checkbox isChecked={savedCodes} onChange={(e) => setSavedCodes(e.target.checked)}>
            <Text fontSize="xs" color="gray.500">
              I've saved these backup codes
            </Text>
          </Checkbox>
        </Flex>
      </Box>

      <Box as="form" onSubmit={handleVerify}>
        <FormControl mb={4}>
          <FormLabel>Enter code from authenticator to confirm</FormLabel>
          <Input
            type="text"
            textAlign="center"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            autoComplete="one-time-code"
          />
        </FormControl>
        <Button
          type="submit"
          variant="primary"
          w="100%"
          isDisabled={!savedCodes}
          isLoading={isSubmitting}
          loadingText="Verifying..."
        >
          Enable MFA & Sign In
        </Button>
      </Box>

      <Text
        mt={4}
        fontSize="xs"
        color="gray.500"
        cursor="pointer"
        textAlign="center"
        onClick={onBack}
        _hover={{ textDecoration: 'underline' }}
      >
        Back to login
      </Text>
    </>
  );
}
