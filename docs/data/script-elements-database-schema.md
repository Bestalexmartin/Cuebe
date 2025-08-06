# Script Elements Database Schema & API Design

**Date:** August 2025  
**Status:** Current  
**Category:** Data Architecture & Database Schema

## Database Schema Updates

### New Tables Required

#### 1. `script_elements` Table
```sql
CREATE TABLE script_elements (
    -- Primary identification
    element_id VARCHAR(36) PRIMARY KEY,
    script_id VARCHAR(36) NOT NULL,
    type ENUM('cue', 'note', 'group') NOT NULL,
    
    -- Sequencing and timing
    sequence INTEGER NOT NULL,
    time_offset INTEGER DEFAULT 0, -- milliseconds
    trigger_type ENUM('manual', 'time', 'auto', 'follow', 'go', 'standby') DEFAULT 'manual',
    follows_cue_id VARCHAR(36) NULL,
    
    -- Content and identification
    cue_id VARCHAR(50) NULL, -- LX5, SND12, etc.
    description TEXT NOT NULL,
    notes TEXT NULL,
    
    -- Department and visual
    department_id VARCHAR(36) NULL,
    department_color VARCHAR(7) NULL, -- hex color override
    custom_color VARCHAR(7) NULL, -- for notes
    
    -- Location and logistics
    location ENUM('stage_left', 'stage_right', 'center_stage', 'upstage', 'downstage',
                  'stage_left_up', 'stage_right_up', 'stage_left_down', 'stage_right_down',
                  'fly_gallery', 'booth', 'house', 'backstage', 'wings_left', 'wings_right',
                  'grid', 'trap', 'pit', 'lobby', 'dressing_room', 'other') NULL,
    location_details TEXT NULL,
    
    -- Timing and execution
    duration INTEGER NULL, -- milliseconds
    fade_in INTEGER NULL, -- milliseconds
    fade_out INTEGER NULL, -- milliseconds
    
    -- Status and management
    is_active BOOLEAN DEFAULT true,
    priority ENUM('critical', 'high', 'normal', 'low', 'optional') DEFAULT 'normal',
    execution_status ENUM('pending', 'ready', 'executing', 'completed', 'skipped', 'failed') DEFAULT 'pending',
    
    -- Relationships and grouping (basic parent-child support)
    parent_element_id VARCHAR(36) NULL,
    group_level INTEGER DEFAULT 0,
    is_collapsed BOOLEAN DEFAULT false,
    
    -- Safety and conditions
    is_safety_critical BOOLEAN DEFAULT false,
    safety_notes TEXT NULL,
    
    -- Metadata
    created_by VARCHAR(36) NOT NULL,
    updated_by VARCHAR(36) NOT NULL,
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    
    -- Foreign key constraints
    FOREIGN KEY (script_id) REFERENCES scripts(script_id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    FOREIGN KEY (parent_element_id) REFERENCES script_elements(element_id) ON DELETE CASCADE,
    FOREIGN KEY (follows_cue_id) REFERENCES script_elements(element_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id),
    
    -- Indexes for performance
    INDEX idx_script_sequence (script_id, sequence),
    INDEX idx_script_time (script_id, time_offset),
    INDEX idx_department (department_id),
    INDEX idx_parent_element (parent_element_id),
    INDEX idx_cue_id (cue_id),
    INDEX idx_type_active (type, is_active)
);
```

#### Note: Supporting Tables Removed
The following tables were originally planned but have been removed as unused features:
- `script_element_equipment` - Equipment requirements per element
- `script_element_crew_assignments` - Script-level crew assignments  
- `script_element_performer_assignments` - Performer assignments per element
- `script_element_conditional_rules` - Conditional execution rules
- `script_element_groups` - Advanced group relationships

Show-level crew assignments are handled through the `crewAssignmentsTable` instead.

### Updates to Existing Tables

#### Update `departments` Table
```sql
ALTER TABLE departments ADD COLUMN IF NOT EXISTS short_name VARCHAR(10) NOT NULL DEFAULT '';
ALTER TABLE departments ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#6495ED';
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT NULL;

-- Add index for short_name lookups
CREATE INDEX idx_dept_short_name ON departments(short_name);
```

