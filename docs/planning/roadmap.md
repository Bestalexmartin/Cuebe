# Cuebe Development Roadmap

**Date:** July 2025  
**Status:** Current  
**Category:** Project Planning & Strategy

## Overview

This roadmap outlines the development plan for Cuebe's script editing and management system, designed to provide professional-grade theater production tools with crew assignment and sharing capabilities.

## Vision

Transform Cuebe into a comprehensive theater production platform that supports:

- **Professional script editing** with high data density and efficient workflows (owner-only editing)
- **Crew role assignment** with department-specific crew management
- **Script sharing** with department-filtered views and permission controls
- **Note visibility controls** for author-only vs crew-visible notes
- **Document import capabilities** for existing scripts and production materials
- **Playback features** for live performance support

## Development Timeline

### Phase 1: Foundation Architecture (Week 1)

**Priority: Critical** | **Dependencies: None** | **Blocks: All subsequent phases**

#### 1.1 ScriptEditPage Layout System

- **Wide content area** (80-85% width) for high-density script display
- **Narrow toolbar** (60-80px) with icon-based controls
- **Responsive breakpoints** for mobile/tablet support
- **Navigation integration** with existing ShowCard workflow

#### 1.2 Core Data Model Design

```typescript
interface ScriptElement {
  id: string;
  type:
    | "dialogue"
    | "stage_direction"
    | "lighting_cue"
    | "sound_cue"
    | "set_change"
    | "intermission";
  content: string;
  departmentAssignments: DepartmentAssignment[];
  position: number;
  metadata: {
    character?: string;
    timing?: string;
    notes?: string;
  };
  visibility: "crew" | "author_only"; // New field for note visibility
}

interface DepartmentAssignment {
  departmentId: string;
  crewAssignments: CrewAssignment[];
  priority: "primary" | "secondary";
  notes?: string;
}

interface ShowDepartment {
  showId: string;
  departmentId: string;
  assignedCrew: CrewAssignment[];
  isActive: boolean;
}
```

#### 1.3 Navigation & Routing

- **Show → Script navigation** flow
- **Breadcrumb system** (Dashboard > Show > Script)
- **Back navigation handling** with unsaved changes protection

**Success Metrics:**

- Layout loads in <1 second
- Responsive design works on all target devices
- Data model supports 1000+ script elements per script

---

### Phase 2: Core Display System (Week 2)

**Priority: Critical** | **Dependencies: Phase 1** | **Blocks: Phases 4, 5**

#### 2.1 Mode Switching Toolbar

- **VIEW/PLAY/INFO/EDIT/SHARE** mode buttons
- **Icon-based design** with comprehensive tooltips
- **Keyboard shortcut indicators** (V/P/I/E/S)
- **Active state visual feedback**

#### 2.2 VIEW Mode Implementation

- **High-density display** without traditional card boundaries
- **Typography hierarchy** for different element types
- **Department color indicators** (colored dots/badges)
- **Search and filter capabilities**
- **Virtual scrolling** for performance (500+ elements)

#### 2.3 Script Element Components

- **ScriptDialogue** - Character names, dialogue content
- **ScriptStageDirection** - Action descriptions, blocking notes
- **ScriptCue** - Lighting/sound/technical cues
- **ScriptTransition** - Scene changes, intermissions
- **Consistent styling** without heavy visual boundaries

**Success Metrics:**

- Smooth scrolling with 1000+ elements
- Search results appear in <200ms
- Mode switching is instantaneous

---

### Phase 3: Crew Role Assignment System (Week 2-3)

**Priority: High** | **Dependencies: Phase 1** | **Blocks: Script sharing features**

#### 3.1 Show-Level Crew Management

- **Department assignment interface** for shows
- **Crew-to-department assignment** within show context
- **Role definition system** (Lead, Assistant, etc.)
- **Assignment persistence** across all show scripts
- **Conflict detection** for overlapping assignments

#### 3.2 Crew Assignment Interface Components

- **Department selector dropdown** with color coding
- **Multi-select crew assignment** within departments
- **Role assignment interface** for crew members
- **Visual assignment indicators** in script view
- **Assignment conflict warnings**

#### 3.3 Data Relationship Management

