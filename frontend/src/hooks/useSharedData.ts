import { useState, useEffect } from "react";
import { Show } from "../features/shows/types";
import {
  validateShareToken,
  encodeShareToken,
  INVALID_SHARE_TOKEN_ERROR,
} from "../utils/tokenValidation";

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
        const response = await fetch(
          `/api/shared/${encodeShareToken(shareToken!)}`,
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Share link not found or expired");
          }
          throw new Error("Failed to load shared content");
        }

        const data = await response.json();
        setSharedData((prev) => {
          // Only update state if data actually changed to prevent unnecessary re-renders
          const hasChanged = JSON.stringify(prev) !== JSON.stringify(data);
          return hasChanged ? data : prev;
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load shared content",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedData();
  }, [shareToken, refreshCounter]);

  const refreshData = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  const updateSharedData = (
    updater: (prevData: SharedData | null) => SharedData | null,
  ) => {
    setSharedData(updater);
  };

  return { sharedData, isLoading, error, refreshData, updateSharedData };
};
