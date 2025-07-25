import React from 'react';
import {
    Box,
    HStack,
    VStack,
    Text,
} from "@chakra-ui/react";
import { BaseCard, BaseCardAction } from '../base/BaseCard';
import { formatDateTimeLocal } from '../../utils/dateTimeUtils';

// TypeScript interfaces
interface Department {
    departmentID: string;
    departmentName: string;
    departmentDescription?: string;
    departmentColor?: string;
    dateCreated: string;
    dateUpdated: string;
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

        onEdit(department.departmentID);
    };

    const headerBadges = (
        <>
            {department.departmentColor && (
                <Box
                    w="32px"
                    h="32px"
                    borderRadius="full"
                    bg={department.departmentColor}
                    border="2px solid"
                    borderColor="gray.300"
                    _dark={{ borderColor: "gray.600" }}
                    flexShrink="0"
                />
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
        <VStack align="stretch" spacing="1" fontSize="sm" color="detail.text">
            <HStack justify="space-between">
                <Text>0 crew members</Text>
                <Text fontSize="xs">
                    Created: {formatDateTimeLocal(department.dateCreated || department.dateUpdated)}
                </Text>
            </HStack>
            <HStack justify="space-between">
                <Text>0 shows assigned</Text>
                <Text fontSize="xs">
                    Updated: {formatDateTimeLocal(department.dateUpdated || department.dateCreated)}
                </Text>
            </HStack>
        </VStack>
    );

    const expandedContent = (
        <>
            {/* Color Information */}
            {department.departmentColor && (
                <Box>
                    <Text fontWeight="semibold" mb={2}>Department Color</Text>
                    <HStack spacing="3" align="center">
                        <Box
                            w="40px"
                            h="40px"
                            borderRadius="md"
                            bg={department.departmentColor}
                            border="2px solid"
                            borderColor="gray.300"
                            _dark={{ borderColor: "gray.600" }}
                        />
                        <VStack align="start" spacing="0">
                            <Text fontSize="sm" fontWeight="medium">
                                {department.departmentColor.toUpperCase()}
                            </Text>
                            <Text fontSize="xs" color="detail.text">
                                Hex Color Code
                            </Text>
                        </VStack>
                    </HStack>
                </Box>
            )}

            {/* Full Description */}
            {department.departmentDescription && (
                <Box>
                    <Text fontWeight="semibold" mb={2}>Description</Text>
                    <Text fontSize="sm" color="detail.text">
                        {department.departmentDescription}
                    </Text>
                </Box>
            )}
        </>
    );

    return (
        <BaseCard
            title={department.departmentName}
            cardId={department.departmentID}
            isSelected={isSelected}
            isHovered={isHovered}
            onCardClick={() => onDepartmentClick(department.departmentID)}
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