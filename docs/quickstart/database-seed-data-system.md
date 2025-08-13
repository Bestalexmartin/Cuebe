# Database Seed Data System

**Date:** August 2025  
**Status:** Current  
**Category:** Data Management & Infrastructure

## Overview

The Cuebe database seed data system provides a robust solution for creating, storing, and restoring database snapshots. This system addresses circular foreign key constraints and ensures reliable database backup and restoration across different environments.

## Problem Statement

The Cuebe database contains self-referencing foreign key constraints in:
- `userTable.created_by → userTable.user_id` (user creation tracking)
- `scriptElementsTable.parent_element_id → scriptElementsTable.element_id` (hierarchical script elements)

These circular constraints create challenges for data export/import operations and require specialized handling.

## Solution Architecture

### Constraint Management

The system automatically handles circular foreign key constraints by:

1. **Making constraints deferrable**: Modified constraints to be `DEFERRABLE INITIALLY DEFERRED`
2. **Transaction-based restoration**: All data restoration occurs within a single transaction
3. **Dependency-aware ordering**: Tables are processed in dependency order during export/import

### Seed Data Tools

The system provides multiple tools for different use cases:

#### Basic Tools
- **`create_seed_data.sh`** - Simple shell script for basic exports
- **`restore_seed_data.sh`** - Basic restoration with safety prompts

#### Advanced Tools  
- **`create_seed_data_advanced.py`** - Python script with proper dependency handling
- **`restore_advanced_seed.sh`** - Advanced restoration using constraint-aware data

## File Structure

```
backend/
├── create_seed_data.sh           # Basic seed creation
├── restore_seed_data.sh          # Basic restoration
├── create_seed_data_advanced.py  # Advanced Python tool
├── restore_advanced_seed.sh      # Advanced restoration
└── seed_data/                    # Generated seed data directory
    ├── schema.sql                # Database structure only
    ├── data.sql                  # Raw data export
    ├── seed.sql                  # Combined basic seed file
    ├── advanced_seed.sql         # Constraint-aware seed file
    └── seed_data.json           # JSON format for programmatic access
```

## Usage Guide

### Creating Seed Data

#### Method 1: Basic Creation
```bash
cd backend
./create_seed_data.sh
```

**Creates:**
- `seed_data/schema.sql` - Database structure
- `seed_data/data.sql` - Raw data export  
- `seed_data/seed.sql` - Combined seed file

#### Method 2: Advanced Creation (Recommended)
```bash
cd backend
python3 create_seed_data_advanced.py
```

**Creates:**
- `seed_data/advanced_seed.sql` - Constraint-aware SQL
- `seed_data/seed_data.json` - JSON format

**Advantages:**
- Handles table dependencies correctly
- Exports data in safe order
- Creates constraint-aware restoration scripts
- Provides JSON format for programmatic access

### Restoring Seed Data

#### Method 1: Basic Restoration
```bash
cd backend
./restore_seed_data.sh
```

#### Method 2: Advanced Restoration (Recommended)
```bash
cd backend
./restore_advanced_seed.sh
```

**Safety Features:**
- Interactive confirmation prompts
- Automatic backend container shutdown during restoration
- Automatic backend restart after completion
- Error handling and rollback capabilities

## Cross-System Deployment

### Setting Up on New System

1. **Clone the repository**:
```bash
git clone <repository-url>
cd Cuebe
```

2. **Set up environment**:
```bash
# Copy and configure environment file
cp .env.example .env
# Edit .env with your database credentials
```

3. **Start containers**:
```bash
docker-compose up -d
```

4. **Restore seed data**:
```bash
cd backend
./restore_advanced_seed.sh
```

### Environment Configuration

Ensure your `.env` file contains:
```bash
# Database Configuration
POSTGRES_USER=alex
POSTGRES_PASSWORD=your_password
POSTGRES_DB=cuebe_db

# Docker Compose Configuration  
COMPOSE_PROJECT_NAME=cuebe
```

### Production Considerations

#### Security
- **Never commit real passwords** to version control
- Use environment-specific `.env` files
- Consider using Docker secrets for production passwords

#### Data Privacy
- **Review seed data content** before sharing across environments
- Remove or anonymize sensitive production data
- Consider creating separate seed data for different environments (dev/staging/production)

#### Performance
- Large datasets may require optimization of the restoration process
- Consider chunked restoration for very large databases
- Monitor disk space during seed data creation

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
Error: port 5432 already allocated
```
**Solution:** Stop existing PostgreSQL containers
```bash
docker-compose down
docker ps -a | grep postgres
```

#### Permission Denied
```bash
Permission denied: ./create_seed_data.sh
```
**Solution:** Make scripts executable
```bash
chmod +x *.sh *.py
```

#### Circular Constraint Warnings
```
pg_dump: warning: there are circular foreign-key constraints
```
**Note:** These warnings are expected and do not affect functionality when using the deferrable constraints.

#### Database Connection Failed
```bash
psycopg2.OperationalError: connection to server failed
```
**Solution:** Ensure database container is running and accessible
```bash
docker-compose ps
docker logs cuebe-db
```

### Data Validation

After restoration, verify data integrity:

```bash
# Check table counts
docker exec cuebe-db psql -U alex -d cuebe_db -c "
SELECT schemaname,tablename,n_tup_ins as \"rows\" 
FROM pg_stat_user_tables 
ORDER BY tablename;"

# Verify foreign key constraints
docker exec cuebe-db psql -U alex -d cuebe_db -c "
SELECT COUNT(*) as constraint_violations 
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY';"
```

## Technical Implementation

### Constraint Modification Query
```sql
-- Make self-referencing constraints deferrable
ALTER TABLE "userTable" DROP CONSTRAINT "userTable_created_by_fkey";
ALTER TABLE "userTable" ADD CONSTRAINT "userTable_created_by_fkey" 
    FOREIGN KEY (created_by) REFERENCES "userTable"(user_id) 
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "scriptElementsTable" DROP CONSTRAINT "scriptElementsTable_parent_element_id_fkey";
ALTER TABLE "scriptElementsTable" ADD CONSTRAINT "scriptElementsTable_parent_element_id_fkey" 
    FOREIGN KEY (parent_element_id) REFERENCES "scriptElementsTable"(element_id) 
    DEFERRABLE INITIALLY DEFERRED;
```

### Table Dependency Order
The advanced tools process tables in this dependency order:
1. `userTable` (base table with self-reference)
2. `venuesTable`
3. `departmentsTable`
4. `showsTable`
5. `scriptsTable`
6. `scriptElementsTable` (self-referencing)
7. `crewRelationshipsTable`
8. `crewAssignmentsTable`
9. `script_shares`

## Best Practices

### Development Workflow
1. **Create seed data** when database reaches a stable state
2. **Version control** seed data files (excluding sensitive information)
3. **Test restoration** in clean environment before deployment
4. **Document changes** when modifying database schema

### Maintenance
- **Regenerate seed data** after significant schema changes
- **Regular validation** of seed data integrity
- **Monitor file sizes** and consider data archival strategies
- **Review and clean** old seed data files periodically

## Integration with Development Guide

This seed data system integrates with the broader development workflow documented in `/docs/development/development-guide.md`. For new developers:

1. Follow the development guide setup
2. Use `./restore_advanced_seed.sh` instead of manual database setup
3. Begin development with pre-populated realistic data

## Related Documentation

- `/docs/development/development-guide.md` - General development setup
- `/docs/architecture/system-architecture.md` - Database architecture
- `/docs/data/script-elements-database-schema.md` - Database schema details