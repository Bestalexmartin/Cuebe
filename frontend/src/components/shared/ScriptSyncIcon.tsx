// frontend/src/components/shared/ScriptSyncIcon.tsx

import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Box,
  Icon
} from '@chakra-ui/react';
import { AppIcon } from '../AppIcon';
import { AiOutlineLoading3Quarters, AiOutlineLoading } from "react-icons/ai";

// Animated Connected Icon Component
const AnimatedConnectedIcon: React.FC<{ size: string }> = ({ size }) => (
  <Box
    width={size}
    height={size}
    borderRadius="50%"
    background="radial-gradient(circle, #9AE6B4, #22543D)"
    sx={{
      '@keyframes brightness-pulse': {
        '0%': { filter: 'brightness(0.8)' },
        '16.66%': { filter: 'brightness(0.9)' },
        '33.33%': { filter: 'brightness(1.0)' },
        '50%': { filter: 'brightness(1.1)' },
        '66.66%': { filter: 'brightness(1.0)' },
        '83.33%': { filter: 'brightness(0.9)' },
        '100%': { filter: 'brightness(0.8)' }
      },
      animation: 'brightness-pulse 4s ease-in-out infinite'
    }}
  />
);

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

export const ScriptSyncIcon: React.FC<ScriptSyncIconProps> = ({
  isConnected,
  isConnecting,
  connectionCount,
  connectionError,
  userType,
  onClick
}) => {
  const [displayedIcon, setDisplayedIcon] = useState<React.ReactNode>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const getCurrentIcon = () => {
    if (connectionError) return <ThickRingIcon size="22px" />;
    if (isConnecting) return <DualSpinningRingIcon size="22px" />;
    if (isConnected) return <AnimatedConnectedIcon size="22px" />;
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
      }, 1000); // 1 second delay to show connecting state longer
    }
  }, [isConnected, isConnecting, connectionError]);

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