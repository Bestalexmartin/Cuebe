import { ActionItem } from '../../components/ActionsMenu';

interface GuestActionMenuConfigParams {
    onOptionsClick: () => void;
}

export const createGuestActionMenuConfig = ({
    onOptionsClick
}: GuestActionMenuConfigParams): ActionItem[] => [
    {
        id: 'guest-options',
        label: 'Viewing Options',
        onClick: onOptionsClick,
        isDestructive: false,
        isDisabled: false
    }
];