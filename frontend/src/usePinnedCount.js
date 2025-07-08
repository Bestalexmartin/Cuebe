// frontend/src/usePinnedCount.js

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const usePinnedCount = () => {
  const { getToken } = useAuth();
  const [pinnedCount, setPinnedCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const token = await getToken();
      if (!token) return;

      try {
        const response = await fetch('/api/me/pinned-scripts/count', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch pinned count.');
        const data = await response.json();
        setPinnedCount(data.pinnedCount);
      } catch (error) {
        console.error(error);
      }
    };
    fetchCount();
  }, [getToken]);

  return { pinnedCount };
};