// frontend/src/services/apiFetch.ts
//
// Central fetch wrapper. Resolves the path via getApiUrl, sends credentials,
// and defaults the Content-Type for JSON bodies. This is the single choke
// point for auth on the wire.
//
// Blok 017 cookie model: authentication rides on HttpOnly cookies
// (bk_access / bk_refresh) sent automatically via credentials: 'include'.
// State-changing requests echo the bk_csrf cookie as the X-CSRF-Token header
// (double-submit CSRF defense). On a 401 the wrapper attempts a single token
// refresh via /api/auth/refresh and retries the original request once.
//
// The call-site signature is unchanged: callers still pass an optional
// getToken (a no-op during the cookie transition, retained so the 32 existing
// call sites and the useStableAuth pattern keep compiling) and receive a raw
// Response.

import { getApiUrl } from '../config/api';

export interface ApiFetchOptions extends RequestInit {
  // Retained for call-site compatibility during the Clerk -> Blok transition.
  // The cookie model carries auth via HttpOnly cookies, so a resolved token is
  // no longer required; if supplied and it resolves, it is still attached as a
  // Bearer header (harmless fallback alongside the cookie).
  getToken?: () => Promise<string | null>;
}

// Read a cookie value by name from document.cookie.
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Module-level dedup for concurrent refresh attempts.
let refreshPromise: Promise<boolean> | null = null;

export async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const csrf = getCookie('bk_csrf');
      if (csrf) headers['X-CSRF-Token'] = csrf;
      const res = await fetch(getApiUrl('/api/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      if (!res.ok) {
        try {
          const data = await res.json();
          if (data.detail === 'Session limit exceeded') {
            sessionStorage.setItem('cuebe_session_evicted', '1');
          }
        } catch {
          // Ignore parse errors
        }
      }
      return res.ok;
    } catch {
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// Listeners notified when auth is lost (refresh failed on 401).
type AuthLostListener = () => void;
const authLostListeners: Set<AuthLostListener> = new Set();

export function onAuthLost(listener: AuthLostListener): () => void {
  authLostListeners.add(listener);
  return () => {
    authLostListeners.delete(listener);
  };
}

function notifyAuthLost() {
  authLostListeners.forEach((fn) => fn());
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { getToken, headers, body, ...rest } = options;

  const method = (rest.method || 'GET').toUpperCase();

  const finalHeaders: Record<string, string> = { ...(headers as Record<string, string>) };

  // Bearer fallback (transitional). The cookie carries auth; this is harmless
  // when no token resolves.
  if (getToken) {
    const token = await getToken();
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  // Default Content-Type for JSON bodies, but never override FormData (the
  // browser sets the multipart boundary itself).
  if (body !== undefined && !(body instanceof FormData) && finalHeaders['Content-Type'] === undefined) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  // Attach the CSRF token for state-changing methods (double-submit cookie).
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrf = getCookie('bk_csrf');
    if (csrf) {
      finalHeaders['X-CSRF-Token'] = csrf;
    }
  }

  const doFetch = () =>
    fetch(getApiUrl(path), {
      credentials: 'include',
      ...rest,
      body,
      headers: finalHeaders,
    });

  let response = await doFetch();

  // On 401, try a single refresh and retry once.
  if (response.status === 401) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      const newCsrf = getCookie('bk_csrf');
      if (newCsrf) {
        finalHeaders['X-CSRF-Token'] = newCsrf;
      }
      response = await doFetch();
    }

    if (response.status === 401) {
      notifyAuthLost();
    }
  }

  return response;
}
