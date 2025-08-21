// frontend/src/features/script/utils/editQueueFormatter.ts

import { EditOperation } from '../types/editQueue';
import { ScriptElement } from '../types/scriptElements';
import { formatTimeOffset, formatDuration } from '../../../utils/timeUtils';
import { formatTimeLocal } from '../../../utils/dateTimeUtils';

/**
 * Formats edit operations into human-readable descriptions for the UI
 */
export class EditQueueFormatter {
    
    /**
     * Format a single edit operation into a human-readable string
     */
    static formatOperation(operation: EditOperation, allElements: ScriptElement[]): string {
        const element = allElements.find(el => el.element_id === operation.element_id);
        const elementName = element?.element_name || `Element ${operation.element_id?.slice(-6) || 'Unknown'}`;
        
        switch (operation.type) {
            case 'REORDER':
                const oldSeq = (operation as any).old_sequence;
                const newSeq = (operation as any).new_sequence;
                if (oldSeq !== undefined && newSeq !== undefined) {
                    return `Moved "${elementName}" from position ${oldSeq} to position ${newSeq}`;
                } else {
                    return `Moved "${elementName}"`;
                }
            
            case 'UPDATE_FIELD':
                return this.formatFieldUpdate(operation, elementName);
            
            case 'UPDATE_TIME_OFFSET':
                const oldTime = formatTimeOffset(operation.old_offset_ms, false); // Use 12-hour for edit history
                const newTime = formatTimeOffset(operation.new_offset_ms, false);
                return `Updated "${elementName}" time from ${oldTime} to ${newTime}`;
            
            case 'CREATE_ELEMENT':
                const elementType = operation.element_data.element_type?.toLowerCase() || 'element';
                const insertText = operation.insert_index !== undefined ? ` at position ${operation.insert_index + 1}` : '';
                return `Created new ${elementType}${insertText}: "${operation.element_data.element_name || 'Untitled'}"`;
            
            case 'DELETE_ELEMENT':
                const deletedType = operation.element_data.element_type?.toLowerCase() || 'element';
                return `Deleted ${deletedType}: "${operation.element_data.element_name || 'Untitled'}"`;
            
            case 'BULK_REORDER':
                const count = operation.element_changes.length;
                return `Reordered ${count} element${count > 1 ? 's' : ''}`;
                
            case 'ENABLE_AUTO_SORT':
                const moveCount = (operation as any).element_moves?.length || 0;
                return `Auto-sort enabled (${moveCount} element${moveCount > 1 ? 's' : ''})`;
            
            case 'DISABLE_AUTO_SORT':
                return `Auto-sort disabled`;
            
            case 'UPDATE_SCRIPT_INFO':
                return this.formatScriptInfoUpdate(operation);
            
            case 'UPDATE_ELEMENT':
                return this.formatElementUpdate(operation, elementName);
            
            case 'UPDATE_GROUP_WITH_PROPAGATION':
                return this.formatGroupUpdate(operation, elementName);
            
            case 'CREATE_GROUP':
                const groupName = operation.group_name || 'Untitled Group';
                const elementCount = operation.element_ids?.length || 0;
                return `Created group "${groupName}" with ${elementCount} element${elementCount !== 1 ? 's' : ''}`;
            
            case 'UNGROUP_ELEMENTS':
                const ungroupName = (operation as any).group_name || 'Unknown Group';
                return `Ungrouped elements from "${ungroupName}"`;
            
            case 'TOGGLE_GROUP_COLLAPSE':
                // Use the target state stored in the operation if available
                const targetCollapsed = (operation as any).target_collapsed_state;
                if (targetCollapsed !== undefined) {
                    const action = targetCollapsed ? 'Collapsed' : 'Expanded';
                    return `${action} group "${elementName}"`;
                }
                
                // Fallback to checking current element state if target state not stored
                const currentElement = allElements.find(el => el.element_id === operation.element_id);
                const currentlyCollapsed = currentElement?.is_collapsed || false;
                const action = currentlyCollapsed ? 'Collapsed' : 'Expanded';
                return `${action} group "${elementName}"`;
            
            case 'BATCH_COLLAPSE_GROUPS':
                const batchTargetCollapsed = (operation as any).target_collapsed_state;
                const groupCount = (operation as any).group_element_ids?.length || 0;
                const batchAction = batchTargetCollapsed ? 'Collapsed' : 'Expanded';
                return `${batchAction} all ${groupCount} groups`;
            
            default:
                return `Unknown operation on "${elementName}"`;
        }
    }
    
