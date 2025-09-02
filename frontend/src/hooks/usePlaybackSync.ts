import { useCallback, useRef, useEffect } from 'react';
import { PlaybackState } from '../contexts/PlayContext';

interface UsePlaybackSyncProps {
    scriptSync?: any;
    script?: any;
    currentTime?: number | null;
    playbackState: PlaybackState;
}

export const usePlaybackSync = ({ scriptSync, script, currentTime, playbackState }: UsePlaybackSyncProps) => {
    const lastBroadcastedStateRef = useRef<PlaybackState | null>(null);
    
    // Send playback command via WebSocket to synchronize scoped sides
    const sendPlaybackCommand = useCallback((command: string) => {
        if (scriptSync?.sendPlaybackCommand) {
            scriptSync.sendPlaybackCommand(
                command,
                currentTime,
                command === 'PLAY' ? script?.start_time : undefined
            );
        }
    }, [scriptSync, currentTime, script?.start_time]);

    // Auto-broadcast state changes (for script completion and other automatic transitions)
    useEffect(() => {
        // Only broadcast state changes that weren't already broadcasted manually
        if (lastBroadcastedStateRef.current !== playbackState) {
            if (playbackState === 'COMPLETE' && lastBroadcastedStateRef.current !== 'COMPLETE') {
                // Script automatically completed - broadcast to scoped sides
                sendPlaybackCommand('COMPLETE');
            }
            lastBroadcastedStateRef.current = playbackState;
        }
    }, [playbackState, sendPlaybackCommand]);

    return {
        sendPlaybackCommand
    };
};