// frontend/src/pages/script/hooks/useShowStartCalculation.ts

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

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
    const { getToken } = useAuth();

    const calculateShowStartDuration = useCallback(async () => {
        if (!scriptId) {
            return;
        }

        setIsCalculating(true);
        setError(null);

        try {
            const token = await getToken();
            if (!token) {
                throw new Error('Authentication token not available');
            }

            const response = await fetch(`/api/scripts/${scriptId}/calculate-show-start-duration`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
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
    }, [scriptId, getToken]);

    return {
        isCalculating,
        error,
        calculateShowStartDuration
    };
};