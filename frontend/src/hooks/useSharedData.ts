import { useState, useEffect } from 'react';
import { Show } from '../features/shows/types';
import { validateShareToken, encodeShareToken, INVALID_SHARE_TOKEN_ERROR } from '../utils/tokenValidation';
import { apiCache } from '../utils/apiCache';

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

  useEffect(() => {
    const fetchSharedData = async () => {
      if (!validateShareToken(shareToken)) {
        setError(INVALID_SHARE_TOKEN_ERROR);
        setIsLoading(false);
        return;
      }

      // Check cache first
      const cacheKey = apiCache.getSharedDataKey(shareToken!);
      const cachedData = apiCache.get<SharedData>(cacheKey);
      
      if (cachedData) {
        setSharedData(cachedData);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/shared/${encodeShareToken(shareToken!)}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Share link not found or expired');
          }
          throw new Error('Failed to load shared content');
        }

        const data = await response.json();
        
        // Cache the response
        apiCache.set(cacheKey, data);
        setSharedData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shared content');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedData();
  }, [shareToken]);

  return { sharedData, isLoading, error };
};