// frontend/src/shared/components/GuestDarkModeSwitch.tsx
import React, { useState, useEffect } from 'react';
import { IconButton, useColorMode } from '@chakra-ui/react';
import { AppIcon } from '../../components/AppIcon';
import { encodeShareToken } from '../../utils/tokenValidation';
import { useEnhancedToast } from '../../utils/toastUtils';
import { getApiUrl } from '../../config/api';

export const GuestDarkModeSwitch: React.FC<{ shareToken?: string }> = ({ shareToken }) => {
  const [guestDarkMode, setGuestDarkMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { setColorMode } = useColorMode();
  const { showError } = useEnhancedToast();

  // Load guest preferences on mount
  useEffect(() => {
    const loadGuestPreferences = async () => {
      if (!shareToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(getApiUrl(`/api/shared/${encodeShareToken(shareToken)}/preferences`));
        if (response.ok) {
          const preferences = await response.json();
          const isDark = preferences.dark_mode || false;
          setGuestDarkMode(isDark);
          setColorMode(isDark ? 'dark' : 'light');
        } else {
          setGuestDarkMode(false);
          setColorMode('light');
        }
      } catch (error) {
        setGuestDarkMode(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadGuestPreferences();
  }, [shareToken]);

  const toggleGuestDarkMode = async () => {
    if (!shareToken) return;

    const newDarkMode = !guestDarkMode;
    
    // Optimistic update
    setGuestDarkMode(newDarkMode);
    setColorMode(newDarkMode ? 'dark' : 'light');

    try {
      const response = await fetch(getApiUrl(`/api/shared/${encodeShareToken(shareToken)}/preferences`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dark_mode: newDarkMode })
      });

      if (response.ok) {
        const updatedPreferences = await response.json();
        const serverDarkMode = updatedPreferences.dark_mode;
        setGuestDarkMode(serverDarkMode);
        setColorMode(serverDarkMode ? 'dark' : 'light');
      } else {
        // Revert on error
        setGuestDarkMode(!newDarkMode);
        setColorMode(!newDarkMode ? 'dark' : 'light');
        showError('Failed to save dark mode preference');
      }
    } catch (error) {
      // Revert on error
      setGuestDarkMode(!newDarkMode);
      setColorMode(!newDarkMode ? 'dark' : 'light');
      showError('Failed to save dark mode preference');
    }
  };

  if (isLoading) {
    return (
      <IconButton
        aria-label="Toggle dark mode"
        icon={<AppIcon name="moon" color="blue.400" boxSize="20px" />}
        variant="ghost"
        isRound={true}
        size="md"
        isDisabled={true}
        _focus={{ boxShadow: 'none' }}
        _hover={{ bg: "transparent", color: "initial" }}
      />
    );
  }

  return (
    <IconButton
      aria-label="Toggle dark mode"
      icon={
        <AppIcon 
          name={guestDarkMode ? 'sun' : 'moon'}
          color={guestDarkMode ? 'orange.400' : 'blue.400'}
          boxSize="20px"
        />
      }
      onClick={toggleGuestDarkMode}
      variant="ghost"
      isRound={true}
      size="md"
      _focus={{ boxShadow: 'none' }}
      _hover={{ bg: "transparent", color: "initial" }}
    />
  );
};
