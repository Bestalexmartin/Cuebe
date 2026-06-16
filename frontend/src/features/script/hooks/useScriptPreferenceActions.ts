import { useCallback } from 'react';
import { UserPreferences } from '../../../hooks/useUserPreferences';

interface UseScriptPreferenceActionsOptions {
    activeAutoSortCues: boolean;
    activeMode: string;
    activeShowClockTimes: boolean;
    applyLocalChange: (operation: any) => void;
    editQueueElements: Array<{ element_id: string; offset_ms: number; sequence: number }>;
    modalNames: {
        AUTO_SORT_ACTIVATED: string;
    };
    modalState: {
        closeModal: (name: string) => void;
        openModal: (name: string) => void;
    };
    setPreviewPreferences: (preferences: UserPreferences | null) => void;
    scriptId?: string;
    showError: (...args: any[]) => void;
    showSuccess: (...args: any[]) => void;
    updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<boolean>;
    updatePreferences: (preferences: UserPreferences) => Promise<boolean>;
}

export const useScriptPreferenceActions = ({
    activeAutoSortCues,
    activeMode,
    activeShowClockTimes,
    applyLocalChange,
    editQueueElements,
    modalNames,
    modalState,
    scriptId,
    setPreviewPreferences,
    showError,
    showSuccess,
    updatePreference,
    updatePreferences
}: UseScriptPreferenceActionsOptions) => {
    const handleAutoSortElements = useCallback(async () => {
        if (!scriptId) return;

        try {
            const currentElements = [...editQueueElements];
            const sortedElements = [...currentElements].sort((a, b) => a.offset_ms - b.offset_ms);
            const needsReordering = currentElements.some((element, index) => (
                element.element_id !== sortedElements[index]?.element_id
            ));

            if (!needsReordering) {
                showSuccess('Auto-Sort Complete', 'Elements are already in correct time order.');
                return;
            }

            const resequencedElements = sortedElements.map((element, index) => ({
                element_id: element.element_id,
                old_sequence: element.sequence,
                new_sequence: index + 1
            }));

            applyLocalChange({
                type: 'ENABLE_AUTO_SORT' as const,
                element_id: 'auto-sort-preference',
                old_preference_value: false,
                new_preference_value: true,
                element_moves: resequencedElements,
                resequenced_elements: resequencedElements,
                total_elements: currentElements.length
            });

            showSuccess(
                'Elements Auto-Sorted',
                `Reordered ${resequencedElements.length} elements by time offset. New elements will be automatically sorted.`
            );
        } catch (error) {
            showError(error instanceof Error ? error.message : 'Failed to enable auto-sort');
        }
    }, [scriptId, editQueueElements, applyLocalChange, showSuccess, showError]);

    const handleAutoSortToggle = useCallback(async (value: boolean) => {
        if (!value && activeMode === 'view') {
            return;
        }

        if (value && !activeAutoSortCues && scriptId) {
            await handleAutoSortElements();
        } else if (!value && activeAutoSortCues) {
            applyLocalChange({
                type: 'DISABLE_AUTO_SORT' as const,
                element_id: 'auto-sort-preference',
                old_preference_value: true,
                new_preference_value: false
            });
        }

        await updatePreference('autoSortCues', value);
    }, [activeAutoSortCues, activeMode, applyLocalChange, handleAutoSortElements, scriptId, updatePreference]);

    const handleAutoSortCheckboxChange = useCallback(async (newAutoSortValue: boolean) => {
        await handleAutoSortToggle(newAutoSortValue);
    }, [handleAutoSortToggle]);

    const handleClockTimesCheckboxChange = useCallback(async (newClockTimesValue: boolean) => {
        await updatePreference('showClockTimes', newClockTimesValue);
    }, [updatePreference]);

    const handleViewModeActivation = useCallback(async () => {
        const needsAutoSort = !activeAutoSortCues;
        const needsClockTimes = !activeShowClockTimes;

        if (needsAutoSort) {
            await handleAutoSortToggle(true);
        }
        if (needsClockTimes) {
            await updatePreference('showClockTimes', true);
        }

        if (needsAutoSort || needsClockTimes) {
            modalState.openModal(modalNames.AUTO_SORT_ACTIVATED);
            setTimeout(() => {
                modalState.closeModal(modalNames.AUTO_SORT_ACTIVATED);
            }, 2000);
        }
    }, [
        activeAutoSortCues,
        activeShowClockTimes,
        handleAutoSortToggle,
        modalNames.AUTO_SORT_ACTIVATED,
        modalState,
        updatePreference
    ]);

    const handleOptionsModalSave = useCallback(async (newPreferences: UserPreferences) => {
        const ok = await updatePreferences(newPreferences);
        setPreviewPreferences(null);

        if (ok) {
            showSuccess('Preferences Updated', 'Your settings have been saved successfully.');
            return;
        }

        showError('Failed to save preferences', {
            description: 'Your changes could not be saved. Please try again.'
        });
    }, [setPreviewPreferences, showError, showSuccess, updatePreferences]);

    return {
        handleAutoSortCheckboxChange,
        handleAutoSortToggle,
        handleClockTimesCheckboxChange,
        handleOptionsModalSave,
        handleViewModeActivation,
    };
};
