import { useState, useCallback } from 'react';

export const useScriptUIState = () => {
    // Sharing state
    const [isSharing, setIsSharing] = useState(false);
    const [isHiding, setIsHiding] = useState(false);
    const [isScriptShared, setIsScriptShared] = useState(false);
    const [shareCount, setShareCount] = useState(0);
    
    // Department filtering state
    const [filteredDepartmentIds, setFilteredDepartmentIds] = useState<string[]>([]);
    const [hasUserSetFilter, setHasUserSetFilter] = useState(false);
    
    // Highlighting state
    const [isHighlightingEnabled, setIsHighlightingEnabled] = useState(true);
    
    // Group state
    const [buttonShowsOpen, setButtonShowsOpen] = useState<boolean>(true);
    const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});
    
    // Scroll state
    const [scrollState, setScrollState] = useState<{
        isAtTop: boolean;
        isAtBottom: boolean;
        allElementsFitOnScreen: boolean;
    }>({
        isAtTop: true,
        isAtBottom: false,
        allElementsFitOnScreen: false
    });

    // Handlers
    const handleHighlightingToggle = useCallback(() => {
        setIsHighlightingEnabled(!isHighlightingEnabled);
    }, [isHighlightingEnabled]);

    const handleScrollStateChange = useCallback((newScrollState: {
        isAtTop: boolean;
        isAtBottom: boolean;
        allElementsFitOnScreen: boolean;
    }) => {
        setScrollState(newScrollState);
    }, []);

    const handleApplyDepartmentFilter = useCallback((selectedDepartmentIds: string[]) => {
        setFilteredDepartmentIds(selectedDepartmentIds);
        setHasUserSetFilter(true);
    }, []);

    const setFilteredDepartmentIdsDirectly = useCallback((departmentIds: string[]) => {
        setFilteredDepartmentIds(departmentIds);
    }, []);

    return {
        // Sharing
        isSharing,
        setIsSharing,
        isHiding,
        setIsHiding,
        isScriptShared,
        setIsScriptShared,
        shareCount,
        setShareCount,
        
        // Department filtering
        filteredDepartmentIds,
        setFilteredDepartmentIds: setFilteredDepartmentIdsDirectly,
        hasUserSetFilter,
        handleApplyDepartmentFilter,
        
        // Highlighting
        isHighlightingEnabled,
        setIsHighlightingEnabled,
        handleHighlightingToggle,
        
        // Groups
        buttonShowsOpen,
        setButtonShowsOpen,
        groupOverrides,
        setGroupOverrides,
        
        // Scroll
        scrollState,
        setScrollState,
        handleScrollStateChange
    };
};