    /**
     * Format script info updates with appropriate descriptions
     */
    private static formatScriptInfoUpdate(operation: any): string {
        const changes = operation.changes || {};
        const changedFields = Object.keys(changes);
        
        if (changedFields.length === 0) {
            return 'Updated script information';
        }
        
        if (changedFields.length === 1) {
            const field = changedFields[0];
            const change = changes[field];
            const fieldDisplayNames: Record<string, string> = {
                'script_name': 'script name',
                'script_status': 'script status',
                'start_time': 'start time',
                'end_time': 'end time',
                'script_notes': 'script notes'
            };
            
            const fieldName = fieldDisplayNames[field] || field;
            const oldValue = this.formatScriptValue(field, change.old_value);
            const newValue = this.formatScriptValue(field, change.new_value);
            
            return `Updated ${fieldName} from "${oldValue}" to "${newValue}"`;
        }
        
        // Multiple fields changed
        const fieldDisplayNames: Record<string, string> = {
            'script_name': 'name',
            'script_status': 'status',
            'start_time': 'start time',
            'end_time': 'end time',
            'script_notes': 'notes'
        };
        
        const fieldNames = changedFields.map(field => fieldDisplayNames[field] || field).join(', ');
        return `Updated script ${fieldNames}`;
    }
    
    /**
     * Format element updates with appropriate descriptions
     */
    private static formatElementUpdate(operation: any, elementName: string): string {
        const changes = operation.changes || {};
        const changedFields = Object.keys(changes);
        
        if (changedFields.length === 0) {
            return `Updated "${elementName}"`;
        }
        
        if (changedFields.length === 1) {
            const field = changedFields[0];
            const change = changes[field];
            const fieldDisplayNames: Record<string, string> = {
                'element_name': 'description',
                'cue_notes': 'notes',
                'priority': 'priority',
                'department_id': 'department',
                'custom_color': 'color',
                'duration_ms': 'duration',
                'offset_ms': 'time offset',
                'location_details': 'location',
                'parent_element_id': 'parent element',
                'group_level': 'group level',
                'is_collapsed': 'collapsed'
            };
            
            const fieldName = fieldDisplayNames[field] || this.formatFieldName(field);
            // Handle both oldValue/newValue and old_value/new_value formats
            const oldValue = this.formatValue(field, change.oldValue ?? change.old_value);
            const newValue = this.formatValue(field, change.newValue ?? change.new_value);
            
            return `Updated "${elementName}" ${fieldName} from "${oldValue}" to "${newValue}"`;
        }
        
        // Multiple fields changed
        const fieldDisplayNames: Record<string, string> = {
            'element_name': 'description',
            'cue_notes': 'notes',
            'priority': 'priority',
            'department_id': 'department',
            'custom_color': 'color',
            'duration_ms': 'duration',
            'offset_ms': 'time',
            'location_details': 'location',
            'parent_element_id': 'parent',
            'group_level': 'group level',
            'is_collapsed': 'collapsed state'
        };
        
        const fieldNames = changedFields.map(field => fieldDisplayNames[field] || this.formatFieldName(field)).join(', ');
        return `Updated "${elementName}" ${fieldNames}`;
    }
    
    /**
     * Format group updates with appropriate descriptions
     */
    private static formatGroupUpdate(operation: any, elementName: string): string {
        const fieldUpdates = operation.field_updates || {};
        const changedFields = Object.keys(fieldUpdates);
        const affectedChildren = operation.affected_children || [];
        
        if (changedFields.length === 0) {
            return `Updated group "${elementName}"`;
        }
        
        if (changedFields.length === 1) {
            const field = changedFields[0];
            const newValue = fieldUpdates[field];
            const oldValue = operation.old_values?.[field];
            
            const fieldDisplayNames: Record<string, string> = {
                'element_name': 'name',
                'cue_notes': 'description',
                'custom_color': 'color',
                'offset_ms': 'start time'
            };
            
            const fieldName = fieldDisplayNames[field] || this.formatFieldName(field);
            
            if (field === 'offset_ms' && affectedChildren.length > 0) {
                const offsetDelta = operation.offset_delta_ms || 0;
                const timeChange = offsetDelta > 0 ? `+${formatTimeOffset(Math.abs(offsetDelta), false)}` : `-${formatTimeOffset(Math.abs(offsetDelta), false)}`;
                return `Updated group "${elementName}" ${fieldName} (${timeChange}, ${affectedChildren.length} children affected)`;
            }
            
            const formattedOldValue = this.formatValue(field, oldValue);
            const formattedNewValue = this.formatValue(field, newValue);
            return `Updated group "${elementName}" ${fieldName} from "${formattedOldValue}" to "${formattedNewValue}"`;
        }
        
        // Multiple fields changed
        const fieldDisplayNames: Record<string, string> = {
            'element_name': 'name',
            'cue_notes': 'description',
            'custom_color': 'color',
            'offset_ms': 'start time'
        };
        
        const fieldNames = changedFields.map(field => fieldDisplayNames[field] || this.formatFieldName(field)).join(', ');
        const childrenNote = affectedChildren.length > 0 ? ` (${affectedChildren.length} children affected)` : '';
        return `Updated group "${elementName}" ${fieldNames}${childrenNote}`;
    }
    
