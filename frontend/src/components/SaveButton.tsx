// frontend/src/components/SaveButton.tsx

import React from 'react';
import { Button, Tooltip, HStack, Text, Spinner } from '@chakra-ui/react';
import { AppIcon } from './AppIcon';

interface SaveButtonProps {
    hasUnsavedChanges: boolean;
    isLoading?: boolean;
    onSave: () => Promise<void> | void;
    onDiscard?: () => void;
    summary?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'outline' | 'solid';
    showDiscardButton?: boolean;
}

export const SaveButton: React.FC<SaveButtonProps> = ({
    hasUnsavedChanges,
    isLoading = false,
    onSave,
    onDiscard,
    summary,
    size = 'md',
    variant = 'solid',
    showDiscardButton = true
}) => {
    if (!hasUnsavedChanges && !isLoading) {
        return (
            <Tooltip label="No changes to save">
                <Button
                    size={size}
                    variant="outline"
                    isDisabled={true}
                    leftIcon={<AppIcon name="save" boxSize="16px" />}
                >
                    Saved
                </Button>
            </Tooltip>
        );
    }

    return (
        <HStack spacing={2}>
            <Tooltip 
                label={summary ? `Save changes: ${summary}` : 'Save changes'}
                placement="top"
            >
                <Button
                    size={size}
                    variant={variant}
                    colorScheme="blue"
                    isLoading={isLoading}
                    loadingText="Saving..."
                    leftIcon={isLoading ? <Spinner size="sm" /> : <AppIcon name="save" boxSize="16px" />}
                    onClick={onSave}
                    _hover={{
                        bg: variant === 'solid' ? 'blue.600' : 'blue.50',
                        borderColor: 'blue.500'
                    }}
                >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
            </Tooltip>
            
            {showDiscardButton && onDiscard && hasUnsavedChanges && (
                <Tooltip label="Discard all unsaved changes" placement="top">
                    <Button
                        size={size}
                        variant="outline"
                        colorScheme="red"
                        leftIcon={<AppIcon name="delete" boxSize="16px" />}
                        onClick={onDiscard}
                        _hover={{
                            bg: 'red.50',
                            borderColor: 'red.500'
                        }}
                    >
                        Discard
                    </Button>
                </Tooltip>
            )}
        </HStack>
    );
};

/**
 * Compact version for toolbars
 */
export const CompactSaveButton: React.FC<SaveButtonProps> = ({
    hasUnsavedChanges,
    isLoading = false,
    onSave,
    summary
}) => {
    const getButtonProps = () => {
        if (isLoading) {
            return {
                bg: 'blue.500',
                color: 'white',
                borderColor: 'blue.400'
            };
        }
        
        if (hasUnsavedChanges) {
            return {
                bg: 'orange.500',
                color: 'white',
                borderColor: 'orange.400',
                _hover: {
                    bg: 'orange.600',
                    borderColor: 'orange.500'
                }
            };
        }
        
        return {
            bg: 'card.background',
            color: 'button.text',
            borderColor: 'container.border',
            cursor: 'default',
            _hover: {}
        };
    };

    return (
        <Tooltip 
            label={
                isLoading ? 'Saving changes...' :
                hasUnsavedChanges ? (summary ? `Save changes: ${summary}` : 'Save unsaved changes') :
                'No changes to save'
            }
            placement="right"
        >
            <Button
                width="50px"
                height="50px"
                minWidth="50px"
                p={0}
                border="1px solid"
                borderRadius="md"
                transition="all 0.2s"
                onClick={hasUnsavedChanges && !isLoading ? onSave : undefined}
                isDisabled={!hasUnsavedChanges || isLoading}
                {...getButtonProps()}
            >
                {isLoading ? (
                    <Spinner size="sm" color="white" />
                ) : (
                    <AppIcon
                        name="save"
                        boxSize="24px"
                    />
                )}
            </Button>
        </Tooltip>
    );
};