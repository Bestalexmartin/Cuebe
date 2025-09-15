// frontend/src/contexts/ScriptSyncContext.tsx

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Stable data that rarely changes
interface ScriptSyncStableData {
  scriptId: string | null;
  userType: 'stage_manager' | 'crew_member';
  triggerRotation?: React.MutableRefObject<(() => void) | null>;
}

// Dynamic data that changes frequently
interface ScriptSyncDynamicData {
  isConnected: boolean;
  isConnecting: boolean;
  connectionCount: number;
  connectionError?: string | null;
}

// Combined interface for backward compatibility
interface ScriptSyncData extends ScriptSyncStableData, ScriptSyncDynamicData {}

interface ScriptSyncContextType {
  // Stable data context (rarely triggers re-renders)
  stableData: ScriptSyncStableData | null;
  setStableData: (data: ScriptSyncStableData | null) => void;

  // Dynamic data context (updates frequently but only subscribed components re-render)
  dynamicData: ScriptSyncDynamicData | null;
  setDynamicData: (data: ScriptSyncDynamicData) => void;

  // Backward compatibility - combined data
  syncData: ScriptSyncData | null;
  setSyncData: (data: ScriptSyncData | null) => void;
}

const ScriptSyncContext = createContext<ScriptSyncContextType | null>(null);

export const useScriptSyncContext = () => {
  const context = useContext(ScriptSyncContext);
  if (!context) {
    throw new Error('useScriptSyncContext must be used within ScriptSyncProvider');
  }
  return context;
};

// New hooks for accessing specific data types
export const useScriptSyncStable = () => {
  const context = useScriptSyncContext();
  return context.stableData;
};

export const useScriptSyncDynamic = () => {
  const context = useScriptSyncContext();
  return context.dynamicData;
};

export const useScriptSyncContextOptional = () => {
  return useContext(ScriptSyncContext);
};

interface ScriptSyncProviderProps {
  children: ReactNode;
}

export const ScriptSyncProvider: React.FC<ScriptSyncProviderProps> = ({ children }) => {
  const [stableData, setStableData] = useState<ScriptSyncStableData | null>(null);
  const [dynamicData, setDynamicDataState] = useState<ScriptSyncDynamicData | null>(null);

  // Memoized combined data for backward compatibility
  const syncData = React.useMemo(() => {
    if (!stableData || !dynamicData) return null;
    return { ...stableData, ...dynamicData };
  }, [stableData, dynamicData]);

  // Optimized dynamic data setter that doesn't cause re-renders if values haven't changed
  const setDynamicData = useCallback((newData: ScriptSyncDynamicData) => {
    setDynamicDataState(prevData => {
      if (!prevData) return newData;

      // Only update if values actually changed
      if (
        prevData.isConnected === newData.isConnected &&
        prevData.isConnecting === newData.isConnecting &&
        prevData.connectionCount === newData.connectionCount &&
        prevData.connectionError === newData.connectionError
      ) {
        return prevData; // No change, prevent re-render
      }

      return newData;
    });
  }, []);

  // Backward compatibility setter
  const setSyncData = useCallback((data: ScriptSyncData | null) => {
    if (!data) {
      setStableData(null);
      setDynamicDataState(null);
      return;
    }

    // Split into stable and dynamic data
    const stable: ScriptSyncStableData = {
      scriptId: data.scriptId || null,
      userType: data.userType,
      triggerRotation: data.triggerRotation
    };

    const dynamic: ScriptSyncDynamicData = {
      isConnected: data.isConnected,
      isConnecting: data.isConnecting,
      connectionCount: data.connectionCount,
      connectionError: data.connectionError
    };

    setStableData(stable);
    setDynamicData(dynamic);
  }, [setDynamicData]);

  const contextValue = React.useMemo(() => ({
    stableData,
    setStableData,
    dynamicData,
    setDynamicData,
    syncData,
    setSyncData
  }), [stableData, dynamicData, syncData, setDynamicData, setSyncData]);

  return (
    <ScriptSyncContext.Provider value={contextValue}>
      {children}
    </ScriptSyncContext.Provider>
  );
};
