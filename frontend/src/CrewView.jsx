// frontend/src/CrewView.jsx

import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Menu, MenuButton, MenuList, MenuItem, Avatar } from "@chakra-ui/react";
import { AppIcon } from './components/AppIcon';

export const CrewView = ({
    sortedCrew,
    isLoading,
    error,
    sortBy,
    sortDirection,
    handleSortClick,
    onCrewModalOpen,
}) => {
    return (
        <Flex direction="column" height="100%">
            {/* Header Section */}
            <Flex justify="space-between" align="center" flexShrink={0}>
                <HStack spacing="2" align="center">
                    <AppIcon name="crew" boxSize="25px" />
                    <Heading as="h2" size="md">Crew Members</Heading>
                </HStack>
                <HStack spacing="2">
                    <Menu>
                        <MenuButton as={Button} size="xs" rightIcon={<AppIcon name="openmenu" />}>
                            Sort by: {sortBy === 'fullnameFirst' ? 'Name' : sortBy === 'userRole' ? 'Role' : 'Date Added'}
                        </MenuButton>
                        <MenuList>
                            <MenuItem onClick={() => handleSortClick('fullnameFirst')}>Name</MenuItem>
                            <MenuItem onClick={() => handleSortClick('userRole')}>Role</MenuItem>
                            <MenuItem onClick={() => handleSortClick('dateAdded')}>Date Added</MenuItem>
                        </MenuList>
                    </Menu>
                    <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
                    <Button
                        bg="blue.400"
                        color="white"
                        size="xs"
                        onClick={onCrewModalOpen}
                        _hover={{ bg: 'orange.400' }}
                        _focus={{ boxShadow: 'none' }}
                    >
                        Add Crew Member
                    </Button>
                </HStack>
            </Flex>

            <Box
                mt="4"
                border="1px solid"
                borderColor="container.border"
                p="4"
                borderRadius="md"
                flexGrow={1}
                overflowY="auto"
                className="hide-scrollbar"
            >
                {isLoading && (
                    <Flex justify="center" align="center" height="200px">
                        <Spinner />
                    </Flex>
                )}
                {error && (
                    <Text color="red.500" textAlign="center" p="4">
                        {error}
                    </Text>
                )}
                {!isLoading && !error && (
                    sortedCrew.length > 0 ? (
                        <VStack spacing={4} align="stretch">
                            {sortedCrew.map(crewMember => (
                                <Box
                                    key={crewMember.ID}
                                    p="4"
                                    borderWidth="2px"
                                    borderRadius="md"
                                    shadow="sm"
                                    borderColor="gray.600"
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    <Flex align="center" gap="3">
                                        <Avatar
                                            size="sm"
                                            name={`${crewMember.fullnameFirst} ${crewMember.fullnameLast}`}
                                            src={crewMember.profileImgURL}
                                        />
                                        <Box flex="1">
                                            <Text fontWeight="medium">
                                                {crewMember.fullnameFirst} {crewMember.fullnameLast}
                                            </Text>
                                            <HStack spacing="2" mt="1">
                                                {crewMember.userRole && (
                                                    <Text fontSize="sm" color="gray.500">
                                                        {crewMember.userRole}
                                                    </Text>
                                                )}
                                                {crewMember.emailAddress && (
                                                    <>
                                                        <Text fontSize="sm" color="gray.400">•</Text>
                                                        <Text fontSize="sm" color="gray.500">
                                                            {crewMember.emailAddress}
                                                        </Text>
                                                    </>
                                                )}
                                            </HStack>
                                        </Box>
                                        {!crewMember.isActive && (
                                            <Text fontSize="xs" color="red.500" fontWeight="medium">
                                                Inactive
                                            </Text>
                                        )}
                                    </Flex>
                                </Box>
                            ))}
                        </VStack>
                    ) : (
                        <Flex direction="column" align="center" justify="center" height="200px" gap="4">
                            <AppIcon name="crew" boxSize="40px" color="gray.400" />
                            <Text color="gray.500" textAlign="center">
                                You haven't added any crew members yet.
                            </Text>
                            <Button
                                bg="blue.400"
                                color="white"
                                size="sm"
                                onClick={onCrewModalOpen}
                                _hover={{ bg: 'orange.400' }}
                                _focus={{ boxShadow: 'none' }}
                            >
                                Add Your First Crew Member
                            </Button>
                        </Flex>
                    )
                )}
            </Box>
        </Flex>
    );
};