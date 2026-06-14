// frontend/src/features/script/hooks/useShowStartCalculation.ts

import { useState, useCallback, useMemo } from 'react';
import { useApiFetch } from '../../../hooks/useApiFetch';

interface UseShowStartCalculationReturn {
    isCalculating: boolean;
    error: string | null;
    calculateShowStartDuration: () => Promise<void>;
}

export const useShowStartCalculation = (
    scriptId: string | undefined
): UseShowStartCalculationReturn => {
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const apiFetch = useApiFetch();

    const calculateShowStartDuration = useCallback(async () => {
        if (!scriptId) {
            return;
        }

        setIsCalculating(true);
        setError(null);

        try {
            const response = await apiFetch(`/api/scripts/${scriptId}/calculate-show-start-duration`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error(`Failed to calculate SHOW START duration: ${response.status}`);
            }

            // Duration calculation successful
        } catch (err) {
            console.error('Error calculating SHOW START duration:', err);
            setError(err instanceof Error ? err.message : 'Failed to calculate SHOW START duration');
        } finally {
            setIsCalculating(false);
        }
    }, [scriptId, apiFetch]);

    return useMemo(() => ({
        isCalculating,
        error,
        calculateShowStartDuration
    }), [isCalculating, error, calculateShowStartDuration]);
};