#### Update `scripts` Table (if needed)
```sql
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS element_count INTEGER DEFAULT 0;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS last_element_update TIMESTAMP NULL;
```

## API Endpoints Implementation Status

### Implemented Script Elements CRUD Operations

#### 1. Get Script Elements
```
GET /api/scripts/{script_id}/elements
```
**Implementation Status:** ✅ **COMPLETE** - Fully implemented and tested

**Query Parameters:**
- `element_type` (string): Filter by element type (cue, note, group) 
- `department_id` (UUID): Filter by department
- `active_only` (boolean, default: true): Only return active elements
- `skip` (int, default: 0): Pagination offset
- `limit` (int, default: 100, max: 1000): Pagination limit

**Response:** Direct array of ScriptElement objects
```json
[ScriptElement, ScriptElement, ...]
```

**Security:** User ownership verification through show relationship

---

#### 2. Get Single Script Element
```
GET /api/elements/{element_id}
```
**Implementation Status:** ✅ **COMPLETE** - Additional endpoint for detailed element retrieval

**Response:** Single ScriptElement with all relationships loaded
**Security:** User ownership verification through show relationship

---

#### 3. Create Script Element
```
POST /api/scripts/{script_id}/elements
```
**Implementation Status:** ✅ **COMPLETE** - Full validation and enum support

**Request Body:** Uses `ScriptElementCreate` schema
```json
{
  "element_type": "cue|note|group",
  "cue_id": "string?",
  "description": "string",
  "department_id": "UUID?",
  "time_offset_ms": number,
  "trigger_type": "manual|time|auto|follow|go|standby",
  "duration": number?,
  "location": "LocationArea?",
  "priority": "critical|high|normal|low|optional",
  "is_safety_critical": boolean,
  "sequence": number? // Auto-calculated if not provided
}
```

**Features:**
- Automatic sequence number calculation
- Department ownership validation
- Enum value validation with error handling
- Legacy field compatibility (maintains both old and new fields)

---

#### 4. Update Script Element
```
PATCH /api/elements/{element_id}
```
**Implementation Status:** ✅ **COMPLETE** - Comprehensive update with version tracking

**Request Body:** Uses `ScriptElementUpdate` schema (partial updates)
**Features:**
- Version tracking (auto-incrementing)
- User attribution (updated_by field)
- Enum validation
- Legacy field synchronization
- Timestamp updating

---

#### 5. Delete Script Element
```
DELETE /api/elements/{element_id}
```
**Implementation Status:** ✅ **COMPLETE** - Supports both soft and hard delete

**Query Parameters:**
- `soft_delete` (boolean, default: true): Soft delete vs hard delete

**Features:**
- Soft delete by default (sets is_active=False)
- Hard delete option for permanent removal
- Cascade handling for relationships

---

#### 6. Restore Script Element
```
POST /api/elements/{element_id}/restore
```
**Implementation Status:** ✅ **COMPLETE** - Restore soft-deleted elements

**Features:**
- Restores is_active flag
- Updates version and timestamp
- User attribution for restore action

---

### Implemented Bulk Operations

#### 7. Reorder Elements
```
PATCH /api/scripts/{script_id}/elements/reorder
```
**Implementation Status:** ✅ **COMPLETE** - Efficient bulk reordering

**Request Body:** Uses `ScriptElementReorderRequest` schema
```json
{
  "elements": [
    {"element_id": "UUID", "sequence": number}
  ]
}
```

**Features:**
- Updates both new sequence and legacy elementOrder fields
- Version tracking for all modified elements
- Atomic transaction handling

---

#### 8. Bulk Update Elements
```
PATCH /api/scripts/{script_id}/elements/bulk-update
```
**Implementation Status:** ✅ **COMPLETE** - Mass property updates

**Request Body:** Uses `ScriptElementBulkUpdate` schema
```json
{
  "element_ids": ["UUID"],
  "department_id": "UUID?",
  "priority": "string?",
  "execution_status": "string?",
  "location": "string?",
  "is_safety_critical": boolean?,
  "custom_color": "string?"
}
```

