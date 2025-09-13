// frontend/src/features/script/hooks/useScriptFormSync.ts

import { useMemo, useEffect, useCallback } from 'react';
import { convertUTCToLocal, convertLocalToUTC } from '../../../utils/timeUtils';
import { useChangeDetection } from '../../../hooks/useChangeDetection';
import { ScriptMode } from './useScriptModes';

interface UseScriptFormSyncParams {
    sourceScript: any;
    pendingOperations: any[];
    form: any;
    activeMode: ScriptMode;
    applyLocalChange: (operation: any) => void;
    setActiveMode: (mode: ScriptMode) => void;
}

export const useScriptFormSync = ({
    sourceScript,
    pendingOperations,
    form,
    activeMode,
    applyLocalChange,
    setActiveMode
}: UseScriptFormSyncParams) => {

    // Calculate current script including all edit queue changes
    const currentScript = useMemo(() => {
        if (!sourceScript) return null;
        
        let current = { ...sourceScript };
        
        for (const operation of pendingOperations) {
            if (operation.type === 'UPDATE_SCRIPT_INFO') {
                const changes = (operation as any).changes;
                for (const [field, change] of Object.entries(changes)) {
                    const changeData = change as { old_value: any; new_value: any };
                    if (field === 'script_name') {
                        current.script_name = changeData.new_value;
                    } else if (field === 'script_status') {
                        current.script_status = changeData.new_value;
                    } else if (field === 'start_time') {
                        // Keep start_time as ISO string - don't convert to Date object
                        current.start_time = changeData.new_value;
                    } else if (field === 'end_time') {
                        // Keep end_time as ISO string - don't convert to Date object
                        current.end_time = changeData.new_value;
                    } else if (field === 'script_notes') {
                        current.script_notes = changeData.new_value;
                    }
                }
            }
        }
        
        return current;
    }, [sourceScript, pendingOperations]);

    // Data for change detection
    const changeDetectionBaseData = currentScript ? {
        script_name: currentScript.script_name,
        script_status: currentScript.script_status,
        start_time: currentScript.start_time ? convertLocalToUTC(convertUTCToLocal(currentScript.start_time)) : null,
        end_time: currentScript.end_time ? convertLocalToUTC(convertUTCToLocal(currentScript.end_time)) : null,
        script_notes: currentScript.script_notes || ''
    } : null;

    const currentFormData = {
        script_name: form.formData.script_name,
        script_status: form.formData.script_status,
        start_time: convertLocalToUTC(form.formData.start_time),
        end_time: convertLocalToUTC(form.formData.end_time),
        script_notes: form.formData.script_notes
    };
    

    const { hasChanges, updateOriginalData } = useChangeDetection(
        changeDetectionBaseData,
        currentFormData,
        activeMode === 'info'
    );

    // Populate form when script data loads or edit queue changes
    useEffect(() => {
        if (currentScript) {
            const formData = {
                script_name: currentScript.script_name || '',
                script_status: currentScript.script_status || 'DRAFT',
                start_time: currentScript.start_time ? convertUTCToLocal(currentScript.start_time) : '',
                end_time: currentScript.end_time ? convertUTCToLocal(currentScript.end_time) : '',
                script_notes: currentScript.script_notes || ''
            };
            
            form.setFormData(formData);
        }
    }, [currentScript, form.setFormData]);

    // Clear pending changes after successful save
    // STRIPPED FOR REBUILD: This was part of the broken coordinated refresh architecture
    const clearPendingChanges = useCallback(() => {
        
        // if (activeMode === 'info') {
        //     updateOriginalData({
        //         script_name: form.formData.script_name,
        //         script_status: form.formData.script_status,
        //         start_time: convertLocalToUTC(form.formData.start_time),
        //         end_time: convertLocalToUTC(form.formData.end_time),
        //         script_notes: form.formData.script_notes
        //     });
        // }
    }, [activeMode, form.formData, updateOriginalData]);

    // Handle exiting Info mode with unsaved changes
    const handleInfoModeExit = useCallback((targetModeId: ScriptMode) => {
        if (!hasChanges || !changeDetectionBaseData) {
            setActiveMode(targetModeId);
            return;
        }

        const formChanges = {
            script_name: {
                old_value: changeDetectionBaseData.script_name,
                new_value: form.formData.script_name
            },
            script_status: {
                old_value: changeDetectionBaseData.script_status,
                new_value: form.formData.script_status
            },
            start_time: {
                old_value: changeDetectionBaseData.start_time,
                new_value: convertLocalToUTC(form.formData.start_time)
            },
            end_time: {
                old_value: changeDetectionBaseData.end_time,
                new_value: convertLocalToUTC(form.formData.end_time)
            },
            script_notes: {
                old_value: changeDetectionBaseData.script_notes,
                new_value: form.formData.script_notes
            }
        };

        const actualChanges: any = {};
        for (const [field, values] of Object.entries(formChanges)) {
            if (values.old_value !== values.new_value) {
                actualChanges[field] = values;
            }
        }

        if (Object.keys(actualChanges).length > 0) {
            const infoFormOperation = {
                type: 'UPDATE_SCRIPT_INFO' as const,
                element_id: 'script-info',
                changes: actualChanges
            };

            try {
                applyLocalChange(infoFormOperation);
            } catch (error) {
                console.error('Error applying info mode changes:', error);
                // Continue with mode switch even if change application fails
            }
        }

        setActiveMode(targetModeId);
    }, [hasChanges, changeDetectionBaseData, form.formData, applyLocalChange, setActiveMode]);

    return {
        currentScript,
        hasChanges,
        handleInfoModeExit,
        clearPendingChanges
    };
};
