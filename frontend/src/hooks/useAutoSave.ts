// frontend/src/hooks/useAutoSave.ts

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoSaveParams {
    autoSaveInterval: number; // 0 = off, 15, 30, 60 seconds
    hasUnsavedChanges: boolean;
    pendingOperations: any[];
    saveChanges: () => Promise<boolean>;
    onAutoSaveStart?: () => void;
    onAutoSaveComplete?: (success: boolean) => void;
}

interface UseAutoSaveReturn {
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
    onAutoSaveComplete
}: UseAutoSaveParams) => {
    const lastAutoSaveOperationCountRef = useRef<number>(0);
    const countdownRef = useRef<number | null>(null);
    const performAutoSaveRef = useRef<() => Promise<void>>();
    
    const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
    const [lastAutoSaveTime, setLastAutoSaveTime] = useState<number | null>(null);
    const [secondsUntilNextSave, setSecondsUntilNextSave] = useState<number>(0);
    const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);

    const performAutoSave = useCallback(async () => {
        // Don't auto-save if already saving or no changes
        if (isAutoSaving || !hasUnsavedChanges || pendingOperations.length === 0) {
            // Reset timer when no changes to save
            setSecondsUntilNextSave(autoSaveInterval);
            return;
        }

        // Check if there are new operations since last auto-save
        const currentOperationCount = pendingOperations.length;
        if (currentOperationCount === lastAutoSaveOperationCountRef.current) {
            console.log('🔄 Auto-save: No new changes since last save, skipping');
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
            }

            onAutoSaveComplete?.(success);
        } catch (error) {
            onAutoSaveComplete?.(false);
        } finally {
            setIsAutoSaving(false);
        }
    }, [isAutoSaving, hasUnsavedChanges, pendingOperations, saveChanges, onAutoSaveStart, onAutoSaveComplete]);

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


        // Set up countdown timer (updates every second)
        setSecondsUntilNextSave(autoSaveInterval);
        countdownRef.current = window.setInterval(() => {
            setSecondsUntilNextSave(prev => {
                const next = prev - 1;
                if (next <= 0) {
                    // Time to auto-save
                    performAutoSaveRef.current?.();
                    return autoSaveInterval; // Reset countdown
                }
                return next;
            });
        }, 1000);

        // No separate main interval needed - countdown timer handles saves

        return () => {
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, [autoSaveInterval]);

    // Reset operation count tracking when pendingOperations changes significantly
    useEffect(() => {
        // If operations were cleared (likely due to manual save), reset tracking
        if (pendingOperations.length === 0 && lastAutoSaveOperationCountRef.current > 0) {
            lastAutoSaveOperationCountRef.current = 0;
        }
    }, [pendingOperations.length]);

    return {
        isAutoSaving,
        lastAutoSaveTime,
        secondsUntilNextSave,
        showSaveSuccess
    };
};