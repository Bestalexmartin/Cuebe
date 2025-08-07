// frontend/src/features/shared-script/types/sharedScript.ts

export interface SharedScriptElement {
    element_id: string;
    element_type: 'CUE' | 'NOTE' | 'GROUP' | null;
    sequence: number | null;
    cue_id: string | null;
    description: string;
    cue_notes: string | null;
    time_offset_ms: number | null;
    department_id: string | null;
    location: string | null;
    location_details: string | null;
    priority: 'SAFETY' | 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'OPTIONAL' | null;
    trigger_type: 'MANUAL' | 'TIME' | 'AUTO' | 'FOLLOW' | 'GO' | 'STANDBY' | null;
}

export interface Department {
    department_id: string;
    department_name: string;
    department_color: string | null;
    department_initials: string | null;
}

export interface SharedScriptData {
    script_id: string;
    script_name: string;
    script_status: string;
    show_name: string | null;
    venue_name: string | null;
    start_time: string | null;
    end_time: string | null;
    elements: SharedScriptElement[];
    departments: Department[] | null;
    permissions: {
        view: boolean;
        download: boolean;
        [key: string]: boolean;
    };
    last_updated: string;
    share_name: string | null;
    expires_at: string | null;
    is_expired: boolean;
}

export interface ShareTokenValidation {
    is_valid: boolean;
    script_id?: string;
    shared_with_user_id?: string;
    permissions?: {
        view: boolean;
        download: boolean;
        [key: string]: boolean;
    };
    expires_at?: string;
    error_message?: string;
}

export interface SharedScriptError {
    message: string;
    code?: string;
    details?: string;
}