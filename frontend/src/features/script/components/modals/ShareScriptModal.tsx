// frontend/src/features/script/components/modals/ShareScriptModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    Button,
    VStack,
    HStack,
    Text,
    Checkbox,
    CheckboxGroup,
    Input,
    Textarea,
    FormControl,
    FormLabel,
    FormHelperText,
    Alert,
    AlertIcon,
    Divider,
    Box,
    Badge,
    IconButton,
    Tooltip,
    useClipboard,
    useToast,
    Select,
    Switch,
    InputGroup,
    InputRightElement
} from "@chakra-ui/react";
import { format, addDays, addWeeks, addMonths } from 'date-fns';

import { useShareScript } from '../../hooks/useShareScript';
import { useShowCrew } from '../../../shows/hooks/useShowCrew';
import { AppIcon } from '../../../../components/AppIcon';

interface ShareScriptModalProps {
    isOpen: boolean;
    onClose: () => void;
    scriptId: string;
    scriptName: string;
    showId: string;
}

interface ShareFormData {
    shareName: string;
    notes: string;
    selectedUserId: string;
    permissions: {
        view: boolean;
        download: boolean;
    };
    expiresAt: string | null;
    customExpiration: boolean;
}

const EXPIRATION_PRESETS = [
    { label: 'Never', value: null },
    { label: '1 Day', value: () => addDays(new Date(), 1) },
    { label: '1 Week', value: () => addWeeks(new Date(), 1) },
    { label: '1 Month', value: () => addMonths(new Date(), 1) },
    { label: '3 Months', value: () => addMonths(new Date(), 3) },
    { label: 'Custom', value: 'custom' }
];

