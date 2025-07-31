// frontend/src/utils/editQueueFormatter.ts

import { EditOperation } from '../types/editQueue';
import { ScriptElement } from '../types/scriptElements';

/**
 * Formats edit operations into human-readable descriptions for the UI
 */
export class EditQueueFormatter {
    
    /**
     * Format a single edit operation into a human-readable string
     */
    static formatOperation(operation: EditOperation, allElements: ScriptElement[]): string {
        const element = allElements.find(el => el.elementID === operation.elementId);
        const elementName = element?.description || `Element ${operation.elementId.slice(-6)}`;
        
        switch (operation.type) {
            case 'REORDER':
                return `Moved "${elementName}" from position ${operation.oldIndex + 1} to position ${operation.newIndex + 1}`;
            
            case 'UPDATE_FIELD':
                return this.formatFieldUpdate(operation, elementName);
            
            case 'UPDATE_TIME_OFFSET':
                const oldTime = this.formatTime(operation.oldTimeOffsetMs);
                const newTime = this.formatTime(operation.newTimeOffsetMs);
                return `Updated "${elementName}" time from ${oldTime} to ${newTime}`;
            
            case 'CREATE_ELEMENT':
                const elementType = operation.elementData.elementType?.toLowerCase() || 'element';
                return `Created new ${elementType}: "${operation.elementData.description || 'Untitled'}"`;
            
            case 'CREATE_ELEMENT_AT_INDEX':
                const elementTypeAtIndex = operation.elementData.elementType?.toLowerCase() || 'element';
                return `Created new ${elementTypeAtIndex}: "${operation.elementData.description || 'Untitled'}"`;
            
            case 'DELETE_ELEMENT':
                const deletedType = operation.elementData.elementType?.toLowerCase() || 'element';
                return `Deleted ${deletedType}: "${operation.elementData.description || 'Untitled'}"`;
            
            case 'BULK_REORDER':
                const count = operation.elementChanges.length;
                return `Reordered ${count} element${count > 1 ? 's' : ''}`;
                
            case 'ENABLE_AUTO_SORT':
                const moveCount = operation.elementMoves.length;
                return `Enabled auto-sort (reordered ${moveCount} element${moveCount > 1 ? 's' : ''})`;
            
            default:
                return `Unknown operation on "${elementName}"`;
        }
    }
    
    /**
     * Format field-specific updates with appropriate value formatting
     */
    private static formatFieldUpdate(operation: any, elementName: string): string {
        const { field, oldValue, newValue } = operation;
        
        const fieldDisplayNames: Record<string, string> = {
            'description': 'description',
            'cueID': 'cue ID',
            'cueNotes': 'notes',
            'priority': 'priority',
            'departmentID': 'department',
            'customColor': 'color',
            'duration': 'duration',
            'timeOffsetMs': 'time offset',
            'executionStatus': 'execution status',
            'locationDetails': 'location details',
            'fadeIn': 'fade in',
            'fadeOut': 'fade out',
            'isSafetyCritical': 'safety critical',
            'safetyNotes': 'safety notes',
            'parentElementID': 'parent element',
            'groupLevel': 'group level',
            'isCollapsed': 'collapsed',
            'triggerType': 'trigger type',
            'followsCueID': 'follows cue'
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
            case 'timeOffsetMs':
                return this.formatTime(value);
            
            case 'duration':
                return this.formatDuration(value);
            
            case 'customColor':
                return value === '#E2E8F0' ? 'default' : value;
            
            case 'priority':
                return value || '(none)';
            
            default:
                return String(value).length > 30 
                    ? String(value).substring(0, 30) + '...'
                    : String(value);
        }
    }
    
    /**
     * Format time in milliseconds to readable format
     */
    private static formatTime(timeMs: number): string {
        const totalSeconds = Math.round(timeMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    /**
     * Format duration in seconds to readable format
     */
    private static formatDuration(durationSeconds: number): string {
        if (!durationSeconds) return '0:00';
        
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        const seconds = durationSeconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
            return date.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
        } else if (date.toDateString() === yesterday.toDateString()) {
            // Yesterday - show "Yesterday HH:MM:SS"
            const time = date.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            return `Yesterday ${time}`;
        } else {
            // Other dates - show "Mon DD HH:MM:SS"
            const time = date.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
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
            'UPDATE_TIME_OFFSET': 'time changes',
            'CREATE_ELEMENT': 'additions',
            'CREATE_ELEMENT_AT_INDEX': 'additions',
            'DELETE_ELEMENT': 'deletions',
            'BULK_REORDER': 'bulk moves'
        };
        
        const parts = Object.entries(types).map(([type, count]) => {
            const desc = typeDescriptions[type as keyof typeof typeDescriptions] || 'changes';
            return `${count} ${desc}`;
        });
        
        return `${operations.length} changes (${parts.join(', ')})`;
    }
}