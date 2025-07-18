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
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { AppIcon } from "./components/AppIcon";

// TypeScript interfaces
interface Venue {
  venueID: string; // CHANGED: UUID is now a string
  venueName: string;
}

interface Script {
  scriptID: string;
  scriptName: string;
  scriptStatus: string;
  showID: string;
  dateUpdated: string;
}

interface Show {
  showID: string;
  showName: string;
  showDate?: string;
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
  onScriptClick: (scriptId: string) => void; // CHANGED: string instead of number
  onShowHover: (showId: string | null) => void;
  onCreateScriptClick: (showId: string) => void;
  sortBy: "showName" | "showDate" | "dateUpdated";
  sortDirection: "asc" | "desc";
}

export const ShowCard: React.FC<ShowCardProps> = ({
  show,
  isSelected,
  isHovered,
  selectedScriptId,
  onShowClick,
  onScriptClick, // Still called for any additional logic
  onShowHover,
  onCreateScriptClick,
  sortBy,
  sortDirection,
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
    navigate(`/shows/${show.showID}/edit`);
  };

  // Handler for script click - now navigates to edit page
  const handleScriptClick = (scriptId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Call the original handler for any additional logic (like analytics, etc.)
    onScriptClick(scriptId);

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
        {isSelected && (
          <HStack>
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
        )}
      </Flex>
      <Text fontSize="sm" color="gray.500" mt={2}>
        {venueName}
      </Text>
      <HStack mt={2} justify="space-between" fontSize="xs" color="gray.600">
        <Text>
          Date:{" "}
          {show.showDate ? new Date(show.showDate).toLocaleDateString() : "N/A"}
        </Text>
        <Text>Scripts: {show.scripts ? show.scripts.length : 0}</Text>
        <Text>Updated: {new Date(show.dateUpdated).toLocaleDateString()}</Text>
      </HStack>
      <Collapse in={isSelected} animateOpacity>
        <Box pl="8" pt="4">
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
                  <Flex justify="space-between" align="center">
                    <Heading size="sm" mb="0">
                      {script.scriptName}
                    </Heading>
                    <Text fontSize="xs" color="gray.500">
                      Updated:{" "}
                      {new Date(script.dateUpdated).toLocaleDateString()}
                    </Text>
                  </Flex>
                </Box>
              ))}
            </VStack>
          ) : (
            <Text fontSize="sm" fontStyle="italic" pl={2}>
              No scripts for this show.
            </Text>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};
