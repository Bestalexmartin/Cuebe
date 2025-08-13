# Script Management Workflows

**Date:** January 2025  
**Status:** Current (Updated for New Features)  
**Category:** User Documentation & Workflows

## Overview

This guide provides step-by-step workflows for common script management tasks in Cuebe. These workflows are designed to help users efficiently create, edit, and manage theatrical scripts using the ManageScriptPage interface.

## Basic Navigation

### Accessing Script Management

1. **From Dashboard**: Click on a script card in the Shows view
2. **From Show Details**: Select a script from the show's script list
3. **Direct Navigation**: Use browser bookmarks or direct URLs

### Interface Overview

The ManageScriptPage provides:
- **Header**: Script title, action buttons (Cancel, Save Changes)
- **Main Area**: Script content (left) and toolbar (right, desktop only)
- **Modes**: Six different operational modes (Info, View, Edit, Play, Share, History)
- **Mobile**: Responsive design with drawer-based toolbar

## Core Workflows

### 1. Editing Script Information

**Purpose**: Update script metadata (name, status, times, notes)

#### Steps:
1. **Enter Info Mode**: Click "Info" in the toolbar
2. **Edit Fields**:
   - **Script Name**: Required, 4-100 characters
   - **Script Status**: Select from dropdown (DRAFT, ACTIVE, ARCHIVED, etc.)
   - **Start Time**: Use datetime picker for show start
   - **End Time**: Use datetime picker for show end
   - **Notes**: Optional, up to 500 characters
3. **Validation**: Red floating panel appears for any validation errors
4. **Save Changes**: 
   - **Automatic**: Changes saved to edit queue when switching modes
   - **Manual**: Use "Save Changes" button in header
5. **Review**: Check edit history in History mode to see changes

#### Important Notes:
- Changes are added to edit queue, not saved immediately
- Validation errors prevent saving
- Browser navigation is blocked with unsaved changes

### 2. Script Sharing Workflow

**Purpose**: Securely share scripts with crew members

#### Creating Script Shares:
1. **Access Sharing**: Click "Share" button in script toolbar
2. **Toggle Script Sharing**: Use "Share with All Crew" toggle
3. **Individual Shares** (Future Feature):
   - Select crew members from your managed crew
   - Set permissions (view, download)
   - Configure expiration dates
   - Add share-specific notes
4. **Generate Access**: System creates secure share tokens
5. **Distribute Links**: Share URLs or QR codes with crew members

#### Managing Existing Shares:
1. **View Active Shares**: See all current script shares
2. **Monitor Usage**: Track access counts and last access times
3. **Modify Permissions**: Update share settings as needed
4. **Revoke Access**: Immediately disable problematic shares
5. **Audit Trail**: Review access logs for security

#### Accessing Shared Scripts:
1. **Public Access**: No login required, use share token
2. **Mobile Optimized**: Touch-friendly interface for crew access
3. **Department Filtering**: See only relevant script elements
4. **Read-Only Access**: Cannot modify shared script content

### 3. Edit Queue Management Workflow

**Purpose**: Professional non-destructive editing with undo/redo

#### Understanding Edit Queue:
1. **Local Changes**: All edits stored locally until saved
2. **Non-Destructive**: Original data preserved until save
3. **Operation History**: Complete audit trail of all changes
4. **Undo/Redo**: Full reversal capability for any operation

#### Working with Edit Queue:
1. **Make Changes**: Edit script info, elements, sequences
2. **Review Queue**: Use "History" mode to see pending changes
3. **Undo Operations**: Reverse individual or multiple changes
4. **Batch Save**: Save all changes together to server
5. **Discard Changes**: Revert to last saved state if needed

#### Edit Queue Features:
- **Human-Readable History**: Clear descriptions of all changes
- **Operation Summaries**: "3 updates, 2 new elements, 1 reorder"
- **Colored Operation Types**: Visual coding for different change types
- **Export Capability**: Copy change logs to clipboard
- **Auto-Sort Integration**: Preference changes with immediate reordering

### 2. Viewing Scripts

**Purpose**: Read-only script review and presentation

#### Steps:
1. **Enter View Mode**: Click "View" in toolbar (default mode)
2. **Navigate Content**:
   - **Scroll**: Use mouse wheel or scroll bars
   - **Jump Navigation**: Use "Top" and "Bottom" buttons when available
3. **Customize Display**:
   - **Options**: Click gear icon → Options
   - **Department Colors**: Enable colorized department names
   - **Clock Times**: Show absolute times instead of relative offsets
4. **Switch Modes**: Use toolbar to switch to Edit, Play, or Share modes

#### View Mode Features:
- **Non-interactive**: Elements cannot be selected or modified
- **Performance optimized**: Efficient rendering for large scripts
- **Professional display**: Clean, distraction-free presentation

### 3. Adding Script Elements

**Purpose**: Create new cues, notes, and groups

