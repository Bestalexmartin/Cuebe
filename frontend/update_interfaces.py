#!/usr/bin/env python3
import os
import re
import glob

# Field name mappings (camelCase to snake_case)
field_mappings = {
    'userID': 'user_id',
    'elementID': 'element_id',
    'scriptID': 'script_id',
    'departmentID': 'department_id',
    'showID': 'show_id',
    'venueID': 'venue_id',
    'ownerID': 'owner_id',
    'emailAddress': 'email_address',
    'fullnameFirst': 'fullname_first',
    'fullnameLast': 'fullname_last',
    'userName': 'user_name',
    'profileImgURL': 'profile_img_url',
    'phoneNumber': 'phone_number',
    'userStatus': 'user_status',
    'userRole': 'user_role',
    'createdBy': 'created_by',
    'updatedBy': 'updated_by',
    'invitedAt': 'invited_at',
    'invitationToken': 'invitation_token',
    'userPrefsJSON': 'user_prefs_json',
    'userPrefsBitmap': 'user_prefs_bitmap',
    'isActive': 'is_active',
    'dateCreated': 'date_created',
    'dateUpdated': 'date_updated',
    'venueName': 'venue_name',
    'venueType': 'venue_type',
    'contactName': 'contact_name',
    'contactEmail': 'contact_email',
    'contactPhone': 'contact_phone',
    'stageWidth': 'stage_width',
    'stageDepth': 'stage_depth',
    'flyHeight': 'fly_height',
    'venueNotes': 'venue_notes',
    'rentalRate': 'rental_rate',
    'minimumRental': 'minimum_rental',
    'departmentName': 'department_name',
    'departmentDescription': 'department_description',
    'departmentColor': 'department_color',
    'departmentInitials': 'department_initials',
    'showName': 'show_name',
    'showDate': 'show_date',
    'showDuration': 'show_duration',
    'showNotes': 'show_notes',
    'scriptName': 'script_name',
    'scriptNotes': 'script_notes',
    'scriptStatus': 'script_status',
    'startTime': 'start_time',
    'endTime': 'end_time',
    'actualStartTime': 'actual_start_time',
    'isPinned': 'is_pinned',
    'elementType': 'element_type',
    'elementOrder': 'element_order',
    'cueNumber': 'cue_number',
    'cueID': 'cue_id',
    'elementDescription': 'element_description',
    'cueNotes': 'cue_notes',
    'triggerType': 'trigger_type',
    'followsCueID': 'follows_cue_id',
    'executionStatus': 'execution_status',
    'timeOffsetMs': 'time_offset_ms',
    'fadeIn': 'fade_in',
    'fadeOut': 'fade_out',
    'locationDetails': 'location_details',
    'customColor': 'custom_color',
    'groupLevel': 'group_level',
    'isCollapsed': 'is_collapsed',
    'parentElementID': 'parent_element_id'
}

def update_typescript_files():
    """Update all TypeScript files with new field names"""
    
    # Find all TypeScript files
    ts_files = []
    for pattern in ['**/*.ts', '**/*.tsx']:
        ts_files.extend(glob.glob(f'src/{pattern}', recursive=True))
    
    updated_files = 0
    
    for ts_file in ts_files:
        try:
            with open(ts_file, 'r') as f:
                content = f.read()
            
            original_content = content
            
            # Apply field name replacements
            for old_field, new_field in field_mappings.items():
                # Update interface/type definitions
                content = re.sub(rf'\b{old_field}:', f'{new_field}:', content)
                content = re.sub(rf'\b{old_field}\?:', f'{new_field}?:', content)
                
                # Update object property access 
                content = re.sub(rf'\.{old_field}\b', f'.{new_field}', content)
                
                # Update string literals in object keys
                content = re.sub(rf'"{old_field}"', f'"{new_field}"', content)
                content = re.sub(rf"'{old_field}'", f"'{new_field}'", content)
                
                # Update destructuring
                content = re.sub(rf'{{{old_field}}}', f'{{{new_field}}}', content)
                
            # Only write if changes were made
            if content != original_content:
                with open(ts_file, 'w') as f:
                    f.write(content)
                updated_files += 1
                print(f'Updated: {ts_file}')
                
        except Exception as e:
            print(f'Error updating {ts_file}: {e}')
    
    print(f'Completed: {updated_files} TypeScript files updated')

if __name__ == '__main__':
    update_typescript_files()