// frontend/src/ShowCard.jsx

import React, { useMemo } from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Collapse, IconButton } from "@chakra-ui/react";
import { EditIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';

export const ShowCard = ({
    show,
    isSelected,
    isHovered,
    selectedScriptId,
    onShowClick,
    onScriptClick,
    onShowHover,
    onCreateScriptClick,
    sortBy,
    sortDirection,
}) => {
    const navigate = useNavigate(); // Get the navigate function from the router

    const sortedScripts = useMemo(() => {
        if (!show.scripts) return [];
        const scriptsToSort = [...show.scripts];
        scriptsToSort.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'showName') {
                comparison = a.scriptName.localeCompare(b.scriptName);
            } else { // 'dateUpdated'
                comparison = new Date(b.dateUpdated) - new Date(a.dateUpdated);
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return scriptsToSort;
    }, [show.scripts, sortBy, sortDirection]);

    const borderColor = isHovered ? 'orange.400' : isSelected ? 'blue.400' : 'gray.600';

    // Handler for the new edit button
    const handleEditClick = (e) => {
        e.stopPropagation();
        navigate(`/shows/${show.showID}/edit`);
    };

    // Get venue name safely
    const venueName = show.venue?.venueName || 'No venue set';

    return (
        <Box
            p="4"
            borderWidth="2px"
            borderRadius="md"
            shadow="sm"
            cursor="pointer"
            onClick={() => onShowClick(show.showID)}
            borderColor={borderColor}
            onMouseEnter={() => onShowHover(show.showID)}
            onMouseLeave={() => onShowHover(null)}
        >
            <Flex justify="space-between" align="center">
                <Heading size="sm">{show.showName}</Heading>
                {isSelected && (
                    // Use an HStack to group the two buttons together
                    <HStack>
                        <Button
                            leftIcon={<EditIcon />}
                            size="xs"
                            onClick={handleEditClick}
                        >
                            Edit
                        </Button>
                        <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
                        <Button
                            bg="blue.400"
                            size="xs"
                            color="white"
                            onClick={(e) => { e.stopPropagation(); onCreateScriptClick(show.showID); }}
                            _hover={{ bg: 'orange.400' }}
                            _focus={{ boxShadow: 'none' }}
                        >
                            Create Script
                        </Button>
                    </HStack>
                )}
            </Flex>
            <Text fontSize="sm" color="gray.500" mt={2}>{venueName}</Text>
            <HStack mt={2} justify="space-between" fontSize="xs" color="gray.600">
                <Text>Date: {show.showDate ? new Date(show.showDate).toLocaleDateString() : 'N/A'}</Text>
                <Text>Scripts: {show.scripts ? show.scripts.length : 0}</Text>
                <Text>Updated: {new Date(show.dateUpdated).toLocaleDateString()}</Text>
            </HStack>
            <Collapse in={isSelected} animateOpacity>
                <Box pl="8" pt="4">
                    {sortedScripts.length > 0 ? (
                        <VStack spacing={2} align="stretch">
                            {sortedScripts.map(script => (
                                <Box
                                    key={script.scriptID}
                                    p="3"
                                    borderWidth="2px"
                                    borderRadius="md"
                                    shadow="sm"
                                    cursor="pointer"
                                    onClick={(e) => { e.stopPropagation(); onScriptClick(script.scriptID); }}
                                    borderColor={selectedScriptId === script.scriptID ? 'blue.400' : 'gray.600'}
                                    _hover={{ borderColor: 'orange.400' }}
                                    onMouseEnter={() => onShowHover(null)}
                                    onMouseLeave={() => onShowHover(show.showID)}
                                >
                                    <Flex justify="space-between" align="center">
                                        <Heading size="sm" mb="0">{script.scriptName}</Heading>
                                        <Text fontSize="xs" color="gray.500">
                                            Updated: {new Date(script.dateUpdated).toLocaleDateString()}
                                        </Text>
                                    </Flex>
                                </Box>
                            ))}
                        </VStack>
                    ) : (
                        <Text fontSize="sm" fontStyle="italic" pl={2}>No scripts for this show.</Text>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
};