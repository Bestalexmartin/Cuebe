// frontend/src/EditShowPage.jsx

import { Flex, Box, VStack, HStack, Heading, Button, Text, Spinner } from "@chakra-ui/react";
import { AppIcon } from './components/AppIcon';
import { useParams, useNavigate } from "react-router-dom";

export const EditShowPage = ({
    isLoading,
    error
}) => {
    // This hook gets the showId from the URL
    const { showId } = useParams();
    const navigate = useNavigate();

    const handleClose = () => {
        navigate('/dashboard'); // Navigate back to the main dashboard
    };

    return (
        <Flex
            width="100%"
            height="100%"
            p="2rem"
            flexDirection="column"
            boxSizing="border-box"
        >
            {/* Header Section */}
            <Flex justify="space-between" align="center" flexShrink={0}>
                <HStack spacing="2" align="center">
                    <AppIcon name="crew" boxSize="25px" />
                    <Heading as="h2" size="md">Edit Show</Heading>
                </HStack>
                <HStack spacing="2">
                    <Button bg="blue.400" color="white" size="xs" onClick={handleClose} _hover={{ bg: 'orange.400' }} _focus={{ boxShadow: 'none' }}>
                        Exit
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
                <Text>Form elements go here.</Text>
            </Box>
        </Flex>
    );
};