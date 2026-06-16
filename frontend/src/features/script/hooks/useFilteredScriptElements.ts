import { useEffect, useMemo } from 'react';
import { ScriptElement } from '../types/scriptElements';

interface UseFilteredScriptElementsOptions {
    allElements: ScriptElement[];
    filteredDepartmentIds: string[];
    hasUserSetFilter: boolean;
    setFilteredDepartmentIds: (departmentIds: string[]) => void;
    visibleElements: ScriptElement[];
}

const filterElementsByDepartment = (
    elements: ScriptElement[],
    filteredDepartmentIds: string[],
) => {
    if (filteredDepartmentIds.length === 0) {
        return elements.filter(
            (element) => element.element_type === 'NOTE' || element.element_type === 'GROUP'
        );
    }

    return elements.filter((element) => {
        if (element.element_type === 'NOTE' || element.element_type === 'GROUP') {
            return true;
        }

        return Boolean(
            element.department_id && filteredDepartmentIds.includes(element.department_id)
        );
    });
};

export const useFilteredScriptElements = ({
    allElements,
    filteredDepartmentIds,
    hasUserSetFilter,
    setFilteredDepartmentIds,
    visibleElements
}: UseFilteredScriptElementsOptions) => {
    const departmentFilteredElements = useMemo(
        () => filterElementsByDepartment(visibleElements, filteredDepartmentIds),
        [visibleElements, filteredDepartmentIds]
    );

    const departmentFilteredAllElements = useMemo(
        () => filterElementsByDepartment(allElements, filteredDepartmentIds),
        [allElements, filteredDepartmentIds]
    );

    useEffect(() => {
        if (allElements.length === 0 || filteredDepartmentIds.length > 0 || hasUserSetFilter) {
            return;
        }

        const allDepartmentIds = Array.from(new Set(
            allElements
                .filter((element) =>
                    element.department_id &&
                    element.element_type !== 'NOTE' &&
                    element.element_type !== 'GROUP'
                )
                .map((element) => element.department_id!)
        ));

        setFilteredDepartmentIds(allDepartmentIds);
    }, [allElements, filteredDepartmentIds.length, hasUserSetFilter, setFilteredDepartmentIds]);

    return {
        departmentFilteredElements,
        departmentFilteredAllElements
    };
};
