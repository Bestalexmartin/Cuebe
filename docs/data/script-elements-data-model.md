# Script Elements Data Model

**Date:** August 2025  
**Status:** Current  
**Category:** Data Architecture & Schema

## Overview

The script elements data model defines the structure for all script content in CallMaster. This includes cues, notes, and organizational groups that make up a theater production script.

## Core Element Types

### Base Element Structure
All script elements inherit from `ScriptElementBase` which provides:

- **Primary identification**: Unique IDs, script reference, element type
- **Sequencing and timing**: Order, time offsets, trigger mechanisms
- **Content**: Descriptions, notes, cue identifiers
- **Department association**: Visual organization and color coding
- **Location tracking**: Physical theater locations
- **Execution management**: Timing, fades, status tracking
- **Hierarchy support**: Basic parent/child relationships for grouping
- **Safety protocols**: Critical cue identification and safety notes
- **Audit trail**: Creation, modification, and version tracking

### Element Types

#### 1. Cue Elements (`CueElement`)
Technical and performance cues with specific department assignments.

**Required Fields:**
- `cue_id`: Department-specific identifier (e.g., "LX5", "SND12", "FLY3")
- `department_id`: Must be assigned to a department
- `description`: What the cue accomplishes

**Dynamic Cue ID Generation:**
When no explicit `cue_id` is provided, the system automatically generates IDs using the pattern:
- Format: `[DEPT_PREFIX]-[##]` (e.g., `FL-01`, `SM-03`, `LX-12`)
- Department prefix: First 2 characters of department name, uppercased
- Sequential numbering: Zero-padded 2-digit counter per department
- Maintains chronological order within each department throughout the script

**Common Use Cases:**
- Lighting changes and effects
- Sound effects and music playback
- Fly system movements
- Pyrotechnics and special effects
- Video projections
- Costume and makeup changes

#### 2. Note Elements (`NoteElement`)
Informational content and reminders without department assignment.

**Key Features:**
- `department_id`: Optional - can be general notes
- `custom_color`: Required for visual distinction
- Flexible content for any type of notation

**Common Use Cases:**
- Director's notes and reminders
- General production notes
- Safety warnings and protocols
- Performance timing notes
- Cast and crew reminders

#### 3. Group Elements (`GroupElement`)
Organizational containers for related elements.

**Key Features:**
- `child_element_ids`: Array of contained element IDs
- `is_collapsed`: UI display state
- `group_color`: Visual grouping identifier

**Common Use Cases:**
- Scene groupings
- Song or musical number sequences
- Complex multi-department sequences
- Act and scene divisions
- Safety-critical sequence groupings

## Timing and Execution

### Trigger Types
- **Manual**: Operator-initiated execution
- **Time**: Executes at specific time offset
- **Auto**: Automatically follows previous cue
- **Follow**: Follows a specific cue ID
- **Go**: Executes on "GO" command
- **Standby**: Executes on "STANDBY" command

### Execution Status Tracking
- **Pending**: Not yet executed
- **Ready**: Prepared for execution
- **Executing**: Currently running
- **Completed**: Successfully executed
- **Skipped**: Bypassed during performance
- **Failed**: Execution encountered error

### Timing Controls
- **time_offset_ms**: Milliseconds from script start (high precision timing)
- **duration**: Runtime for timed elements
- **fade_in/fade_out**: Transition timing in milliseconds
- **sequence**: Auto-incrementing order number

> **Note**: The legacy `timeOffset` field has been removed in favor of `time_offset_ms` for better precision and consistency. All time calculations now use millisecond precision throughout the system.

## Location System

### Predefined Theater Locations
- **Stage Areas**: Center, upstage, downstage, stage left/right
- **Stage Combinations**: Stage left up, stage right down, etc.
- **Technical Areas**: Fly gallery, booth, grid, trap, pit
- **Venue Areas**: House, lobby, backstage, wings, dressing rooms
- **Custom**: Other locations with details field

### Location Details
- `location`: Predefined location enum
- `location_details`: Specific location description

## Department Integration

### Department Properties
- **department_id**: Unique identifier
- **name**: Full department name
- **short_name**: Abbreviation for cue IDs (LX, SND, FLY)
- **color**: Hex color code for visual identification
- **description**: Department role and responsibilities

