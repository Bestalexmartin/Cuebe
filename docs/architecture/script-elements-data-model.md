# Script Elements Data Model

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
- **Hierarchy support**: Parent/child relationships for grouping
- **Resource assignment**: Equipment, crew, and performer requirements
- **Safety protocols**: Critical cue identification and safety notes
- **Conditional execution**: Rules for dynamic cue execution
- **Audit trail**: Creation, modification, and version tracking

### Element Types

#### 1. Cue Elements (`CueElement`)
Technical and performance cues with specific department assignments.

**Required Fields:**
- `cueID`: Department-specific identifier (e.g., "LX5", "SND12", "FLY3")
- `departmentID`: Must be assigned to a department
- `description`: What the cue accomplishes

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
- `departmentID`: Optional - can be general notes
- `customColor`: Required for visual distinction
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
- `childElementIDs`: Array of contained element IDs
- `isCollapsed`: UI display state
- `groupColor`: Visual grouping identifier

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
- **timeOffset**: Milliseconds from script start
- **duration**: Runtime for timed elements
- **fadeIn/fadeOut**: Transition timing in milliseconds
- **sequence**: Auto-incrementing order number

## Location System

### Predefined Theater Locations
- **Stage Areas**: Center, upstage, downstage, stage left/right
- **Stage Combinations**: Stage left up, stage right down, etc.
- **Technical Areas**: Fly gallery, booth, grid, trap, pit
- **Venue Areas**: House, lobby, backstage, wings, dressing rooms
- **Custom**: Other locations with details field

### Location Details
- `location`: Predefined location enum
- `locationDetails`: Specific location description

## Department Integration

### Department Properties
- **departmentID**: Unique identifier
- **name**: Full department name
- **shortName**: Abbreviation for cue IDs (LX, SND, FLY)
- **color**: Hex color code for visual identification
- **description**: Department role and responsibilities

### Visual Organization
- Department color chips displayed with each cue
- Custom colors available for note elements
- Consistent color coding across all interfaces

## Safety and Critical Operations

### Safety Features
- `isSafetyCritical`: Boolean flag for critical cues
- `safetyNotes`: Specific safety instructions
- Priority levels including "critical" designation
- Equipment and crew requirement tracking

### Resource Management
- **Equipment Required**: Array of required equipment
- **Crew Assignments**: Assigned crew member IDs
- **Performer Assignments**: Involved actor IDs

## Conditional Execution

### Conditional Rules
Rules that determine whether a cue should execute based on:
- **Weather conditions**: Outdoor performance variables
- **Cast availability**: Understudy or cast changes
- **Equipment status**: Backup cue activation
- **Time constraints**: Schedule-dependent execution
- **Custom conditions**: Production-specific rules

### Rule Structure
- **Condition type**: Category of condition
- **Operator**: Comparison method (equals, contains, etc.)
- **Value**: Comparison value
- **Description**: Human-readable explanation

## Hierarchical Organization

### Parent-Child Relationships
- `parentElementID`: Reference to parent element
- `groupLevel`: Depth in hierarchy (0 = root level)
- Supports nested groups and complex organization

### Group Management
- Collapsible groups for UI organization
- Child element arrays for group contents
- Automatic sequencing within groups

## Version Control and Audit Trail

### Metadata Tracking
- **createdBy/updatedBy**: User ID references
- **dateCreated/dateUpdated**: ISO timestamp strings
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

### Playback Integration
- **Current Element Tracking**: Active cue highlighting
- **Next Element Preview**: Upcoming cue identification
- **Elapsed Time**: Real-time script timing
- **Playback Controls**: Play, pause, speed adjustment

## Form Validation

### Required Fields by Type
- **Cues**: cueID, departmentID, description
- **Notes**: description, customColor
- **Groups**: description, childElementIDs

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

*Last Updated: July 2025*  
*Documentation Version: 1.0*