// frontend/src/utils/saveScript.ts

import { EditOperation } from '../features/script/types/editQueue';

export interface SaveScriptParams {
  scriptId: string;
  operations: EditOperation[];
  getToken: () => Promise<string | null>;
  onSuccess?: (freshData: any) => void;
  onError?: (error: Error) => void;
}

export const saveScript = async ({
  scriptId,
  operations,
  getToken,
  onSuccess,
  onError
}: SaveScriptParams): Promise<boolean> => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Authentication token not available");
    }

    
    const requestBody = {
      operations: operations.map(op => ({
        id: op.id,
        timestamp: op.timestamp,
        element_id: op.element_id,
        description: op.description,
        type: op.type,
        // Include operation-specific data based on type
        ...('old_index' in op && 'new_index' in op ? {
          old_index: op.old_index,
          new_index: op.new_index,
          old_sequence: op.old_sequence,
          new_sequence: op.new_sequence
        } : {}),
        ...('field' in op ? {
          field: op.field,
          old_value: op.old_value,
          new_value: op.new_value
        } : {}),
        ...('old_offset_ms' in op ? {
          old_offset_ms: op.old_offset_ms,
          new_offset_ms: op.new_offset_ms
        } : {}),
        ...('element_data' in op ? {
          element_data: op.element_data
        } : {}),
        ...('element_changes' in op ? {
          element_changes: op.element_changes
        } : {}),
        ...('changes' in op ? {
          changes: op.changes
        } : {}),
        ...('group_element_id' in op ? {
          group_element_id: op.group_element_id
        } : {}),
        ...('group_name' in op ? {
          group_name: op.group_name
        } : {}),
        ...('element_ids' in op ? {
          element_ids: op.element_ids
        } : {})
      }))
    };
    
    const response = await fetch(`/api/scripts/${scriptId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🚨 SAVE ERROR Response status:", response.status);
      console.error("🚨 SAVE ERROR Response text:", errorText);
      
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
        console.error("🚨 SAVE ERROR Parsed error data:", errorData);
      } catch (e) {
        console.error("🚨 SAVE ERROR Could not parse error response as JSON");
      }
      throw new Error(errorData.detail || `Save failed with status ${response.status}: ${errorText}`);
    }

    const freshData = await response.json();
    onSuccess?.(freshData);
    return true;

  } catch (error) {
    onError?.(error as Error);
    return false;
  }
};