#### Steps:
1. **Enter Edit Mode**: Click "Edit" in toolbar
2. **Add Element**: Click "Add" button in toolbar
3. **Select Element Type**:
   - **Cue**: Specific action or event
   - **Note**: General information or reminder
   - **Group**: Container for organizing related elements
4. **Fill Form**:
   - **Description**: Clear, descriptive name
   - **Time Offset**: When element occurs (MM:SS or milliseconds)
   - **Department**: Responsible department
   - **Priority**: Importance level
   - **Notes**: Additional details
   - **Location**: Where action occurs
5. **Save**: Click "Create" to add to edit queue
6. **Review**: Element appears immediately in edit view

#### Auto-Sort Behavior:
- If **auto-sort enabled**: New element automatically positioned by time
- If **auto-sort disabled**: Element added at selected position

### 4. Editing Script Elements

**Purpose**: Modify existing cues, notes, and groups

#### Steps:
1. **Enter Edit Mode**: Click "Edit" in toolbar
2. **Select Element**: Click on desired element (highlighted in blue)
3. **Edit Element**: Click "Edit" button in toolbar
4. **Modify Fields**: Update description, timing, department, etc.
5. **Save Changes**: Click "Save" in modal
6. **Review**: Changes appear immediately and are added to edit queue

#### Element Selection:
- **Single Selection**: Click element to select/deselect
- **Visual Feedback**: Selected elements have blue highlight
- **Context Actions**: Edit, duplicate, delete buttons require selection

### 5. Reordering Script Elements

**Purpose**: Change the sequence of script elements

#### Steps:
1. **Enter Edit Mode**: Click "Edit" in toolbar
2. **Drag Element**: Click and drag element to new position
3. **Handle Auto-Sort Conflicts**:
   - **Same Time Offset**: Reorder applied immediately
   - **Different Time Offsets**: Modal appears with options:
     - **Match Before**: Set time to element above
     - **Match After**: Set time to element below
     - **Disable Auto-Sort**: Keep current times, disable feature
     - **Cancel**: Revert to original position
4. **Confirm Action**: Choose appropriate option in modal
5. **Review**: Check edit history for reorder operations

#### Auto-Sort Integration:
- **Enabled**: Elements with different times trigger conflict modal
- **Disabled**: All reorders applied immediately
- **Toggle**: Use Options modal to enable/disable auto-sort

### 6. Using Auto-Sort

**Purpose**: Automatically organize elements by time offset

#### Enabling Auto-Sort:
1. **Options Modal**: Click gear icon → Options
2. **Enable Checkbox**: Check "Auto-sort cues by time offset"
3. **Immediate Reorder**: Elements reorganize by time automatically
4. **Review Changes**: Check History mode for sort operations

#### Auto-Sort Behavior:
- **New Elements**: Automatically positioned by time
- **Time Changes**: Elements reposition when time offset changes
- **Drag Conflicts**: Modal appears for conflicting time offsets
- **Edit Queue**: All sort operations tracked for undo/review

### 7. Duplicating Elements

**Purpose**: Create copies of existing elements

#### Steps:
1. **Enter Edit Mode**: Click "Edit" in toolbar
2. **Select Element**: Click on element to duplicate
3. **Duplicate**: Click "Duplicate" button in toolbar
4. **Modify Details**:
   - **Description**: Edit to differentiate from original
   - **Time Offset**: Adjust timing as needed
5. **Confirm**: Click "Duplicate" to create copy
6. **Review**: New element appears in script with modifications

### 8. Deleting Elements

**Purpose**: Remove unwanted cues, notes, or groups

#### Steps:
1. **Enter Edit Mode**: Click "Edit" in toolbar
2. **Select Element**: Click on element to delete
3. **Delete**: Click "Delete" button in toolbar
4. **Confirm**: Two-tier confirmation process:
   - **Initial**: Confirm deletion intent
   - **Final**: Confirm permanent removal
5. **Complete**: Element removed and added to edit queue for potential undo

#### Safety Features:
- **Two-tier confirmation**: Prevents accidental deletion
- **Edit queue**: Deletions can be undone before saving
- **Visual feedback**: Clear confirmation dialogs

### 9. Managing Edit History

**Purpose**: Review, undo, and manage pending changes

#### Steps:
1. **View History**: Click "History" in toolbar
2. **Review Changes**: See chronological list of all operations
3. **Revert Changes**:
   - **Revert to Point**: Click specific operation to undo back to that point
   - **Clear All**: Use "Clear History" to discard all changes
4. **Confirmation**: Two-tier confirmation for destructive operations
5. **Return**: Switch back to Edit or View mode to continue

#### History Features:
- **Color-coded operations**: Visual distinction between operation types
- **Human-readable descriptions**: Clear explanations of each change
- **Copy functionality**: Export change log to clipboard
- **Summary statistics**: Overview of pending changes

### 10. Saving Changes

**Purpose**: Persist all pending changes to the server

