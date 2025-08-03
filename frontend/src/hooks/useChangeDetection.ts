// frontend/src/hooks/useChangeDetection.ts

import { useState, useEffect, useMemo } from 'react';

/**
 * Custom hook for detecting changes in form data to enable/disable save buttons
 * 
 * @template T - The type of the original data object
 * @param initialData - The initial/original data to compare against
 * @param currentData - The current form data
 * @param isActive - Whether change detection should be active (e.g., when in edit mode)
 * @returns Object with hasChanges boolean and functions to manage original data
 */
export function useChangeDetection<T extends Record<string, any>>(
    initialData: T | null,
    currentData: Partial<T>,
    is_active: boolean = true
) {
    const [originalData, setOriginalData] = useState<T | null>(null);

    // Set original data when initial data loads (only once)
    useEffect(() => {
        if (initialData && !originalData) {
            setOriginalData({ ...initialData });
        }
    }, [initialData, originalData]);

    // Deep comparison to detect changes
    const hasChanges = useMemo(() => {
        if (!is_active || !originalData) return false;

        // Compare each field in currentData with originalData
        for (const key in currentData) {
            if (currentData[key] !== originalData[key]) {
                return true;
            }
        }
        
        return false;
    }, [is_active, originalData, currentData]);

    // Function to update original data after successful save
    const updateOriginalData = (newData: Partial<T>) => {
        if (originalData) {
            setOriginalData({ ...originalData, ...newData });
        }
    };

    // Function to reset original data (useful for cancel operations)
    const resetOriginalData = () => {
        setOriginalData(null);
    };

    return useMemo(() => ({
        hasChanges,
        originalData,
        updateOriginalData,
        resetOriginalData
    }), [hasChanges, originalData, updateOriginalData, resetOriginalData]);
}