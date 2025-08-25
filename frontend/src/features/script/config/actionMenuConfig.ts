// frontend/src/features/script/config/actionMenuConfig.ts

import { ActionItem } from '../../../components/ActionsMenu';

interface ActionMenuConfigParams {
    onOptionsClick: () => void;
    onFilterDepartmentsClick: () => void;
    onDuplicateClick: () => void;
    onExportClick: () => void;
    onDeleteClick: () => void;
}

export const createActionMenuConfig = ({
    onOptionsClick,
    onFilterDepartmentsClick,
    onDuplicateClick,
    onExportClick,
    onDeleteClick
}: ActionMenuConfigParams): ActionItem[] => [
    {
        id: 'options',
        label: 'Manage Edit Options',
        onClick: onOptionsClick,
        isDestructive: false,
        isDisabled: false
    },
    {
        id: 'filter-departments',
        label: 'Filter by Department',
        onClick: onFilterDepartmentsClick,
        isDestructive: false,
        isDisabled: false
    },
    {
        id: 'duplicate-script',
        label: 'Duplicate Script',
        onClick: onDuplicateClick,
        isDestructive: false,
        isDisabled: false
    },
    {
        id: 'export-script',
        label: 'Export Script',
        onClick: onExportClick,
        isDestructive: false,
        isDisabled: false
    },
    {
        id: 'delete-script',
        label: 'Delete Script',
        onClick: onDeleteClick,
        isDestructive: true,
        isDisabled: false
    }
];