// frontend/src/features/script/config/actionMenuConfig.ts

import { ActionItem } from '../../../components/ActionsMenu';

interface ActionMenuConfigParams {
    onOptionsClick: () => void;
    onDuplicateClick: () => void;
    onDeleteClick: () => void;
}

export const createActionMenuConfig = ({
    onOptionsClick,
    onDuplicateClick,
    onDeleteClick
}: ActionMenuConfigParams): ActionItem[] => [
    {
        id: 'options',
        label: 'Options',
        onClick: onOptionsClick,
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
        onClick: () => { },
        isDestructive: false,
        isDisabled: true
    },
    {
        id: 'edit-history',
        label: 'Edit History',
        onClick: () => { },
        isDestructive: false,
        isDisabled: true
    },
    {
        id: 'delete-script',
        label: 'Delete Script',
        onClick: onDeleteClick,
        isDestructive: true,
        isDisabled: false
    }
];