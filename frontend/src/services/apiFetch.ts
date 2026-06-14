// frontend/src/services/apiFetch.ts
//
// Central fetch wrapper. Resolves the path via getApiUrl, sends credentials,
// attaches Authorization when a token provider is supplied, and defaults the
// Content-Type for JSON bodies. This is the single choke point for auth on the
// wire: the Blok 017 migration swaps the internals to HttpOnly cookies + CSRF
// without touching call sites.

import { getApiUrl } from '../config/api';

export interface ApiFetchOptions extends RequestInit {
  // When supplied and it resolves to a token, an Authorization: Bearer header
  // is attached. Omit for unauthenticated (e.g. public/guest) requests.
  getToken?: () => Promise<string | null>;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { getToken, headers, body, ...rest } = options;

  const finalHeaders: Record<string, string> = { ...(headers as Record<string, string>) };

  if (getToken) {
    const token = await getToken();
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  if (body !== undefined && finalHeaders['Content-Type'] === undefined) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  return fetch(getApiUrl(path), {
    credentials: 'include',
    ...rest,
    body,
    headers: finalHeaders,
  });
}
