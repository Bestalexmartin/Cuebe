// frontend/src/components/shared/ScriptSyncIcon.tsx

import React, { useState, useEffect } from 'react';
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
  shouldRotate?: boolean; // Triggers rotation animation
}

export const ScriptSyncIcon: React.FC<ScriptSyncIconProps> = ({
  isConnected,
  isConnecting,
  connectionError,
  onClick,
  shouldRotate = false
}) => {
  const [displayedIcon, setDisplayedIcon] = useState<React.ReactNode>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [internalRotate, setInternalRotate] = useState(false);
  const [hasShownWelcomeRotation, setHasShownWelcomeRotation] = useState(false);
  

  const getCurrentIcon = () => {
    if (connectionError) return <ThickRingIcon size="22px" />;
    if (isConnecting) return <DualSpinningRingIcon size="22px" />;
    if (isConnected) {
      const finalShouldRotate = shouldRotate || internalRotate;
      return <ConnectedIcon size="22px" shouldRotate={finalShouldRotate} />;
    }
    return <ThickRingIcon size="22px" />;
  };

  useEffect(() => {
    const newIcon = getCurrentIcon();
    
    if (displayedIcon === null) {
      // First render - no transition needed
      setDisplayedIcon(newIcon);
    } else if (isConnecting && !isConnected) {
      // Transition to connecting state
      setIsTransitioning(true);
      
      setTimeout(() => {
        setDisplayedIcon(newIcon);
        setIsTransitioning(false);
      }, 200); // 0.2 second transition to connecting state
    } else if (isConnected || connectionError || (!isConnecting && !isConnected)) {
      // Transition from connecting to other states
      setIsTransitioning(true);
      
      setTimeout(() => {
        setDisplayedIcon(newIcon);
        setIsTransitioning(false);
        
        // Trigger welcome rotation when connected icon is displayed
        if (isConnected && !hasShownWelcomeRotation) {
          setInternalRotate(true);
          setHasShownWelcomeRotation(true);
          setTimeout(() => setInternalRotate(false), 700);
        }
      }, 1000); // 1 second delay to show connecting state longer
    }
  }, [isConnected, isConnecting, connectionError]); // Remove shouldRotate from deps
  
  // Handle rotation updates separately without triggering transitions
  useEffect(() => {
    if (isConnected && displayedIcon !== null) {
      setDisplayedIcon(getCurrentIcon());
    }
  }, [shouldRotate, internalRotate]); // Update for both external and internal rotation changes

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
            transition: 'opacity 0.2s ease-in-out',
            opacity: isTransitioning ? 0.3 : 1
          }}
        >
          {displayedIcon}
        </Box>
      }
    />
  );
};