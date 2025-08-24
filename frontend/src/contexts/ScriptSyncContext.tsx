// frontend/src/contexts/ScriptSyncContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ScriptSyncData {
  isConnected: boolean;
  isConnecting: boolean;
  connectionCount: number;
  connectionError?: string | null;
  userType: 'stage_manager' | 'crew_member';
  shouldRotate?: boolean;
}

interface ScriptSyncContextType {
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

export const useScriptSyncContextOptional = () => {
  return useContext(ScriptSyncContext);
};

interface ScriptSyncProviderProps {
  children: ReactNode;
}

export const ScriptSyncProvider: React.FC<ScriptSyncProviderProps> = ({ children }) => {
  const [syncData, setSyncData] = useState<ScriptSyncData | null>(null);

  return (
    <ScriptSyncContext.Provider value={{ syncData, setSyncData }}>
      {children}
    </ScriptSyncContext.Provider>
  );
};