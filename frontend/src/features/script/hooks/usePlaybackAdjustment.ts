import { useCallback, useEffect, useRef } from 'react';

interface UsePlaybackAdjustmentProps {
    scriptId: string | undefined;
    allEditQueueElements: any[] | undefined;
    applyLocalChange: (operation: any) => void;
    effectiveCurrentScript: any;
    lastPauseDurationMs: number | undefined;
    currentTime: number | null;
}

export const usePlaybackAdjustment = ({
    scriptId,
    allEditQueueElements,
    applyLocalChange,
    effectiveCurrentScript,
    lastPauseDurationMs,
    currentTime
}: UsePlaybackAdjustmentProps) => {

    const handleOffsetAdjustment = useCallback((delayMs: number, currentTimeMs: number) => {
        if (!scriptId || delayMs <= 0 || !effectiveCurrentScript) {
            return;
        }
        
        // Round delay up to nearest second for synchronized timing
        const roundedDelayMs = Math.ceil(delayMs / 1000) * 1000;
        
        // Check if we're before the show has actually started
        const now = new Date();
        const scriptStartTime = new Date(effectiveCurrentScript.start_time);
        // Guard against invalid script start time
        if (isNaN(scriptStartTime.getTime())) {
            return; // Cannot adjust start time if current value is invalid
        }
        const isBeforeShowStart = now < scriptStartTime;
        
        if (isBeforeShowStart) {
            // Pre-show delay: adjust the actual script start_time
            const newStartMs = scriptStartTime.getTime() + roundedDelayMs;
            const newStartTime = new Date(newStartMs);
            if (isNaN(newStartTime.getTime())) {
                return; // Defensive: avoid writing invalid dates
            }
            
            // Create script info update operation
            const scriptUpdateOperation = {
                type: 'UPDATE_SCRIPT_INFO' as const,
                element_id: scriptId,
                changes: {
                    start_time: {
                        old_value: effectiveCurrentScript.start_time,
                        new_value: newStartTime.toISOString()
                    }
                }
            };
            
            // Pre-show offset adjustment
            applyLocalChange(scriptUpdateOperation);
        } else {
            // Mid-show delay: adjust individual element offsets for ALL elements after the current one
            const sourceElements = allEditQueueElements || [];
            const unplayedElements = sourceElements.filter(element => {
                const offset = element.offset_ms || 0;
                // Only include elements that start AFTER the current time
                return offset > currentTimeMs;
            });
            
            if (unplayedElements.length === 0) {
                return;
            }
            
            const adjustmentOperation = {
                type: 'BULK_OFFSET_ADJUSTMENT' as const,
                element_id: 'playback-delay-adjustment',
                delay_ms: roundedDelayMs,
                affected_element_ids: unplayedElements.map(el => el.element_id),
                current_time_ms: currentTimeMs
            };
            applyLocalChange(adjustmentOperation);

            // Note: timing boundaries will be refreshed by the useEffect that watches departmentFilteredElements
        }
    }, [scriptId, allEditQueueElements, applyLocalChange, effectiveCurrentScript]);

    // Watch for pause duration changes and apply offset adjustment
    const lastProcessedPauseRef = useRef<number | undefined>(undefined);
    useEffect(() => {
        if (!lastPauseDurationMs || !effectiveCurrentScript || !currentTime) {
            return;
        }
        
        // Prevent processing the same pause duration multiple times
        if (lastProcessedPauseRef.current === lastPauseDurationMs) {
            return;
        }
        
        lastProcessedPauseRef.current = lastPauseDurationMs;
        handleOffsetAdjustment(lastPauseDurationMs, currentTime);
    }, [lastPauseDurationMs, currentTime, effectiveCurrentScript, handleOffsetAdjustment]);

    return {
        handleOffsetAdjustment
    };
};