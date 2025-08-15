// frontend/src/constants/userRoles.ts

export interface UserRoleOption {
  value: string;
  label: string;
}

// User role options sorted by typical theatre hierarchy and pay rates (highest to lowest)
export const USER_ROLE_OPTIONS: UserRoleOption[] = [
  // Executive/Creative Leadership (Highest tier)
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'PRODUCER', label: 'Producer' },
  
  // Department Heads/Designers (Upper management tier)
  { value: 'STAGE_MANAGER', label: 'Stage Manager' },
  { value: 'TECHNICAL_DIRECTOR', label: 'Technical Director' },
  { value: 'LIGHTING_DESIGNER', label: 'Lighting Designer' },
  { value: 'SOUND_DESIGNER', label: 'Sound Designer' },
  
  // Assistant Management (Mid-tier)
  { value: 'ASSISTANT_DIRECTOR', label: 'Assistant Director' },
  { value: 'ASSISTANT_STAGE_MANAGER', label: 'Assistant Stage Manager' },
  { value: 'PROPS_MASTER', label: 'Props Master' },
  
  // Lead Technical Roles (Mid-tier)
  { value: 'LEAD_AUDIO', label: 'Lead Audio' },
  { value: 'LEAD_VIDEO', label: 'Lead Video' },
  
  // Specialized Crew (Technical)
  { value: 'ELECTRICIAN', label: 'Electrician' },
  { value: 'SOUND_TECHNICIAN', label: 'Sound Technician' },
  { value: 'PROJECTIONIST', label: 'Projectionist' },
  { value: 'RECORDIST', label: 'Recordist' },
  { value: 'GRAPHICS', label: 'Graphics' },
  { value: 'FLY_OPERATOR', label: 'Fly Operator' },
  { value: 'CARPENTER', label: 'Carpenter' },
  
  // General Crew (Entry level)
  { value: 'CREW', label: 'Crew' },
  
  // Catch-all
  { value: 'OTHER', label: 'Other' }
];

// Helper function to format role values to display labels
export const formatRole = (roleValue: string): string => {
  const roleOption = USER_ROLE_OPTIONS.find(option => option.value === roleValue);
  return roleOption ? roleOption.label : roleValue;
};

// Helper function to format role values for badges (ALL CAPS with spaces)
export const formatRoleBadge = (roleValue: string): string => {
  // Convert UPPERCASE enum values to ALL CAPS with spaces for badge display
  return roleValue.replace(/_/g, ' ');
};

// Helper function to generate sharing URL suffix from share token
export const getShareUrlSuffix = (shareToken?: string): string => {
  if (!shareToken) {
    return 'LinkID: Loading...';
  }
  // Return last 12 characters of the share token with prefix
  return `LinkID: ${shareToken.slice(-12)}`;
};