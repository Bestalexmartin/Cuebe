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
                    if (field === 'script_name') {
                        current.script_name = changeData.newValue;
                    } else if (field === 'script_status') {
                        current.script_status = changeData.newValue;
                    } else if (field === 'start_time') {
                        current.start_time = typeof changeData.newValue === 'string' 
                            ? new Date(changeData.newValue) 
                            : changeData.newValue;
                    } else if (field === 'end_time') {
                        current.end_time = typeof changeData.newValue === 'string' 
                            ? new Date(changeData.newValue) 
                            : changeData.newValue;
                    } else if (field === 'script_notes') {
                        current.script_notes = changeData.newValue;
                    }
                }
            }
        }
        
        return current;
    }, [script, pendingOperations]);

    // Data for change detection
    const changeDetectionBaseData = currentScript ? {
        script_name: currentScript.script_name,
        script_status: currentScript.script_status,
        start_time: convertLocalToUTC(convertUTCToLocal(currentScript.start_time)),
        end_time: convertLocalToUTC(convertUTCToLocal(currentScript.end_time)),
        script_notes: currentScript.script_notes || ''
    } : null;

    const { hasChanges } = useChangeDetection(
        changeDetectionBaseData,
        {
            script_name: form.formData.script_name,
            script_status: form.formData.script_status,
            start_time: convertLocalToUTC(form.formData.start_time),
            end_time: convertLocalToUTC(form.formData.end_time),
            script_notes: form.formData.script_notes
        },
        activeMode === 'info'
    );

    // Populate form when script data loads or edit queue changes
    useEffect(() => {
        if (currentScript) {
            form.setFormData({
                script_name: currentScript.script_name || '',
                script_status: currentScript.script_status || 'DRAFT',
                start_time: convertUTCToLocal(currentScript.start_time),
                end_time: convertUTCToLocal(currentScript.end_time),
                script_notes: currentScript.script_notes || ''
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
            script_name: {
                oldValue: changeDetectionBaseData.script_name,
                newValue: form.formData.script_name
            },
            script_status: {
                oldValue: changeDetectionBaseData.script_status,
                newValue: form.formData.script_status
            },
            start_time: {
                oldValue: changeDetectionBaseData.start_time,
                newValue: convertLocalToUTC(form.formData.start_time)
            },
            end_time: {
                oldValue: changeDetectionBaseData.end_time,
                newValue: convertLocalToUTC(form.formData.end_time)
            },
            script_notes: {
                oldValue: changeDetectionBaseData.script_notes,
                newValue: form.formData.script_notes
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