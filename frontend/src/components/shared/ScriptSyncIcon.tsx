// frontend/src/components/shared/ScriptSyncIcon.tsx

import React, { useState, forwardRef, useImperativeHandle } from 'react';
import {
  IconButton,
  Box,
  Icon
} from '@chakra-ui/react';
import { IoSyncCircleSharp } from "react-icons/io5";

// CSS keyframes for all animations
const animationStyles = {
  '@keyframes dual-ring-spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' }
  },
  '@keyframes single-rotation': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' }
  }
};

interface ScriptSyncIconState {
  connectionState: 'disconnected' | 'connecting' | 'connected';
  rotationTrigger: number;
}

// Single unified icon component that handles all states
const UnifiedSyncIcon: React.FC<{ 
  state: ScriptSyncIconState; 
  size: string; 
}> = ({ state, size }) => {
  const { connectionState, rotationTrigger } = state;
  
  if (connectionState === 'disconnected') {
    // Grey ring
    return (
      <Box
        width={size}
        height={size}
        borderRadius="50%"
        border="3px solid"
        borderColor="gray.600"
        background="transparent"
      />
    );
  }
  
  if (connectionState === 'connecting') {
    // Dual spinning rings animation
    return (
      <Box
        width={size}
        height={size}
        position="relative"
        display="flex"
        alignItems="center"
        justifyContent="center"
        sx={animationStyles}
      >
        {/* Outer grey ring */}
        <Box
          width={size}
          height={size}
          borderRadius="50%"
          border="3px solid transparent"
          borderTopColor="gray.600"
          borderRightColor="gray.600"
          borderBottomColor="gray.600"
          background="transparent"
          position="absolute"
          sx={{
            animation: 'dual-ring-spin 1s linear infinite reverse'
          }}
        />
        {/* Inner green ring */}
        <Box
          width={`${parseInt(size) * 0.65}px`}
          height={`${parseInt(size) * 0.65}px`}
          borderRadius="50%"
          border="3px solid transparent"
          borderTopColor="green.400"
          borderRightColor="green.400"
          background="transparent"
          position="absolute"
          sx={{
            animation: 'dual-ring-spin 1.2s linear infinite'
          }}
        />
      </Box>
    );
  }
  
  // Connected - green icon with rotation on trigger
  return (
    <Box
      width={size}
      height={size}
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{
        ...animationStyles,
        animation: rotationTrigger > 0 ? 'single-rotation 0.6s ease-in-out' : 'none'
      }}
      key={rotationTrigger} // Force re-render to restart animation
    >
      <Icon
        as={IoSyncCircleSharp}
        boxSize="28px"
        color="green.400"
      />
    </Box>
  );
};

interface ScriptSyncIconProps {
  isConnected: boolean;
  isConnecting: boolean;
  connectionCount: number;
  connectionError?: string | null;
  onClick?: () => void;
}

export interface ScriptSyncIconRef {
  triggerRotation: () => void;
}

export const ScriptSyncIcon = forwardRef<ScriptSyncIconRef, ScriptSyncIconProps>(({
  isConnected,
  isConnecting,
  onClick
}, ref) => {
  const [rotationTrigger, setRotationTrigger] = useState(0);
  const [animationState, setAnimationState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  
  // Start full animation sequence when connection completes
  React.useEffect(() => {
    if (isConnected && !isPlayingSequence && animationState !== 'connected') {
      setIsPlayingSequence(true);
      setAnimationState('connecting');
      
      // Play connecting animation for 1.5 seconds, then transition to connected
      setTimeout(() => {
        setAnimationState('connected');
        setRotationTrigger(prev => prev + 1); // Initial welcome rotation
        setIsPlayingSequence(false);
      }, 1500);
    } else if (!isConnected && !isConnecting) {
      // Immediate disconnect
      setAnimationState('disconnected');
      setIsPlayingSequence(false);
    }
  }, [isConnected, isConnecting, animationState, isPlayingSequence]);
  
  const iconState: ScriptSyncIconState = {
    connectionState: animationState,
    rotationTrigger
  };
  
  // Expose rotation function to parent via ref
  useImperativeHandle(ref, () => ({
    triggerRotation: () => {
      if (animationState === 'connected') {
        setRotationTrigger(prev => prev + 1);
      }
    }
  }), [animationState]);

  return (
    <IconButton
      size="sm"
      variant="ghost"
      onClick={onClick}
      aria-label="Script sync status"
      _hover={{
        bg: 'whiteAlpha.200'
      }}
      icon={<UnifiedSyncIcon state={iconState} size="22px" />}
    />
  );
});
