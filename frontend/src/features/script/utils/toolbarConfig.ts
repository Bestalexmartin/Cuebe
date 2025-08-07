// frontend/src/features/script/utils/toolbarConfig.ts

import { ToolButton } from '../types/toolButton';

export interface ScrollState {
    isAtTop: boolean;
    isAtBottom: boolean;
    allElementsFitOnScreen: boolean;
}

export interface ToolbarContext {
    activeMode: string;
    scrollState: ScrollState;
    hasSelection: boolean;
    hasMultipleSelection: boolean;
    hasUnsavedChanges: boolean;
    pendingOperationsCount: number;
    selectedElement?: any;
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
export const getViewStateButtons = (activeMode: string, pendingOperationsCount: number): ToolButton[] => {
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
            isDisabled: pendingOperationsCount === 0
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
            isDisabled: true // Not implemented yet
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
export const getElementManagementButtons = (hasSelection: boolean, hasMultipleSelection: boolean = false, selectedGroupElement?: any): ToolButton[] => {
    const isGroupSelected = selectedGroupElement && (selectedGroupElement as any).element_type === 'GROUP';
    
    // When multiple elements are selected, only GROUP should be enabled
    // When a group parent is selected, only BREAK should be enabled
    const shouldDisableEditButtons = hasMultipleSelection || isGroupSelected;
    
    return [
        {
            id: 'add-element',
            icon: 'add',
            label: 'ADD',
            description: 'Add Script Element',
            isActive: false,
            isDisabled: hasMultipleSelection || isGroupSelected
        },
        {
            id: 'edit-element',
            icon: 'element-edit',
            label: 'MODIFY',
            description: 'Edit Selected Element',
            isActive: false,
            isDisabled: !hasSelection || shouldDisableEditButtons
        },
        {
            id: 'duplicate-element',
            icon: 'copy',
            label: 'COPY',
            description: 'Duplicate Selected Element',
            isActive: false,
            isDisabled: !hasSelection || shouldDisableEditButtons
        },
        {
            id: isGroupSelected ? 'ungroup-elements' : 'group-elements',
            icon: isGroupSelected ? 'ungroup' : 'group',
            label: isGroupSelected ? 'BREAK' : 'GROUP',
            description: isGroupSelected ? 'Break Selected Group' : 'Group Selected Elements',
            isActive: false,
            isDisabled: isGroupSelected ? !hasSelection : !hasMultipleSelection
        },
        {
            id: 'delete-element',
            icon: 'delete',
            label: 'TRASH',
            description: 'Delete Selected Element',
            isActive: false,
            isDisabled: !hasSelection || shouldDisableEditButtons
        }
    ];
};

/**
 * Main toolbar configuration function
 * Generates all toolbar buttons based on current context
 */
export const getToolbarButtons = (context: ToolbarContext): ToolButton[] => {
    const { activeMode, scrollState, hasSelection, hasMultipleSelection, hasUnsavedChanges, pendingOperationsCount, selectedElement } = context;
    
    const buttons: ToolButton[] = [];
    
    // Navigation buttons - always at the top
    buttons.push(...getNavigationButtons(scrollState));
    
    // View state buttons
    buttons.push(...getViewStateButtons(activeMode, pendingOperationsCount));
    
    // Action buttons
    buttons.push(...getActionButtons(activeMode, hasUnsavedChanges));
    
    // Element management buttons (only in edit mode)
    if (activeMode === 'edit') {
        buttons.push(...getElementManagementButtons(hasSelection, hasMultipleSelection, selectedElement));
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
        elements: buttons.filter(btn => ['add-element', 'edit-element', 'duplicate-element', 'group-elements', 'ungroup-elements', 'delete-element'].includes(btn.id))
    };
    
    return groups;
};
