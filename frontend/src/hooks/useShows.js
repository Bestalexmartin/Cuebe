// frontend/src/useShows.js

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useShows = () => {
  const { getToken } = useAuth();
  const [shows, setShows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // We wrap fetchShows in useCallback so it doesn't get recreated on every render
  const fetchShows = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      const response = await fetch('/api/me/shows', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Something went wrong fetching your shows.');
      }
      const data = await response.json();
      setShows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  // Return the fetch function so other components can call it
  return { shows, isLoading, error, refetchShows: fetchShows };
};