export const ShareScriptModal: React.FC<ShareScriptModalProps> = ({
    isOpen,
    onClose,
    scriptId,
    scriptName,
    showId
}) => {
    const toast = useToast();
    const { crewMembers, isLoading: loadingCrew } = useShowCrew(showId);
    const { createShare, isCreating, error: shareError } = useShareScript();

    const [formData, setFormData] = useState<ShareFormData>({
        shareName: `${scriptName} - Crew View`,
        notes: '',
        selectedUserId: '',
        permissions: {
            view: true,
            download: false
        },
        expiresAt: null,
        customExpiration: false
    });

    const [generatedShare, setGeneratedShare] = useState<{
        token: string;
        shareUrl: string;
        shareId: string;
    } | null>(null);

    const [selectedPreset, setSelectedPreset] = useState<string>('never');
    const [customExpirationDate, setCustomExpirationDate] = useState<string>('');

    const { hasCopied, onCopy } = useClipboard(generatedShare?.shareUrl || '');

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen && !generatedShare) {
            setFormData({
                shareName: `${scriptName} - Crew View`,
                notes: '',
                selectedUserId: '',
                permissions: {
                    view: true,
                    download: false
                },
                expiresAt: null,
                customExpiration: false
            });
            setSelectedPreset('never');
            setCustomExpirationDate('');
        }
    }, [isOpen, scriptName, generatedShare]);

    // Handle expiration preset change
    const handleExpirationPresetChange = (value: string) => {
        setSelectedPreset(value);
        
        if (value === 'never') {
            setFormData(prev => ({ ...prev, expiresAt: null, customExpiration: false }));
        } else if (value === 'custom') {
            setFormData(prev => ({ ...prev, customExpiration: true }));
        } else {
            const preset = EXPIRATION_PRESETS.find(p => p.label.toLowerCase().replace(' ', '_') === value);
            if (preset && typeof preset.value === 'function') {
                const expirationDate = preset.value();
                setFormData(prev => ({
                    ...prev,
                    expiresAt: expirationDate.toISOString(),
                    customExpiration: false
                }));
            }
        }
    };

    // Handle custom expiration date change
    const handleCustomExpirationChange = (value: string) => {
        setCustomExpirationDate(value);
        if (value) {
            const date = new Date(value);
            setFormData(prev => ({ ...prev, expiresAt: date.toISOString() }));
        } else {
            setFormData(prev => ({ ...prev, expiresAt: null }));
        }
    };

    // Validate form
    const isFormValid = useMemo(() => {
        return (
            formData.shareName.trim().length > 0 &&
            formData.selectedUserId.trim().length > 0 &&
            (!formData.customExpiration || customExpirationDate)
        );
    }, [formData, customExpirationDate]);

    // Handle form submission
    const handleCreateShare = async () => {
        if (!isFormValid) return;

        try {
            const shareData = {
                share_name: formData.shareName.trim(),
                notes: formData.notes.trim() || undefined,
                shared_with_user_id: formData.selectedUserId,
                permissions: formData.permissions,
                expires_at: formData.expiresAt || undefined
            };

            const result = await createShare(scriptId, shareData);
            
            setGeneratedShare({
                token: result.share_token,
                shareUrl: result.share_url,
                shareId: result.share_id
            });

            toast({
                title: "Share Created Successfully",
                description: "Your script sharing link has been generated.",
                status: "success",
                duration: 3000,
                isClosable: true
            });

        } catch (error) {
            console.error('Error creating share:', error);
            toast({
                title: "Failed to Create Share",
                description: error instanceof Error ? error.message : "An unexpected error occurred",
                status: "error",
                duration: 5000,
                isClosable: true
            });
        }
    };

    // Handle modal close
    const handleClose = () => {
        setGeneratedShare(null);
        onClose();
    };

    // Copy URL to clipboard
    const handleCopyUrl = () => {
        onCopy();
        toast({
            title: "Link Copied!",
            description: "The sharing link has been copied to your clipboard.",
            status: "success",
            duration: 2000,
            isClosable: true
        });
    };

    // Get selected crew member for display
    const selectedCrewMember = useMemo(() => {
        return crewMembers.find(member => member.user_id === formData.selectedUserId);
    }, [crewMembers, formData.selectedUserId]);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    {generatedShare ? 'Share Created Successfully' : 'Share Script with Crew'}
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    {generatedShare ? (
                        // Success state - show generated link
                        <VStack spacing={6} align="stretch">
                            <Alert status="success" borderRadius="md">
                                <AlertIcon />
                                Your script sharing link has been created successfully!
                            </Alert>

                            <Box>
                                <FormLabel>Sharing Link</FormLabel>
                                <InputGroup>
                                    <Input
                                        value={generatedShare.shareUrl}
                                        isReadOnly
                                        bg="gray.50"
                                        fontFamily="mono"
                                        fontSize="sm"
                                    />
                                    <InputRightElement width="4.5rem">
                                        <Button
                                            size="sm"
                                            onClick={handleCopyUrl}
                                            colorScheme={hasCopied ? "green" : "blue"}
                                        >
                                            {hasCopied ? "Copied!" : "Copy"}
                                        </Button>
                                    </InputRightElement>
                                </InputGroup>
                                <FormHelperText>
                                    Share this link with your crew members to give them access to the script.
                                </FormHelperText>
                            </Box>

                            <Box>
                                <Text fontWeight="semibold" mb={2}>Share Details</Text>
                                <VStack spacing={2} align="stretch" fontSize="sm">
                                    <HStack justify="space-between">
                                        <Text color="gray.600">Share Name:</Text>
                                        <Text>{formData.shareName}</Text>
                                    </HStack>
                                    
                                    <HStack justify="space-between">
                                        <Text color="gray.600">Shared With:</Text>
                                        <VStack spacing={0} align="flex-end">
                                            <Text fontWeight="medium">
                                                {selectedCrewMember ? 
                                                    `${selectedCrewMember.fullname_first} ${selectedCrewMember.fullname_last}` : 
                                                    'Unknown User'
                                                }
                                            </Text>
                                            {selectedCrewMember && (
                                                <Text fontSize="xs" color="gray.500">
                                                    {selectedCrewMember.email_address}
                                                </Text>
                                            )}
                                        </VStack>
                                    </HStack>
                                    
                                    {selectedCrewMember && (
                                        <HStack justify="space-between">
                                            <Text color="gray.600">Their Departments:</Text>
                                            <HStack spacing={1}>
                                                {/* Show all departments this crew member is assigned to */}
                                                {crewMembers
                                                    .filter(member => member.user_id === selectedCrewMember.user_id)
                                                    .map(assignment => (
                                                        <Badge
                                                            key={assignment.assignment_id}
                                                            colorScheme="blue"
                                                            variant="subtle"
                                                            fontSize="xs"
                                                            style={{
                                                                backgroundColor: assignment.department_color || undefined
                                                            }}
                                                        >
                                                            {assignment.department_initials || assignment.department_name}
                                                        </Badge>
                                                    ))
                                                }
                                            </HStack>
                                        </HStack>
                                    )}
                                    
                                    <HStack justify="space-between">
                                        <Text color="gray.600">Permissions:</Text>
                                        <HStack spacing={2}>
                                            {formData.permissions.view && <Badge colorScheme="green">View</Badge>}
                                            {formData.permissions.download && <Badge colorScheme="blue">Download</Badge>}
                                        </HStack>
                                    </HStack>
                                    
                                    {formData.expiresAt && (
                                        <HStack justify="space-between">
                                            <Text color="gray.600">Expires:</Text>
                                            <Text>{format(new Date(formData.expiresAt), 'MMM d, yyyy h:mm a')}</Text>
                                        </HStack>
                                    )}
                                </VStack>
                            </Box>

                            <Box bg="blue.50" p={4} borderRadius="md">
                                <Text fontSize="sm" color="blue.800">
                                    <strong>Next Steps:</strong>
                                    <br />
                                    • Copy and send the link to {selectedCrewMember ? `${selectedCrewMember.fullname_first}` : 'the crew member'}
                                    • They can access their personalized script view without logging in
                                    • Content is automatically filtered based on their department assignments
                                    • You can manage this share from the script's Share mode
                                </Text>
                            </Box>
                        </VStack>
                    ) : (
                        // Form state - configure share
                        <VStack spacing={6} align="stretch">
                            {shareError && (
                                <Alert status="error" borderRadius="md">
                                    <AlertIcon />
                                    {shareError}
                                </Alert>
                            )}

                            {/* Share Name */}
                            <FormControl isRequired>
                                <FormLabel>Share Name</FormLabel>
                                <Input
                                    value={formData.shareName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, shareName: e.target.value }))}
                                    placeholder="e.g. Hamlet - Crew View"
                                />
                                <FormHelperText>
                                    A name to help you identify this share later
                                </FormHelperText>
                            </FormControl>

                            {/* Crew Member Selection */}
                            <FormControl isRequired>
                                <FormLabel>Crew Member</FormLabel>
                                <Text fontSize="sm" color="gray.600" mb={3}>
                                    Select which crew member will have access to this script
                                </Text>
                                
                                {loadingCrew ? (
                                    <Text fontSize="sm" color="gray.500">Loading crew members...</Text>
                                ) : crewMembers.length === 0 ? (
                                    <Alert status="warning" size="sm">
                                        <AlertIcon />
                                        No crew members are assigned to this show yet.
                                    </Alert>
                                ) : (
                                    <Select
                                        placeholder="Choose a crew member..."
                                        value={formData.selectedUserId}
                                        onChange={(e) => setFormData(prev => ({ 
                                            ...prev, 
                                            selectedUserId: e.target.value,
                                            shareName: e.target.value ? 
                                                `${scriptName} - ${crewMembers.find(m => m.user_id === e.target.value)?.fullname_first} ${crewMembers.find(m => m.user_id === e.target.value)?.fullname_last}` :
                                                `${scriptName} - Crew View`
                                        }))}
                                    >
                                        {/* Group by unique users (since crew members can have multiple department assignments) */}
                                        {Array.from(new Map(crewMembers.map(member => [member.user_id, member])).values())
                                            .sort((a, b) => `${a.fullname_first} ${a.fullname_last}`.localeCompare(`${b.fullname_first} ${b.fullname_last}`))
                                            .map((member) => (
                                                <option key={member.user_id} value={member.user_id}>
                                                    {member.fullname_first} {member.fullname_last} ({member.email_address})
                                                    {member.user_status === 'GUEST' ? ' - Guest' : ''}
                                                </option>
                                            ))}
                                    </Select>
                                )}

                                {/* Show departments for selected user */}
                                {selectedCrewMember && (
                                    <Box mt={3} p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                                        <Text fontSize="sm" fontWeight="medium" mb={2}>
                                            This crew member will see content for:
                                        </Text>
                                        <HStack spacing={2} flexWrap="wrap">
                                            {crewMembers
                                                .filter(member => member.user_id === selectedCrewMember.user_id)
                                                .map(assignment => (
                                                    <Badge
                                                        key={assignment.assignment_id}
                                                        colorScheme="blue"
                                                        variant="solid"
                                                        fontSize="xs"
                                                        style={{
                                                            backgroundColor: assignment.department_color || '#3182ce',
                                                            color: 'white'
                                                        }}
                                                    >
                                                        {assignment.department_name}
                                                        {assignment.show_role && ` (${assignment.show_role})`}
                                                    </Badge>
                                                ))
                                            }
                                            <Badge colorScheme="gray" variant="outline" fontSize="xs">
                                                General Notes
                                            </Badge>
                                        </HStack>
                                    </Box>
                                )}
                            </FormControl>

                            {/* Permissions */}
                            <FormControl>
                                <FormLabel>Permissions</FormLabel>
                                <VStack spacing={3} align="stretch">
                                    <HStack justify="space-between">
                                        <VStack align="flex-start" spacing={0}>
                                            <Text fontSize="sm" fontWeight="medium">View Script</Text>
                                            <Text fontSize="xs" color="gray.600">
                                                Allow crew to view script elements
                                            </Text>
                                        </VStack>
                                        <Switch
                                            isChecked={formData.permissions.view}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                permissions: { ...prev.permissions, view: e.target.checked }
                                            }))}
                                            isDisabled // View permission is always required
                                        />
                                    </HStack>
                                    
                                    <HStack justify="space-between">
                                        <VStack align="flex-start" spacing={0}>
                                            <Text fontSize="sm" fontWeight="medium">Download Script</Text>
                                            <Text fontSize="xs" color="gray.600">
                                                Allow crew to download script data
                                            </Text>
                                        </VStack>
                                        <Switch
                                            isChecked={formData.permissions.download}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                permissions: { ...prev.permissions, download: e.target.checked }
                                            }))}
                                        />
                                    </HStack>
                                </VStack>
                            </FormControl>

                            {/* Expiration */}
                            <FormControl>
                                <FormLabel>Link Expiration</FormLabel>
                                <Select
                                    value={selectedPreset}
                                    onChange={(e) => handleExpirationPresetChange(e.target.value)}
                                    mb={3}
                                >
                                    {EXPIRATION_PRESETS.map(preset => (
                                        <option 
                                            key={preset.label} 
                                            value={preset.label.toLowerCase().replace(' ', '_')}
                                        >
                                            {preset.label}
                                        </option>
                                    ))}
                                </Select>

                                {formData.customExpiration && (
                                    <Input
                                        type="datetime-local"
                                        value={customExpirationDate}
                                        onChange={(e) => handleCustomExpirationChange(e.target.value)}
                                        min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                                    />
                                )}

                                <FormHelperText>
                                    After this date, the sharing link will no longer work
                                </FormHelperText>
                            </FormControl>

                            {/* Notes */}
                            <FormControl>
                                <FormLabel>Notes (Optional)</FormLabel>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Internal notes about this share (not visible to crew)"
                                    rows={3}
                                />
                            </FormControl>
                        </VStack>
                    )}
                </ModalBody>

                <ModalFooter>
                    {generatedShare ? (
                        <HStack spacing={3}>
                            <Button variant="outline" onClick={handleClose}>
                                Close
                            </Button>
                            <Button
                                colorScheme="blue"
                                leftIcon={<AppIcon name="external-link" />}
                                onClick={() => window.open(generatedShare.shareUrl, '_blank')}
                            >
                                Preview Share
                            </Button>
                        </HStack>
                    ) : (
                        <HStack spacing={3}>
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                colorScheme="blue"
                                onClick={handleCreateShare}
                                isLoading={isCreating}
                                isDisabled={!isFormValid}
                                loadingText="Creating Share..."
                            >
                                Create Share Link
                            </Button>
                        </HStack>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};