import React from 'react';
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Button,
  Collapse,
  Skeleton,
  SkeletonText,
  BoxProps
} from '@chakra-ui/react';
import { AppIcon, IconName } from '../AppIcon';

export type SkeletonVariant = 'default' | 'show' | 'venue' | 'crew' | 'department';

export interface BaseCardAction {
  label: string;
  icon?: IconName;
  onClick: (e: React.MouseEvent) => void;
  'aria-label'?: string;
}

export interface BaseCardProps extends Omit<BoxProps, 'onClick'> {
  title: string;
  isSelected: boolean;
  isHovered: boolean;
  onCardClick: () => void;
  onHover?: (id: string | null) => void;
  cardId: string;
  
  // Loading state
  isLoading?: boolean;
  skeletonVariant?: SkeletonVariant;
  
  // Header content
  headerBadges?: React.ReactNode;
  headerActions?: BaseCardAction[];
  
  // Quick info rows (always visible)
  quickInfo?: React.ReactNode;
  
  // Expandable content (shown when selected)
  expandedContent?: React.ReactNode;
  
  // Styling overrides
  borderColorOverride?: string;
}

const BaseCardComponent: React.FC<BaseCardProps> = ({
  title,
  isSelected,
  isHovered,
  onCardClick,
  onHover,
  cardId,
  isLoading = false,
  skeletonVariant = 'default',
  headerBadges,
  headerActions,
  quickInfo,
  expandedContent,
  borderColorOverride,
  children,
  ...boxProps
}) => {
  const getBorderColor = () => {
    if (borderColorOverride) return borderColorOverride;
    return isHovered ? 'orange.400' : isSelected ? 'blue.400' : 'gray.600';
  };

  const handleCardClick = () => {
    onCardClick();
  };

  const handleMouseEnter = () => {
    onHover?.(cardId);
  };

  const handleMouseLeave = () => {
    onHover?.(null);
  };

  // Skeleton loading components for different variants
  const getSkeletonContent = () => {
    const baseHeader = (
      <Flex justify="space-between" align="center" mb={2}>
        <Flex align="center" gap="3">
          <Skeleton height="20px" width="120px" />
          <Skeleton height="18px" width="60px" borderRadius="full" />
        </Flex>
      </Flex>
    );

    const baseExpandedContent = isSelected && (
      <Box mt="4" pt="3" borderTop="1px solid" borderColor="ui.border">
        <SkeletonText mt="2" noOfLines={3} spacing="2" skeletonHeight="2" />
      </Box>
    );

    switch (skeletonVariant) {
      case 'show':
        return (
          <>
            {baseHeader}
            <VStack align="stretch" spacing={2} mb={3}>
              <Flex justify="space-between">
                <Skeleton height="16px" width="60px" />
                <Skeleton height="16px" width="140px" />
              </Flex>
              <Flex justify="space-between">
                <Skeleton height="16px" width="80px" />
                <Skeleton height="16px" width="120px" />
              </Flex>
              <Flex justify="space-between">
                <Skeleton height="16px" width="70px" />
                <Skeleton height="16px" width="100px" />
              </Flex>
            </VStack>
            {baseExpandedContent}
          </>
        );
      
      case 'venue':
        return (
          <>
            {baseHeader}
            <VStack align="stretch" spacing={2} mb={3}>
              <Flex justify="space-between">
                <Skeleton height="16px" width="60px" />
                <Skeleton height="16px" width="80px" />
              </Flex>
              <Flex justify="space-between">
                <Skeleton height="16px" width="90px" />
                <Skeleton height="16px" width="100px" />
              </Flex>
            </VStack>
            {baseExpandedContent}
          </>
        );
      
      case 'crew':
        return (
          <>
            {baseHeader}
            <VStack align="stretch" spacing={2} mb={3}>
              <Flex justify="space-between">
                <Skeleton height="16px" width="100px" />
                <Skeleton height="16px" width="120px" />
              </Flex>
              <Flex justify="space-between">
                <Skeleton height="16px" width="70px" />
                <Skeleton height="16px" width="90px" />
              </Flex>
            </VStack>
            {baseExpandedContent}
          </>
        );
      
      case 'department':
        return (
          <>
            <Flex justify="space-between" align="center" mb={2}>
              <Flex align="center" gap="3">
                <Skeleton height="20px" width="100px" />
                <Skeleton height="20px" width="20px" borderRadius="full" />
              </Flex>
            </Flex>
            <VStack align="stretch" spacing={2} mb={3}>
              <Flex justify="space-between">
                <Skeleton height="16px" width="80px" />
                <Skeleton height="16px" width="60px" />
              </Flex>
              <Skeleton height="14px" width="200px" />
            </VStack>
            {baseExpandedContent}
          </>
        );
      
      default:
        return (
          <>
            {baseHeader}
            <VStack align="stretch" spacing={2} mb={3}>
              <Flex justify="space-between">
                <Skeleton height="16px" width="80px" />
                <Skeleton height="16px" width="100px" />
              </Flex>
              <Flex justify="space-between">
                <Skeleton height="16px" width="90px" />
                <Skeleton height="16px" width="120px" />
              </Flex>
            </VStack>
            {baseExpandedContent}
          </>
        );
    }
  };

  return (
    <Box
      p="4"
      borderWidth="2px"
      borderRadius="md"
      shadow="sm"
      cursor={isLoading ? "default" : "pointer"}
      borderColor={isLoading ? "gray.200" : getBorderColor()}
      _hover={isLoading ? {} : { borderColor: 'orange.400' }}
      onMouseEnter={isLoading ? undefined : handleMouseEnter}
      onMouseLeave={isLoading ? undefined : handleMouseLeave}
      onClick={isLoading ? undefined : handleCardClick}
      {...boxProps}
    >
      {isLoading ? (
        getSkeletonContent()
      ) : (
        <>
          {/* Header Row */}
          <Flex justify="space-between" align="center" mb={headerBadges || headerActions ? 1 : 0}>
            <Flex align="center" gap="3" width="100%">
              {headerBadges && (
                <Box flexShrink="0">
                  {headerBadges}
                </Box>
              )}
              <Box flex="1">
                <Heading size="sm">{title}</Heading>
              </Box>
            </Flex>

            {headerActions && (
              <HStack 
                spacing="1" 
                opacity={isSelected ? 1 : 0} 
                pointerEvents={isSelected ? "auto" : "none"}
              >
                {headerActions.map((action, index) => (
                  <Button
                    key={index}
                    aria-label={action['aria-label'] || action.label}
                    leftIcon={action.icon ? <AppIcon name={action.icon} boxSize="12px" /> : undefined}
                    size="xs"
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ))}
              </HStack>
            )}
          </Flex>

          {/* Quick Info Section - Always Visible */}
          {quickInfo && (
            <Flex mt="1">
              {headerBadges && (
                <Box flexShrink="0" width="calc(32px + 12px)">
                  {/* Spacer to align with text column */}
                </Box>
              )}
              <Box flex="1">
                {quickInfo}
              </Box>
            </Flex>
          )}

          {/* Custom children content - Always Visible */}
          {children}

          {/* Expandable Details - Only show when selected */}
          {expandedContent && (
            <Collapse in={isSelected} animateOpacity>
              <Flex 
                mt="4" 
                pt="3" 
                borderTop="1px solid" 
                borderColor="ui.border"
              >
                {headerBadges && (
                  <Box flexShrink="0" width="calc(32px + 12px)">
                    {/* Spacer to align with text column */}
                  </Box>
                )}
                <VStack 
                  align="stretch" 
                  spacing="3"
                  flex="1"
                >
                  {expandedContent}
                </VStack>
              </Flex>
            </Collapse>
          )}
        </>
      )}
    </Box>
  );
};

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: BaseCardProps, nextProps: BaseCardProps): boolean => {
  // Compare primitive props
  if (
    prevProps.title !== nextProps.title ||
    prevProps.isSelected !== nextProps.isSelected ||
    prevProps.isHovered !== nextProps.isHovered ||
    prevProps.cardId !== nextProps.cardId ||
    prevProps.isLoading !== nextProps.isLoading ||
    prevProps.skeletonVariant !== nextProps.skeletonVariant ||
    prevProps.borderColorOverride !== nextProps.borderColorOverride
  ) {
    return false;
  }

  // Compare React nodes (shallow comparison for performance)
  if (prevProps.headerBadges !== nextProps.headerBadges ||
      prevProps.quickInfo !== nextProps.quickInfo ||
      prevProps.expandedContent !== nextProps.expandedContent ||
      prevProps.children !== nextProps.children) {
    return false;
  }

  // Compare headerActions array
  const prevActions = prevProps.headerActions || [];
  const nextActions = nextProps.headerActions || [];
  if (prevActions.length !== nextActions.length) {
    return false;
  }
  for (let i = 0; i < prevActions.length; i++) {
    if (prevActions[i].label !== nextActions[i].label ||
        prevActions[i].icon !== nextActions[i].icon ||
        prevActions[i]['aria-label'] !== nextActions[i]['aria-label']) {
      return false;
    }
    // Note: We don't compare onClick functions as they might be recreated on each render
    // The parent component should use useCallback for onClick handlers if needed
  }

  // Compare BoxProps (only the commonly changing ones)
  if (prevProps.className !== nextProps.className ||
      prevProps.style !== nextProps.style) {
    return false;
  }

  return true;
};

// Memoized BaseCard component
export const BaseCard = React.memo(BaseCardComponent, arePropsEqual);