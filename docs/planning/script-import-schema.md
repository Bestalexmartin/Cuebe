# Script Import Schema Design

**Date:** August 17, 2025  
**Status:** Design Phase  
**Category:** Planning & Architecture

## Overview

This document defines the "clean" import schema for CSV script imports. The goal is to establish a standard format that all imports must conform to, providing a clear validation boundary and single source of truth for script data.

## Clean Import JSON Schema

### Complete Import Structure

```typescript
interface CleanScriptImport {
  script_metadata: ScriptMetadata;
  script_elements: ScriptElementImport[];
  import_metadata: ImportMetadata;
}

interface ScriptMetadata {
  script_name: string;
  script_status: 'DRAFT' | 'COPY' | 'WORKING' | 'FINAL';
  start_time?: string; // ISO 8601 format
  end_time?: string;   // ISO 8601 format  
  script_notes?: string;
}

interface ScriptElementImport {
  // Core element data
  element_type: 'CUE' | 'NOTE' | 'ACTION' | 'WARNING';
  element_name: string;
  cue_notes?: string;
  
  // Timing information
  offset_ms: number;           // Required: timing in milliseconds
  duration_ms?: number;        // Optional: duration in milliseconds
  sequence?: number;           // Optional: will be auto-calculated if not provided
  
  // Department association
  department_id?: string;      // UUID if known
  department_name?: string;    // Name for lookup/creation
  
  // Visual and location
  priority?: 'SAFETY' | 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'OPTIONAL';
  location_details?: string;
  custom_color?: string;       // Hex color (e.g., "#FF0000")
  
  // Grouping (for future use)
  parent_element_id?: string;
  group_level?: number;
}

interface ImportMetadata {
  source_file: string;
  import_timestamp: string;
  total_elements: number;
  warnings?: string[];
  confidence_scores?: Record<string, number>; // Future AI integration
}
```

## Optimal CSV Format

For the "golden path" workflow, the expected CSV format is:

```csv
Time,Type,Element Name,Description,Department,Priority,Location,Duration,Color
0:00:30,CUE,Preset 1,House to Half,Lighting,NORMAL,FOH,5000,#FF6B35
0:01:15,CUE,Thunder SFX,Thunder sound effect,Sound,HIGH,,3000,
0:02:00,NOTE,Check Props,Verify all props in place,Props,NORMAL,Stage Right,,#4ECDC4
0:02:30,ACTION,Standby,All departments standby,All,CRITICAL,All Areas,,#FF0000
```

### CSV Column Mappings

| CSV Column    | Maps To              | Type     | Required | Description |
|---------------|---------------------|----------|----------|-------------|
| Time          | offset_ms           | string   | Yes      | "0:01:30" or "90" or "1.5m" |
| Type          | element_type        | string   | Yes      | CUE, NOTE, ACTION, WARNING |
| Element Name  | element_name        | string   | Yes      | Brief element identifier |
| Description   | cue_notes           | string   | No       | Detailed description |
| Department    | department_name     | string   | No       | Department name or abbreviation |
| Priority      | priority            | string   | No       | SAFETY, CRITICAL, HIGH, NORMAL, LOW, OPTIONAL |
| Location      | location_details    | string   | No       | Stage location or area |
| Duration      | duration_ms         | string   | No       | Duration in same format as Time |
| Color         | custom_color        | string   | No       | Hex color code |

## Time Format Parsing

The import system will support multiple time formats:

```typescript
interface TimeFormat {
  pattern: RegExp;
  converter: (match: RegExpMatchArray) => number;
}

const TIME_FORMATS: TimeFormat[] = [
  // "1:30:45" (hours:minutes:seconds)
  {
    pattern: /^(\d+):(\d+):(\d+)$/,
    converter: ([_, h, m, s]) => (parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s)) * 1000
  },
  
  // "1:30" (minutes:seconds)
  {
    pattern: /^(\d+):(\d+)$/,
    converter: ([_, m, s]) => (parseInt(m) * 60 + parseInt(s)) * 1000
  },
  
  // "90" (seconds)
  {
    pattern: /^(\d+)$/,
    converter: ([_, s]) => parseInt(s) * 1000
  },
  
  // "1.5m" (decimal minutes)
  {
    pattern: /^(\d+(?:\.\d+)?)m$/,
    converter: ([_, m]) => Math.round(parseFloat(m) * 60 * 1000)
  },
  
  // "90s" (seconds with unit)
  {
    pattern: /^(\d+)s$/,
    converter: ([_, s]) => parseInt(s) * 1000
  }
];
```

## Department Matching Strategy

When processing department names from CSV:

