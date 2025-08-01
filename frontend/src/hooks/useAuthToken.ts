import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useAuthToken = () => {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  const refreshToken = useCallback(async () => {
    try {
      const t = await getToken();
      setToken(t);
    } catch (err) {
      console.error('Failed to retrieve auth token:', err);
      setToken(null);
    }
  }, [getToken]);

  useEffect(() => {
    refreshToken();
  }, [refreshToken]);

  return { token, refreshToken };
};
