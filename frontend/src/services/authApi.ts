// frontend/src/services/authApi.ts
//
// Blok 017 auth API client, ported for Cuebe.
//
// Built on the central apiFetch wrapper (cookie auth + CSRF + transparent
// refresh). apiFetch returns a raw Response, so this module parses JSON and
// raises a typed Error (with a numeric .status) on non-2xx, matching the
// error shape the ported auth forms expect.

import { apiFetch } from './apiFetch';
import type {
  LoginResponse,
  UserMeResponse,
  MessageResponse,
  MfaSetupResponse,
  SwitchUserResponse,
  UpdateProfileRequest,
  AvatarUploadResponse,
  InviteValidationResponse,
  MySessionsResponse,
} from '../types/auth';

interface ApiError extends Error {
  status: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, options);

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  let data: { detail?: unknown } | T;
  try {
    data = await response.json();
  } catch {
    data = {} as T;
  }

  if (!response.ok) {
    const detail = (data as { detail?: unknown }).detail;
    const message = Array.isArray(detail)
      ? detail.map((e: { msg?: string }) => e.msg || String(e)).join('; ')
      : (detail as string | undefined);
    const error = new Error(message || `API error: ${response.status}`) as ApiError;
    error.status = response.status;
    throw error;
  }

  return data as T;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  mfaVerify: (mfaSessionToken: string, code: string) =>
    request<LoginResponse>('/api/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ mfa_session_token: mfaSessionToken, code }),
    }),

  refresh: () =>
    request<{ message: string }>('/api/auth/refresh', {
      method: 'POST',
    }),

  logout: () =>
    request<void>('/api/auth/logout', {
      method: 'POST',
    }),

  me: () => request<UserMeResponse>('/api/auth/me'),

  updatePreferences: (preferences: Record<string, unknown>) =>
    request<{ preferences: Record<string, unknown> }>('/api/auth/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ preferences }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<MessageResponse>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),

  switchUser: (targetUserId: string, pin: string) =>
    request<SwitchUserResponse>('/api/auth/switch-user', {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId, pin }),
    }),

  register: (
    email: string,
    password: string,
    displayName: string,
    firstName?: string,
    lastName?: string,
    inviteToken?: string,
  ) =>
    request<MessageResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        display_name: displayName,
        first_name: firstName || '',
        last_name: lastName || '',
        invite_token: inviteToken,
      }),
    }),

  verifyEmail: (token: string) =>
    request<MessageResponse>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  forgotPassword: (email: string) =>
    request<MessageResponse>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<MessageResponse>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    }),

  mfaSetup: () =>
    request<MfaSetupResponse>('/api/auth/mfa/setup', {
      method: 'POST',
    }),

  mfaVerifySetup: (code: string) =>
    request<MessageResponse>('/api/auth/mfa/verify-setup', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  mfaDisable: (password: string) =>
    request<MessageResponse>('/api/auth/mfa', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  regenerateBackupCodes: (password: string) =>
    request<{ backup_codes: string[] }>('/api/auth/mfa/regenerate-backup-codes', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  unlock: (password: string) =>
    request<MessageResponse>('/api/auth/unlock', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  logoutAllDevices: () =>
    request<MessageResponse>('/api/auth/logout-all-devices', {
      method: 'POST',
    }),

  mfaForcedSetup: (setupToken: string) =>
    request<MfaSetupResponse>('/api/auth/mfa/forced-setup', {
      method: 'POST',
      body: JSON.stringify({ mfa_setup_token: setupToken }),
    }),

  mfaForcedSetupVerify: (setupToken: string, code: string) =>
    request<LoginResponse>('/api/auth/mfa/forced-setup/verify', {
      method: 'POST',
      body: JSON.stringify({ mfa_setup_token: setupToken, code }),
    }),

  updateProfile: (data: UpdateProfileRequest) =>
    request<UserMeResponse>('/api/auth/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<AvatarUploadResponse>('/api/auth/avatar', {
      method: 'POST',
      body: formData,
    });
  },

  deleteAvatar: () =>
    request<MessageResponse>('/api/auth/avatar', {
      method: 'DELETE',
    }),

  verifyEmailChange: (token: string) =>
    request<MessageResponse>('/api/auth/verify-email-change', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  deleteAccount: (password: string) =>
    request<MessageResponse>('/api/auth/me/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  validateInvite: (token: string) =>
    request<InviteValidationResponse>(`/api/invites/${token}`),

  listMySessions: () => request<MySessionsResponse>('/api/auth/my-sessions'),

  revokeMySession: (sessionId: string) =>
    request<MessageResponse>(`/api/auth/my-sessions/${sessionId}`, { method: 'DELETE' }),
};
