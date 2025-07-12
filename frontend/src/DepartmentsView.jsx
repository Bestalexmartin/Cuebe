// frontend/src/DepartmentsView.jsx

import { Flex, Box, VStack, HStack, Heading, Button, Text, Spinner } from "@chakra-ui/react";
import { AppIcon } from './components/AppIcon';

const sortedDepartments = []; // Placeholder for sorted venues data, replace with actual data fetching logic

export const DepartmentsView = ({
    isLoading,
    error,
    onDepartmentModalOpen,
}) => {
    return (
        <Flex direction="column" height="100%">
            {/* Header Section */}
            <Flex justify="space-between" align="center" flexShrink={0}>
                <HStack spacing="2" align="center">
                    <AppIcon name="department" boxSize="25px" />
                    <Heading as="h2" size="md">Departments</Heading>
                </HStack>
                <HStack spacing="2">
                    <Button bg="blue.400" color="white" size="xs" onClick={onDepartmentModalOpen} _hover={{ bg: 'orange.400' }} _focus={{ boxShadow: 'none' }}>
                        Add Department
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
                    sortedDepartments.length > 0 ? (
                        <VStack spacing={4} align="stretch">

                        </VStack>
                    ) : (<Text>You haven't added any departments yet.</Text>)
                )}
            </Box>
        </Flex>
    );
};