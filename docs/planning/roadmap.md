<!-- docs/planning/roadmap.md -->

# CallMaster Development Roadmap

## Overview

This roadmap outlines the development plan for CallMaster's script editing and management system, designed to provide professional-grade theater production tools with real-time collaboration capabilities.

## Vision

Transform CallMaster into a comprehensive theater production platform that supports:
- **Professional script editing** with high data density and efficient workflows
- **Real-time collaboration** between production teams using WebSocket technology
- **Department-level sharing** with automated crew notifications and remote playback
- **Document import capabilities** for existing scripts and production materials
- **Advanced playback features** for live performance support

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
  type: 'dialogue' | 'stage_direction' | 'lighting_cue' | 'sound_cue' | 'set_change' | 'intermission';
  content: string;
  departmentAssignments: DepartmentAssignment[];
  position: number;
  metadata: {
    character?: string;
    timing?: string;
    notes?: string;
  };
}

interface DepartmentAssignment {
  departmentId: string;
  crewAssignments: CrewAssignment[];
  priority: 'primary' | 'secondary';
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

### Phase 3: Department/Crew Management (Week 2-3, Parallel)
**Priority: High** | **Dependencies: Phase 1** | **Blocks: Advanced assignment features**

#### 3.1 Show-Level Assignment System
- **Department creation/management** per show
- **Crew assignment to departments** within show context
- **Assignment persistence** across all show scripts
- **Conflict detection** for overlapping assignments

#### 3.2 Assignment Interface Components
- **Department selector dropdown** with color coding
- **Multi-select crew assignment** within departments
- **Visual assignment indicators** in script view
- **Assignment conflict warnings**

#### 3.3 Data Relationship Management
- **Show-department associations**
- **Crew-department assignments** 
- **Cross-script assignment sharing**
- **Assignment history tracking**

**Success Metrics:**
- Assignment operations complete in <100ms
- No assignment conflicts go undetected
- Crew can be assigned to multiple non-conflicting elements

---

### Phase 4: Advanced Editing System (Week 3-4)
**Priority: High** | **Dependencies: Phases 1, 2**

#### 4.1 EDIT Mode Functionality
- **Element creation tools** with type selection
- **Drag-and-drop reordering** with visual feedback
- **In-line content editing** with auto-save
- **Department assignment interface** embedded in editor
- **Undo/redo system** (20-step history)

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
- **Change notifications** for collaborative editing awareness

#### 4.4 Keyboard Shortcuts System
- **Mode switching**: V/P/I/E/S
- **Element creation**: Ctrl+D (dialogue), Ctrl+S (stage direction), Ctrl+L (lighting), etc.
- **Navigation**: J/K for element traversal, G for go-to
- **Editing**: Ctrl+S (save), Ctrl+Z/Ctrl+Y (undo/redo)

**Success Metrics:**
- Element creation completes in <50ms
- Auto-save triggers within 2 seconds of changes
- Undo/redo operations are instantaneous

---

### Phase 5: Real-Time Collaboration (Week 4-5)
**Priority: Medium** | **Dependencies: Phases 1-4**

#### 5.1 WebSocket Playback System
- **Real-time script playback** across multiple clients
- **Current element highlighting** synchronized across all viewers
- **Playback controls** (play/pause/jump to cue)
- **Connection management** with auto-reconnection

#### 5.2 PLAY Mode Implementation
- **Performance-focused display** with larger text
- **Auto-scroll following** current playback position
- **Department-specific filtering** for focused viewing
- **Timer/stopwatch integration** for performance tracking

#### 5.3 WebSocket Infrastructure
```typescript
interface PlaybackState {
  scriptId: string;
  currentElementId: string;
  isPlaying: boolean;
  playbackSpeed: number;
  timestamp: number;
}

interface WebSocketMessage {
  type: 'playback_update' | 'cue_highlight' | 'user_join' | 'user_leave';
  payload: PlaybackState | any;
  userId: string;
  timestamp: number;
}
```

**Success Metrics:**
- WebSocket latency <100ms
- 99.9% message delivery success rate
- Supports 50+ concurrent viewers per script

---

### Phase 6: Department-Level Sharing (Week 5-6)
**Priority: Medium** | **Dependencies: Phase 5**

#### 6.1 SHARE Mode Advanced Features
- **Department-specific script views** with filtered content
- **Email invitation system** for crew members
- **Secure sharing links** with expiration and permissions
- **Remote playback initiation** by production managers

#### 6.2 Email Integration & Notifications
- **Automated crew invitations** with personalized script links
- **Role-specific script views** showing only relevant cues
- **Notification system** for playback events and script updates
- **Permission management** for view/edit access

#### 6.3 Collaborative Features
- **Real-time presence indicators** showing who's viewing
- **Department-specific chat** for cue-level discussions
- **Version control** with branching for different productions
- **Audit trail** for all script modifications

**Success Metrics:**
- Email delivery rate >98%
- Department-filtered views load in <1 second
- Permission changes take effect immediately

---

### Phase 7: Document Import System (Week 6-7)
**Priority: Low** | **Dependencies: Phase 4**

#### 7.1 File Format Support
- **Text file import** (.txt, .rtf, .doc, .docx)
- **Spreadsheet import** (.csv, .xlsx) for cue sheets
- **PDF parsing** for existing script documents
- **Script format detection** (standard theater formats)

#### 7.2 AI Integration for Document Parsing
- **Intelligent content recognition** using AI/ML models
- **Character dialogue detection** and separation
- **Stage direction identification** and formatting
- **Cue extraction** from technical documents
- **Format standardization** to CallMaster schema

#### 7.3 Import Processing Pipeline
```typescript
interface ImportTask {
  id: string;
  fileType: 'text' | 'spreadsheet' | 'pdf';
  status: 'processing' | 'review' | 'complete' | 'error';
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

### Phase 8: Management Interface (Week 7-8)
**Priority: Low** | **Dependencies: Phase 3**

#### 8.1 Department/Crew Management Dashboard
- **Show-wide department overview** with assignment matrix
- **Crew assignment visualization** across all scripts
- **Conflict resolution tools** for scheduling issues
- **Assignment analytics** and reporting

#### 8.2 Advanced Management Features
- **Bulk assignment operations** for efficiency
- **Template systems** for recurring production types
- **Assignment import/export** for external systems
- **Performance reporting** and analytics

**Success Metrics:**
- Management operations complete in <200ms
- Analytics load in <3 seconds
- Bulk operations handle 100+ assignments efficiently

---

## Technical Implementation Strategy

### Performance Requirements
- **Load Time**: <2 seconds for scripts with 1000+ elements
- **Edit Responsiveness**: <100ms for element creation/modification  
- **Auto-Save Reliability**: 99.9% success rate
- **WebSocket Latency**: <100ms for real-time features
- **Concurrent Users**: Support 50+ users per script

### Technology Stack Enhancements
- **Frontend**: Enhanced React components with WebSocket integration
- **Backend**: FastAPI with WebSocket endpoints and background task processing
- **Real-Time**: Redis for WebSocket message brokering
- **AI Integration**: OpenAI API or similar for document parsing
- **Email System**: SendGrid or AWS SES for crew notifications

### Security & Performance
- **Role-based access control** for script sharing
- **Rate limiting** for API endpoints
- **Connection pooling** for WebSocket scalability
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
- **WebSocket connection stability**: 99.5%
- **Auto-save success rate**: 99.9%
- **Email delivery rate**: 98%+

### Business Impact Metrics
- **Production efficiency improvement**: 25% reduction in script preparation time
- **Collaboration enhancement**: 50% reduction in communication delays
- **Error reduction**: 40% fewer missed cues due to better script management

## Iterative Development Approach

### Sprint Structure (2-week sprints)
- **Sprint 1-2**: Foundation & Core Display (Phases 1-2)
- **Sprint 3-4**: Department Management & Editing (Phases 3-4)  
- **Sprint 5-6**: Real-Time Features & Sharing (Phases 5-6)
- **Sprint 7-8**: Advanced Features & Management (Phases 7-8)

### Quality Gates
- **Code review** for all major features
- **Performance testing** before each phase completion
- **User acceptance testing** with theater professionals
- **Security review** for sharing and collaboration features

## Theater Industry Impact

This roadmap positions CallMaster as a comprehensive theater production platform that addresses real industry needs:

- **Professional Script Management**: Replaces traditional paper scripts and fragmented digital tools
- **Enhanced Collaboration**: Enables seamless communication between production departments
- **Real-Time Performance Support**: Provides live cueing and coordination during performances
- **Accessibility**: Makes professional theater tools available to community and educational theaters
- **Standardization**: Creates consistent workflows across different production types

---

*This roadmap represents a comprehensive vision for CallMaster's script management capabilities. Implementation will be iterative, with regular stakeholder feedback and adaptation based on user needs and technical discoveries.*

**Last Updated**: July 2025  
**Version**: 1.0  
**Next Review**: August 2025