import React, { createContext, useContext, ReactNode } from 'react';
import { useScript } from '../features/script/hooks/useSimpleScript';
import { useShow } from '../features/shows/hooks/useShow';
import { useScriptElementsWithEditQueue } from '../features/script/hooks/useScriptElementsWithEditQueue';
import { useShowCrew } from '../features/shows/hooks/useShowCrew';

interface ScriptDataContextValue {
    // Script data
    scriptId: string | undefined;
    sourceScript: any;
    currentScript: any;
    isLoadingScript: boolean;
    scriptError: any;
    setSourceScript: (script: any) => void;
    
    // Show data
    show: any;
    
    // Crew data
    crewMembers: any[];
    
    // Elements and edit queue
    elements: any[];
    allElements: any[];
    serverElements: any[];
    allEditQueueElements: any[];
    filteredEditQueueElements: any[];
    hasUnsavedChanges: boolean;
    pendingOperations: any[];
    
    // Edit queue operations
    applyLocalChange: (operation: any) => void;
    saveChanges: () => Promise<boolean>;
    discardChanges: () => void;
    updateServerElements: (elements: any[]) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    
    // Group operations
    toggleGroupCollapse: (elementId: string) => void;
    expandAllGroups: () => void;
    collapseAllGroups: () => void;
    
    // Checkpoint operations
    checkpoints: any[];
    activeCheckpoint: string | undefined | null;
    createCheckpoint: (type: "AUTO_SORT" | "MANUAL", description: string, scriptData?: any) => string;
    revertToCheckpoint: (checkpointId: string) => void;
    revertToPoint: (operationIndex: number) => void;
}

const ScriptDataContext = createContext<ScriptDataContextValue | null>(null);

interface ScriptDataProviderProps {
    children: ReactNode;
    scriptId: string | undefined;
    elementsToPass?: any[];
    editQueueOptions?: any;
    currentScript?: any; // from form sync
}

export const ScriptDataProvider: React.FC<ScriptDataProviderProps> = ({
    children,
    scriptId,
    elementsToPass,
    editQueueOptions,
    currentScript
}) => {
    // Script data
    const { script: sourceScript, isLoading: isLoadingScript, error: scriptError, setScript: setSourceScript } = useScript(scriptId);
    
    // Show data
    const { show } = useShow(sourceScript?.show_id);
    
    // Crew data
    const { crewMembers } = useShowCrew(currentScript?.show_id || '');
    
    // Edit queue integration - derive elements from source script
    const elementsToUse = elementsToPass || (sourceScript as any)?.elements || [];
    const editQueueHook = useScriptElementsWithEditQueue(scriptId, elementsToUse, editQueueOptions);
    
    const {
        elements,
        allElements,
        serverElements,
        hasUnsavedChanges,
        pendingOperations,
        applyLocalChange,
        saveChanges,
        discardChanges,
        updateServerElements,
        undo,
        redo,
        canUndo,
        canRedo,
        toggleGroupCollapse,
        expandAllGroups,
        collapseAllGroups,
        checkpoints,
        activeCheckpoint,
        createCheckpoint,
        revertToCheckpoint,
        revertToPoint
    } = editQueueHook;


    // Derived data
    const allEditQueueElements = allElements;
    const filteredEditQueueElements = elements;

    const contextValue: ScriptDataContextValue = {
        // Script data
        scriptId,
        sourceScript,
        currentScript: currentScript || sourceScript,
        isLoadingScript,
        scriptError,
        setSourceScript,
        
        // Show data
        show,
        
        // Crew data
        crewMembers,
        
        // Elements and edit queue
        elements,
        allElements,
        serverElements,
        allEditQueueElements,
        filteredEditQueueElements,
        hasUnsavedChanges,
        pendingOperations,
        
        // Edit queue operations
        applyLocalChange,
        saveChanges,
        discardChanges,
        updateServerElements,
        undo,
        redo,
        canUndo,
        canRedo,
        
        // Group operations
        toggleGroupCollapse,
        expandAllGroups,
        collapseAllGroups,
        
        // Checkpoint operations
        checkpoints,
        activeCheckpoint,
        createCheckpoint,
        revertToCheckpoint,
        revertToPoint
    };

    return (
        <ScriptDataContext.Provider value={contextValue}>
            {children}
        </ScriptDataContext.Provider>
    );
};

export const useScriptData = (): ScriptDataContextValue => {
    const context = useContext(ScriptDataContext);
    if (!context) {
        throw new Error('useScriptData must be used within a ScriptDataProvider');
    }
    return context;
};