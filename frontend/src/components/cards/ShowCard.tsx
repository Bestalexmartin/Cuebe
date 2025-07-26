import React, { useMemo } from "react";
import {
  VStack,
  HStack,
  Button,
  Text,
  Badge,
  Box,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { BaseCard, BaseCardAction } from "../base/BaseCard";
import { formatDateFriendly, formatTimeLocal, formatDateTimeLocal } from "../../utils/dateTimeUtils";

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
  lastUsed?: string;
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
  sortBy: "showName" | "showDate" | "dateCreated" | "dateUpdated";
  sortDirection: "asc" | "desc";
  onSaveNavigationState?: () => void;
  isLoading?: boolean;
}

const ShowCardComponent: React.FC<ShowCardProps> = ({
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
  isLoading = false,
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
        comparison =
          new Date(b.dateUpdated).getTime() - new Date(a.dateUpdated).getTime();
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return scriptsToSort;
  }, [show.scripts, sortBy, sortDirection]);

  // Handler for the show edit button
  const handleEditClick = (e: React.MouseEvent) => {
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

  const headerActions: BaseCardAction[] = [
    {
      label: "Edit",
      icon: "edit",
      onClick: handleEditClick,
      'aria-label': "Edit show"
    }
  ];

  const quickInfo = (
    <>
      <HStack justify="space-between" fontSize="sm" color="detail.text">
        <Text>
          {venueName} • {formatDateFriendly(show.showDate)}
        </Text>
        <Text fontSize="xs">
          Created: {formatDateTimeLocal(show.dateCreated)}
        </Text>
      </HStack>
      <HStack
        justify="space-between"
        fontSize="sm"
        color="detail.text"
        mt={1}
      >
        <Text>Scripts: {show.scripts ? show.scripts.length : 0}</Text>
        <Text fontSize="xs">
          Updated: {formatDateTimeLocal(show.dateUpdated)}
        </Text>
      </HStack>
    </>
  );

  const expandedContent = (
    <Box>
      <HStack justify="space-between" align="center" flexShrink={0} mb={4}>
        <Text fontWeight="semibold">
          Scripts
        </Text>
        <Button
          variant="primary"
          size="xs"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onCreateScriptClick(show.showID);
          }}
          _focus={{ boxShadow: "none" }}
        >
          Create Script
        </Button>
      </HStack>
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
                  <Text fontWeight="semibold" size="sm">{script.scriptName}</Text>
                  <HStack
                    justify="space-between"
                    fontSize="xs"
                    color="detail.text"
                    mt={2}
                  >
                    <Badge variant="solid" colorScheme="blue" size="sm">
                      {script.scriptStatus.toUpperCase()}
                    </Badge>
                    <Text>
                      Created:{" "}
                      {formatDateTimeLocal(script.dateCreated)}
                    </Text>
                  </HStack>
                  <HStack
                    justify="space-between"
                    fontSize="xs"
                    color="detail.text"
                  >
                    <Text>
                      Start Time:{" "}
                      {formatTimeLocal(script.startTime)}
                    </Text>
                    <Text>
                      Updated:{" "}
                      {formatDateTimeLocal(script.dateUpdated)}
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
                        {formatDateTimeLocal(script.lastUsed)}
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
  );

  return (
    <BaseCard
      title={show.showName}
      cardId={show.showID}
      isSelected={isSelected}
      isHovered={isHovered}
      onCardClick={() => onShowClick(show.showID)}
      onHover={onShowHover}
      headerActions={headerActions}
      quickInfo={quickInfo}
      expandedContent={expandedContent}
      isLoading={isLoading}
      skeletonVariant="show"
    />
  );
};

export const ShowCard = React.memo(ShowCardComponent);
