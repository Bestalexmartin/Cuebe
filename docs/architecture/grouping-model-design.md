# Script Grouping Model Design

**Date:** December 2024  
**Status:** Implemented  
**Category:** Architecture & Data Models

## Overview
Design a comprehensive grouping system for theater scripts that works for both import and export, supporting hierarchical organization of script elements.

## Current Database Model
- `parent_element_id`: UUID reference to parent element
- `group_level`: Integer depth (0=root, 1=first level, etc.)
- `is_collapsed`: Boolean UI state
- `element_type`: CUE, NOTE, GROUP

## Proposed CSV Format for Groups

### Approach 1: Hierarchical Path (Recommended)
```csv
Time,Type,Element Name,Description,Group Path,Department,Priority
0:00:00,GROUP,Act 1,,Act 1,,NORMAL
0:00:10,GROUP,Scene 1,Opening scene,Act 1/Scene 1,,NORMAL
0:00:15,CUE,Preset 1,House to half,Act 1/Scene 1,Lighting,NORMAL
0:00:30,CUE,Sound 1,Thunder effect,Act 1/Scene 1,Sound,HIGH
0:01:00,GROUP,Scene 2,Dialogue scene,Act 1/Scene 2,,NORMAL
0:01:15,CUE,Preset 2,Full stage,Act 1/Scene 2,Lighting,NORMAL
0:05:00,GROUP,Act 2,,Act 2,,NORMAL
```

**Benefits:**
- Human readable and intuitive
- Easy to edit in Excel/CSV
- Clear hierarchy visualization
- Self-documenting structure

### Approach 2: Level + Parent Name
```csv
Time,Type,Element Name,Description,Group Level,Parent Group,Department
0:00:00,GROUP,Act 1,,0,,,NORMAL
0:00:10,GROUP,Scene 1,,1,Act 1,,NORMAL
0:00:15,CUE,Preset 1,,2,Scene 1,Lighting,NORMAL
```

## Processing Logic

### Import Processing
1. **Parse Group Paths**: Split "Act 1/Scene 1" into ["Act 1", "Scene 1"]
2. **Create GROUP Elements**: Auto-create missing parent groups
3. **Calculate Levels**: Level 0 for "Act 1", Level 1 for "Scene 1", Level 2 for cues
4. **Link Relationships**: Set parent_element_id based on hierarchy
5. **Sequence Management**: Maintain document order while respecting grouping

### Export Processing
1. **Build Hierarchy**: Query elements with parent relationships
2. **Generate Paths**: Build "Act 1/Scene 1" from parent chain
3. **Flatten Structure**: Export in linear CSV format with group paths
4. **Preserve Order**: Maintain sequence while showing hierarchy

## Implementation Plan

### Phase 1: CSV Import Groups
- [ ] Add "Group Path" column detection
- [ ] Parse hierarchical paths (split by "/")  
- [ ] Create missing GROUP elements automatically
- [ ] Calculate group_level and parent_element_id
- [ ] Update import validation

### Phase 2: CSV Export Groups  
- [ ] Design export API endpoint
- [ ] Build hierarchy from database
- [ ] Generate group paths for CSV
- [ ] Create downloadable CSV export

### Phase 3: Advanced Features
- [ ] Group templates (common structures)
- [ ] Bulk group operations
- [ ] Group-based filtering and views
- [ ] Visual hierarchy in UI

## CSV Column Mapping

### Import Columns
- `Time`: offset_ms
- `Type`: element_type (CUE/NOTE/GROUP)
- `Element Name`: element_name  
- `Description`: cue_notes
- `Group Path`: Parse into hierarchy (NEW)
- `Department`: department_name (ignored for GROUP/NOTE)
- `Priority`: priority
- `Color`: custom_color
- `Duration`: duration_ms

### Special Rules
- GROUP elements don't need time if they're containers
- Groups inherit timing from first child if not specified
- Empty Group Path = root level (group_level = 0)
- Duplicate group names get numbered (Act 1, Act 1 (2))

## Example Theater Script Structure
```
Act I
├── Preset                    (0:00:00)
├── Scene 1 - Living Room
│   ├── House to Half         (0:00:30, Lighting)
│   ├── Sound Check           (0:00:45, Sound)  
│   └── Curtain Up           (0:01:00, Scenic)
├── Scene 2 - Kitchen  
│   ├── Area Lighting        (0:05:00, Lighting)
│   └── Transition Music     (0:05:30, Sound)
└── Intermission             (0:15:00)

Act II  
├── Scene 1 - Garden
│   └── Outdoor Lighting     (0:20:00, Lighting)
└── Finale                   (0:35:00)
    ├── All Systems          (0:35:00, All)
    └── House Lights         (0:36:00, Lighting)
```

This structure allows for natural theater organization while being practical for CSV import/export.