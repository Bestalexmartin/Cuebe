// frontend/src/CrewView.jsx

import { useState, useMemo } from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Menu, MenuButton, MenuList, MenuItem, useDisclosure } from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';
import { AppIcon } from './components/AppIcon';
import { CrewCard } from './CrewCard';
import { useCrews } from './hooks/useCrews';
import { CreateCrewModal } from './components/modals/CreateCrewModal';

export const CrewView = ({
    onCreateCrew,
    selectedCrewId,
    onCrewClick,
    hoveredCardId,
    setHoveredCardId,
    onSaveNavigationState // NEW: Add prop for saving navigation state
}) => {
    const navigate = useNavigate();
    const { crews, isLoading, error, refetchCrews } = useCrews();
    const { isOpen, onOpen, onClose } = useDisclosure();

    // Crew-specific sorting state  
    const [sortBy, setSortBy] = useState('fullnameFirst');
    const [sortDirection, setSortDirection] = useState('asc');

    // Crew-specific sorting logic
    const handleSortClick = (newSortBy) => {
        if (sortBy === newSortBy) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortDirection(newSortBy === 'dateCreated' ? 'desc' : 'asc');
        }
    };

    const sortedCrews = useMemo(() => {
        if (!crews || crews.length === 0) return [];

        const crewsToSort = [...crews];
        crewsToSort.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'fullnameFirst') {
                const aName = `${a.fullnameFirst || ''} ${a.fullnameLast || ''}`.trim();
                const bName = `${b.fullnameFirst || ''} ${b.fullnameLast || ''}`.trim();
                comparison = aName.localeCompare(bName);
            } else if (sortBy === 'fullnameLast') {
                const aName = `${a.fullnameLast || ''} ${a.fullnameFirst || ''}`.trim();
                const bName = `${b.fullnameLast || ''} ${b.fullnameFirst || ''}`.trim();
                comparison = aName.localeCompare(bName);
            } else if (sortBy === 'userRole') {
                const aRole = a.userRole || 'zzz';
                const bRole = b.userRole || 'zzz';
                comparison = aRole.localeCompare(bRole);
            } else if (sortBy === 'emailAddress') {
                const aEmail = a.emailAddress || 'zzz';
                const bEmail = b.emailAddress || 'zzz';
                comparison = aEmail.localeCompare(bEmail);
            } else { // 'dateCreated'
                comparison = new Date(b.dateCreated || b.dateUpdated) - new Date(a.dateCreated || a.dateUpdated);
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return crewsToSort;
    }, [crews, sortBy, sortDirection]);

    const handleEdit = (crewId) => {
        if (onSaveNavigationState) {
            onSaveNavigationState();
        }
        navigate(`/crew/${crewId}/edit`);
    };

    // Use the modal handler from props if provided, otherwise use local modal
    const handleCreateCrew = onCreateCrew || onOpen;

    return (
        <>
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
                                Sort by: {sortBy === 'fullnameFirst' ? 'First Name' : sortBy === 'fullnameLast' ? 'Last Name' : sortBy === 'userRole' ? 'Role' : sortBy === 'emailAddress' ? 'Email' : 'Date Added'}
                            </MenuButton>
                            <MenuList>
                                <MenuItem onClick={() => handleSortClick('fullnameFirst')}>First Name</MenuItem>
                                <MenuItem onClick={() => handleSortClick('fullnameLast')}>Last Name</MenuItem>
                                <MenuItem onClick={() => handleSortClick('userRole')}>Role</MenuItem>
                                <MenuItem onClick={() => handleSortClick('emailAddress')}>Email</MenuItem>
                                <MenuItem onClick={() => handleSortClick('dateCreated')}>Date Added</MenuItem>
                            </MenuList>
                        </Menu>
                        <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
                        <Button
                            bg="blue.400"
                            color="white"
                            size="xs"
                            onClick={handleCreateCrew}
                            _hover={{ bg: 'orange.400' }}
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
                        sortedCrews.length > 0 ? (
                            <VStack spacing={4} align="stretch">
                                {sortedCrews.map(crewMember => (
                                    <CrewCard
                                        key={crewMember.userID}
                                        crewMember={crewMember}
                                        onEdit={handleEdit}
                                        onCrewClick={onCrewClick}
                                        isHovered={hoveredCardId === crewMember.userID}
                                        isSelected={selectedCrewId === crewMember.userID}
                                        onHover={setHoveredCardId}
                                        onSaveNavigationState={onSaveNavigationState} // NEW: Pass down the save function
                                    />
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
                                    onClick={handleCreateCrew}
                                    _hover={{ bg: 'orange.400' }}
                                >
                                    Add Your First Crew Member
                                </Button>
                            </Flex>
                        )
                    )}
                </Box>
            </Flex>

            <CreateCrewModal
                isOpen={isOpen}
                onClose={onClose}
                onCrewCreated={refetchCrews}
            />
        </>
    );
};