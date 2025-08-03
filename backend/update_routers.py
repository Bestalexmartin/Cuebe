#!/usr/bin/env python3
import os
import re

router_files = [
    'routers/auth.py',
    'routers/shows.py', 
    'routers/users.py',
    'routers/venues.py',
    'routers/crews.py',
    'routers/script_elements.py',
    'routers/development.py',
    'routers/system_tests.py'
]

field_mappings = {
    'userID': 'user_id',
    'elementID': 'element_id',
    'scriptID': 'script_id',
    'departmentID': 'department_id',
    'showID': 'show_id',
    'venueID': 'venue_id',
    'ownerID': 'owner_id',
    'emailAddress': 'email_address',
    'userName': 'user_name',
    'phoneNumber': 'phone_number',
    'showName': 'show_name',
    'scriptName': 'script_name',
    'venueName': 'venue_name',
    'elementType': 'element_type',
    'cueID': 'cue_id',
    'timeOffsetMs': 'time_offset_ms',
    'customColor': 'custom_color',
    'isActive': 'is_active',
    'dateCreated': 'date_created',
    'dateUpdated': 'date_updated'
}

updated_files = 0

for router_file in router_files:
    if os.path.exists(router_file):
        try:
            with open(router_file, 'r') as f:
                content = f.read()
            
            original_content = content
            
            for old_field, new_field in field_mappings.items():
                # Update attribute access (obj.field)
                content = re.sub(r'\.' + old_field + r'\b', '.' + new_field, content)
                # Update string literals
                content = re.sub(r'"' + old_field + r'"', '"' + new_field + '"', content)
                content = re.sub(r"'" + old_field + r"'", "'" + new_field + "'", content)
            
            if content != original_content:
                with open(router_file, 'w') as f:
                    f.write(content)
                updated_files += 1
                print(f'Updated: {router_file}')
        except Exception as e:
            print(f'Error updating {router_file}: {e}')
    else:
        print(f'File not found: {router_file}')

print(f'Completed: {updated_files} router files updated')