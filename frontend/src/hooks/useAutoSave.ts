// frontend/src/hooks/useAutoSave.ts

import { useEffect, useRef, useCallback, useState } from "react";

interface UseAutoSaveParams {
  autoSaveInterval: number; // 0 = off, 10, 60, 120, 300 seconds (10s, 1min, 2min, 5min)
  hasUnsavedChanges: boolean;
  pendingOperations: any[];
  saveChanges: () => Promise<boolean>; // Stub - will be replaced with new save function
  onAutoSaveStart?: () => void;
  onAutoSaveComplete?: (success: boolean) => void;
}

export interface UseAutoSaveReturn {
  isAutoSaving: boolean;
  lastAutoSaveTime: number | null;
  secondsUntilNextSave: number;
  showSaveSuccess: boolean;
  isPaused: boolean;
  togglePause: () => void;
}

export const useAutoSave = ({
  autoSaveInterval,
  hasUnsavedChanges,
  pendingOperations,
  saveChanges,
  onAutoSaveStart,
  onAutoSaveComplete,
}: UseAutoSaveParams) => {
  const countdownRef = useRef<number | null>(null);
  const performAutoSaveRef = useRef<(() => Promise<void>) | undefined>(
    undefined,
  );
  const saveInProgressRef = useRef<boolean>(false);

  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<number | null>(null);
  const [secondsUntilNextSave, setSecondsUntilNextSave] = useState<number>(0);
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
    // Clear countdown when pausing
    if (!isPaused && countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
      setSecondsUntilNextSave(0);
    }
  }, [isPaused]);

  // RENDER LOOP FIX: Optimize dependencies to prevent excessive re-renders
  const performAutoSave = useCallback(async () => {
    
    // Don't auto-save if paused, already saving, or no changes
    if (isPaused || isAutoSaving || !hasUnsavedChanges || pendingOperations.length === 0) {
      
      if (pendingOperations.length === 0) {
        // Clear the timer completely when no changes
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setSecondsUntilNextSave(0);
      }
      return;
    }

    // Additional race condition check - prevent multiple simultaneous saves
    if (saveInProgressRef.current) {
      return;
    }

    saveInProgressRef.current = true;
    setIsAutoSaving(true);
    onAutoSaveStart?.();

    try {
      const success = await saveChanges();

      if (success) {
        setLastAutoSaveTime(Date.now());

        // Show success indicator for 2 seconds
        setShowSaveSuccess(true);
        setTimeout(() => {
          setShowSaveSuccess(false);
        }, 2000);

        // Clear timer after successful save - edit queue is now cleared
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setSecondsUntilNextSave(0);
      }

      onAutoSaveComplete?.(success);
    } catch (error) {
      onAutoSaveComplete?.(false);
    } finally {
      saveInProgressRef.current = false;
      setIsAutoSaving(false);
    }
  }, [
    // RENDER LOOP FIX: Use only length instead of full array to reduce re-renders
    isPaused,
    isAutoSaving,
    hasUnsavedChanges,
    pendingOperations.length, // Changed from full array
    saveChanges,
    onAutoSaveStart,
    onAutoSaveComplete,
  ]);

  // Keep ref up to date
  useEffect(() => {
    performAutoSaveRef.current = performAutoSave;
  }, [performAutoSave]);

  // Set up auto-save interval - OPTIMIZED to prevent render loops
  useEffect(() => {
    // Clear existing intervals
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    // Don't set up auto-save if disabled or paused
    if (autoSaveInterval === 0 || isPaused) {
      setSecondsUntilNextSave(0);
      return;
    }

    // Only start countdown if there are pending operations
    if (pendingOperations.length === 0) {
      setSecondsUntilNextSave(0);
      return;
    }

    // Set up countdown timer (updates every second) - RENDER LOOP FIX
    setSecondsUntilNextSave(autoSaveInterval);
    countdownRef.current = window.setInterval(() => {
      setSecondsUntilNextSave((prev) => {
        // RENDER LOOP FIX: Only update state when value actually changes
        const next = Math.max(0, prev - 1);
        if (next !== prev) {
          if (next <= 0) {
            // Time to auto-save
            performAutoSaveRef.current && performAutoSaveRef.current();
            return 0;
          }
          return next;
        }
        return prev; // Return same value to prevent unnecessary re-render
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [autoSaveInterval, pendingOperations.length, isPaused]);

  // Reset timer when operations are cleared (after any save)
  useEffect(() => {
    if (pendingOperations.length === 0) {
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
    isPaused,
    togglePause,
  };
};