1. **Exact Match**: Check existing departments by name
2. **Fuzzy Match**: Check common abbreviations (LX→Lighting, SFX→Sound)
3. **Create New**: If no match found, suggest creating new department
4. **Validation**: Warn if department seems unusual

```typescript
const DEPARTMENT_ALIASES = {
  'LX': 'Lighting',
  'QLab': 'Sound', 
  'SFX': 'Sound',
  'Props': 'Properties',
  'Set': 'Scenic',
  'Costume': 'Costumes',
  'Hair': 'Hair & Makeup',
  'Makeup': 'Hair & Makeup'
};
```

## Validation Rules

### Required Field Validation
- `script_name`: Must be provided (either in CSV metadata or form)
- `element_type`: Must be valid enum value
- `element_name`: Must be non-empty string
- `offset_ms`: Must be valid time format

### Data Quality Validation
- Time values must be non-negative and reasonable (< 24 hours)
- Color values must be valid hex format if provided
- Priority values must match enum if provided
- Element names should be unique within script (warning, not error)

### Business Logic Validation
- Elements should generally be in chronological order (warning if not)
- Duplicate timing values should be flagged as warnings
- Missing departments should be clearly identified for user decision

## Example Clean Import JSON

```json
{
  "script_metadata": {
    "script_name": "Act 1 - Opening Scene",
    "script_status": "DRAFT",
    "script_notes": "Imported from tech rehearsal notes"
  },
  "script_elements": [
    {
      "element_type": "CUE",
      "element_name": "Preset 1",
      "cue_notes": "House to Half",
      "offset_ms": 30000,
      "duration_ms": 5000,
      "department_name": "Lighting",
      "priority": "NORMAL",
      "custom_color": "#FF6B35"
    },
    {
      "element_type": "CUE", 
      "element_name": "Thunder SFX",
      "cue_notes": "Thunder sound effect",
      "offset_ms": 75000,
      "duration_ms": 3000,
      "department_name": "Sound",
      "priority": "HIGH"
    },
    {
      "element_type": "NOTE",
      "element_name": "Check Props", 
      "cue_notes": "Verify all props in place",
      "offset_ms": 120000,
      "department_name": "Properties",
      "priority": "NORMAL",
      "location_details": "Stage Right",
      "custom_color": "#4ECDC4"
    }
  ],
  "import_metadata": {
    "source_file": "act1_opening.csv",
    "import_timestamp": "2025-08-17T14:30:00Z",
    "total_elements": 3,
    "warnings": [
      "Department 'Properties' not found - will be created",
      "Element timing at 1:15 overlaps with previous element"
    ]
  }
}
```

## Implementation Strategy

### Phase 1: Golden Path (MVP)
1. **CSV Upload**: File input with drag-and-drop
2. **CSV Parsing**: Papa Parse with column header detection
3. **Time Conversion**: Support basic time formats
4. **Department Lookup**: Match against existing departments
5. **Validation**: Basic validation with clear error messages
6. **Preview**: Show parsed elements before import
7. **Import**: Create script and elements in database

### Phase 2: Enhanced Validation
1. **Advanced Time Formats**: Support more time format variations
2. **Smart Department Matching**: Fuzzy matching and aliases
3. **Data Quality Checks**: Overlap detection, sequencing validation
4. **Bulk Operations**: Import multiple scripts at once

### Phase 3: AI Enhancement
1. **Intelligent Column Detection**: AI suggests column mappings
2. **Data Cleaning**: AI standardizes inconsistent formats
3. **Quality Scoring**: AI confidence scores for data quality
4. **Smart Defaults**: AI suggests missing information

## File Structure

```
frontend/src/features/script/
├── import/
│   ├── components/
│   │   ├── ScriptImportModal.tsx
│   │   ├── CSVPreviewTable.tsx
│   │   ├── ColumnMappingInterface.tsx
│   │   └── ImportValidationPanel.tsx
│   ├── hooks/
│   │   ├── useCSVParser.ts
│   │   ├── useScriptImport.ts
│   │   └── useImportValidation.ts
│   ├── utils/
│   │   ├── csvParser.ts
│   │   ├── timeConverter.ts
│   │   ├── departmentMatcher.ts
│   │   └── importValidator.ts
│   └── types/
│       └── importSchema.ts

backend/routers/
└── script_import.py
```

## API Endpoints

```python
# POST /api/scripts/import
# - Upload CSV file
# - Return parsed data for preview
# - Include validation warnings

# POST /api/scripts/import/confirm  
# - Accept validated import data
# - Create script and elements
# - Return created script ID
```

This schema provides a solid foundation for the "golden path" workflow while being extensible for future enhancements like AI integration and advanced parsing capabilities.