- **Show-department associations**
- **Crew-department-role assignments**
- **Cross-script assignment sharing**
- **Assignment history tracking**

**Success Metrics:**

- Assignment operations complete in <100ms
- No assignment conflicts go undetected
- Crew can be assigned to multiple non-conflicting roles
- Assignment interface is intuitive and efficient

---

### Phase 4: Owner-Only Editing System (Week 3-4)

**Priority: High** | **Dependencies: Phases 1, 2**

#### 4.1 EDIT Mode Functionality (Owner Only)

- **Element creation tools** with type selection
- **Drag-and-drop reordering** with visual feedback
- **In-line content editing** with auto-save
- **Department assignment interface** embedded in editor
- **Undo/redo system** (20-step history)
- **Note visibility controls** (crew visible vs author only)

#### 4.2 INFO Mode Enhancement

- **Script metadata editing** (enhanced from existing EditScriptPage)
- **Global script settings** and preferences
- **Department/crew overview** for current script
- **Performance statistics** and analytics

#### 4.3 Script Edit History System

- **Version tracking** for all script modifications with timestamps
- **Change audit trail** showing who made what changes when
- **History browser interface** for reviewing past versions
- **Diff visualization** comparing versions side-by-side
- **Restore capability** to revert to previous versions

#### 4.4 Keyboard Shortcuts System

- **Mode switching**: V/P/I/E/S
- **Element creation**: Ctrl+D (dialogue), Ctrl+S (stage direction), Ctrl+L (lighting), etc.
- **Navigation**: J/K for element traversal, G for go-to
- **Editing**: Ctrl+S (save), Ctrl+Z/Ctrl+Y (undo/redo)

**Success Metrics:**

- Element creation completes in <50ms
- Auto-save triggers within 2 seconds of changes
- Undo/redo operations are instantaneous
- Owner-only editing is enforced and secure

---

### Phase 5: Script Sharing & Playback (Week 4-5)

**Priority: High** | **Dependencies: Phases 1-4**

#### 5.1 Script Sharing Architecture & Token System

**Core Infrastructure:**
- **Database Schema Extensions**: New `script_shares` table for managing shared access
  - Token generation, expiration dates, department filtering, permissions
  - Support for time-based expiration and manual revocation
  - Link sharing tokens to specific script versions for consistency
- **JWT-based Sharing Tokens**: Separate from auth tokens, containing:
  - script_id, department_filter, permissions, expiration timestamp
  - Secure token generation using cryptographically secure random values
  - Token validation middleware for shared script access
- **Token Management API Endpoints**:
  - `POST /api/scripts/{id}/share` - Generate sharing URL with permissions
  - `GET /api/shared-scripts/{token}` - Access shared script (public endpoint)
  - `DELETE /api/scripts/{id}/shares/{token}` - Revoke specific share access
  - `GET /api/scripts/{id}/shares` - List all active shares for management

**Security & Access Control:**
- **Guest User Handling**: Automatic guest user creation for unregistered crew
- **Registered User Recognition**: Existing auth system integration for signed-in crew
- **Department-based Filtering**: Show only relevant cues/notes based on crew assignments
- **Read-only Enforcement**: Complete prevention of editing on shared views
- **Audit Logging**: Track all shared script access and usage patterns

#### 5.2 SHARE Mode Implementation (Owner Interface)

**Share Management Dashboard:**
- **Active Shares Overview**: List all current sharing links with status
- **Department-Specific Sharing**: Select which departments can access the script
- **Expiration Controls**: Set time-based or permanent sharing permissions
- **URL Generation Interface**: One-click copy-to-clipboard sharing URLs
- **Bulk Operations**: Share with multiple departments simultaneously
- **Revocation Management**: Individual or bulk share removal capabilities

**Share Creation Workflow:**
```
Owner clicks SHARE → Select Departments → Set Expiration → 
Generate Links → Copy URLs → Send to Crew (manual or email)
```

**Share Modal Components:**
- Department selection with color-coded checkboxes
- Date/time picker for expiration settings
- Generated URL display with copy functionality
- Preview of crew-filtered view before sharing

#### 5.3 Public Script View System (Crew Interface)

