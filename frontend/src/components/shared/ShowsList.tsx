import React from 'react';
import { VStack, Flex, Text } from '@chakra-ui/react';
import { ShowCard } from '../../features/shows/components/ShowCard';
import { AppIcon } from '../AppIcon';
import { Show } from '../../features/shows/types';

interface ShowsListProps {
  sortedShows: Show[];
  selectedShowId: string | null;
  hoveredCardId: string | null;
  sortBy: 'show_name' | 'show_date' | 'date_updated' | 'date_created';
  sortDirection: 'asc' | 'desc';
  sharedData: any;
  onShowHover: (id: string | null) => void;
  onShowClick: (id: string) => void;
  onScriptClick: (id: string) => void;
}

// Add custom comparison function for React.memo
const arePropsEqual = (prevProps: ShowsListProps, nextProps: ShowsListProps): boolean => {
  return (
    prevProps.sortedShows === nextProps.sortedShows &&
    prevProps.selectedShowId === nextProps.selectedShowId &&
    prevProps.hoveredCardId === nextProps.hoveredCardId &&
    prevProps.sortBy === nextProps.sortBy &&
    prevProps.sortDirection === nextProps.sortDirection &&
    prevProps.sharedData === nextProps.sharedData &&
    prevProps.onShowHover === nextProps.onShowHover &&
    prevProps.onShowClick === nextProps.onShowClick &&
    prevProps.onScriptClick === nextProps.onScriptClick
  );
};

export const ShowsList: React.FC<ShowsListProps> = React.memo(({
  sortedShows,
  selectedShowId,
  hoveredCardId,
  sortBy,
  sortDirection,
  sharedData,
  onShowHover,
  onShowClick,
  onScriptClick,
}) => {
  return (
    <>
      {sortedShows.length > 0 ? (
        <VStack spacing={4} align="stretch">
          {sortedShows.map(show => (
            <ShowCard
              key={show.show_id}
              show={show}
              sortBy={sortBy}
              sortDirection={sortDirection}
              isSelected={selectedShowId === show.show_id}
              isHovered={hoveredCardId === show.show_id}
              onShowHover={onShowHover}
              onShowClick={onShowClick}
              selectedScriptId={null}
              onScriptClick={onScriptClick}
              onCreateScriptClick={() => {}}
              hideEditButton={true}
              hideCreateScriptButton={true}
              hideScriptBadges={true}
              disableInternalNavigation={true}
            />
          ))}
        </VStack>
      ) : (
        <Flex direction="column" align="center" justify="center" height="200px" gap="4">
          <AppIcon name="show" boxSize="40px" color="gray.400" />
          <Text color="gray.500" textAlign="center">
            {sharedData && sharedData.shows ? 
              "No scripts have been shared with you." : 
              "No shows have been shared with you."
            }
          </Text>
        </Flex>
      )}
    </>
  );
}, arePropsEqual);