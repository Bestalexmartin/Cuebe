import React, { useState, useEffect } from 'react';
import {
    VStack,
    Input
} from '@chakra-ui/react';
import { BaseModal } from '../../../components/base/BaseModal';

interface MobileSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (query: string) => void;
}

export const MobileSearchModal: React.FC<MobileSearchModalProps> = ({
    isOpen,
    onClose,
    onSearch
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            onSearch(searchQuery.trim());
            onClose();
        }
    };

    const handleCancel = () => {
        setSearchQuery('');
        onClose();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleCancel}
            primaryAction={{
                label: "Search",
                variant: "primary",
                onClick: handleSearch,
                isDisabled: !searchQuery.trim()
            }}
            secondaryAction={{
                label: "Cancel",
                variant: "secondary",
                onClick: handleCancel
            }}
            errorBoundaryContext="MobileSearchModal"
            maxWidth="350px"
        >
            <VStack spacing={4} align="center" px="40px">
                <Input
                    placeholder="Search tutorials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoFocus
                    width="300px"
                />
            </VStack>
        </BaseModal>
    );
};