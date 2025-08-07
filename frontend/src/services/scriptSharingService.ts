// frontend/src/services/scriptSharingService.ts

export interface ScriptSharingStatus {
  isShared: boolean;
  shareCount: number;
  activeShares: number;
}

export class ScriptSharingService {
  /**
   * Mark script as shared (toggle script sharing on)
   */
  static async shareWithAllCrew(scriptId: string, token: string): Promise<void> {
    const response = await fetch(`/api/scripts/${scriptId}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_shared: true })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to mark script as shared');
    }

    return response.json();
  }

  /**
   * Mark script as hidden (toggle script sharing off)
   */
  static async hideFromAllCrew(scriptId: string, token: string): Promise<void> {
    const response = await fetch(`/api/scripts/${scriptId}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_shared: false })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to mark script as hidden');
    }

    return response.json();
  }

  /**
   * Get script sharing status from the script itself
   */
  static async getSharingStatus(scriptId: string, token: string): Promise<ScriptSharingStatus> {
    const response = await fetch(`/api/scripts/${scriptId}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to get script sharing status');
    }

    const script = await response.json();
    
    return {
      isShared: script.is_shared || false,
      shareCount: 0,
      activeShares: 0
    };
  }
}