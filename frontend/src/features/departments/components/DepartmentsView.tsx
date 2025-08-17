// frontend/src/features/departments/components/DepartmentsView.tsx

import React, { useMemo } from 'react';
import { Flex } from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';
import { DepartmentCard } from './DepartmentCard';
import { useDepartments } from '../hooks/useDepartments';
import { EntityViewHeader } from '../../../components/shared/EntityViewHeader';
import { EntityViewContainer } from '../../../components/shared/EntityViewContainer';
import { EntityEmptyState } from '../../../components/shared/EntityEmptyState';
import { SortOption } from '../../../components/shared/SortMenu';


// TypeScript interfaces
interface DepartmentsViewProps {
    onCreateDepartment: () => void;
    selectedDepartmentId?: string | null;
    onDepartmentClick: (departmentId: string) => void;
    hoveredCardId?: string | null;
    setHoveredCardId: (id: string | null) => void;
    onSaveNavigationState?: () => void;
    sortBy: 'department_name' | 'department_color' | 'date_created' | 'date_updated';
    sortDirection: 'asc' | 'desc';
    onSortChange: (sortBy: 'department_name' | 'department_color' | 'date_created' | 'date_updated', sortDirection: 'asc' | 'desc') => void;
    showCardRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
}

const DEPARTMENTS_SORT_OPTIONS: SortOption[] = [
    { value: 'department_name', label: 'Name' },
    { value: 'department_color', label: 'Color' },
    { value: 'date_created', label: 'Date Added' },
    { value: 'date_updated', label: 'Updated' },
];

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({
    onCreateDepartment,
    selectedDepartmentId,
    onDepartmentClick,
    hoveredCardId,
    setHoveredCardId,
    onSaveNavigationState,
    sortBy,
    sortDirection,
    onSortChange,
    showCardRefs
}) => {
    const navigate = useNavigate();
    const { departments, isLoading, error } = useDepartments();

    // Department-specific sorting logic
    const handleSortClick = (newSortBy: string) => {
        const typedSortBy = newSortBy as typeof sortBy;
        if (sortBy === typedSortBy) {
            const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            onSortChange(typedSortBy, newDirection);
        } else {
            const newDirection = typedSortBy === 'department_name' ? 'asc' : 'desc';
            onSortChange(typedSortBy, newDirection);
        }
    };

    const sortedDepartments = useMemo(() => {
        if (!departments || departments.length === 0) return [];

        const departmentsToSort = [...departments];
        departmentsToSort.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'department_name') {
                comparison = a.department_name.localeCompare(b.department_name);
            } else if (sortBy === 'department_color') {
                const getHue = (hex?: string) => {
                    if (!hex) return 999;
                    // Simple hex to hue conversion (approximate)
                    const r = parseInt(hex.slice(1, 3), 16) / 255;
                    const g = parseInt(hex.slice(3, 5), 16) / 255;
                    const b = parseInt(hex.slice(5, 7), 16) / 255;
                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    let hue = 0;
                    if (max !== min) {
                        const delta = max - min;
                        switch (max) {
                            case r: hue = ((g - b) / delta) % 6; break;
                            case g: hue = (b - r) / delta + 2; break;
                            case b: hue = (r - g) / delta + 4; break;
                        }
                        hue *= 60;
                    }
                    return hue < 0 ? hue + 360 : hue;
                };
                comparison = getHue(a.department_color) - getHue(b.department_color);
            } else if (sortBy === 'date_created') {
                comparison = new Date(b.date_created || b.date_updated).getTime() - new Date(a.date_created || a.date_updated).getTime();
            } else {
                comparison = new Date(b.date_updated || b.date_created).getTime() - new Date(a.date_updated || a.date_created).getTime();
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return departmentsToSort;
    }, [departments, sortBy, sortDirection]);

    const handleEdit = (departmentId: string) => {
        if (onSaveNavigationState) {
            onSaveNavigationState();
        }
        navigate(`/departments/${departmentId}/edit`);
    };

    // Use the modal handler from props if provided, otherwise use local modal
    const handleCreateDepartment = onCreateDepartment;

    const emptyState = (
        <EntityEmptyState
            entityIcon="department"
            message="You haven't added any departments yet."
            actionButtonText="Add Your First Department"
            onActionClick={handleCreateDepartment}
        />
    );

    return (
        <Flex direction="column" height="100%">
            <EntityViewHeader
                entityName="Departments"
                entityIcon="department"
                sortBy={sortBy}
                sortDirection={sortDirection}
                sortOptions={DEPARTMENTS_SORT_OPTIONS}
                onSortClick={handleSortClick}
                createButtonText="Add Department"
                onCreateClick={handleCreateDepartment}
            />

            <EntityViewContainer
                isLoading={isLoading}
                error={error}
                hasItems={sortedDepartments.length > 0}
                emptyStateComponent={emptyState}
            >
                {sortedDepartments.map(department => (
                    <div key={department.department_id} ref={el => { showCardRefs.current[department.department_id] = el; }}>
                        <DepartmentCard
                            department={department}
                            onEdit={handleEdit}
                            onDepartmentClick={onDepartmentClick}
                            isHovered={hoveredCardId === department.department_id}
                            isSelected={selectedDepartmentId === department.department_id}
                            onHover={setHoveredCardId}
                            onSaveNavigationState={onSaveNavigationState}
                        />
                    </div>
                ))}
            </EntityViewContainer>
        </Flex>
    );
};
