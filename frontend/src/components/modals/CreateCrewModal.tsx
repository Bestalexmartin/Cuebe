// frontend/src/components/modals/CreateCrewModal.tsx

import React from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    FormControl,
    FormLabel,
    Input,
    Select,
    VStack,
    HStack,
} from '@chakra-ui/react';
import { useAuth } from '@clerk/clerk-react';
import { useFormManager } from '../../hooks/useFormManager';

// TypeScript interfaces
interface CrewFormData {
    emailAddress: string;
    fullnameFirst: string;
    fullnameLast: string;
    userRole: string;
    phoneNumber: string;
    notes: string;
}

interface CreateCrewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCrewCreated: () => void;
}

interface RoleOption {
    value: string;
    label: string;
}

interface ExistingUser {
    ID: string;
    fullnameFirst: string;
    fullnameLast: string;
}

const INITIAL_FORM_STATE: CrewFormData = {
    emailAddress: '',
    fullnameFirst: '',
    fullnameLast: '',
    userRole: 'crew',
    phoneNumber: '',
    notes: '',
};

const ROLE_OPTIONS: RoleOption[] = [
    { value: 'crew', label: 'Crew Member' },
    { value: 'department_head', label: 'Department Head' },
    { value: 'stage_manager', label: 'Stage Manager' },
    { value: 'assistant_stage_manager', label: 'Assistant Stage Manager' },
    { value: 'director', label: 'Director' },
    { value: 'producer', label: 'Producer' },
    { value: 'designer', label: 'Designer' },
    { value: 'technician', label: 'Technician' },
    { value: 'admin', label: 'Administrator' },
];

export const CreateCrewModal: React.FC<CreateCrewModalProps> = ({ 
    isOpen, 
    onClose, 
    onCrewCreated 
}) => {
    const { getToken } = useAuth();

    const {
        formData,
        isSubmitting,
        updateField,
        resetForm,
        submitForm,
    } = useFormManager<CrewFormData>(INITIAL_FORM_STATE);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            const checkEmailResponse = await fetch(`/api/users/check-email?email=${encodeURIComponent(formData.emailAddress)}`, {
                headers: {
                    'Authorization': `Bearer ${await getToken()}`
                }
            });

            if (checkEmailResponse.ok) {
                const existingUser: ExistingUser | null = await checkEmailResponse.json();

                if (existingUser) {
                    const relationshipData = {
                        crew_user_id: existingUser.ID,
                        notes: formData.notes.trim() || null
                    };

                    await submitForm(
                        '/api/crew-relationships/',
                        'POST',
                        `"${existingUser.fullnameFirst} ${existingUser.fullnameLast}" has been added to your crew`,
                        relationshipData
                    );
                } else {
                    const userData = {
                        emailAddress: formData.emailAddress,
                        fullnameFirst: formData.fullnameFirst,
                        fullnameLast: formData.fullnameLast,
                        userRole: formData.userRole,
                        phoneNumber: formData.phoneNumber || null,
                        notes: formData.notes || null,
                    };

                    await submitForm(
                        '/api/users/create-guest-with-relationship',
                        'POST',
                        `"${formData.fullnameFirst} ${formData.fullnameLast}" has been added as a guest user`,
                        userData
                    );
                }
            } else {
                throw new Error('Failed to check for existing user');
            }

            handleModalClose();
            onCrewCreated();

        } catch (error) {
            // Error handling is done in submitForm
        }
    };

    const handleModalClose = () => {
        resetForm();
        onClose();
    };

    const isFormValid = (): boolean => {
        return formData.emailAddress.trim() !== '' &&
            formData.fullnameFirst.trim() !== '' &&
            formData.fullnameLast.trim() !== '';
    };

    return (
        <Modal isOpen={isOpen} onClose={handleModalClose} onCloseComplete={resetForm}>
            <ModalOverlay />
            <ModalContent
                as="form"
                onSubmit={handleSubmit}
                bg="page.background"
                border="2px solid"
                borderColor="gray.600"
            >
                <ModalHeader>Add New Crew Member</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack spacing={4} align="stretch">
                        <HStack spacing={4}>
                            <FormControl isRequired>
                                <FormLabel>First Name</FormLabel>
                                <Input
                                    placeholder="Enter first name"
                                    value={formData.fullnameFirst}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('fullnameFirst', e.target.value)}
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Last Name</FormLabel>
                                <Input
                                    placeholder="Enter last name"
                                    value={formData.fullnameLast}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('fullnameLast', e.target.value)}
                                />
                            </FormControl>
                        </HStack>

                        <FormControl isRequired>
                            <FormLabel>Email Address</FormLabel>
                            <Input
                                type="email"
                                placeholder="crew@example.com"
                                value={formData.emailAddress}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('emailAddress', e.target.value)}
                            />
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel>Role</FormLabel>
                            <Select
                                value={formData.userRole}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('userRole', e.target.value)}
                            >
                                {ROLE_OPTIONS.map((role) => (
                                    <option key={role.value} value={role.value}>
                                        {role.label}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl>
                            <FormLabel>Phone Number</FormLabel>
                            <Input
                                type="tel"
                                placeholder="(555) 123-4567"
                                value={formData.phoneNumber}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('phoneNumber', e.target.value)}
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Notes</FormLabel>
                            <Input
                                placeholder="Additional notes about this crew member"
                                value={formData.notes}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('notes', e.target.value)}
                            />
                        </FormControl>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button
                        bg="blue.400"
                        color="white"
                        size="xs"
                        mr={3}
                        type="submit"
                        isLoading={isSubmitting}
                        isDisabled={!isFormValid()}
                        _hover={{ bg: 'orange.400' }}
                    >
                        Add Crew Member
                    </Button>
                    <Button
                        size="xs"
                        onClick={handleModalClose}
                        _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                    >
                        Cancel
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};