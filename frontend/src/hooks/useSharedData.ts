import { useState, useEffect } from 'react';
import { Show } from '../features/shows/types';
import { validateShareToken, encodeShareToken, INVALID_SHARE_TOKEN_ERROR } from '../utils/tokenValidation';

interface SharedData {
  shows?: Show[];
  user_name?: string;
  user_profile_image?: string;
  share_expires?: string;
}

export const useSharedData = (shareToken: string | undefined) => {
  const [sharedData, setSharedData] = useState<SharedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    const fetchSharedData = async () => {
      if (!validateShareToken(shareToken)) {
        setError(INVALID_SHARE_TOKEN_ERROR);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/shared/${encodeShareToken(shareToken!)}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Share link not found or expired');
          }
          throw new Error('Failed to load shared content');
        }

        const data = await response.json();
        console.log('🔄 useSharedData: Fresh data loaded:', {
          showCount: data.shows?.length,
          scriptCount: data.shows?.reduce((acc: number, show: any) => acc + (show.scripts?.length || 0), 0),
          userData: data.user_name
        });
        setSharedData(prev => {
          console.log('🔄 useSharedData: State update - prev !== new:', prev !== data);
          return data;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shared content');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedData();
  }, [shareToken, refreshCounter]);

  const refreshData = () => {
    console.log('🔄 useSharedData: Refreshing data...');
    setRefreshCounter(prev => prev + 1);
  };

  return { sharedData, isLoading, error, refreshData };
};