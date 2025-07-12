// frontend/src/PinnedView.jsx

import { Flex, Box, VStack, HStack, Heading, Button, Text, Spinner } from "@chakra-ui/react";

const sortedPins = []; // Placeholder for sorted pins data, replace with actual data fetching logic

export const PinnedView = ({
    isLoading,
    error,
}) => {
    return (
        <Flex direction="column" height="100%">
            {/* Header Section */}
            <Flex justify="space-between" align="center" flexShrink={0}>
                <Heading as="h2" size="md">Pinned Scripts</Heading>
                <HStack spacing="2">
                    <Button bg="blue.400" color="white" size="xs" _hover={{ bg: 'orange.400' }} _focus={{ boxShadow: 'none' }}>
                        Pin Current Script
                    </Button>
                </HStack>
            </Flex>
            <Box
                mt="4"
                border="1px solid"
                borderColor="gray.300"
                p="4"
                borderRadius="md"
                flexGrow={1}
                overflowY="auto"
                className="hide-scrollbar"
            >
                {isLoading && <Spinner />}
                {error && <Text color="red.500">{error}</Text>}
                {!isLoading && !error && (
                    sortedPins.length > 0 ? (
                        <VStack spacing={4} align="stretch">

                        </VStack>
                    ) : (<Text>You haven't pinned any scripts yet.</Text>)
                )}
            </Box>
        </Flex>
    );
};