#### Steps:
1. **Check Status**: "Save Changes" button enabled when changes exist
2. **Initiate Save**: Click "Save Changes" in header
3. **Confirm**: Review changes in save confirmation modal
4. **Process**: Save processing modal shows progress
5. **Complete**: Success message confirms all changes saved
6. **Continue**: Return to normal editing with clean slate

#### Save Process:
- **Batch Operation**: All changes saved in single transaction
- **Error Handling**: Failed saves preserve edit queue for retry
- **Validation**: Server-side validation before persistence
- **Feedback**: Clear success/error messages

## Advanced Workflows

### 11. Collaborative Editing

**Purpose**: Work with others while maintaining change integrity

#### Best Practices:
1. **Regular Saves**: Save frequently to share changes
2. **Communication**: Coordinate with team on major changes
3. **Change Review**: Use History mode to review team changes
4. **Conflict Resolution**: Refresh and merge changes as needed

### 12. Script Preparation for Performance

**Purpose**: Prepare scripts for live show use

#### Steps:
1. **Final Review**: Use View mode for clean presentation
2. **Timing Verification**: Check all time offsets and clock times
3. **Department Coordination**: Verify department assignments
4. **Export Options**: Use Share mode for distribution (future feature)
5. **Performance Mode**: Switch to Play mode during show (future feature)

### 13. Script Maintenance

**Purpose**: Keep scripts organized and up-to-date

#### Regular Tasks:
1. **Status Updates**: Keep script status current (DRAFT → ACTIVE → ARCHIVED)
2. **Cleanup**: Remove outdated or irrelevant elements
3. **Organization**: Use auto-sort to maintain chronological order
4. **Documentation**: Add notes for future reference
5. **Backup**: Regular saves preserve change history

## Troubleshooting

### Common Issues

#### Validation Errors
- **Symptom**: Red floating error panel appears
- **Solution**: Address each validation message before saving
- **Prevention**: Use real-time validation to catch errors early

#### Unsaved Changes Warning
- **Symptom**: Browser warning when navigating away
- **Solution**: Save changes or use Cancel to discard
- **Prevention**: Regular saves to avoid losing work

#### Auto-Sort Conflicts
- **Symptom**: Modal appears during drag operations
- **Solution**: Choose appropriate time offset resolution
- **Prevention**: Coordinate time offsets when auto-sort is enabled

#### Performance Issues
- **Symptom**: Slow response with large scripts
- **Solution**: Use View mode for read-only operations
- **Prevention**: Regular cleanup of unused elements

### Recovery Procedures

#### Lost Changes
1. **Check Edit History**: Verify what changes exist
2. **Save Attempt**: Try saving to preserve current state
3. **Browser Refresh**: Last resort - will lose unsaved changes
4. **Data Recovery**: Contact administrator if needed

#### Modal Issues
1. **Stuck Modal**: Press Escape key or click outside modal
2. **Missing Buttons**: Refresh page to restore interface
3. **Form Reset**: Use Cancel to exit without saving

#### Navigation Problems
1. **Mode Switching**: Use toolbar buttons or mobile drawer
2. **Scroll Issues**: Use jump buttons or keyboard navigation
3. **Mobile Issues**: Use drawer menu for full functionality

## Best Practices

### Workflow Efficiency
- **Plan Changes**: Review script structure before major edits
- **Batch Operations**: Group related changes together
- **Regular Saves**: Don't let edit queue grow too large
- **Use History**: Review changes before saving

### Data Integrity
- **Validation**: Address errors immediately
- **Consistent Naming**: Use clear, descriptive element names
- **Time Coordination**: Ensure time offsets are accurate
- **Department Assignment**: Verify department responsibilities

### Team Collaboration
- **Communication**: Coordinate with team on changes
- **Change Documentation**: Use notes to explain modifications
- **Regular Updates**: Keep script status current
- **Backup Strategy**: Save frequently and maintain backups

### Performance Optimization
- **Mode Selection**: Use appropriate mode for task
- **Element Management**: Remove unused elements
- **Browser Performance**: Close unnecessary tabs/applications
- **Network Considerations**: Save during stable connections

## Future Features

### Planned Enhancements
- **Real-time Collaboration**: Multiple users editing simultaneously
- **Advanced Export**: PDF, CSV, and other format exports
- **Performance Integration**: Live show playback and control
- **Version Control**: Branch and merge capabilities
- **Advanced Search**: Find and filter elements quickly

### Integration Opportunities
- **External Systems**: QLab, lighting consoles, sound boards
- **Mobile Apps**: Dedicated mobile interfaces
- **Cloud Sync**: Cross-device synchronization
- **API Access**: Third-party integrations

## Related Documentation

- [ManageScriptPage Component Guide](../components/manage-script-page.md)
- [Script Mode System](../features/script-mode-system.md)
- [Edit Queue System](../architecture/edit-queue-system.md)
- [User Preferences Integration](../features/user-preferences-integration.md)