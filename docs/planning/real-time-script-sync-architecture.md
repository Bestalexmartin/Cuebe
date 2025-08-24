# Real-Time Script Synchronization Architecture

**Date:** August 2025  
**Status:** Active Development - Phase 1  
**Category:** Planning & Architecture  

## Overview

This document outlines the architecture for real-time script synchronization between authenticated users (stage managers) and scoped users (crew members with share tokens). This system serves as the foundation for future real-time script playbook functionality across all connected devices.

## Problem Statement

**Current State:**
- Stage managers edit scripts in the Auth side (ManageScriptPage.tsx)
- Crew members view scripts in the Scoped side (SharedPage.tsx) with static content
- Changes made by stage managers require manual refresh by crew members
- No real-time collaboration or live updates

**Desired State:**
- Stage manager edits instantly appear in crew member views
- Real-time synchronization across all script viewers
- Foundation for live script playback during performances
- Seamless collaboration without page refreshes

## Architecture Design

### System Components

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Auth Side     │ ◄──────────────► │  Backend        │
│ (Stage Manager) │                 │  WebSocket      │
│ ManageScript    │                 │  Hub            │
└─────────────────┘                 └─────────────────┘
                                            ▲
                                            │ WebSocket
                                            ▼
                                    ┌─────────────────┐
                                    │  Scoped Side    │
                                    │ (Crew Members)  │
                                    │  SharedPage     │
                                    └─────────────────┘
```

### Data Flow

1. **Stage Manager Makes Edit** → ManageScriptPage.tsx
2. **Edit Applied Locally** → Edit Queue System
3. **Broadcast Update** → WebSocket to Backend
4. **Backend Validates** → Permissions & Share Token
5. **Forward to Room** → All connected viewers
6. **Crew Views Update** → SharedPage.tsx auto-updates

## Technical Implementation

### Phase 1: Basic Real-Time Sync (Current Focus)

#### Backend Components

**WebSocket Endpoint**
```python
# /backend/routers/script_sync.py
@router.websocket("/ws/script/{script_id}")
async def script_websocket(
    websocket: WebSocket,
    script_id: str,
    share_token: Optional[str] = None,
    user_token: Optional[str] = None
):
    # Validate permissions (authenticated user OR valid share token)
    # Join script-specific room
    # Handle real-time updates and broadcasting