    /**
     * Format script-specific values for display
     */
    private static formatScriptValue(field: string, value: any): string {
        if (value === null || value === undefined || value === '') {
            return '(empty)';
        }
        
        switch (field) {
            case 'start_time':
            case 'end_time':
                // Format ISO date string to readable format
                try {
                    return formatTimeLocal(value, false); // Use 12-hour for edit history
                } catch {
                    return String(value);
                }
            
            case 'script_status':
                return String(value).toLowerCase();
            
            case 'script_notes':
                return String(value).length > 30 
                    ? String(value).substring(0, 30) + '...'
                    : String(value);
            
            default:
                return String(value);
        }
    }
    
    /**
     * Format field-specific updates with appropriate value formatting
     */
    private static formatFieldUpdate(operation: any, elementName: string): string {
        const { field, oldValue, newValue } = operation;
        
        const fieldDisplayNames: Record<string, string> = {
            'element_name': 'description',
            'cue_notes': 'notes',
            'priority': 'priority',
            'department_id': 'department',
            'custom_color': 'color',
            'duration_ms': 'duration',
            'offset_ms': 'time offset',
            'location_details': 'location details',
            'isSafetyCritical': 'safety critical',
            'safetyNotes': 'safety notes',
            'parent_element_id': 'parent element',
            'group_level': 'group level',
            'is_collapsed': 'collapsed'
        };
        
        const fieldName = fieldDisplayNames[field] || this.formatFieldName(field);
        const formattedOldValue = this.formatValue(field, oldValue);
        const formattedNewValue = this.formatValue(field, newValue);
        
        return `Updated "${elementName}" ${fieldName} from "${formattedOldValue}" to "${formattedNewValue}"`;
    }
    
    /**
     * Convert field names to human-readable format
     */
    private static formatFieldName(field: string): string {
        return field
            // Convert camelCase to spaces
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            // Convert snake_case to spaces
            .replace(/_/g, ' ')
            // Lowercase the result
            .toLowerCase();
    }

    /**
     * Format values based on field type for better readability
     */
    private static formatValue(field: string, value: any): string {
        if (value === null || value === undefined) {
            return '(empty)';
        }
        
        switch (field) {
            case 'offset_ms':
                // Handle numeric time values, including 0
                if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
                    return formatTimeOffset(Number(value), false) || '0:00'; // Use 12-hour for edit history
                }
                return '(empty)';
            
            case 'duration_ms':
                // Handle numeric duration values, including 0  
                if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
                    return formatDuration(Number(value));
                }
                return '(empty)';
            
            case 'custom_color':
                return value === '#E2E8F0' ? 'default' : value;
            
            case 'priority':
                return value || '(none)';
            
            default:
                const stringValue = String(value);
                if (stringValue === '' || stringValue === 'undefined' || stringValue === 'null') {
                    return '(empty)';
                }
                return stringValue.length > 30 
                    ? stringValue.substring(0, 30) + '...'
                    : stringValue;
        }
    }
    
    
    
    /**
     * Get a date and time stamp for display
     */
    static formatTimestamp(timestamp: number): string {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Check if it's today, yesterday, or another date
        if (date.toDateString() === today.toDateString()) {
            // Today - show just time
            return formatTimeLocal(date.toISOString(), false).replace(/^.*\s/, ''); // Extract time part only
        } else if (date.toDateString() === yesterday.toDateString()) {
            // Yesterday - show "Yesterday HH:MM:SS"
            const time = formatTimeLocal(date.toISOString(), false).replace(/^.*\s/, ''); // Extract time part only
            return `Yesterday ${time}`;
        } else {
            // Other dates - show "Mon DD HH:MM:SS"
            const time = formatTimeLocal(date.toISOString(), false).replace(/^.*\s/, ''); // Extract time part only
            const dateStr = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
            });
            return `${dateStr} ${time}`;
        }
    }
    
    /**
     * Format multiple operations into a summary
     */
    static formatOperationsSummary(operations: EditOperation[]): string {
        if (operations.length === 0) return 'No changes';
        if (operations.length === 1) return '1 change';
        
        const types = operations.reduce((acc, op) => {
            acc[op.type] = (acc[op.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const typeDescriptions = {
            'REORDER': 'moves',
            'UPDATE_FIELD': 'updates',
            'UPDATE_ELEMENT': 'updates',
            'UPDATE_GROUP_WITH_PROPAGATION': 'group updates',
            'UPDATE_TIME_OFFSET': 'time changes',
            'CREATE_ELEMENT': 'additions',
            'DELETE_ELEMENT': 'deletions',
            'BULK_REORDER': 'bulk moves',
            'ENABLE_AUTO_SORT': 'batch reorders',
            'DISABLE_AUTO_SORT': 'preference changes',
            'UPDATE_SCRIPT_INFO': 'script info updates',
            'CREATE_GROUP': 'group creations',
            'UNGROUP_ELEMENTS': 'group dissolutions',
            'TOGGLE_GROUP_COLLAPSE': 'group toggles',
            'BATCH_COLLAPSE_GROUPS': 'batch group toggles'
        };
        
        const parts = Object.entries(types).map(([type, count]) => {
            const desc = typeDescriptions[type as keyof typeof typeDescriptions] || 'changes';
            return `${count} ${desc}`;
        });
        
        return `${operations.length} changes (${parts.join(', ')})`;
    }
}
