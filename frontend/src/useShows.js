// frontend/src/useShows.js

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

// The "export" keyword makes this a named export
export const useShows = () => {
  const { getToken } = useAuth();
  const [shows, setShows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/me/shows', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
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
    };

    fetchShows();
  }, [getToken]);

  return { shows, isLoading, error };
};