import React, { createContext, useContext } from 'react';

interface DashboardContextType {
  hoveredCardId: string | null;
  setHoveredCardId: (id: string | null) => void;
  showCardRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  saveCurrentNavigationState: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

interface DashboardProviderProps {
  children: React.ReactNode;
  hoveredCardId: string | null;
  setHoveredCardId: (id: string | null) => void;
  showCardRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  saveCurrentNavigationState: () => void;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({
  children,
  hoveredCardId,
  setHoveredCardId,
  showCardRefs,
  saveCurrentNavigationState,
}) => {
  const value: DashboardContextType = {
    hoveredCardId,
    setHoveredCardId,
    showCardRefs,
    saveCurrentNavigationState,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboardContext = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
};