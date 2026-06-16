import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../../config/api';
import { useEnhancedToast } from '../../utils/toastUtils';

export const useGuestSharedPreferences = (
  shareToken: string | undefined,
  showPreferences: boolean,
) => {
  const [guestLookaheadSeconds, setGuestLookaheadSeconds] = useState(30);
  const [guestUseMilitaryTime, setGuestUseMilitaryTime] = useState(false);
  const savedLookaheadRef = useRef<number | null>(null);
  const savedMilitaryRef = useRef<boolean | null>(null);
  const previousShowPreferencesRef = useRef(showPreferences);
  const { showSuccess, showError } = useEnhancedToast();

  const saveGuestPreferences = useCallback(async (lookaheadSeconds: number, useMilitaryTime: boolean) => {
    if (!shareToken) return;

    const response = await fetch(getApiUrl(`/api/shared/${encodeURIComponent(shareToken)}/preferences`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lookahead_seconds: lookaheadSeconds,
        use_military_time: useMilitaryTime,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save preferences');
    }

    const updatedPreferences = await response.json();
    const lookahead = updatedPreferences.lookahead_seconds ?? 30;
    const militaryTime = updatedPreferences.use_military_time ?? false;

    setGuestLookaheadSeconds(lookahead);
    setGuestUseMilitaryTime(militaryTime);
    savedLookaheadRef.current = lookahead;
    savedMilitaryRef.current = militaryTime;
    showSuccess('Preferences Updated', 'Your preferences have been saved successfully.');
  }, [shareToken, showSuccess]);

  useEffect(() => {
    const loadGuestPreferences = async () => {
      if (!shareToken) return;

      try {
        const response = await fetch(getApiUrl(`/api/shared/${encodeURIComponent(shareToken)}/preferences`));
        if (!response.ok) {
          return;
        }

        const preferences = await response.json();
        const lookahead = preferences.lookahead_seconds ?? 30;
        const militaryTime = preferences.use_military_time ?? false;

        setGuestLookaheadSeconds(lookahead);
        setGuestUseMilitaryTime(militaryTime);
        savedLookaheadRef.current = lookahead;
        savedMilitaryRef.current = militaryTime;
      } catch (error) {
        console.error('Failed to load guest preferences:', error);
      }
    };

    loadGuestPreferences();
  }, [shareToken]);

  useEffect(() => {
    if (previousShowPreferencesRef.current && !showPreferences) {
      const changed =
        savedLookaheadRef.current !== guestLookaheadSeconds ||
        savedMilitaryRef.current !== guestUseMilitaryTime;

      if (changed) {
        saveGuestPreferences(guestLookaheadSeconds, guestUseMilitaryTime).catch(() => {
          showError('Failed to save preferences');
        });
      }
    }

    previousShowPreferencesRef.current = showPreferences;
  }, [
    guestLookaheadSeconds,
    guestUseMilitaryTime,
    saveGuestPreferences,
    showError,
    showPreferences,
  ]);

  return {
    guestLookaheadSeconds,
    guestUseMilitaryTime,
    setGuestLookaheadSeconds,
    setGuestUseMilitaryTime,
  };
};
