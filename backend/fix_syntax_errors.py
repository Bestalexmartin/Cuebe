#!/usr/bin/env python3
"""
Fix syntax errors introduced by the cleanup script.
"""

import os
import re
from pathlib import Path

def fix_syntax_errors(content):
    """Fix common syntax errors from cleanup"""
    
    # Fix broken assignment statements like "element    element.date_updated = ..."
    content = re.sub(r'element\s+element\.', 'element.', content)
    content = re.sub(r'group_element\s+group_element\.', 'group_element.', content)
    
    # Fix incomplete filter statements like "models.ScriptElement    "
    content = re.sub(r'models\.ScriptElement\s+\)', 'models.ScriptElement)', content)
    
    # Fix broken query filter lines
    content = re.sub(r'query = query\.filter\(models\.ScriptElement\s+', '', content)
    content = re.sub(r'\.filter\(models\.ScriptElement\s+', '', content)
    
    # Remove orphaned lines that start with just spacing + element/field
    content = re.sub(r'^\s+(element|group_element)\s*$', '', content, flags=re.MULTILINE)
    
    # Clean up multiple empty lines
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    return content

def fix_file(file_path):
    """Fix a single file"""
    if not file_path.exists():
        return
    
    print(f"Fixing: {file_path}")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    content = fix_syntax_errors(content)
    
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"✅ Fixed {file_path}")
    else:
        print(f"⏭️  No fixes needed in {file_path}")

def main():
    backend_dir = Path(__file__).parent
    
    files_to_fix = [
        'routers/script_elements.py',
        'routers/script_elements/operations.py',
        'routers/script_elements/routes.py',
    ]
    
    print("🔧 Fixing syntax errors from cleanup...")
    
    for file_path in files_to_fix:
        full_path = backend_dir / file_path
        fix_file(full_path)
    
    print("✅ Syntax fixes complete!")

if __name__ == "__main__":
    main()