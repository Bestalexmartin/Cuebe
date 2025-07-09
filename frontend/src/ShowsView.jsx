// frontend/src/ShowsView.jsx

import React from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { ChevronDownIcon } from '@chakra-ui/icons';
import { ShowCard } from "./ShowCard";

export const ShowsView = ({
    sortedShows,
    showCardRefs,
    isLoading,
    error,
    sortBy,
    handleSortClick,
    onShowModalOpen,
    selectedShowId,
    hoveredShowId,
    setHoveredShowId,
    handleShowClick,
    selectedScriptId,
    handleScriptClick,
    handleOpenCreateScriptModal,
    sortDirection
}) => {
    return (
        <Flex direction="column" height="100%">
            {/* Header Section */}
            <Flex justify="space-between" align="center" flexShrink={0}>
                <Heading as="h2" size="md">Shows</Heading>
                <HStack spacing="2">
                    <Menu>
                        <MenuButton as={Button} size="xs" rightIcon={<ChevronDownIcon />}>
                            Sort by: {sortBy === 'showDate' ? 'Show Date' : sortBy === 'showName' ? 'Name' : 'Updated'}
                        </MenuButton>
                        <MenuList>
                            <MenuItem onClick={() => handleSortClick('showName')}>Name</MenuItem>
                            <MenuItem onClick={() => handleSortClick('showDate')}>Show Date</MenuItem>
                            <MenuItem onClick={() => handleSortClick('dateUpdated')}>Updated</MenuItem>
                        </MenuList>
                    </Menu>
                    <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
                    <Button bg="blue.400" color="white" size="xs" onClick={onShowModalOpen} _hover={{ bg: 'orange.400' }} _focus={{ boxShadow: 'none' }}>
                        Create Show
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
                    sortedShows.length > 0 ? (
                        <VStack spacing={4} align="stretch">
                            {sortedShows.map(show => (
                                <div key={show.showID} ref={el => showCardRefs.current[show.showID] = el}>
                                    <ShowCard
                                        key={show.showID}
                                        show={show}
                                        sortBy={sortBy}
                                        sortDirection={sortDirection}
                                        isSelected={selectedShowId === show.showID}
                                        isHovered={hoveredShowId === show.showID}
                                        onShowHover={setHoveredShowId}
                                        onShowClick={handleShowClick}
                                        selectedScriptId={selectedScriptId}
                                        onScriptClick={handleScriptClick}
                                        onCreateScriptClick={handleOpenCreateScriptModal}
                                    />
                                </div>
                            ))}
                        </VStack>
                    ) : (<Text>You haven't added any shows yet.</Text>)
                )}
            </Box>
        </Flex>
    );
};