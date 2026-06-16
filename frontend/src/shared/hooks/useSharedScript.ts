import { useCallback } from 'react';
import { getApiUrl } from '../../config/api';
import { useSharedShowTimeEngine } from '../contexts/SharedShowTimeEngineProvider';
import { useScriptView } from './useScriptView';

export const useSharedScript = (
  shareToken: string | undefined,
  updateSharedData?: (updater: (prev: any) => any) => void,
  refreshSharedData?: () => void,
) => {
  const { resetAllPlaybackState, engine } = useSharedShowTimeEngine();

  const resetPlaybackState = useCallback(() => {
    try { resetAllPlaybackState(); } catch {}
    try { engine.setScript(null); } catch {}
  }, [resetAllPlaybackState, engine]);

  return useScriptView({
    shareToken,
    updateSharedData,
    refreshSharedData,
    resetPlaybackState,
    buildScriptUrl: (encodedShareToken, scriptId) => (
      getApiUrl(`/api/shared/${encodedShareToken}/scripts/${scriptId}`)
    ),
  });
};
