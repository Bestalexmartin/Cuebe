// frontend/src/components/shared/SharedShowCard.tsx

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  useColorModeValue
} from '@chakra-ui/react';
import { AppIcon } from '../AppIcon';
import { formatDateFriendly, formatAbsoluteTimeStandard } from '../../utils/timeUtils';

// TypeScript interfaces
interface SharedVenue {
  venue_id: string;
  venue_name: string;
  venue_city?: string;
  venue_state?: string;
}

interface SharedScript {
  script_id: string;
  script_name: string;
  script_status: string;
  start_time: string;
  end_time?: string;
}

interface SharedShow {
  show_id: string;
  show_name: string;
  show_date?: string;
  show_end?: string;
  venue?: SharedVenue;
  scripts: SharedScript[];
}

interface SharedShowCardProps {
  show: SharedShow;
  onClick: () => void;
  useMilitaryTime?: boolean;
}

export const SharedShowCard: React.FC<SharedShowCardProps> = ({
  show,
  onClick,
  useMilitaryTime = false
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBorderColor = useColorModeValue('orange.400', 'orange.300');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');

  const scriptCount = show.scripts?.length || 0;
  const hasActiveScripts = show.scripts?.some(script => script.script_status === 'active') || false;

  return (
    <Box
      bg={bgColor}
      border="2px solid"
      borderColor={borderColor}
      borderRadius="lg"
      p={{ base: 4, md: 6 }}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        borderColor: hoverBorderColor,
        transform: 'translateY(-2px)',
        shadow: 'lg'
      }}
      onClick={onClick}
    >
      <VStack spacing={4} align="stretch">
        {/* Header Row */}
        <HStack justify="space-between" align="flex-start">
          <VStack spacing={1} align="flex-start" flex={1}>
            <Text
              fontSize={{ base: 'lg', md: 'xl' }}
              fontWeight="bold"
              color="blue.500"
              _dark={{ color: 'blue.300' }}
              lineHeight="1.2"
              noOfLines={2}
            >
              {show.show_name}
            </Text>
            
            {show.venue && (
              <HStack spacing={2} align="center">
                <AppIcon name="roadmap" boxSize="14px" color={mutedTextColor} />
                <Text fontSize="sm" color={textColor} noOfLines={1}>
                  {show.venue.venue_name}
                  {show.venue.venue_city && show.venue.venue_state && 
                    ` • ${show.venue.venue_city}, ${show.venue.venue_state}`
                  }
                </Text>
              </HStack>
            )}
          </VStack>

          <AppIcon 
            name="arrow-right" 
            boxSize="20px" 
            color={mutedTextColor}
            transform="translateX(4px)"
          />
        </HStack>

        {/* Show Date & Time */}
        {show.show_date && (
          <HStack spacing={3} align="center">
            <AppIcon name="calendar" boxSize="16px" color="blue.400" />
            <VStack spacing={0} align="flex-start">
              <Text fontSize="sm" fontWeight="medium" color={textColor}>
                {formatDateFriendly(show.show_date)}
              </Text>
              {show.show_end && (
                <Text fontSize="xs" color={mutedTextColor}>
                  {formatAbsoluteTimeStandard(show.show_date, useMilitaryTime)} - {formatAbsoluteTimeStandard(show.show_end, useMilitaryTime)}
                </Text>
              )}
            </VStack>
          </HStack>
        )}

        {/* Scripts Summary */}
        <HStack justify="space-between" align="center">
          <HStack spacing={2} align="center">
            <AppIcon name="script" boxSize="16px" color="green.400" />
            <Text fontSize="sm" color={textColor}>
              {scriptCount} {scriptCount === 1 ? 'script' : 'scripts'}
            </Text>
          </HStack>

          <HStack spacing={2}>
            {hasActiveScripts && (
              <Badge colorScheme="green" variant="solid" size="sm">
                Active
              </Badge>
            )}
            {scriptCount > 0 && (
              <Badge colorScheme="blue" variant="outline" size="sm">
                Shared
              </Badge>
            )}
          </HStack>
        </HStack>

        {/* Mobile-specific: Quick Preview */}
        {show.scripts && show.scripts.length > 0 && (
          <Box
            display={{ base: 'block', md: 'none' }}
            pt={2}
            borderTop="1px solid"
            borderColor={borderColor}
          >
            <Text fontSize="xs" color={mutedTextColor} mb={2}>
              Available Scripts:
            </Text>
            <VStack spacing={1} align="stretch">
              {show.scripts.slice(0, 3).map(script => (
                <HStack key={script.script_id} spacing={2} align="center">
                  <Box
                    w={2}
                    h={2}
                    borderRadius="full"
                    bg={script.script_status === 'active' ? 'green.400' : 'gray.400'}
                    flexShrink={0}
                  />
                  <Text fontSize="xs" color={textColor} noOfLines={1}>
                    {script.script_name}
                  </Text>
                </HStack>
              ))}
              {show.scripts.length > 3 && (
                <Text fontSize="xs" color={mutedTextColor} fontStyle="italic">
                  +{show.scripts.length - 3} more...
                </Text>
              )}
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};