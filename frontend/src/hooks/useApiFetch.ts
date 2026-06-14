// frontend/src/hooks/useApiFetch.ts
//
// Hook form of apiFetch bound to the current auth token. Built on useStableAuth
// so the returned function keeps a stable identity across renders (preserving
// the referential stability the data hooks rely on).

import { useCallback } from 'react';

import { useStableAuth } from './useStableAuth';
import { apiFetch, ApiFetchOptions } from '../services/apiFetch';

export const useApiFetch = () => {
  const { getToken } = useStableAuth();

  return useCallback(
    (path: string, options: ApiFetchOptions = {}): Promise<Response> =>
      apiFetch(path, { getToken, ...options }),
    [getToken],
  );
};
