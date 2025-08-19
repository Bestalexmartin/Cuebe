// frontend/src/features/script/utils/groupUtils.ts

import { ScriptElement } from '../types/scriptElements';

/**
 * Generates a descriptive summary for a group based on its child elements
 */
export const generateGroupSummary = (elements: ScriptElement[]): string => {
    const cueCount = elements.filter(el => el.element_type === 'CUE').length;
    const noteCount = elements.filter(el => el.element_type === 'NOTE').length;
    const groupCount = elements.filter(el => (el as any).element_type === 'GROUP').length;

    const parts: string[] = [];
    if (cueCount > 0) parts.push(`${cueCount} cue${cueCount !== 1 ? 's' : ''}`);
    if (noteCount > 0) parts.push(`${noteCount} note${noteCount !== 1 ? 's' : ''}`);
    if (groupCount > 0) parts.push(`${groupCount} group${groupCount !== 1 ? 's' : ''}`);

    return parts.length > 0 ? `Includes ${parts.join(' and ')}` : '';
};

/**
 * Finds all child elements of a group
 */
export const getGroupChildren = (groupId: string, allElements: ScriptElement[]): ScriptElement[] => {
    return allElements.filter(el => 
        el.parent_element_id === groupId && 
        el.group_level && 
        el.group_level > 0
    );
};

/**
 * Generates a temporary ID for new groups
 */
export const generateTempGroupId = (): string => {
    return `group-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};