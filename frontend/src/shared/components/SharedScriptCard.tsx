// frontend/src/shared/components/SharedScriptCard.tsx

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  useColorModeValue
} from '@chakra-ui/react';
import { AppIcon } from '../../components/AppIcon';
import { formatAbsoluteTimeStandard, formatDateTimeLocal } from '../../utils/timeUtils';

// TypeScript interfaces
interface SharedScript {
  script_id: string;
  script_name: string;
  script_status: string;
  start_time: string;
  end_time?: string;
  date_created: string;
  date_updated: string;
  last_used?: string;
}

interface SharedScriptCardProps {
  script: SharedScript;
  showName: string;
  onClick: () => void;
}

export const SharedScriptCard: React.FC<SharedScriptCardProps> = ({
  script,
  showName,
  onClick
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBorderColor = useColorModeValue('orange.400', 'orange.300');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'green';
      case 'draft':
        return 'blue';
      case 'archived':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'play';
      case 'draft':
        return 'edit';
      case 'archived':
        return 'archive';
      default:
        return 'script';
    }
  };

  // Calculate script duration if we have both start and end times
  const getDuration = (): string | null => {
    if (!script.start_time || !script.end_time) return null;
    
    try {
      const start = new Date(script.start_time);
      const end = new Date(script.end_time);
      const durationMs = end.getTime() - start.getTime();
      const minutes = Math.floor(durationMs / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${remainingMinutes}m`;
      }
      return `${minutes}m`;
    } catch {
      return null;
    }
  };

  const duration = getDuration();

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
        transform: 'translateY(-1px)',
        shadow: 'md'
      }}
      onClick={onClick}
    >
      <VStack spacing={4} align="stretch">
        {/* Header Row */}
        <HStack justify="space-between" align="flex-start">
          <HStack spacing={3} align="center" flex={1}>
            <Box
              p={2}
              borderRadius="md"
              bg={`${getStatusColor(script.script_status)}.50`}
              _dark={{ bg: `${getStatusColor(script.script_status)}.900` }}
            >
              <AppIcon 
                name={getStatusIcon(script.script_status)} 
                boxSize="20px" 
                color={`${getStatusColor(script.script_status)}.500`}
                _dark={{ color: `${getStatusColor(script.script_status)}.300` }}
              />
            </Box>
            
            <VStack spacing={1} align="flex-start" flex={1}>
              <Text
                fontSize={{ base: 'md', md: 'lg' }}
                fontWeight="bold"
                color="blue.500"
                _dark={{ color: 'blue.300' }}
                lineHeight="1.2"
                noOfLines={2}
              >
                {script.script_name}
              </Text>
              
              <Badge
                colorScheme={getStatusColor(script.script_status)}
                variant={script.script_status === 'active' ? 'solid' : 'outline'}
                size="sm"
                textTransform="capitalize"
              >
                {script.script_status}
              </Badge>
            </VStack>
          </HStack>

          <AppIcon 
            name="arrow-right" 
            boxSize="20px" 
            color={mutedTextColor}
            transform="translateX(4px)"
          />
        </HStack>

        {/* Script Details */}
        <VStack spacing={3} align="stretch">
          {/* Timing Information */}
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
            <HStack spacing={2} align="center">
              <AppIcon name="time" boxSize="14px" color="blue.400" />
              <Text fontSize="sm" color={textColor}>
                Start: {formatAbsoluteTimeStandard(script.start_time)}
              </Text>
            </HStack>
            
            {script.end_time && (
              <Text fontSize="sm" color={textColor}>
                End: {formatAbsoluteTimeStandard(script.end_time)}
              </Text>
            )}
            
            {duration && (
              <Badge colorScheme="purple" variant="outline" size="sm">
                {duration}
              </Badge>
            )}
          </HStack>

          {/* Last Used & Updated Info */}
          <VStack spacing={1} align="stretch">
            {script.last_used && (
              <HStack spacing={2} align="center">
                <AppIcon name="history" boxSize="14px" color={mutedTextColor} />
                <Text fontSize="xs" color={mutedTextColor}>
                  Last used: {formatDateTimeLocal(script.last_used)}
                </Text>
              </HStack>
            )}
            
            <HStack spacing={2} align="center">
              <AppIcon name="edit" boxSize="14px" color={mutedTextColor} />
              <Text fontSize="xs" color={mutedTextColor}>
                Updated: {formatDateTimeLocal(script.date_updated)}
              </Text>
            </HStack>
          </VStack>

          {/* Mobile-specific: Show Name Reminder */}
          <Box
            display={{ base: 'block', md: 'none' }}
            pt={2}
            borderTop="1px solid"
            borderColor={borderColor}
          >
            <HStack spacing={2} align="center">
              <AppIcon name="show" boxSize="12px" color={mutedTextColor} />
              <Text fontSize="xs" color={mutedTextColor}>
                From: {showName}
              </Text>
            </HStack>
          </Box>
        </VStack>
      </VStack>
    </Box>
  );
};