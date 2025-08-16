import React from 'react';
import { ShowsView } from '../../features/shows/components/ShowsView';
import { VenuesView } from '../../features/venues/components/VenuesView';
import { DepartmentsView } from '../../features/departments/components/DepartmentsView';
import { CrewView } from '../../features/crew/components/CrewView';
import { useDashboardContext } from '../../contexts/DashboardContext';

interface ViewRendererProps {
  currentView: string;
  refreshKey: number;
  
  // Show-related props
  shows: any[];
  isLoading: boolean;
  error: string | null;
  selectedShowId: string | null;
  selectedScriptId: string | null;
  handleShowClick: (id: string) => void;
  handleScriptClick: (id: string) => void;
  onCreateShow: () => void;
  onCreateScript: (showId: string) => void;
  
  // Venue-related props
  selectedVenueId: string | null;
  handleVenueClick: (id: string) => void;
  onCreateVenue: () => void;
  
  // Department-related props
  selectedDepartmentId: string | null;
  handleDepartmentClick: (id: string) => void;
  onCreateDepartment: () => void;
  
  // Crew-related props
  selectedCrewId: string | null;
  handleCrewClick: (id: string) => void;
  onCreateCrew: () => void;
  
  // Sort props
  sortState: any;
  handleShowsSortChange: (sortBy: string, sortDirection: string) => void;
  handleVenuesSortChange: (sortBy: string, sortDirection: string) => void;
  handleDepartmentsSortChange: (sortBy: string, sortDirection: string) => void;
  handleCrewSortChange: (sortBy: string, sortDirection: string) => void;
}

export const ViewRenderer: React.FC<ViewRendererProps> = React.memo(({
  currentView,
  refreshKey,
  shows,
  isLoading,
  error,
  selectedShowId,
  selectedScriptId,
  handleShowClick,
  handleScriptClick,
  onCreateShow,
  onCreateScript,
  selectedVenueId,
  handleVenueClick,
  onCreateVenue,
  selectedDepartmentId,
  handleDepartmentClick,
  onCreateDepartment,
  selectedCrewId,
  handleCrewClick,
  onCreateCrew,
  sortState,
  handleShowsSortChange,
  handleVenuesSortChange,
  handleDepartmentsSortChange,
  handleCrewSortChange,
}) => {
  // Get common props from context
  const { hoveredCardId, setHoveredCardId, showCardRefs, saveCurrentNavigationState } = useDashboardContext();
  switch (currentView) {
    case 'shows':
      return (
        <ShowsView
          key={`shows-${refreshKey}`}
          shows={shows}
          isLoading={isLoading}
          error={error}
          onCreateShow={onCreateShow}
          selectedShowId={selectedShowId}
          hoveredCardId={hoveredCardId}
          setHoveredCardId={setHoveredCardId}
          handleShowClick={handleShowClick}
          showCardRefs={showCardRefs}
          selectedScriptId={selectedScriptId}
          handleScriptClick={handleScriptClick}
          onCreateScript={onCreateScript}
          onSaveNavigationState={saveCurrentNavigationState}
          sortBy={sortState.shows.sortBy}
          sortDirection={sortState.shows.sortDirection}
          onSortChange={handleShowsSortChange}
        />
      );
    
    case 'venues':
      return (
        <VenuesView
          key={`venues-${refreshKey}`}
          onCreateVenue={onCreateVenue}
          selectedVenueId={selectedVenueId}
          onVenueClick={handleVenueClick}
          hoveredCardId={hoveredCardId}
          setHoveredCardId={setHoveredCardId}
          onSaveNavigationState={saveCurrentNavigationState}
          sortBy={sortState.venues.sortBy}
          sortDirection={sortState.venues.sortDirection}
          onSortChange={handleVenuesSortChange}
          showCardRefs={showCardRefs}
        />
      );
    
    case 'departments':
      return (
        <DepartmentsView
          key={`departments-${refreshKey}`}
          onCreateDepartment={onCreateDepartment}
          selectedDepartmentId={selectedDepartmentId}
          onDepartmentClick={handleDepartmentClick}
          hoveredCardId={hoveredCardId}
          setHoveredCardId={setHoveredCardId}
          onSaveNavigationState={saveCurrentNavigationState}
          sortBy={sortState.departments.sortBy}
          sortDirection={sortState.departments.sortDirection}
          onSortChange={handleDepartmentsSortChange}
          showCardRefs={showCardRefs}
        />
      );
    
    case 'crew':
      return (
        <CrewView
          key={`crew-${refreshKey}`}
          onCreateCrew={onCreateCrew}
          selectedCrewId={selectedCrewId}
          onCrewClick={handleCrewClick}
          hoveredCardId={hoveredCardId}
          setHoveredCardId={setHoveredCardId}
          onSaveNavigationState={saveCurrentNavigationState}
          sortBy={sortState.crew.sortBy}
          sortDirection={sortState.crew.sortDirection}
          onSortChange={handleCrewSortChange}
          showCardRefs={showCardRefs}
        />
      );
    
    default:
      return null;
  }
});