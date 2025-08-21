// frontend/src/features/shows/components/ShowCard.tsx

import React, { useMemo } from "react";
import {
  VStack,
  HStack,
  Button,
  Text,
  Badge,
  Box,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { BaseCard, BaseCardAction } from "../../../components/base/BaseCard";
import { formatDateFriendly, formatTimeLocal, formatDateTimeLocal } from "../../../utils/dateTimeUtils";
import { AppIcon } from "../../../components/AppIcon";
import { Show } from "../types";

interface ShowCardProps {
  show: Show;
  isSelected: boolean;
  isHovered: boolean;
  selectedScriptId: string | null;
  onShowClick: (showId: string) => void;
  onScriptClick: (scriptId: string) => void;
  onShowHover: (showId: string | null) => void;
  onCreateScriptClick: (showId: string) => void;
  onImportScriptClick: (showId: string) => void;
  onClearDepartmentMappingClick?: (showId: string) => void;
  sortBy: "show_name" | "show_date" | "date_created" | "date_updated";
  sortDirection: "asc" | "desc";
  onSaveNavigationState?: () => void;
  isLoading?: boolean;
  // New props for share page customization
  hideEditButton?: boolean;
  hideCreateScriptButton?: boolean;
  hideScriptBadges?: boolean;
  disableInternalNavigation?: boolean;
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
  onImportScriptClick,
  onClearDepartmentMappingClick,
  sortBy,
  sortDirection,
  onSaveNavigationState,
  isLoading = false,
  hideEditButton = false,
  hideCreateScriptButton = false,
  hideScriptBadges = false,
  disableInternalNavigation = false,
}) => {
  const navigate = useNavigate();

  const sortedScripts = useMemo(() => {
    if (!show.scripts) return [];
    const scriptsToSort = [...show.scripts];
    scriptsToSort.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "show_name") {
        comparison = a.script_name.localeCompare(b.script_name);
      } else {
        comparison =
          new Date(b.date_updated).getTime() - new Date(a.date_updated).getTime();
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

    navigate(`/shows/${show.show_id}/edit`);
  };

  // Handler for script click - navigates to manage page unless disabled
  const handleScriptClick = (scriptId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Call the original handler for any additional logic (like analytics, etc.)
    onScriptClick(scriptId);

    // Only do internal navigation if not disabled (e.g., for shared pages)
    if (!disableInternalNavigation) {
      // Save navigation state before leaving dashboard
      if (onSaveNavigationState) {
        onSaveNavigationState();
      }

      // Navigate to the script management page
      navigate(`/scripts/${scriptId}/manage`);
    }
  };

  // Get venue name safely
  const venueName = show.venue?.venue_name || "No venue set";

  const headerActions: BaseCardAction[] = hideEditButton ? [] : [
    {
      label: "Edit",
      icon: "edit",
      onClick: handleEditClick,
      'aria-label': "Edit show"
    }
  ];

  const quickInfo = (
    <>
      <HStack justify="space-between" fontSize="sm" color="cardText">
        <Text>
          {venueName} • {formatDateFriendly(show.show_date)}
        </Text>
      </HStack>
      <HStack justify="space-between" fontSize="sm" color="cardText" mt={1}>
        <Text>
          Start Time: {show.show_date ? formatTimeLocal(show.show_date) : 'Not set'}
        </Text>
        <Text fontSize="xs">
          Created: {formatDateTimeLocal(show.date_created)}
        </Text>
      </HStack>
      <HStack justify="space-between" fontSize="sm" color="cardText" mt={1}>
        <Text>
          End Time: {show.show_end ? formatTimeLocal(show.show_end) : 'Not set'}
        </Text>
        <Text fontSize="xs">
          Updated: {formatDateTimeLocal(show.date_updated)}
        </Text>
      </HStack>
    </>
  );

  const expandedContent = (
    <Box>
      <HStack justify="space-between" align="center" flexShrink={0} pt={2} mb={4}>
        <Text fontWeight="semibold">
          Scripts
        </Text>
        {!hideCreateScriptButton && (
          <Menu>
            <MenuButton
              as={Button}
              variant="primary"
              size="xs"
              rightIcon={<AppIcon name="openmenu" />}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
              }}
              _focus={{ boxShadow: "none" }}
            >
              Script Actions
            </MenuButton>
            <MenuList>
              <MenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onCreateScriptClick(show.show_id);
                }}
              >
                Create New Script
              </MenuItem>
              <MenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onImportScriptClick(show.show_id);
                }}
              >
                Import Script
              </MenuItem>
              {onClearDepartmentMappingClick && (
                <MenuItem
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onClearDepartmentMappingClick(show.show_id);
                  }}
                >
                  Clear Department Mapping
                </MenuItem>
              )}
            </MenuList>
          </Menu>
        )}
      </HStack>
      <Box>
        {sortedScripts.length > 0 ? (
          <VStack spacing={2} align="stretch">
            {sortedScripts.map((script) => (
              <Box
                key={script.script_id}
                p="4"
                borderWidth="2px"
                borderRadius="md"
                shadow="sm"
                cursor="pointer"
                onClick={(e: React.MouseEvent) =>
                  handleScriptClick(script.script_id, e)
                }
                borderColor={
                  selectedScriptId === script.script_id
                    ? "blue.400"
                    : "gray.600"
                }
                _hover={{ borderColor: "orange.400" }}
                onMouseEnter={() => onShowHover(null)}
                onMouseLeave={() => onShowHover(show.show_id)}
              >
                <VStack align="stretch" spacing="1">
                  <Text fontWeight="semibold" size="sm">{script.script_name}</Text>
                  {!hideScriptBadges && (
                    <HStack
                      justify="space-between"
                      fontSize="xs"
                      color="cardText"
                      mt={2}
                    >
                      <HStack spacing={2}>
                        <Badge variant="solid" colorScheme="blue">
                          {script.script_status.toUpperCase()}
                        </Badge>
                        {script.is_shared && (
                          <Badge variant="solid" colorScheme="green">
                            SHARED
                          </Badge>
                        )}
                      </HStack>
                    </HStack>
                  )}
                  <HStack
                    justify="space-between"
                    fontSize="sm"
                    color="cardText"
                  >
                    <Text>
                      Start Time:{" "}
                      {script.start_time ? formatTimeLocal(script.start_time) : 'Not set'}
                    </Text>
                    <Text fontSize="xs">
                      Created:{" "}
                      {formatDateTimeLocal(script.date_created)}
                    </Text>
                  </HStack>
                  <HStack
                    justify="space-between"
                    fontSize="sm"
                    color="cardText"
                  >
                    <Text>
                      End Time:{" "}
                      {script.end_time ? formatTimeLocal(script.end_time) : 'Not set'}
                    </Text>
                    <Text fontSize="xs">
                      Updated:{" "}
                      {formatDateTimeLocal(script.date_updated)}
                    </Text>
                  </HStack>
                  {script.last_used && (
                    <HStack
                      justify="flex-end"
                      fontSize="xs"
                      color="cardText"
                    >
                      <Text>
                        Last Used:{" "}
                        {formatDateTimeLocal(script.last_used)}
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
            color="cardText"
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
      title={show.show_name}
      cardId={show.show_id}
      isSelected={isSelected}
      isHovered={isHovered}
      onCardClick={() => onShowClick(show.show_id)}
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
