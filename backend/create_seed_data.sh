#!/bin/bash

# Create seed data from current database state
# This script exports the current database to seed files

echo "Creating seed data from current database..."

# Create seed directory if it doesn't exist
mkdir -p seed_data

# Export full schema (structure only)
echo "Exporting database schema..."
docker exec cuebe-db pg_dump -U alex -d cuebe_db --schema-only > seed_data/schema.sql

# Export data only with proper handling of circular constraints
echo "Exporting database data..."
docker exec cuebe-db pg_dump -U alex -d cuebe_db --data-only --disable-triggers --inserts > seed_data/data.sql

# Create a combined seed file
echo "Creating combined seed file..."
cat > seed_data/seed.sql << 'EOF'
-- Cuebe Database Seed Data
-- Generated automatically from current database state

-- First, clear any existing data (in correct order to handle foreign keys)
TRUNCATE TABLE "script_shares" CASCADE;
TRUNCATE TABLE "crewAssignmentsTable" CASCADE;
TRUNCATE TABLE "crewRelationshipsTable" CASCADE;
TRUNCATE TABLE "scriptElementsTable" CASCADE;
TRUNCATE TABLE "scriptsTable" CASCADE;
TRUNCATE TABLE "showsTable" CASCADE;
TRUNCATE TABLE "departmentsTable" CASCADE;
TRUNCATE TABLE "venuesTable" CASCADE;
TRUNCATE TABLE "userTable" CASCADE;

-- Disable triggers during seed data insertion
SET session_replication_role = replica;

EOF

# Append the data (skip the header comments from pg_dump)
grep -v '^--' seed_data/data.sql | grep -v '^$' >> seed_data/seed.sql

# Re-enable triggers
cat >> seed_data/seed.sql << 'EOF'

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Update sequences to current max values
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, attname, seq_name
        FROM (
            SELECT 
                schemaname,
                tablename,
                attname,
                CASE 
                    WHEN split_part(attname, '_', array_length(string_to_array(attname, '_'), 1)) = 'id' THEN
                        pgc.relname
                END AS seq_name
            FROM pg_stats pgs
            JOIN pg_class pgc ON pgc.relname = schemaname||'_'||tablename||'_'||attname||'_seq'
            WHERE schemaname = 'public'
            AND pgc.relkind = 'S'
        ) t
        WHERE seq_name IS NOT NULL
    ) LOOP
        EXECUTE 'SELECT setval(''' || r.seq_name || ''', COALESCE((SELECT MAX(' || r.attname || ') FROM "' || r.tablename || '"), 1))';
    END LOOP;
END $$;

EOF

echo "Seed data created successfully!"
echo "Files created:"
echo "  - seed_data/schema.sql (database structure)"
echo "  - seed_data/data.sql (raw data export)"
echo "  - seed_data/seed.sql (combined seed file)"
echo ""
echo "To restore seed data, run: ./restore_seed_data.sh"