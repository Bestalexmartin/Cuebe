// frontend/src/features/shows/types/crewAssignments.ts

// Re-export existing types for convenience
export interface CrewMember {
  user_id: string;
  fullname_first?: string;
  fullname_last?: string;
  email_address?: string;
  phone_number?: string;
  user_role?: string;
  user_status?: string;
  is_active?: boolean;
  profile_img_url?: string;
  notes?: string; // User table notes
  relationship_notes?: string; // Relationship table notes
  clerk_user_id?: string; // To identify current user
  date_created: string;
  date_updated: string;
}

export interface Department {
  department_id: string;
  department_name: string;
  department_description?: string;
  department_color?: string;
  department_initials?: string;
  date_created: string;
  date_updated: string;
}

// New interfaces for show-level crew assignments
export interface ShowCrewAssignment {
  assignment_id: string;
  show_id: string;
  department_id: string;
  crew_member_id: string;
  role?: string; // Lead, Assistant, etc.
  notes?: string;
  date_created: string;
  date_updated: string;
  
  // Populated relationships for display
  department?: Department;
  crew_member?: CrewMember;
}

export interface ShowCrewAssignmentCreate {
  department_id: string;
  crew_member_id: string;
  role?: string;
  notes?: string;
}

export interface ShowCrewAssignmentUpdate {
  role?: string;
  notes?: string;
}

// UI-specific interfaces
export interface CrewAssignmentRow {
  id: string; // Temporary ID for new assignments or assignment_id for existing
  department_id: string;
  crew_member_ids: string[]; // Multiple crew members can be assigned to same dept
  role: string;
  isNew?: boolean; // True for unsaved assignments
  isSelected?: boolean; // For UI selection state
}

export interface CrewAssignmentFormData {
  assignments: CrewAssignmentRow[];
}