// frontend/src/constants/userRoles.ts

export interface UserRoleOption {
  value: string;
  label: string;
}

// User role options sorted by typical theatre hierarchy and pay rates (highest to lowest)
export const USER_ROLE_OPTIONS: UserRoleOption[] = [
  // Executive/Creative Leadership (Highest tier)
  { value: 'director', label: 'Director' },
  { value: 'producer', label: 'Producer' },
  { value: 'music_director', label: 'Music Director' },
  { value: 'choreographer', label: 'Choreographer' },
  
  // Department Heads/Designers (Upper management tier)
  { value: 'stage_manager', label: 'Stage Manager' },
  { value: 'technical_director', label: 'Technical Director' },
  { value: 'lighting_designer', label: 'Lighting Designer' },
  { value: 'sound_designer', label: 'Sound Designer' },
  { value: 'set_designer', label: 'Set Designer' },
  { value: 'costume_designer', label: 'Costume Designer' },
  
  // Assistant Management (Mid-tier)
  { value: 'assistant_director', label: 'Assistant Director' },
  { value: 'assistant_stage_manager', label: 'Assistant Stage Manager' },
  { value: 'props_master', label: 'Props Master' },
  
  // Specialized Crew (Mid-tier)
  { value: 'electrician', label: 'Electrician' },
  { value: 'sound_technician', label: 'Sound Technician' },
  { value: 'makeup_artist', label: 'Makeup Artist' },
  { value: 'hair_stylist', label: 'Hair Stylist' },
  { value: 'wardrobe', label: 'Wardrobe' },
  
  // General Crew (Entry level)
  { value: 'crew', label: 'Crew' },
  
  // Catch-all
  { value: 'other', label: 'Other' }
];

// Helper function to format role values to display labels
export const formatRole = (roleValue: string): string => {
  const roleOption = USER_ROLE_OPTIONS.find(option => option.value === roleValue);
  return roleOption ? roleOption.label : roleValue;
};