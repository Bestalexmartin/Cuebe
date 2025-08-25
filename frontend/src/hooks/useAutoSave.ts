// frontend/src/hooks/useAutoSave.ts

import { useEffect, useRef, useCallback, useState } from "react";

interface UseAutoSaveParams {
  autoSaveInterval: number; // 0 = off, 15, 30, 60 seconds
  hasUnsavedChanges: boolean;
  pendingOperations: any[];
  saveChanges: () => Promise<boolean>;
  onAutoSaveStart?: () => void;
  onAutoSaveComplete?: (success: boolean) => void;
}

export interface UseAutoSaveReturn {
  isAutoSaving: boolean;
  lastAutoSaveTime: number | null;
  secondsUntilNextSave: number;
  showSaveSuccess: boolean;
}

export const useAutoSave = ({
  autoSaveInterval,
  hasUnsavedChanges,
  pendingOperations,
  saveChanges,
  onAutoSaveStart,
  onAutoSaveComplete,
}: UseAutoSaveParams) => {
  const lastAutoSaveOperationCountRef = useRef<number>(0);
  const countdownRef = useRef<number | null>(null);
  const performAutoSaveRef = useRef<(() => Promise<void>) | undefined>(
    undefined,
  );

  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<number | null>(null);
  const [secondsUntilNextSave, setSecondsUntilNextSave] = useState<number>(0);
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);

  const performAutoSave = useCallback(async () => {
    // Check if there are new operations since last auto-save
    const currentOperationCount = pendingOperations.length;

    // Don't auto-save if already saving, no changes, or no new operations
    if (
      isAutoSaving ||
      !hasUnsavedChanges ||
      currentOperationCount === 0 ||
      currentOperationCount === lastAutoSaveOperationCountRef.current
    ) {
      if (
        currentOperationCount === 0 ||
        currentOperationCount === lastAutoSaveOperationCountRef.current
      ) {
        // Clear the timer completely when no new changes
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setSecondsUntilNextSave(0);
      }
      return;
    }

    setIsAutoSaving(true);
    onAutoSaveStart?.();

    try {
      const success = await saveChanges();

      if (success) {
        // Update tracking but don't clear the edit queue
        lastAutoSaveOperationCountRef.current = currentOperationCount;
        setLastAutoSaveTime(Date.now());

        // Show success indicator for 2 seconds
        setShowSaveSuccess(true);
        setTimeout(() => {
          setShowSaveSuccess(false);
        }, 2000);

        // Clear timer after successful save - no more operations to save immediately
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setSecondsUntilNextSave(0);
      }

      onAutoSaveComplete?.(success);
    } catch (error) {
      console.error("🔄 Auto-save: Error", error);
      onAutoSaveComplete?.(false);
    } finally {
      setIsAutoSaving(false);
    }
  }, [
    isAutoSaving,
    hasUnsavedChanges,
    pendingOperations,
    saveChanges,
    onAutoSaveStart,
    onAutoSaveComplete,
  ]);

  // Keep ref up to date
  useEffect(() => {
    performAutoSaveRef.current = performAutoSave;
  }, [performAutoSave]);

  // Set up auto-save interval
  useEffect(() => {
    // Clear existing intervals
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    // Don't set up auto-save if disabled
    if (autoSaveInterval === 0) {
      setSecondsUntilNextSave(0);
      return;
    }

    // Only start countdown if there are pending operations AND we haven't saved them yet
    const currentOperationCount = pendingOperations.length;
    if (
      currentOperationCount === 0 ||
      currentOperationCount === lastAutoSaveOperationCountRef.current
    ) {
      setSecondsUntilNextSave(0);
      return;
    }

    // Set up countdown timer (updates every second)
    setSecondsUntilNextSave(autoSaveInterval);
    countdownRef.current = window.setInterval(() => {
      setSecondsUntilNextSave((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          // Time to auto-save
          performAutoSaveRef.current && performAutoSaveRef.current();
          // Don't reset countdown here - let the performAutoSave function handle timer state
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [autoSaveInterval, pendingOperations.length]);

  // Reset operation count tracking when pendingOperations changes significantly
  useEffect(() => {
    // If operations were cleared (likely due to manual save), reset tracking and stop timer
    if (
      pendingOperations.length === 0 &&
      lastAutoSaveOperationCountRef.current > 0
    ) {
      lastAutoSaveOperationCountRef.current = 0;

      // Clear the timer when no operations remain
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setSecondsUntilNextSave(0);
    }
  }, [pendingOperations.length]);

  return {
    isAutoSaving,
    lastAutoSaveTime,
    secondsUntilNextSave,
    showSaveSuccess,
  };
};
