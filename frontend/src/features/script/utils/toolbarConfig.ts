// frontend/src/features/script/utils/toolbarConfig.ts

import { ToolButton } from '../types/tool-button';

export interface ScrollState {
    isAtTop: boolean;
    isAtBottom: boolean;
    allElementsFitOnScreen: boolean;
}

export interface ToolbarContext {
    activeMode: string;
    scrollState: ScrollState;
    hasSelection: boolean;
    hasUnsavedChanges: boolean;
}

/**
 * Navigation buttons configuration
 */
export const getNavigationButtons = (scrollState: ScrollState): ToolButton[] => {
    return [
        {
            id: 'jump-top',
            icon: 'jump-top',
            label: 'HEAD',
            description: 'Jump to Top',
            isActive: false,
            isDisabled: scrollState.allElementsFitOnScreen || scrollState.isAtTop
        },
        {
            id: 'jump-bottom',
            icon: 'jump-bottom',
            label: 'TAIL',
            description: 'Jump to Bottom',
            isActive: false,
            isDisabled: scrollState.allElementsFitOnScreen || scrollState.isAtBottom
        }
    ];
};

/**
 * View state buttons configuration
 */
export const getViewStateButtons = (activeMode: string): ToolButton[] => {
    return [
        {
            id: 'view',
            icon: 'view',
            label: 'VIEW',
            description: 'View Mode',
            isActive: activeMode === 'view',
            isDisabled: false
        },
        {
            id: 'edit',
            icon: 'script-edit',
            label: 'EDIT',
            description: 'Edit Mode',
            isActive: activeMode === 'edit',
            isDisabled: false
        },
        {
            id: 'info',
            icon: 'info',
            label: 'INFO',
            description: 'Script Information',
            isActive: activeMode === 'info',
            isDisabled: false
        },
        {
            id: 'history',
            icon: 'history',
            label: 'HIST',
            description: 'Edit History',
            isActive: activeMode === 'history',
            isDisabled: false
        }
    ];
};

/**
 * Action buttons for different modes
 */
export const getActionButtons = (activeMode: string, hasUnsavedChanges: boolean): ToolButton[] => {
    const buttons: ToolButton[] = [];

    // Exit button - available in all modes (replaces dashboard)
    buttons.push({
        id: 'exit',
        icon: 'exit',
        label: 'EXIT',
        description: 'Return to Dashboard',
        isActive: false,
        isDisabled: false
    });

    // Mode-specific actions
    if (activeMode === 'view') {
        buttons.push({
            id: 'play',
            icon: 'play',
            label: 'PLAY',
            description: 'Performance Mode',
            isActive: false,
            isDisabled: false
        });
        
        buttons.push({
            id: 'share',
            icon: 'share',
            label: 'SHARE',
            description: 'Share Script',
            isActive: false,
            isDisabled: false
        });
    } else if (activeMode === 'history') {
        buttons.push({
            id: 'clear-history',
            icon: 'delete',
            label: 'CLEAR',
            description: 'Clear Edit History',
            isActive: false,
            isDisabled: !hasUnsavedChanges
        });
    }

    return buttons;
};

/**
 * Element management buttons for edit mode
 */
export const getElementManagementButtons = (hasSelection: boolean): ToolButton[] => {
    return [
        {
            id: 'add-element',
            icon: 'add',
            label: 'ADD',
            description: 'Add Script Element',
            isActive: false,
            isDisabled: false
        },
        {
            id: 'edit-element',
            icon: 'element-edit',
            label: 'MODIFY',
            description: 'Edit Selected Element',
            isActive: false,
            isDisabled: !hasSelection
        },
        {
            id: 'duplicate-element',
            icon: 'copy',
            label: 'COPY',
            description: 'Duplicate Selected Element',
            isActive: false,
            isDisabled: !hasSelection
        },
        {
            id: 'group-elements',
            icon: 'group',
            label: 'STACK',
            description: 'Group Selected Elements',
            isActive: false,
            isDisabled: true // Not implemented yet
        },
        {
            id: 'delete-element',
            icon: 'delete',
            label: 'TRASH',
            description: 'Delete Selected Element',
            isActive: false,
            isDisabled: !hasSelection
        }
    ];
};

/**
 * Main toolbar configuration function
 * Generates all toolbar buttons based on current context
 */
export const getToolbarButtons = (context: ToolbarContext): ToolButton[] => {
    const { activeMode, scrollState, hasSelection, hasUnsavedChanges } = context;
    
    const buttons: ToolButton[] = [];
    
    // Navigation buttons - always at the top
    buttons.push(...getNavigationButtons(scrollState));
    
    // View state buttons
    buttons.push(...getViewStateButtons(activeMode));
    
    // Action buttons
    buttons.push(...getActionButtons(activeMode, hasUnsavedChanges));
    
    // Element management buttons (only in edit mode)
    if (activeMode === 'edit') {
        buttons.push(...getElementManagementButtons(hasSelection));
    }
    
    return buttons;
};

/**
 * Helper function to create button groups for better organization
 */
export const groupToolbarButtons = (buttons: ToolButton[]) => {
    const groups = {
        navigation: buttons.filter(btn => ['jump-top', 'jump-bottom'].includes(btn.id)),
        modes: buttons.filter(btn => ['view', 'edit', 'info', 'history'].includes(btn.id)),
        actions: buttons.filter(btn => ['exit', 'play', 'share', 'clear-history'].includes(btn.id)),
        elements: buttons.filter(btn => ['add-element', 'edit-element', 'duplicate-element', 'group-elements', 'delete-element'].includes(btn.id))
    };
    
    return groups;
};
