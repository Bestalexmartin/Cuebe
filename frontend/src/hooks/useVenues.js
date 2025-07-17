// frontend/src/useVenues.js

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useVenues = () => {
  const { getToken } = useAuth();
  const [venues, setVenues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVenues = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/venues/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch venues.');
      const data = await response.json();
      setVenues(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  return { venues, isLoading, refetchVenues: fetchVenues };
};