**Features:**
- Selective property updates
- Enum validation
- Atomic transactions
- Version tracking for all modified elements

---

### Planned Future Endpoints (Not Yet Implemented)

#### 9. Duplicate Element
```
POST /api/scripts/{script_id}/elements/{element_id}/duplicate
```
**Status:** 🚧 **PLANNED** - Future implementation

#### 10. Group Management
```
POST /api/scripts/{script_id}/elements/{group_id}/children
PATCH /api/scripts/{script_id}/elements/{group_id}/collapse  
DELETE /api/scripts/{script_id}/elements/{group_id}/children/{child_id}
```
**Status:** 🚧 **PLANNED** - Future implementation for advanced grouping

#### 11. Department Operations
```
GET /api/departments
POST /api/departments
PATCH /api/departments/{department_id}
DELETE /api/departments/{department_id}
```
**Status:** ✅ **IMPLEMENTED** - Available in separate departments router

---

## Testing Status

### Endpoint Testing
- **Health checks:** All endpoints respond correctly
- **Authentication:** User ownership verification working
- **Validation:** Enum validation and error handling tested
- **Performance:** Pagination and filtering optimized
- **Error handling:** Comprehensive error responses

### Integration Testing
- **Database integrity:** Foreign key constraints working
- **Cascade operations:** Show/script deletion cascades properly
- **Transaction safety:** Atomic operations for bulk updates
- **Legacy compatibility:** Both old and new field structures maintained

---

## Implementation Notes

### Security Features
- All endpoints require authentication via `get_current_user`
- User ownership verified through show relationships
- Department ownership validated for assignments
- Comprehensive authorization checks

### Performance Optimizations
- Pagination support (skip/limit) for large datasets
- Selective field updates in PATCH operations
- Efficient ordering by sequence and timeOffsetMs
- Joinedload for reducing N+1 queries

### Data Consistency
- Automatic sequence number management
- Legacy field synchronization (elementOrder, timeOffset, elementDescription)
- Version tracking for audit trails
- Soft delete preservation for data integrity

### Error Handling
- Enum validation with descriptive error messages
- Database constraint violation handling
- Graceful degradation for missing relationships
- Comprehensive logging for debugging

---

*API Implementation completed July 2025*  
*Database cleanup completed August 2025*  
*All core CRUD operations are production-ready*

#### 10. Playback and Execution
```
GET /api/scripts/{script_id}/playback/state
POST /api/scripts/{script_id}/playback/start
POST /api/scripts/{script_id}/playback/pause
POST /api/scripts/{script_id}/playback/stop
PATCH /api/scripts/{script_id}/elements/{element_id}/execute
```

## Database Migrations

### Migration Strategy
1. **Phase 1**: Create new tables for script elements
2. **Phase 2**: Update existing tables with new columns
3. **Phase 3**: Migrate any existing script data
4. **Phase 4**: Add indexes and constraints
5. **Phase 5**: Update API endpoints

### Data Migration Considerations
- Preserve existing script metadata
- Handle any existing script content gracefully
- Maintain foreign key relationships
- Backup data before migration

## Performance Optimizations

### Indexing Strategy
- Composite indexes on (script_id, sequence) for ordered retrieval
- Department and type filtering indexes
- Parent-child relationship indexes for group queries

### Query Optimization
- Use JOIN queries for element + department data
- Implement pagination for large scripts
- Consider caching for frequently accessed scripts

### Real-time Considerations
- WebSocket events for live script updates
- Optimistic updates for UI responsiveness
- Conflict resolution for concurrent edits

## API Security and Validation

### Authentication
- All endpoints require valid user authentication
- Script access permissions based on show membership
- Department-specific permissions for cue modifications

### Data Validation
- Enforce required fields by element type
- Validate time offset and duration values
- Check cue ID uniqueness within department/script
- Validate color codes and enum values

### Rate Limiting
- Bulk operations limited by element count
- Real-time updates throttled to prevent spam
- Export operations with appropriate limits

---

*Last Updated: August 2025*  
*Documentation Version: 1.1*