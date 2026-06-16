import { useMemo, useState } from 'react';
import { UserPreferences } from '../../../hooks/useUserPreferences';

interface UseEffectiveScriptPreferencesOptions {
    autoSaveInterval: number;
    autoSortCues: boolean;
    colorizeDepNames: boolean;
    dangerMode: boolean;
    isOptionsModalOpen: boolean;
    lookaheadSeconds: number;
    playHeartbeatIntervalSec?: number;
    showClockTimes: boolean;
    useMilitaryTime: boolean;
    darkMode: boolean;
}

export const useEffectiveScriptPreferences = ({
    autoSaveInterval,
    autoSortCues,
    colorizeDepNames,
    dangerMode,
    isOptionsModalOpen,
    lookaheadSeconds,
    playHeartbeatIntervalSec,
    showClockTimes,
    useMilitaryTime,
    darkMode
}: UseEffectiveScriptPreferencesOptions) => {
    const [previewPreferences, setPreviewPreferences] = useState<UserPreferences | null>(null);

    const activePreferences = useMemo(() => {
        if (isOptionsModalOpen && previewPreferences) {
            return previewPreferences;
        }

        return {
            darkMode,
            colorizeDepNames,
            showClockTimes,
            autoSortCues,
            useMilitaryTime,
            dangerMode,
            autoSaveInterval,
            lookaheadSeconds,
            playHeartbeatIntervalSec
        };
    }, [
        isOptionsModalOpen,
        previewPreferences,
        darkMode,
        colorizeDepNames,
        showClockTimes,
        autoSortCues,
        useMilitaryTime,
        dangerMode,
        autoSaveInterval,
        lookaheadSeconds,
        playHeartbeatIntervalSec
    ]);

    return {
        activePreferences,
        previewPreferences,
        setPreviewPreferences
    };
};
