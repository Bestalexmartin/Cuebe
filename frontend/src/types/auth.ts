// frontend/src/types/auth.ts
//
// Blok 017 auth types, ported for Cuebe's self-hosted auth.
//
// AccessRole is Cuebe's Layer 1 access tier (Blok's 5-tier role enum). It is
// distinct from Cuebe's ProductionRole (Layer 3, the on-show job) and from
// resource authorization (Layer 2, owner_id / crew relationships). See
// docs/planning/auth-roles-blok-migration-design.md.

export type AccessRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'GUEST';

export interface LoginUser {
  id: string;
  email: string;
  display_name: string;
  role: AccessRole;
  org_id: string | null;
}

export interface LoginResponse {
  user: LoginUser | null;
  mfa_required: boolean;
  mfa_session_token: string | null;
  mfa_setup_required: boolean;
  mfa_setup_token: string | null;
}

export interface RefreshResponse {
  message: string;
}

export interface UserMeResponse {
  id: string;
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  username: string | null;
  phone: string | null;
  avatar_thumbnail_url: string | null;
  role: AccessRole;
  org_id: string | null;
  org_name: string | null;
  email_verified: boolean;
  mfa_enabled: boolean;
  preferences: Record<string, unknown>;
  session_user_id: string | null;
  is_switched: boolean;
  pending_email: string | null;
  auto_lock_minutes: number | null;
  mfa_setup_deadline: string | null;
}

export interface UpdateProfileRequest {
  display_name?: string;
  email?: string;
  username?: string;
  phone?: string;
}

export interface AvatarUploadResponse {
  avatar_url: string;
  thumbnail_url: string;
}

export interface SwitchUserResponse {
  access_token: string;
  user: LoginUser;
  session_user_id: string;
}

export interface MessageResponse {
  message: string;
}

export interface MfaSetupResponse {
  secret: string;
  qr_uri: string;
  backup_codes: string[];
}

export interface InviteValidationResponse {
  email: string;
  org_name: string;
  role: string;
}

export interface SessionItem {
  id: string;
  device_info: string | null;
  ip_address: string | null;
  created_at: string;
  last_used_at: string;
  is_current: boolean;
}

export interface MySessionsResponse {
  sessions: SessionItem[];
}
