// frontend/src/QuickAccessPanel.jsx

import { Flex, Box, VStack, Heading, Button, Text, HStack } from "@chakra-ui/react";
import { TiPin } from "react-icons/ti";
import { IoPeopleSharp } from "react-icons/io5";
import { BiSolidMegaphone, BiSolidMoviePlay } from "react-icons/bi";
import { FaMasksTheater } from "react-icons/fa6";

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
                            <TiPin />
                            <Heading size="xs" textTransform="uppercase">Pinned Script</Heading>
                        </HStack>
                        <Text pt="2" fontSize="sm">View your pinned script.</Text>
                    </Box>
                    <Box borderWidth="2px" borderRadius="md" p="4" shadow="sm" cursor="pointer" borderColor={activeView === 'shows' ? 'blue.400' : 'gray.600'} _hover={{ borderColor: 'orange.400' }} onClick={() => setActiveView('shows')}>
                        <HStack spacing="1" align="center">
                            <BiSolidMoviePlay />
                            <Heading size="xs" textTransform="uppercase">Shows</Heading>
                        </HStack>
                        <Text pt="2" fontSize="sm">Manage your list of shows.</Text>
                    </Box>
                    <Box borderWidth="2px" borderRadius="md" p="4" shadow="sm" cursor="pointer" borderColor={activeView === 'venues' ? 'blue.400' : 'gray.600'} _hover={{ borderColor: 'orange.400' }} onClick={() => setActiveView('venues')}>
                        <HStack spacing="1" align="center">
                            <FaMasksTheater />
                            <Heading size="xs" textTransform="uppercase">Venues</Heading>
                        </HStack>
                        <Text pt="2" fontSize="sm">Manage your list of venues.</Text>
                    </Box>
                    <Box borderWidth="2px" borderRadius="md" p="4" shadow="sm" cursor="pointer" borderColor={activeView === 'departments' ? 'blue.400' : 'gray.600'} _hover={{ borderColor: 'orange.400' }} onClick={() => setActiveView('departments')}>
                        <HStack spacing="1" align="center">
                            <BiSolidMegaphone />
                            <Heading size="xs" textTransform="uppercase">Departments</Heading>
                        </HStack>
                        <Text pt="2" fontSize="sm">Manage your list of departments.</Text>
                    </Box>
                    <Box borderWidth="2px" borderRadius="md" p="4" shadow="sm" cursor="pointer" borderColor={activeView === 'crew' ? 'blue.400' : 'gray.600'} _hover={{ borderColor: 'orange.400' }} onClick={() => setActiveView('crew')}>
                        <HStack spacing="1" align="center">
                            <IoPeopleSharp />
                            <Heading size="xs" textTransform="uppercase">Crew</Heading>
                        </HStack>
                        <Text pt="2" fontSize="sm">Manage your crew members.</Text>
                    </Box>
                </VStack>
            </Box>
        </>
    );
};