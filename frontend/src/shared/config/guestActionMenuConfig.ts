import { ActionItem } from '../../components/ActionsMenu';

interface GuestActionMenuConfigParams {
    onOptionsClick: () => void;
    onBackToShows: () => void;
}

export const createGuestActionMenuConfig = ({
    onOptionsClick,
    onBackToShows
}: GuestActionMenuConfigParams): ActionItem[] => [
    {
        id: 'guest-options',
        label: 'Viewing Options',
        onClick: onOptionsClick,
        isDestructive: false,
        isDisabled: false
    },
    {
        id: 'back-to-shows',
        label: 'Back to Shows',
        onClick: onBackToShows,
        isDestructive: false,
        isDisabled: false
    }
];