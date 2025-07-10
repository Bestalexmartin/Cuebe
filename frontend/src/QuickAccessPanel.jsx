// frontend/src/QuickAccessPanel.jsx

import { Flex, Box, VStack, Heading, Button, Text, HStack } from "@chakra-ui/react";
import { AppIcon } from './components/AppIcon';

export const QuickAccessPanel = ({ activeView, setActiveView }) => {
    return (
        <>
            <Flex justify="space-between" align="center">
                <Heading as="h2" size="md"></Heading>
                <Button
                    bg="blue.400"
                    color="white"
                    size="xs"
                    _hover={{ bg: 'orange.400' }}
                    _focus={{ boxShadow: 'none' }}
                >
                    Options
                </Button>
            </Flex>

            <Box
                mt="4"
                border="1px solid"
                borderColor="gray.300"
                p="4"
                borderRadius="md"
            >
                <VStack spacing={4} align="stretch">
                    <Box borderWidth="2px" borderRadius="md" p="4" shadow="sm" cursor="pointer" borderColor={activeView === 'pinned' ? 'blue.400' : 'gray.600'} _hover={{ borderColor: 'orange.400' }} onClick={() => setActiveView('pinned')}>
                        <HStack spacing="1" align="center">
                            <AppIcon name="pinned" />
                            <Heading size="xs" textTransform="uppercase">Pinned Script</Heading>
                        </HStack>
                        <Text pt="2" fontSize="sm">View your pinned script.</Text>
                    </Box>
                    <Box borderWidth="2px" borderRadius="md" p="4" shadow="sm" cursor="pointer" borderColor={activeView === 'shows' ? 'blue.400' : 'gray.600'} _hover={{ borderColor: 'orange.400' }} onClick={() => setActiveView('shows')}>
                        <HStack spacing="1" align="center">
                            <AppIcon name="show" />
                            <Heading size="xs" textTransform="uppercase">Shows</Heading>
                        </HStack>
                        <Text pt="2" fontSize="sm">Manage your list of shows.</Text>
                    </Box>
                    <Box borderWidth="2px" borderRadius="md" p="4" shadow="sm" cursor="pointer" borderColor={activeView === 'venues' ? 'blue.400' : 'gray.600'} _hover={{ borderColor: 'orange.400' }} onClick={() => setActiveView('venues')}>
                        <HStack spacing="1" align="center">
                            <AppIcon name="venue" />
                            <Heading size="xs" textTransform="uppercase">Venues</Heading>
                        </HStack>
                        <Text pt="2" fontSize="sm">Manage your list of venues.</Text>
                    </Box>
                    <Box borderWidth="2px" borderRadius="md" p="4" shadow="sm" cursor="pointer" borderColor={activeView === 'departments' ? 'blue.400' : 'gray.600'} _hover={{ borderColor: 'orange.400' }} onClick={() => setActiveView('departments')}>
                        <HStack spacing="1" align="center">
                            <AppIcon name="department" />
                            <Heading size="xs" textTransform="uppercase">Departments</Heading>
                        </HStack>
                        <Text pt="2" fontSize="sm">Manage your list of departments.</Text>
                    </Box>
                    <Box borderWidth="2px" borderRadius="md" p="4" shadow="sm" cursor="pointer" borderColor={activeView === 'crew' ? 'blue.400' : 'gray.600'} _hover={{ borderColor: 'orange.400' }} onClick={() => setActiveView('crew')}>
                        <HStack spacing="1" align="center">
                            <AppIcon name="crew" />
                            <Heading size="xs" textTransform="uppercase">Crew</Heading>
                        </HStack>
                        <Text pt="2" fontSize="sm">Manage your crew members.</Text>
                    </Box>
                </VStack>
            </Box>
        </>
    );
};