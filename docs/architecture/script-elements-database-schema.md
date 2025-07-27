# Script Elements Database Schema & API Design

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
    
    -- Relationships and grouping
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

#### 2. `script_element_equipment` Table (Many-to-Many)
```sql
CREATE TABLE script_element_equipment (
    element_id VARCHAR(36) NOT NULL,
    equipment_name VARCHAR(100) NOT NULL,
    is_required BOOLEAN DEFAULT true,
    notes TEXT NULL,
    
    PRIMARY KEY (element_id, equipment_name),
    FOREIGN KEY (element_id) REFERENCES script_elements(element_id) ON DELETE CASCADE
);
```

#### 3. `script_element_crew_assignments` Table (Many-to-Many)
```sql
CREATE TABLE script_element_crew_assignments (
    element_id VARCHAR(36) NOT NULL,
    crew_id VARCHAR(36) NOT NULL,
    assignment_role VARCHAR(100) NULL,
    is_lead BOOLEAN DEFAULT false,
    
    PRIMARY KEY (element_id, crew_id),
    FOREIGN KEY (element_id) REFERENCES script_elements(element_id) ON DELETE CASCADE,
    FOREIGN KEY (crew_id) REFERENCES crew(crew_id) ON DELETE CASCADE
);
```

#### 4. `script_element_performer_assignments` Table (Many-to-Many)
```sql
CREATE TABLE script_element_performer_assignments (
    element_id VARCHAR(36) NOT NULL,
    performer_id VARCHAR(36) NOT NULL,
    character_name VARCHAR(100) NULL,
    notes TEXT NULL,
    
    PRIMARY KEY (element_id, performer_id),
    FOREIGN KEY (element_id) REFERENCES script_elements(element_id) ON DELETE CASCADE
    -- Note: performer_id references would depend on cast management system
);
```

#### 5. `script_element_conditional_rules` Table
```sql
CREATE TABLE script_element_conditional_rules (
    rule_id VARCHAR(36) PRIMARY KEY,
    element_id VARCHAR(36) NOT NULL,
    condition_type ENUM('weather', 'cast', 'equipment', 'time', 'custom') NOT NULL,
    operator ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than') NOT NULL,
    condition_value TEXT NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    FOREIGN KEY (element_id) REFERENCES script_elements(element_id) ON DELETE CASCADE,
    INDEX idx_element_conditions (element_id)
);
```

#### 6. `script_element_groups` Table (For Group Relationships)
```sql
CREATE TABLE script_element_groups (
    group_id VARCHAR(36) NOT NULL,
    child_element_id VARCHAR(36) NOT NULL,
    order_in_group INTEGER NOT NULL,
    
    PRIMARY KEY (group_id, child_element_id),
    FOREIGN KEY (group_id) REFERENCES script_elements(element_id) ON DELETE CASCADE,
    FOREIGN KEY (child_element_id) REFERENCES script_elements(element_id) ON DELETE CASCADE,
    INDEX idx_group_order (group_id, order_in_group)
);
```

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

## API Endpoints Required

### Script Elements CRUD Operations

#### 1. Get Script Elements
```
GET /api/scripts/{script_id}/elements
```
**Query Parameters:**
- `include_inactive` (boolean): Include disabled elements
- `department_id` (string): Filter by department
- `type` (string): Filter by element type
- `parent_only` (boolean): Only return top-level elements

**Response:**
```json
{
  "elements": [ScriptElement],
  "departments": [Department],
  "total_count": number,
  "active_count": number
}
```

#### 2. Create Script Element
```
POST /api/scripts/{script_id}/elements
```
**Request Body:**
```json
{
  "type": "cue|note|group",
  "cue_id": "string?",
  "description": "string",
  "department_id": "string?",
  "time_offset": number,
  "trigger_type": "manual|time|auto|follow|go|standby",
  "duration": number?,
  "location": "LocationArea?",
  "priority": "critical|high|normal|low|optional",
  "is_safety_critical": boolean,
  "equipment_required": ["string"],
  "crew_assignments": ["string"],
  "conditional_rules": [ConditionalRule],
  // ... other fields
}
```

#### 3. Update Script Element
```
PATCH /api/scripts/{script_id}/elements/{element_id}
```
**Request Body:** Partial ScriptElementFormData

#### 4. Delete Script Element
```
DELETE /api/scripts/{script_id}/elements/{element_id}
```

#### 5. Bulk Operations
```
POST /api/scripts/{script_id}/elements/bulk
```
**Actions:** create, update, delete, reorder

### Specialized Endpoints

#### 6. Reorder Elements
```
PATCH /api/scripts/{script_id}/elements/reorder
```
**Request Body:**
```json
{
  "element_orders": [
    {"element_id": "string", "sequence": number}
  ]
}
```

#### 7. Duplicate Element
```
POST /api/scripts/{script_id}/elements/{element_id}/duplicate
```

#### 8. Group Management
```
POST /api/scripts/{script_id}/elements/{group_id}/children
PATCH /api/scripts/{script_id}/elements/{group_id}/collapse
DELETE /api/scripts/{script_id}/elements/{group_id}/children/{child_id}
```

#### 9. Department Operations
```
GET /api/departments
POST /api/departments
PATCH /api/departments/{department_id}
DELETE /api/departments/{department_id}
```

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

*Last Updated: July 2025*  
*Documentation Version: 1.0*