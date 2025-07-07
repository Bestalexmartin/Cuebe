// frontend/src/DashboardPage.jsx

import React from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Text, Spinner, Collapse, useDisclosure } from "@chakra-ui/react";
import { useState } from 'react';
import { useShows } from "./useShows";
import { CreateShowModal } from "./CreateShowModal";

const DashboardPage = () => {
  const { shows, isLoading, error } = useShows();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [selectedScriptId, setSelectedScriptId] = useState(null);

  const handleShowClick = (showId) => {
    setSelectedShowId(selectedShowId === showId ? null : showId);
  };

  const handleScriptClick = (scriptId) => {
    setSelectedScriptId(selectedScriptId === scriptId ? null : scriptId);
  };

  return (
    <>
      <Flex width="100%" gap="8">
        <Box flexBasis="70%">
          <Heading as="h2" size="md" mb="4">
            Library
          </Heading>

          <Box
            mt="4"
            border="1px solid"
            borderColor="gray.300"
            p="4"
            borderRadius="md"
          >
            {isLoading && <Spinner />}
            {error && <Text color="red.500">{error}</Text>}
            {!isLoading && !error && (
              shows.length > 0 ? (
                <VStack spacing={4} align="stretch">
                  {shows.map(show => (
                    // We wrap each show and its scripts in a fragment
                    <React.Fragment key={show.showID}>
                      <Box
                        p="4"
                        borderWidth="2px" // Increased border width for visibility
                        borderRadius="md"
                        shadow="sm"
                        cursor="pointer"
                        onClick={() => handleShowClick(show.showID)}
                        borderColor={selectedShowId === show.showID ? 'blue.400' : 'gray.500 '}
                        _hover={{ borderColor: 'orange.400' }}
                      >
                        <Heading size="sm" mb="2">{show.showName}</Heading>
                        <Text fontSize="sm" color="gray.400">{show.showVenue || 'No venue set'}</Text>
                        <HStack mt={2} justify="space-between" fontSize="xs" color="gray.400">
                          <Text>Date: {show.showDate ? new Date(show.showDate).toLocaleDateString() : 'N/A'}</Text>
                          <Text>Scripts: {show.scripts ? show.scripts.length : 0}</Text>
                          <Text>Updated: {new Date(show.dateUpdated).toLocaleDateString()}</Text>
                        </HStack>
                      </Box>

                      <Collapse in={selectedShowId === show.showID} animateOpacity>
                        <Box pl="8" pr="0" pb="2" pt="0">
                          {show.scripts && show.scripts.length > 0 ? (
                            <VStack spacing={2} align="stretch">
                              {show.scripts.map(script => (
                                <Box
                                  key={script.scriptID}
                                  p="3"
                                  borderWidth="2px"
                                  borderRadius="md"
                                  shadow="sm"
                                  cursor="pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleScriptClick(script.scriptID);
                                  }}
                                  borderColor={selectedScriptId === script.scriptID ? 'blue.400' : 'gray.500'}
                                  _hover={{ borderColor: 'orange.400' }}
                                >
                                  <Heading size="sm" mb="0">{script.scriptName}</Heading>
                                </Box>
                              ))}
                            </VStack>
                          ) : (
                            <Text fontSize="sm" fontStyle="italic">No scripts for this show.</Text>
                          )}
                        </Box>
                      </Collapse>
                    </React.Fragment>
                  ))}
                </VStack>
              ) : (
                <Text>You haven't created any shows yet.</Text>
              )
            )}
          </Box>
          <Button bg="blue.400" color="white" mt="4" onClick={onOpen}>
            Create New Show
          </Button>
        </Box>

        {/* Quick Access Sidebar (30%) */}
        <Box flexBasis="30%">
          <Heading as="h2" size="md" mb="4">
            Quick Access
          </Heading>
          <Box
            border="1px dashed"
            borderColor="gray.300"
            p="8"
            borderRadius="md"
          >
            Quickstart Cards
          </Box>
        </Box>
      </Flex>

      <CreateShowModal
        isOpen={isOpen}
        onClose={onClose}
        onShowCreated={() => { /* We'll need to implement refetching later */ }}
      />
    </>
  );
};

export default DashboardPage;