### Visual Organization
- Department color chips displayed with each cue
- Custom colors available for note elements
- Consistent color coding across all interfaces

## Safety and Critical Operations

### Safety Features
- `is_safety_critical`: Boolean flag for critical cues
- `safety_notes`: Specific safety instructions
- Priority levels including "critical" designation

## Basic Hierarchical Organization

### Parent-Child Relationships
- `parent_element_id`: Reference to parent element for simple grouping
- `group_level`: Depth in hierarchy (0 = root level)
- Support for basic parent/child relationships

**Note**: Advanced group management features (complex nested groups, group-specific operations) have been removed in favor of show-level crew assignments and simpler organization.

## Version Control and Audit Trail

### Metadata Tracking
- **created_by/updated_by**: User ID references
- **date_created/date_updated**: ISO timestamp strings
- **version**: Incremental version number

### Change Management
- Full audit trail of modifications
- Version comparison capabilities
- User attribution for all changes

## Display and Filtering

### Display Options
- **Visibility Controls**: Show/hide inactive elements
- **Department Filtering**: Filter by specific departments
- **Type Filtering**: Show only cues, notes, or groups
- **Priority Filtering**: Filter by priority levels
- **Sorting Options**: Sequence, time, department, cue ID
- **Grouping Views**: Group by department, type, or none
- **Department Colorization**: Optional colored backgrounds for department names with conditional border display
- **Interactive Modes**: Edit mode with selection and drag capabilities, View mode with read-only navigation

#### Department Colorization Feature
When enabled through the Options modal:
- Department names display with colored backgrounds using `department_color`
- Text changes to bold white for better contrast
- Vertical borders are conditionally hidden for seamless colored backgrounds
- NOTE elements maintain normal styling (no colorization, borders always visible)
- Enhances visual organization during script viewing and performance

### User Interface Integration

#### Interactive Features (Edit Mode)
- **Click-to-Select**: Single click selection with visual feedback through border highlighting
- **Drag-to-Reorder**: Gesture-based reordering with 150ms delay and 5px movement threshold
- **Context-Dependent Actions**: Selection-enabled toolbar buttons (Edit, Duplicate, Delete)
- **Modal-Based Operations**: User-friendly interfaces for duplication and deletion
- **Jump Navigation**: Quick scroll-to-top and scroll-to-bottom buttons

#### Toolbar Controls
- **Selection-Dependent Buttons**: Edit, Duplicate, Delete buttons enabled only when element is selected
- **Mode Switching**: Seamless transitions between View, Edit, Info, Play, and Share modes
- **Navigation Aids**: Jump-to-top and jump-to-bottom for long script navigation
- **Auto-Sort Integration**: Toggle for automatic chronological ordering

#### View Mode Features
- **Read-Only Display**: All interactions disabled for distraction-free viewing
- **Navigation Only**: Jump buttons available for script navigation
- **Clean Interface**: Pointer events disabled, optimized for performance viewing

### Playback Integration
- **Current Element Tracking**: Active cue highlighting
- **Next Element Preview**: Upcoming cue identification
- **Elapsed Time**: Real-time script timing
- **Playback Controls**: Play, pause, speed adjustment

## Form Validation

### Required Fields by Type
- **Cues**: cue_id, department_id, description
- **Notes**: description, custom_color
- **Groups**: description, child_element_ids

### Validation Rules
- **Cue ID Format**: Department-specific patterns
- **Time Constraints**: Positive values, reasonable maximums
- **Description Length**: Minimum and maximum character limits
- **Color Validation**: Valid hex color codes

## API Integration

### Database Schema Alignment
The TypeScript interfaces align with the backend database schema for:
- Consistent data validation
- Seamless API communication
- Proper relationship management
- Efficient query optimization

### Real-time Updates
- WebSocket integration for live performance mode
- Concurrent editing conflict resolution
- Automatic synchronization across clients

## Future Extensibility

### Planned Enhancements
- **Media Attachments**: Audio, video, and image references
- **Automation Integration**: DMX, MIDI, and show control protocols
- **Template System**: Reusable cue templates and patterns
- **Analytics**: Performance timing analysis and optimization
- **Collaboration Tools**: Real-time commenting and approval workflows

---

*Last Updated: August 2025*  
*Documentation Version: 1.2*