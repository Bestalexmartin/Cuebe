#!/usr/bin/env python3
"""
Script to clean up all references to unused script element fields.
These fields were over-engineered phantom functionality with zero user value.
"""

import os
import re
from pathlib import Path

# Fields to completely remove
UNUSED_FIELDS = [
    'fade_in', 'fade_out', 'cue_number', 'cue_id', 'element_description',
    'follows_cue_id', 'location', 'department_color', 'version', 'is_active',
    'execution_status', 'trigger_type'
]

# Files that need cleaning (backend)
BACKEND_FILES = [
    'routers/script_elements.py',
    'routers/script_elements/operations.py', 
    'routers/script_elements/routes.py',
    'schemas/operations.py',
    'update_routers.py'
]

def clean_field_assignments(content, field):
    """Remove field assignments in model creation"""
    patterns = [
        rf'{field}=.*?[,)]',  # field=value, or field=value)
        rf'{field}:\s*.*?[,\n]',  # field: value, or field: value\n
        rf'\.{field}\s*=.*?[,\n]',  # .field = value
        rf'"{field}":\s*.*?[,\n]',  # "field": value
    ]
    
    for pattern in patterns:
        content = re.sub(pattern, '', content, flags=re.MULTILINE)
    
    return content

def clean_field_validations(content, field):
    """Remove field validation logic"""
    patterns = [
        rf'elif field == "{field}".*?\n.*?\n',  # elif field == "field" and validation
        rf'if.*?{field}.*?\n.*?\n',  # if field validation  
        rf'{field}_enum.*?\n',  # field_enum = ...
    ]
    
    for pattern in patterns:
        content = re.sub(pattern, '', content, flags=re.MULTILINE | re.DOTALL)
    
    return content

def clean_field_filters(content, field):
    """Remove database query filters"""
    patterns = [
        rf'query = query\.filter\(.*?{field}.*?\)',
        rf'\.filter\(.*?{field}.*?\)',
        rf'models\.ScriptElement\.{field}.*?==.*?\)',
    ]
    
    for pattern in patterns:
        content = re.sub(pattern, '', content, flags=re.MULTILINE)
    
    return content

def clean_version_increments(content):
    """Remove version increment logic"""
    patterns = [
        r'element\.version = element\.version \+ 1[,\n]?',
        r'version=1[,\n]?',
        r'# Reset version to 1.*?\n',
    ]
    
    for pattern in patterns:
        content = re.sub(pattern, '', content, flags=re.MULTILINE)
    
    return content

def clean_soft_delete_logic(content):
    """Remove soft delete logic"""
    patterns = [
        r'element\.is_active = False[,\n]?',
        r'group_element\.is_active = False[,\n]?',
        r'is_active=True[,\n]?',
        r'is_active=original_element\.is_active[,\n]?',
    ]
    
    for pattern in patterns:
        content = re.sub(pattern, '', content, flags=re.MULTILINE)
    
    return content

def clean_enum_assignments(content):
    """Remove enum assignment logic for unused fields"""
    patterns = [
        r'setattr\(element, field, models\.LocationArea\(new_value\)\)',
        r'setattr\(element, field, models\.ExecutionStatus\(new_value\)\)', 
        r'setattr\(element, field, models\.TriggerType\(new_value\)\)',
        r'execution_status = models\.ExecutionStatus.*?\n',
        r'trigger_type = models\.TriggerType.*?\n',
        r'execution_status=models\.ExecutionStatus\.PENDING[,\n]?',
        r'trigger_type=models\.TriggerType\.MANUAL[,\n]?',
    ]
    
    for pattern in patterns:
        content = re.sub(pattern, '', content, flags=re.MULTILINE)
    
    return content

def clean_file(file_path):
    """Clean a single file of all unused field references"""
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return
    
    print(f"Cleaning: {file_path}")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Remove field assignments, validations, and filters
    for field in UNUSED_FIELDS:
        content = clean_field_assignments(content, field)
        content = clean_field_validations(content, field)
        content = clean_field_filters(content, field)
    
    # Remove version increment logic
    content = clean_version_increments(content)
    
    # Remove soft delete logic
    content = clean_soft_delete_logic(content)
    
    # Remove enum assignments
    content = clean_enum_assignments(content)
    
    # Clean up extra commas and empty lines
    content = re.sub(r',\s*,', ',', content)  # Remove double commas
    content = re.sub(r',\s*\)', ')', content)  # Remove trailing commas before )
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)  # Remove excessive empty lines
    
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"✅ Cleaned {file_path}")
    else:
        print(f"⏭️  No changes needed in {file_path}")

def main():
    backend_dir = Path(__file__).parent
    
    print("🧹 Cleaning up unused script element fields...")
    print(f"Fields to remove: {', '.join(UNUSED_FIELDS)}")
    print()
    
    for file_path in BACKEND_FILES:
        full_path = backend_dir / file_path
        clean_file(full_path)
    
    print("\n✅ Backend cleanup complete!")
    print("\nNext steps:")
    print("1. Clean up frontend TypeScript interfaces")
    print("2. Clean up frontend hooks and components")  
    print("3. Remove unused enum definitions")
    print("4. Run the database migration")

if __name__ == "__main__":
    main()