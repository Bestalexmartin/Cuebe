// frontend/src/ShowCard.tsx

import React, { useMemo } from "react";
import {
  Flex,
  Box,
  VStack,
  HStack,
  Heading,
  Button,
  Divider,
  Text,
  Collapse,
  Badge,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { AppIcon } from "./components/AppIcon";

// TypeScript interfaces
interface Venue {
  venueID: string;
  venueName: string;
}

interface Script {
  scriptID: string;
  scriptName: string;
  scriptStatus: string;
  showID: string;
  startTime: string;
  dateCreated: string;
  dateUpdated: string;
  lastUsed?: string; // Optional field for last used date
}

interface Show {
  showID: string;
  showName: string;
  showDate?: string;
  dateCreated: string;
  dateUpdated: string;
  venue?: Venue;
  scripts: Script[];
}

interface ShowCardProps {
  show: Show;
  isSelected: boolean;
  isHovered: boolean;
  selectedScriptId: string | null;
  onShowClick: (showId: string) => void;
  onScriptClick: (scriptId: string) => void;
  onShowHover: (showId: string | null) => void;
  onCreateScriptClick: (showId: string) => void;
  sortBy: "showName" | "showDate" | "dateUpdated";
  sortDirection: "asc" | "desc";
  onSaveNavigationState?: () => void;
}

export const ShowCard: React.FC<ShowCardProps> = ({
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
  onSaveNavigationState,
}) => {
  const navigate = useNavigate();

  const sortedScripts = useMemo(() => {
    if (!show.scripts) return [];
    const scriptsToSort = [...show.scripts];
    scriptsToSort.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "showName") {
        comparison = a.scriptName.localeCompare(b.scriptName);
      } else {
        // 'dateUpdated'
        comparison =
          new Date(b.dateUpdated).getTime() - new Date(a.dateUpdated).getTime();
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return scriptsToSort;
  }, [show.scripts, sortBy, sortDirection]);

  const borderColor = isHovered
    ? "orange.400"
    : isSelected
      ? "blue.400"
      : "gray.600";

  // Handler for the show edit button
  const handleShowEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Save navigation state before leaving dashboard
    if (onSaveNavigationState) {
      onSaveNavigationState();
    }

    navigate(`/shows/${show.showID}/edit`);
  };

  // Handler for script click - now navigates to edit page
  const handleScriptClick = (scriptId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Call the original handler for any additional logic (like analytics, etc.)
    onScriptClick(scriptId);

    // Save navigation state before leaving dashboard
    if (onSaveNavigationState) {
      onSaveNavigationState();
    }

    // Navigate to the script edit page
    navigate(`/scripts/${scriptId}/edit`);
  };

  // Get venue name safely
  const venueName = show.venue?.venueName || "No venue set";

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
        <HStack
          opacity={isSelected ? 1 : 0}
          pointerEvents={isSelected ? "auto" : "none"}
        >
          <Button
            leftIcon={<AppIcon name="edit" boxSize="12px" />}
            size="xs"
            onClick={handleShowEditClick}
          >
            Edit
          </Button>
          <Divider
            orientation="vertical"
            height="20px"
            borderColor="gray.400"
            mx="2"
          />
          <Button
            bg="blue.400"
            size="xs"
            color="white"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onCreateScriptClick(show.showID);
            }}
            _hover={{ bg: "orange.400" }}
            _focus={{ boxShadow: "none" }}
          >
            Create Script
          </Button>
        </HStack>
      </Flex>
      <Text fontSize="sm" color="detail.text" mt={2}>
        {venueName} • Date:{" "}
        {show.showDate ? new Date(show.showDate).toLocaleDateString() : "N/A"}
      </Text>
      <HStack justify="space-between" fontSize="sm" color="detail.text" mt={1}>
        <Text>Scripts: {show.scripts ? show.scripts.length : 0}</Text>
        <Text fontSize="xs">
          Updated: {new Date(show.dateUpdated).toLocaleDateString()}
        </Text>
      </HStack>
      <Collapse in={isSelected} animateOpacity>
        <VStack
          align="stretch"
          spacing="3"
          mt="4"
          pt="3"
          borderTop="1px solid"
          borderColor="ui.border"
        >
          {/* Scripts Section */}
          <Box>
            <Text fontWeight="semibold" mb="2">
              Scripts
            </Text>
            <Box pl="4">
              {sortedScripts.length > 0 ? (
                <VStack spacing={2} align="stretch">
                  {sortedScripts.map((script) => (
                    <Box
                      key={script.scriptID}
                      p="3"
                      borderWidth="2px"
                      borderRadius="md"
                      shadow="sm"
                      cursor="pointer"
                      onClick={(e: React.MouseEvent) =>
                        handleScriptClick(script.scriptID, e)
                      }
                      borderColor={
                        selectedScriptId === script.scriptID
                          ? "blue.400"
                          : "gray.600"
                      }
                      _hover={{ borderColor: "orange.400" }}
                      onMouseEnter={() => onShowHover(null)}
                      onMouseLeave={() => onShowHover(show.showID)}
                    >
                      <VStack align="stretch" spacing="1">
                        <Heading size="sm">{script.scriptName}</Heading>
                        <HStack
                          justify="space-between"
                          fontSize="xs"
                          color="detail.text"
                        >
                          <Badge variant="solid" colorScheme="blue" size="sm">
                            {script.scriptStatus.toUpperCase()}
                          </Badge>
                          <Text>
                            Created:{" "}
                            {new Date(script.dateCreated).toLocaleDateString()}
                          </Text>
                        </HStack>
                        <HStack
                          justify="space-between"
                          fontSize="xs"
                          color="detail.text"
                        >
                          <Text>
                            Start Time:{" "}
                            {script.startTime
                              ? new Date(script.startTime).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "Not set"}
                          </Text>
                          <Text>
                            Updated:{" "}
                            {new Date(script.dateUpdated).toLocaleDateString()}
                          </Text>
                        </HStack>
                        {script.lastUsed && (
                          <HStack
                            justify="flex-end"
                            fontSize="xs"
                            color="detail.text"
                          >
                            <Text>
                              Last Used:{" "}
                              {new Date(script.lastUsed).toLocaleDateString()}
                            </Text>
                          </HStack>
                        )}
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              ) : (
                <Text
                  fontSize="sm"
                  fontStyle="italic"
                  color="detail.text"
                  pl={2}
                >
                  No scripts for this show.
                </Text>
              )}
            </Box>
          </Box>

          {/* Show creation date at bottom right */}
          <Flex justify="flex-end" mt="3">
            <Text fontSize="xs" color="detail.text">
              Created:{" "}
              {new Date(
                show.dateCreated || show.dateUpdated,
              ).toLocaleDateString()}
            </Text>
          </Flex>
        </VStack>
      </Collapse>
    </Box>
  );
};
