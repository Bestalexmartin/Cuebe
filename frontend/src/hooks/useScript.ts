import { useCallback } from 'react';
import { useShowTimeEngine } from '../contexts/ShowTimeEngineProvider';
import { useScriptView } from '../shared/hooks/useScriptView';

export const useScript = (
  shareToken: string | undefined,
  updateSharedData?: (updater: (prev: any) => any) => void,
  refreshSharedData?: () => void,
) => {
  const { stopPlayback, clearAllElementStates } = useShowTimeEngine();

  const resetPlaybackState = useCallback(() => {
    clearAllElementStates();
    stopPlayback();
  }, [clearAllElementStates, stopPlayback]);

  return useScriptView({
    shareToken,
    updateSharedData,
    refreshSharedData,
    resetPlaybackState,
    buildScriptUrl: (encodedShareToken, scriptId) => `/api/shared/${encodedShareToken}/scripts/${scriptId}`,
  });
};
