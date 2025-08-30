// frontend/src/components/shared/ScriptSyncIcon.tsx

import React, { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  IconButton,
  Box,
  Icon
} from '@chakra-ui/react';
import { IoSyncCircleSharp } from "react-icons/io5";

// Connected Icon Component
const ConnectedIcon: React.FC<{ size: string; shouldRotate?: boolean }> = ({ size, shouldRotate = false }) => {
  const [animationKey, setAnimationKey] = React.useState(0);

  React.useEffect(() => {
    console.log('🎯 ConnectedIcon shouldRotate changed:', shouldRotate);
    if (shouldRotate) {
      setAnimationKey(prev => prev + 1);
    }
  }, [shouldRotate]);

  return (
    <Box
      width={size}
      height={size}
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{
        '@keyframes heartbeat-rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        animation: shouldRotate ? 'heartbeat-rotate 0.6s ease-in-out' : 'none',
      }}
      key={animationKey} // Force re-render to restart animation
    >
      <Icon
        as={IoSyncCircleSharp}
        boxSize="28px" // Perfect size for visibility
        color="green.400" // Match the connecting ring color
      />
    </Box>
  );
};

// Thicker Ring Icon Component
const ThickRingIcon: React.FC<{ size: string }> = ({ size }) => (
  <Box
    width={size}
    height={size}
    borderRadius="50%"
    border="3px solid"
    borderColor="gray.600"
    background="transparent"
  />
);

// Dual Spinning Rings Icon Component (for connecting state)
const DualSpinningRingIcon: React.FC<{ size: string }> = ({ size }) => (
    <Box
    width={size}
    height={size}
    position="relative"
    display="flex"
    alignItems="center"
    justifyContent="center"
  >
    {/* Outer ring - grey, 70% complete with 30% gap */}
    <Box
      width={size}
      height={size}
      borderRadius="50%"
      border="3px solid transparent"
      borderTopColor="gray.600"
      borderRightColor="gray.600"
      borderBottomColor="gray.600"
      borderLeftColor="transparent"
      background="transparent"
      position="absolute"
      sx={{
        '@keyframes spin-clockwise': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg)' }
        },
        animation: 'spin-clockwise 0.84s linear infinite'
      }}
    />
    {/* Inner ring - green, 30% complete arc */}
    <Box
      width={`${parseInt(size) * 0.65}px`}
      height={`${parseInt(size) * 0.65}px`}
      borderRadius="50%"
      border="3px solid transparent"
      borderTopColor="green.400"
      borderRightColor="green.400"
      borderBottomColor="transparent"
      borderLeftColor="transparent"
      background="transparent"
      position="absolute"
      sx={{
        '@keyframes spin-counter': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        animation: 'spin-counter 1.19s linear infinite'
      }}
    />
  </Box>
);

interface ScriptSyncIconProps {
  isConnected: boolean;
  isConnecting: boolean;
  connectionCount: number;
  connectionError?: string | null;
  userType: 'stage_manager' | 'crew_member';
  onClick?: () => void;
}

export interface ScriptSyncIconRef {
  triggerRotation: () => void;
}

export const ScriptSyncIcon = forwardRef<ScriptSyncIconRef, ScriptSyncIconProps>(({
  isConnected,
  isConnecting,
  connectionError,
  onClick
}, ref) => {
  const [displayedIcon, setDisplayedIcon] = useState<React.ReactNode>(null);
  const [shouldRotate, setShouldRotate] = useState(false);
  const [hasShownWelcomeRotation, setHasShownWelcomeRotation] = useState(false);
  const [isConnectedWithFade, setIsConnectedWithFade] = useState(false);
  const [animationStage, setAnimationStage] = useState<'initial' | 'connecting' | 'connected'>('initial');

  // Internal rotation trigger function
  const handleRotation = useCallback(() => {
    console.log('🔄 handleRotation called, animationStage:', animationStage, 'isConnected:', isConnected);
    setShouldRotate(true);
    setTimeout(() => setShouldRotate(false), 700);
  }, [animationStage, isConnected]);

  // Expose rotation function to parent via ref
  useImperativeHandle(ref, () => ({
    triggerRotation: handleRotation
  }), [handleRotation]);


  const getCurrentIcon = useMemo(() => {
    if (connectionError) return <ThickRingIcon size="22px" />;
    if (animationStage === 'connecting') return <DualSpinningRingIcon size="22px" />;
    if (animationStage === 'connected') {
      return <ConnectedIcon size="22px" shouldRotate={shouldRotate} />;
    }
    return <ThickRingIcon size="22px" />;
  }, [connectionError, animationStage, shouldRotate]);

  // Staged animation sequence - always plays full duration regardless of actual connection speed
  useEffect(() => {
    if (displayedIcon === null) {
      // First render - show initial state
      setDisplayedIcon(getCurrentIcon);
    } else if ((isConnecting || isConnected) && animationStage === 'initial') {
      // Start connecting animation sequence
      setAnimationStage('connecting');
      setTimeout(() => {
        setDisplayedIcon(<DualSpinningRingIcon size="22px" />);
      }, 200);
      
      // Always wait for full connecting animation before showing connected state
      setTimeout(() => {
        setAnimationStage('connected');
        setIsConnectedWithFade(true);
        setDisplayedIcon(getCurrentIcon);
        
        // Mark welcome rotation as shown
        if (!hasShownWelcomeRotation) {
          setHasShownWelcomeRotation(true);
        }
        
        // Stop initial rotation after animation completes, keep fade state
        setTimeout(() => {
          setShouldRotate(false);
        }, 700);
      }, 1400); // 200ms + 1200ms for full connecting sequence
    } else if (connectionError || (!isConnecting && !isConnected && animationStage !== 'initial')) {
      // Error or disconnection - immediate change
      setAnimationStage('initial');
      setDisplayedIcon(getCurrentIcon);
      setHasShownWelcomeRotation(false);
    }
  }, [isConnected, isConnecting, connectionError, animationStage, hasShownWelcomeRotation]);

  // Update displayed icon when shouldRotate changes (for ping/pong rotations)
  useEffect(() => {
    if (animationStage === 'connected') {
      setDisplayedIcon(getCurrentIcon);
    }
  }, [shouldRotate, getCurrentIcon, animationStage]); // Add handleRotation for welcome rotation

  // Reset welcome rotation state when component unmounts or disconnects
  useEffect(() => {
    if (!isConnected) {
      setHasShownWelcomeRotation(false);
    }
  }, [isConnected]);

  // Welcome rotation is now handled in the main transition logic above

  return (
    <IconButton
      size="sm"
      variant="ghost"
      onClick={onClick}
      aria-label="Script sync status"
      _hover={{
        bg: 'whiteAlpha.200'
      }}
      icon={
        <Box
          sx={{
            transition: isConnectedWithFade ? 'opacity 0.3s ease-in-out' : 'none',
            opacity: isConnectedWithFade && animationStage === 'connected' ? 1 : (animationStage === 'connected' ? 0.3 : 1)
          }}
        >
          {displayedIcon}
        </Box>
      }
    />
  );
});