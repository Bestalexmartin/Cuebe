#!/usr/bin/env python3
"""
Advanced seed data creator for Cuebe database
Handles circular foreign key constraints properly by exporting data in dependency order
"""

import psycopg2
import json
import os
from datetime import datetime

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'cuebe_db',
    'user': 'alex',
    'password': 'd0cFenders0n99'
}

def get_table_dependencies():
    """Get table dependencies to determine safe export order"""
    return [
        'userTable',  # Base table (self-referencing)
        'venuesTable',
        'departmentsTable', 
        'showsTable',
        'scriptsTable',
        'scriptElementsTable',  # Self-referencing
        'crewRelationshipsTable',
        'crewAssignmentsTable',
        'script_shares'
    ]

def export_table_data(cursor, table_name):
    """Export data from a single table as INSERT statements"""
    # Get column information
    cursor.execute(f"""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = '{table_name}'
        ORDER BY ordinal_position
    """)
    columns = cursor.fetchall()
    
    if not columns:
        return []
    
    column_names = [col[0] for col in columns]
    column_list = ', '.join(f'"{col}"' for col in column_names)
    
    # Get the data
    cursor.execute(f'SELECT {column_list} FROM "{table_name}"')
    rows = cursor.fetchall()
    
    if not rows:
        return []
    
    # Generate INSERT statements
    inserts = []
    for row in rows:
        values = []
        for i, value in enumerate(row):
            if value is None:
                values.append('NULL')
            elif isinstance(value, str):
                # Escape single quotes
                escaped_value = value.replace("'", "''")
                values.append(f"'{escaped_value}'")
            elif isinstance(value, bool):
                values.append('TRUE' if value else 'FALSE')
            elif isinstance(value, datetime):
                values.append(f"'{value.isoformat()}'")
            else:
                values.append(str(value))
        
        values_str = ', '.join(values)
        insert_sql = f'INSERT INTO "{table_name}" ({column_list}) VALUES ({values_str});'
        inserts.append(insert_sql)
    
    return inserts

def create_seed_data():
    """Create comprehensive seed data files"""
    print("Creating advanced seed data...")
    
    # Create seed_data directory
    os.makedirs('seed_data', exist_ok=True)
    
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Get table dependency order
        tables = get_table_dependencies()
        
        # Export data in dependency order
        all_inserts = []
        table_data = {}
        
        for table in tables:
            print(f"Exporting {table}...")
            inserts = export_table_data(cursor, table)
            table_data[table] = inserts
            all_inserts.extend(inserts)
            
        # Create advanced seed file
        with open('seed_data/advanced_seed.sql', 'w') as f:
            f.write("-- Cuebe Advanced Seed Data\n")
            f.write(f"-- Generated: {datetime.now().isoformat()}\n")
            f.write("-- This file handles circular foreign key constraints properly\n\n")
            
            # Clear existing data in reverse dependency order
            f.write("-- Clear existing data in safe order\n")
            for table in reversed(tables):
                f.write(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE;\n')
            
            f.write("\n-- Begin transaction\n")
            f.write("BEGIN;\n\n")
            
            # Set constraints to deferred
            f.write("-- Defer constraint checking\n")
            f.write("SET CONSTRAINTS ALL DEFERRED;\n\n")
            
            # Insert data in dependency order
            for table in tables:
                if table_data[table]:
                    f.write(f"-- Insert data for {table}\n")
                    for insert in table_data[table]:
                        f.write(insert + '\n')
                    f.write('\n')
            
            # Commit transaction
            f.write("-- Commit all changes\n")
            f.write("COMMIT;\n")
        
        # Create JSON export for easier programmatic access
        json_data = {}
        for table in tables:
            cursor.execute(f'SELECT * FROM "{table}"')
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            
            json_data[table] = {
                'columns': columns,
                'data': []
            }
            
            for row in rows:
                row_dict = {}
                for i, col in enumerate(columns):
                    value = row[i]
                    if isinstance(value, datetime):
                        value = value.isoformat()
                    row_dict[col] = value
                json_data[table]['data'].append(row_dict)
        
        with open('seed_data/seed_data.json', 'w') as f:
            json.dump(json_data, f, indent=2, default=str)
        
        print("Advanced seed data created successfully!")
        print("Files created:")
        print("  - seed_data/advanced_seed.sql (constraint-aware SQL)")
        print("  - seed_data/seed_data.json (JSON format)")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error creating seed data: {e}")
        return False
    
    return True

if __name__ == "__main__":
    create_seed_data()