// frontend/src/utils/scriptElementUtils.ts

/**
 * Utility functions for working with script elements in shared views
 */

import { formatTimeOffset as formatTimeOffsetUtil } from './timeUtils';

// Re-export formatTimeOffset from timeUtils for backwards compatibility
export const formatTimeOffset = formatTimeOffsetUtil;

// Utility icons available for export if needed
// import { FiClock, FiPlayCircle, FiSquare, FiTarget, FiArrowRight, FiPause } from 'react-icons/fi';

/**
 * Get the color scheme for a priority level
 */
export const getPriorityColor = (priority: string | null): string => {
    switch (priority) {
        case 'SAFETY':
            return 'red';
        case 'CRITICAL':
            return 'orange';
        case 'HIGH':
            return 'yellow';
        case 'NORMAL':
            return 'blue';
        case 'LOW':
            return 'gray';
        case 'OPTIONAL':
            return 'gray';
        default:
            return 'gray';
    }
};



/**
 * Get the color scheme for an element type
 */
export const getElementTypeColor = (elementType: string | null): string => {
    switch (elementType) {
        case 'CUE':
            return 'blue';
        case 'NOTE':
            return 'green';
        case 'GROUP':
            return 'purple';
        default:
            return 'gray';
    }
};


/**
 * Get a human-readable display name for priority
 */
export const getPriorityDisplay = (priority: string | null): string => {
    switch (priority) {
        case 'SAFETY':
            return 'Safety';
        case 'CRITICAL':
            return 'Critical';
        case 'HIGH':
            return 'High';
        case 'NORMAL':
            return 'Normal';
        case 'LOW':
            return 'Low';
        case 'OPTIONAL':
            return 'Optional';
        default:
            return 'Normal';
    }
};

/**
 * Get a human-readable display name for element type
 */
export const getElementTypeDisplay = (elementType: string | null): string => {
    switch (elementType) {
        case 'CUE':
            return 'Cue';
        case 'NOTE':
            return 'Note';
        case 'GROUP':
            return 'Group';
        default:
            return 'Element';
    }
};


/**
 * Check if an element matches a search query
 */
export const elementMatchesSearch = (
    element: any,
    searchQuery: string
): boolean => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    return (
        (element.element_name && element.element_name.toLowerCase().includes(query)) ||
        (element.cue_notes && element.cue_notes.toLowerCase().includes(query)) ||
        (element.location_details && element.location_details.toLowerCase().includes(query))
    );
};

/**
 * Sort elements by their sequence or time offset
 */
export const sortElements = (elements: any[]): any[] => {
    return [...elements].sort((a, b) => {
        // Primary sort by sequence if available
        if (a.sequence !== null && b.sequence !== null) {
            return a.sequence - b.sequence;
        }
        
        // Secondary sort by time offset
        if (a.offset_ms !== null && b.offset_ms !== null) {
            return a.offset_ms - b.offset_ms;
        }
        
        // If one has sequence and other doesn't, prioritize sequence
        if (a.sequence !== null && b.sequence === null) return -1;
        if (a.sequence === null && b.sequence !== null) return 1;
        
        // If one has time offset and other doesn't, prioritize time offset
        if (a.offset_ms !== null && b.offset_ms === null) return -1;
        if (a.offset_ms === null && b.offset_ms !== null) return 1;
        
        // Fallback to element_id for consistent ordering
        return a.element_id.localeCompare(b.element_id);
    });
};