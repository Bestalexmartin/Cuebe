// Stable auth hook used by call sites that pass a getToken into apiFetch.
//
// Under Blok 017, auth rides on HttpOnly cookies (bk_access / bk_refresh) sent
// automatically with credentials: 'include'. There is no JS-readable access
// token, so getToken resolves null. The stable reference is preserved so the
// existing call sites and effect dependency arrays keep working unchanged.
import { useCallback } from 'react';

export const useStableAuth = () => {
  // Stable, dependency-free reference. Resolves null because the cookie carries
  // auth; apiFetch ignores the returned value.
  const getToken = useCallback(async (): Promise<string | null> => {
    return null;
  }, []);

  return { getToken };
};
