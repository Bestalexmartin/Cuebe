// frontend/src/features/departments/components/DepartmentCard.tsx

import React from 'react';
import {
    Box,
    HStack,
    VStack,
    Text,
} from "@chakra-ui/react";
import { BaseCard, BaseCardAction } from '../../../components/base/BaseCard';
import { formatDateTimeLocal } from '../../../utils/timeUtils';

// TypeScript interfaces
interface DepartmentCrewAssignment {
    assignment_id: string;
    show_id: string;
    show_name: string;
    user_id: string;
    fullname_first?: string;
    fullname_last?: string;
    email_address?: string;
    profile_img_url?: string;
    role?: string;
}

interface Department {
    department_id: string;
    department_name: string;
    department_description?: string;
    department_color?: string;
    department_initials?: string;
    date_created: string;
    date_updated: string;
    shows_assigned_count?: number;
    unique_crew_count?: number;
    crew_assignments?: DepartmentCrewAssignment[];
}

interface DepartmentCardProps {
    department: Department;
    onEdit: (departmentId: string) => void;
    onDepartmentClick: (departmentId: string) => void;
    isHovered: boolean;
    isSelected: boolean;
    onHover?: (departmentId: string | null) => void;
    onSaveNavigationState?: () => void;
    isLoading?: boolean;
}

const DepartmentCardComponent: React.FC<DepartmentCardProps> = ({
    department,
    onEdit,
    onDepartmentClick,
    isHovered,
    isSelected,
    onHover,
    onSaveNavigationState,
    isLoading = false,
}) => {
    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (onSaveNavigationState) {
            onSaveNavigationState();
        }

        onEdit(department.department_id);
    };

    const headerBadges = (
        <>
            {department.department_color && (
                <Box
                    w="32px"
                    h="32px"
                    borderRadius="full"
                    bg={department.department_color}
                    flexShrink="0"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    {department.department_initials && (
                        <Text
                            fontSize="xs"
                            fontWeight="bold"
                            color="black"
                            userSelect="none"
                        >
                            {department.department_initials}
                        </Text>
                    )}
                </Box>
            )}
        </>
    );

    const headerActions: BaseCardAction[] = [
        {
            label: "Edit",
            icon: "edit",
            onClick: handleEditClick,
            'aria-label': "Edit Department"
        }
    ];

    const quickInfo = (
        <VStack align="stretch" spacing="1" fontSize="sm" color="cardText">
            <HStack justify="space-between">
                <Text>{department.shows_assigned_count || 0} show{(department.shows_assigned_count || 0) !== 1 ? 's' : ''}</Text>
                <Text fontSize="xs">
                    Created: {formatDateTimeLocal(department.date_created || department.date_updated)}
                </Text>
            </HStack>
            <HStack justify="space-between">
                <Text isTruncated>{department.department_description || ''}</Text>
                <Text fontSize="xs">
                    Updated: {formatDateTimeLocal(department.date_updated || department.date_created)}
                </Text>
            </HStack>
        </VStack>
    );

    const expandedContent = (
        <>
            {/* Color Information */}
            {department.department_color && (
                <Box>
                    <Text fontWeight="semibold" mb={2}>Department Color</Text>
                    <HStack spacing="3" align="center">
                        <Box
                            w="40px"
                            h="40px"
                            borderRadius="md"
                            bg={department.department_color}
                        />
                        <VStack align="start" spacing="0">
                            <Text fontSize="sm" fontWeight="medium">
                                {department.department_color.toUpperCase()}
                            </Text>
                            <Text fontSize="xs" color="cardText">
                                Hex Color Code
                            </Text>
                        </VStack>
                    </HStack>
                </Box>
            )}

        </>
    );

    return (
        <BaseCard
            title={department.department_name}
            cardId={department.department_id}
            isSelected={isSelected}
            isHovered={isHovered}
            onCardClick={() => onDepartmentClick(department.department_id)}
            onHover={onHover}
            headerBadges={headerBadges}
            headerActions={headerActions}
            quickInfo={quickInfo}
            expandedContent={expandedContent}
            isLoading={isLoading}
            skeletonVariant="department"
        />
    );
};

export const DepartmentCard = React.memo(DepartmentCardComponent);
