// frontend/src/features/script/hooks/useScriptFormSync.ts

import { useMemo, useEffect, useCallback } from 'react';
import { convertUTCToLocal, convertLocalToUTC } from '../../../utils/dateTimeUtils';
import { useChangeDetection } from '../../../hooks/useChangeDetection';
import { ScriptMode } from './useScriptModes';

interface UseScriptFormSyncParams {
    script: any;
    pendingOperations: any[];
    form: any;
    activeMode: ScriptMode;
    applyLocalChange: (operation: any) => void;
    setActiveMode: (mode: ScriptMode) => void;
}

export const useScriptFormSync = ({
    script,
    pendingOperations,
    form,
    activeMode,
    applyLocalChange,
    setActiveMode
}: UseScriptFormSyncParams) => {

    // Calculate current script including all edit queue changes
    const currentScript = useMemo(() => {
        if (!script) return null;
        
        let current = { ...script };
        
        for (const operation of pendingOperations) {
            if (operation.type === 'UPDATE_SCRIPT_INFO') {
                const changes = (operation as any).changes;
                for (const [field, change] of Object.entries(changes)) {
                    const changeData = change as { oldValue: any; newValue: any };
                    if (field === 'scriptName') {
                        current.scriptName = changeData.newValue;
                    } else if (field === 'scriptStatus') {
                        current.scriptStatus = changeData.newValue;
                    } else if (field === 'startTime') {
                        current.startTime = typeof changeData.newValue === 'string' 
                            ? new Date(changeData.newValue) 
                            : changeData.newValue;
                    } else if (field === 'endTime') {
                        current.endTime = typeof changeData.newValue === 'string' 
                            ? new Date(changeData.newValue) 
                            : changeData.newValue;
                    } else if (field === 'scriptNotes') {
                        current.scriptNotes = changeData.newValue;
                    }
                }
            }
        }
        
        return current;
    }, [script, pendingOperations]);

    // Data for change detection
    const changeDetectionBaseData = currentScript ? {
        scriptName: currentScript.scriptName,
        scriptStatus: currentScript.scriptStatus,
        startTime: convertLocalToUTC(convertUTCToLocal(currentScript.startTime)),
        endTime: convertLocalToUTC(convertUTCToLocal(currentScript.endTime)),
        scriptNotes: currentScript.scriptNotes || ''
    } : null;

    const { hasChanges } = useChangeDetection(
        changeDetectionBaseData,
        {
            scriptName: form.formData.scriptName,
            scriptStatus: form.formData.scriptStatus,
            startTime: convertLocalToUTC(form.formData.startTime),
            endTime: convertLocalToUTC(form.formData.endTime),
            scriptNotes: form.formData.scriptNotes
        },
        activeMode === 'info'
    );

    // Populate form when script data loads or edit queue changes
    useEffect(() => {
        if (currentScript) {
            form.setFormData({
                scriptName: currentScript.scriptName || '',
                scriptStatus: currentScript.scriptStatus || 'DRAFT',
                startTime: convertUTCToLocal(currentScript.startTime),
                endTime: convertUTCToLocal(currentScript.endTime),
                scriptNotes: currentScript.scriptNotes || ''
            });
        }
    }, [currentScript, form.setFormData]);

    // Handle exiting Info mode with unsaved changes
    const handleInfoModeExit = useCallback((targetModeId: ScriptMode) => {
        if (!hasChanges || !changeDetectionBaseData) {
            setActiveMode(targetModeId);
            return;
        }

        const formChanges = {
            scriptName: {
                oldValue: changeDetectionBaseData.scriptName,
                newValue: form.formData.scriptName
            },
            scriptStatus: {
                oldValue: changeDetectionBaseData.scriptStatus,
                newValue: form.formData.scriptStatus
            },
            startTime: {
                oldValue: changeDetectionBaseData.startTime,
                newValue: convertLocalToUTC(form.formData.startTime)
            },
            endTime: {
                oldValue: changeDetectionBaseData.endTime,
                newValue: convertLocalToUTC(form.formData.endTime)
            },
            scriptNotes: {
                oldValue: changeDetectionBaseData.scriptNotes,
                newValue: form.formData.scriptNotes
            }
        };

        const actualChanges: any = {};
        for (const [field, values] of Object.entries(formChanges)) {
            if (values.oldValue !== values.newValue) {
                actualChanges[field] = values;
            }
        }

        if (Object.keys(actualChanges).length > 0) {
            const infoFormOperation = {
                type: 'UPDATE_SCRIPT_INFO' as const,
                elementId: 'script-info',
                changes: actualChanges
            };

            applyLocalChange(infoFormOperation);
        }

        setActiveMode(targetModeId);
    }, [hasChanges, changeDetectionBaseData, form.formData, applyLocalChange, setActiveMode]);

    return {
        currentScript,
        hasChanges,
        handleInfoModeExit
    };
};