**Token-based Routing & Access:**
- **Public URLs**: `/shared/{token}` accessible without login
- **Token Validation**: Server-side verification before script access
- **Department Filtering**: Show only elements assigned to crew's departments
- **Mobile-Optimized Interface**: Responsive design for on-the-go crew access

**Crew-Focused Script Display:**
- **Simplified Interface**: Clean, distraction-free script viewing
- **Department Highlighting**: Visual emphasis on crew's assigned elements
- **Note Visibility Control**: Hide author-only notes, show crew-visible content
- **Search & Navigation**: Quick access to specific cues or sections
- **Offline Capability**: Cache script content for rehearsal/performance use

**Real-Time Updates:**
- **WebSocket Integration**: Live script changes propagated to shared views
- **Connection Status Indicators**: Show when updates are being received
- **Version Synchronization**: Ensure shared views reflect latest script changes
- **Graceful Degradation**: Fallback to polling if WebSocket unavailable

#### 5.4 PLAY Mode Implementation

**Performance-Focused Interface:**
- **Large Text Display**: Enhanced readability for performance conditions
- **Department-Specific Filtering**: Focus on relevant cues only
- **Auto-Scroll Capabilities**: Hands-free operation during performances
- **Timer Integration**: Performance tracking and cue timing

**Performance Features:**
- **Cue Highlighting**: Visual emphasis on current/upcoming cues
- **Countdown Timers**: Time-to-cue indicators for precision timing
- **Quick Navigation**: Jump to specific acts, scenes, or cue sequences
- **Emergency Controls**: Rapid access to critical information

#### 5.5 Email Integration & Automation (Future Phase)

**Third-Party Email Service Integration:**
- **Service Evaluation**: SendGrid, Mailgun, Amazon SES, Postmark, or Resend
- **Transactional Email Templates**: Professional script sharing notifications
- **Delivery Tracking**: Monitor email open rates and link clicks
- **Unsubscribe Handling**: Crew opt-out capabilities

**Automated Crew Notifications:**
```
Script Shared → Identify Crew Emails → Generate Personalized URLs → 
Send Department-Specific Emails → Track Delivery → Monitor Access
```

**Email Workflow Features:**
- **Personalized Links**: Each crew member gets department-filtered URLs
- **Batch Sending**: Efficient delivery to multiple crew members
- **Update Notifications**: Automatic alerts when scripts are modified
- **Reminder System**: Follow-up emails for unaccessed shared scripts

**Success Metrics:**

- **Performance**: Department-filtered views load in <1 second
- **Security**: Token validation and permission changes take effect immediately  
- **Reliability**: Sharing link success rate >99.5%
- **User Experience**: Script access workflow completes in <30 seconds
- **Email Integration (Future)**: Delivery rate >98%, open rate >70%

---

### Phase 6: Document Import System (Week 5-6)

**Priority: Medium** | **Dependencies: Phase 4**

#### 6.1 File Format Support

- **Text file import** (.txt, .rtf, .doc, .docx)
- **Spreadsheet import** (.csv, .xlsx) for cue sheets
- **PDF parsing** for existing script documents
- **Script format detection** (standard theater formats)

#### 6.2 AI Integration for Document Parsing

- **Intelligent content recognition** using AI/ML models
- **Character dialogue detection** and separation
- **Stage direction identification** and formatting
- **Cue extraction** from technical documents
- **Format standardization** to Cuebe schema

#### 6.3 Import Processing Pipeline

```typescript
interface ImportTask {
  id: string;
  fileType: "text" | "spreadsheet" | "pdf";
  status: "processing" | "review" | "complete" | "error";
  confidenceScore: number;
  suggestedElements: ScriptElement[];
  userReview: boolean;
}
```

**Success Metrics:**

- 90%+ accuracy for standard script formats
- Processing time <30 seconds for typical scripts
- User review interface allows easy corrections

---

### Phase 7: Management Interface (Week 6-7)

**Priority: Medium** | **Dependencies: Phase 3**

#### 7.1 Department/Crew Management Dashboard

- **Show-wide department overview** with assignment matrix
- **Crew assignment visualization** across all scripts
- **Role management tools** for different crew positions
- **Assignment analytics** and reporting

#### 7.2 Advanced Management Features