```

**Update Message Format**
```typescript
interface ScriptUpdate {
  script_id: string;
  share_token?: string;
  update_type: 'element_change' | 'script_info' | 'element_order' | 'element_delete';
  changes: any;
  updated_by: string;
  timestamp: number;
  operation_id?: string; // For edit queue integration
}
```

**Room Management**
- Script rooms: `script_{script_id}`
- Permission validation for each connection
- Broadcast filtering based on share permissions

#### Frontend Components

**Real-Time Sync Hook**
```typescript
// /frontend/src/hooks/useScriptSync.ts
export const useScriptSync = (scriptId: string, shareToken?: string) => {
  const [scriptData, setScriptData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<ScriptUpdate | null>(null);
  
  // WebSocket connection management
  // Incoming update handlers
  // State synchronization
  
  const sendUpdate = (update: Partial<ScriptUpdate>) => {
    // Broadcast changes to other viewers
  };
  
  return { 
    scriptData, 
    isConnected, 
    lastUpdate,
    sendUpdate 
  };
};
```

**Integration Points**

*ManageScriptPage.tsx (Stage Manager)*
```typescript
const { sendUpdate } = useScriptSync(scriptId);

// Integrate with existing edit queue
const handleEditQueueChange = (operation: EditOperation) => {
  // Apply locally first
  applyLocalChange(operation);
  
  // Broadcast to scoped viewers
  sendUpdate({
    update_type: getUpdateType(operation),
    changes: operation,
    updated_by: user.fullName
  });
};
```

*SharedPage.tsx (Crew Member)*
```typescript
const { scriptData, isConnected, lastUpdate } = useScriptSync(scriptId, shareToken);

// Auto-update script content
useEffect(() => {
  if (lastUpdate && scriptData) {
    updateScriptDisplay(lastUpdate);
    showUpdateNotification(lastUpdate.updated_by);
  }
}, [lastUpdate, scriptData]);
```

### Update Types Supported

#### Element Changes
- **element_change**: Name, notes, priority, department, color updates
- **element_order**: Drag/drop reordering, time offset changes  
- **element_delete**: Element removal from script

#### Script Info Changes  
- **script_info**: Script name, status, start/end times, notes

#### Future Extensions
- **playback_position**: Live cue calling position
- **highlight_element**: Director highlighting specific cues
- **playback_control**: Play/pause/seek commands

## User Experience

### For Stage Managers (Auth Side)
- **No workflow changes** - existing edit interface remains identical
- **Visual feedback** - small indicator showing "syncing" status
- **Connection status** - shows number of connected crew members
- **Edit attribution** - see who made recent changes (future multi-user editing)

### For Crew Members (Scoped Side)
- **Seamless updates** - script content updates automatically
- **Change notifications** - subtle indicators when content updates
- **Connection status** - shows sync status with stage manager
- **Real-time feedback** - no more manual refreshing needed

### Update Notifications
```typescript
// Subtle notification system
interface UpdateNotification {
  type: 'element_change' | 'script_info' | 'element_order';
  message: string; // "John updated Lighting Cue 5"
  timestamp: number;
  auto_dismiss: boolean;
}
```

## Development Phases

### Phase 1: Foundation (Current)
- ✅ Basic WebSocket infrastructure
- ✅ Permission validation system
- ✅ Simple element change synchronization
- ✅ Connection status indicators

**Scope:** Stage manager edits → Crew member views update
**Timeline:** 2-3 development sessions
**Risk:** Low - builds on existing edit queue system

### Phase 2: Enhanced Sync (Next)
- Script info changes synchronization
- Element reordering and deletion sync
- Multiple crew member support
- Conflict resolution for edge cases

**Scope:** Full script editing synchronization
**Timeline:** 2-3 additional sessions
**Risk:** Medium - requires careful state management

### Phase 3: Live Playback Foundation (Future)
- Playback position tracking
- Cue calling broadcast
- Element highlighting commands
- Performance mode controls

**Scope:** Real-time script playback during shows
**Timeline:** Major feature development
**Risk:** Low - built on proven sync foundation

## Technical Considerations

### Performance
- **Efficient Updates**: Only broadcast actual changes, not full script data
- **Connection Pooling**: Reuse WebSocket connections across script views
- **Bandwidth**: Minimal - text-based updates only

### Error Handling
- **Connection Loss**: Graceful degradation with reconnection attempts
- **Update Conflicts**: Last-write-wins with conflict notifications
- **Permission Changes**: Handle share token revocation gracefully

### Security
- **Token Validation**: Every WebSocket message validates permissions
- **Share Scope**: Crew members only see updates for their shared scripts
- **Rate Limiting**: Prevent WebSocket abuse and spam

## Integration with Existing Systems

### Edit Queue System
- **Seamless Integration**: Hooks into existing `useScriptElementsWithEditQueue`
- **Operation Broadcasting**: Each edit operation triggers sync update
- **State Consistency**: Local changes apply immediately, sync is secondary

### Share Token System
- **Permission Model**: Existing share token validation extends to WebSocket
- **Scope Filtering**: Updates only sent to users with appropriate access
- **Security Layer**: No new authentication - uses existing patterns

### User Preferences
- **Settings Integration**: Sync notifications respect user preferences
- **Dark Mode**: Update notifications follow theme settings
- **Accessibility**: Screen reader compatible update announcements

## Success Metrics

### Technical Metrics
- **Latency**: Updates appear within 200ms of broadcast
- **Reliability**: 99%+ message delivery rate
- **Connection Stability**: <1% unexpected disconnections
- **Performance**: No noticeable impact on edit responsiveness

### User Experience Metrics
- **Adoption**: Crew members stop manually refreshing scripts
- **Satisfaction**: Stage managers report smoother collaboration
- **Efficiency**: Reduced time between edit and crew awareness
- **Reliability**: Zero missed critical updates during rehearsals

## Future Roadmap

### Real-Time Script Playback (Phase 3)
This foundation enables the complete vision:

**Live Performance Mode**
```typescript
interface PlaybackState {
  position: number; // Current playback position in milliseconds
  is_playing: boolean;
  current_cue: string | null;
  highlighted_elements: string[];
  playback_rate: number; // 1.0 = normal speed
}

interface PlaybackCommand {
  command: 'play' | 'pause' | 'seek' | 'highlight' | 'call_cue';
  data: any;
  issued_by: string;
  timestamp: number;
}
```

**Director/SM Controls**
- Live cue calling with position tracking
- Highlight specific elements for crew attention  
- Synchronized playback across all connected devices
- Real-time show notes and blocking updates

**Crew Experience**
- Auto-scrolling scripts during live performance
- Visual highlighting of current/upcoming cues
- Real-time updates to blocking and notes
- Synchronized view across all departments

## Getting Started

### Development Steps
1. **Backend WebSocket Setup** - Create script sync router and connection management
2. **Frontend Hook Development** - Build useScriptSync hook with connection logic
3. **ManageScript Integration** - Add broadcast functionality to edit queue
4. **SharedPage Integration** - Add real-time update handling
5. **UI Polish** - Connection indicators and update notifications
6. **Testing & Optimization** - Performance testing with multiple connections

### Testing Strategy
- **Multi-browser Testing**: Simulate stage manager + multiple crew members
- **Network Reliability**: Test connection loss and reconnection scenarios
- **Permission Changes**: Test share token revocation during active sessions
- **Performance Testing**: Large scripts with frequent updates

## Conclusion

This real-time synchronization system transforms Cuebe from a static script sharing platform into a dynamic, collaborative theater management tool. The foundation we're building supports both immediate collaboration needs and future live performance capabilities.

**Key Benefits:**
- **Immediate Value**: Eliminates manual refresh frustration
- **Collaborative Workflow**: Stage managers and crew stay synchronized
- **Performance Foundation**: Architecture ready for live show control
- **Scalable Design**: Supports multiple shows and unlimited crew members

**Development Philosophy:**
- **Start Simple**: Basic sync first, advanced features later
- **Build on Existing**: Leverages proven edit queue and share systems  
- **User-Centric**: Minimal workflow disruption, maximum benefit
- **Future-Ready**: Architecture supports advanced playback features

The real-time sync system represents a natural evolution of Cuebe's collaboration capabilities, setting the stage for advanced performance management features while providing immediate benefits to current users.