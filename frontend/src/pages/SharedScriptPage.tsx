// frontend/src/pages/SharedScriptPage.tsx

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Flex,
    Text,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Button,
    VStack,
    HStack,
    useColorModeValue
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';

import { SharedScriptView } from '../features/shared-script/components/SharedScriptView';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface SharedScriptPageProps {
    // No props needed as this is a top-level page component
}

export const SharedScriptPage: React.FC<SharedScriptPageProps> = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const bgColor = useColorModeValue('gray.50', 'gray.900');

    useEffect(() => {
        // Set page title
        document.title = 'Shared Script - Cuebe';

        // Track page view for analytics (if needed)
        // analytics.track('shared_script_view', { token: token?.substring(0, 8) + '...' });

        return () => {
            // Reset title when leaving
            document.title = 'Cuebe';
        };
    }, [token]);

    // Handle missing token
    if (!token) {
        return (
            <Flex
                height="100vh"
                align="center"
                justify="center"
                bg={bgColor}
                p={8}
            >
                <Alert status="error" maxW="md" borderRadius="lg" boxShadow="lg">
                    <AlertIcon />
                    <Box>
                        <AlertTitle>Invalid Link!</AlertTitle>
                        <AlertDescription>
                            This sharing link appears to be malformed or incomplete.
                            Please check the URL and try again.
                        </AlertDescription>
                    </Box>
                </Alert>
            </Flex>
        );
    }

    // Handle invalid token format (basic validation)
    if (token.length < 32 || !/^[a-zA-Z0-9_-]+$/.test(token)) {
        return (
            <Flex
                height="100vh"
                align="center"
                justify="center"
                bg={bgColor}
                p={8}
            >
                <Alert status="error" maxW="md" borderRadius="lg" boxShadow="lg">
                    <AlertIcon />
                    <Box>
                        <AlertTitle>Invalid Sharing Token!</AlertTitle>
                        <AlertDescription>
                            This sharing link contains an invalid token format.
                            Please verify the link with the script owner.
                        </AlertDescription>
                    </Box>
                </Alert>
            </Flex>
        );
    }

    return (
        <ErrorBoundary context="Shared Script Page">
            {/* Main shared script view */}
            <SharedScriptView
                token={token}
                className="shared-script-page"
            />

            {/* Footer for branding */}
            <Box
                position="fixed"
                bottom={4}
                right={4}
                bg={useColorModeValue('white', 'gray.800')}
                borderRadius="lg"
                boxShadow="lg"
                border="1px solid"
                borderColor={useColorModeValue('gray.200', 'gray.600')}
                p={3}
                zIndex={1000}
            >
                <HStack spacing={2} fontSize="xs" color="gray.500">
                    <Text>Powered by</Text>
                    <Button
                        as="a"
                        href="https://Cuebe.app"
                        target="_blank"
                        variant="link"
                        size="xs"
                        rightIcon={<ExternalLinkIcon />}
                        color="blue.500"
                        fontWeight="semibold"
                    >
                        Cuebe
                    </Button>
                </HStack>
            </Box>
        </ErrorBoundary>
    );
};

export default SharedScriptPage;