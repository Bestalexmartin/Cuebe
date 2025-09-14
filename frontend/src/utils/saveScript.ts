// frontend/src/utils/saveScript.ts

import { EditOperation } from '../features/script/types/editQueue';
import { getApiUrl } from '../config/api';

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
      operations: operations.map(op => {
        return {
          id: op.id,
          timestamp: op.timestamp,
          element_id: op.element_id,
          description: op.description,
          type: op.type,
          // Include operation-specific data based on type
          ...('old_sequence' in op && 'new_sequence' in op ? {
            old_sequence: (op as any).old_sequence,
            new_sequence: (op as any).new_sequence
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
        ...('custom_color' in op ? {
          custom_color: op.custom_color
        } : {}),
        ...('element_ids' in op ? {
          element_ids: op.element_ids
        } : {}),
        ...('field_updates' in op ? {
          field_updates: op.field_updates
        } : {}),
        ...('old_values' in op ? {
          old_values: op.old_values
        } : {}),
        ...('offset_delta_ms' in op ? {
          offset_delta_ms: op.offset_delta_ms
        } : {}),
        ...('affected_children' in op ? {
          affected_children: op.affected_children
        } : {}),
        ...('target_collapsed_state' in op ? {
          target_collapsed_state: op.target_collapsed_state
        } : {}),
        ...('group_element_ids' in op ? {
          group_element_ids: op.group_element_ids
        } : {})
        };
      })
    };
    
    const response = await fetch(getApiUrl(`api/scripts/${scriptId}`), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Save failed - Response status:", response.status);
      console.error("Save failed - Response text:", errorText);
      
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error("Could not parse error response as JSON");
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