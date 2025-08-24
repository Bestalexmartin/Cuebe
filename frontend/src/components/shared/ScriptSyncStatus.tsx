// frontend/src/components/shared/ScriptSyncStatus.tsx

import React from 'react';
import {
  HStack,
  Text,
  Badge,
  Tooltip,
  Box
} from '@chakra-ui/react';
import { AppIcon } from '../AppIcon';

interface ScriptSyncStatusProps {
  isConnected: boolean;
  connectionCount: number;
  connectionError?: string | null;
  userType: 'stage_manager' | 'crew_member';
  size?: 'sm' | 'md';
}

export const ScriptSyncStatus: React.FC<ScriptSyncStatusProps> = ({
  isConnected,
  connectionCount,
  connectionError,
  userType,
  size = 'md'
}) => {
  const getStatusColor = () => {
    if (connectionError) return 'red.400';
    if (isConnected) return 'green.400';
    return 'gray.400';
  };

  const getStatusText = () => {
    if (connectionError) return 'Sync Error';
    if (isConnected) {
      return userType === 'stage_manager' 
        ? `${connectionCount} Connected` 
        : 'Live Sync';
    }
    return 'Connecting...';
  };

  const getTooltipText = () => {
    if (connectionError) {
      return `Sync error: ${connectionError}. Changes may not be visible to others.`;
    }
    if (isConnected) {
      if (userType === 'stage_manager') {
        return connectionCount === 0 
          ? 'No crew members connected to this script'
          : `${connectionCount} crew member${connectionCount !== 1 ? 's' : ''} viewing this script in real-time`;
      } else {
        return 'Connected to stage manager - you\'ll see live updates as they make changes';
      }
    }
    return 'Attempting to establish real-time sync connection...';
  };

  const iconSize = size === 'sm' ? '12px' : '14px';
  const textSize = size === 'sm' ? 'xs' : 'sm';

  return (
    <Tooltip label={getTooltipText()} hasArrow placement="bottom">
      <HStack spacing={2} cursor="help">
        <Box color={getStatusColor()}>
          <AppIcon 
            name={isConnected ? 'external-link' : 'warning'} 
            boxSize={iconSize}
          />
        </Box>
        
        <Text
          fontSize={textSize}
          color={getStatusColor()}
          fontWeight="medium"
          userSelect="none"
        >
          {getStatusText()}
        </Text>
        
        {isConnected && userType === 'stage_manager' && connectionCount > 0 && (
          <Badge
            colorScheme="green"
            size="sm"
            borderRadius="full"
            px={2}
            py={0.5}
            fontSize="xs"
          >
            {connectionCount}
          </Badge>
        )}
      </HStack>
    </Tooltip>
  );
};