- **Bulk assignment operations** for efficiency
- **Template systems** for recurring production types
- **Assignment import/export** for external systems
- **Performance reporting** and analytics

**Success Metrics:**

- Management operations complete in <200ms
- Analytics load in <3 seconds
- Bulk operations handle 100+ assignments efficiently

---

## Removed Features (Not in Current Version)

### ~~Real-Time Collaborative Editing~~
- ~~WebSocket-based multi-user editing~~
- ~~Real-time presence indicators~~
- ~~Concurrent editing conflict resolution~~
- ~~Live change synchronization~~

**Rationale:** This version focuses on owner-only editing with sharing for viewing. Real-time collaborative editing adds significant complexity and is not required for the current use case.

## Technical Implementation Strategy

### Performance Requirements

- **Load Time**: <2 seconds for scripts with 1000+ elements
- **Edit Responsiveness**: <100ms for element creation/modification
- **Auto-Save Reliability**: 99.9% success rate
- **Sharing Response Time**: <1 second for department-filtered views
- **Assignment Operations**: <100ms for crew assignments

### Technology Stack Enhancements

- **Frontend**: Enhanced React components with role-based rendering
- **Backend**: FastAPI with role-based access control
- **Email System**: Third-party integration (SendGrid, Mailgun, Amazon SES, Postmark, or Resend) for automated crew notifications
- **AI Integration**: OpenAI API or similar for document parsing
- **Authentication**: Extended Clerk integration for role management

### Security & Performance

- **Role-based access control** for script sharing
- **Owner-only editing** enforcement
- **Rate limiting** for API endpoints
- **Connection pooling** for database scalability
- **Caching strategies** for frequently accessed scripts
- **Background processing** for import operations

## Integration Points

### Existing System Enhancement

- **BaseEditPage integration** for INFO mode
- **Department/crew data reuse** from existing management
- **Navigation consistency** with current dashboard
- **Authentication/authorization** extension for sharing

### External Service Integration

- **Email service providers** for crew notifications
- **Cloud storage** for document import processing
- **AI/ML services** for intelligent document parsing
- **Analytics platforms** for usage tracking

## Success Metrics & KPIs

### User Experience Metrics

- **Time to create script element**: <30 seconds
- **Search response time**: <200ms
- **Mode switching speed**: Instantaneous
- **User adoption rate**: 80% of active shows using script features

### Technical Performance Metrics

- **System uptime**: 99.9%
- **Auto-save success rate**: 99.9%
- **Email delivery rate**: 98%+
- **Sharing link success rate**: 99.5%

### Business Impact Metrics

- **Production efficiency improvement**: 25% reduction in script preparation time
- **Communication enhancement**: 50% reduction in communication delays
- **Error reduction**: 40% fewer missed cues due to better script management

## Iterative Development Approach

### Sprint Structure (2-week sprints)

- **Sprint 1-2**: Foundation & Core Display (Phases 1-2)
- **Sprint 3**: Crew Role Assignment System (Phase 3)
- **Sprint 4**: Owner-Only Editing System (Phase 4)
- **Sprint 5**: Script Sharing & Playback (Phase 5)
- **Sprint 6-7**: Document Import & Management (Phases 6-7)

### Quality Gates

- **Code review** for all major features
- **Security review** for sharing and role assignment features
- **Performance testing** before each phase completion
- **User acceptance testing** with theater professionals

## Theater Industry Impact

This roadmap positions Cuebe as a comprehensive theater production platform that addresses real industry needs:

- **Professional Script Management**: Replaces traditional paper scripts and fragmented digital tools
- **Crew Organization**: Streamlines crew assignment and role management
- **Secure Sharing**: Enables department-specific script access with proper permissions
- **Performance Support**: Provides live cueing and coordination during performances
- **Accessibility**: Makes professional theater tools available to community and educational theaters
- **Standardization**: Creates consistent workflows across different production types

---

_This roadmap represents a focused vision for Cuebe's script management capabilities with owner-only editing and secure sharing. Implementation will be iterative, with regular stakeholder feedback and adaptation based on user needs and technical discoveries._

**Last Updated**: January 2025  
**Version**: 2.0 - Focused on owner-only editing with sharing  
**Next Review**: February 2025