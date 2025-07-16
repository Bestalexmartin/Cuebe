// frontend/src/CreateCrewModal.jsx

import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
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
    HStack,
    useToast
} from '@chakra-ui/react';

export const CreateCrewModal = ({ isOpen, onClose, onCrewCreated }) => {
    const { getToken } = useAuth();
    const toast = useToast();
    const [emailAddress, setEmailAddress] = useState('');
    const [fullnameFirst, setFullnameFirst] = useState('');
    const [fullnameLast, setFullnameLast] = useState('');
    const [userRole, setUserRole] = useState('crew');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Common theater roles
    const roleOptions = [
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

    const resetForm = () => {
        setEmailAddress('');
        setFullnameFirst('');
        setFullnameLast('');
        setUserRole('crew');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const token = await getToken();
            const response = await fetch('/api/crew/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    emailAddress: emailAddress,
                    fullnameFirst: fullnameFirst,
                    fullnameLast: fullnameLast,
                    userRole: userRole
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create crew member');
            }

            toast({
                title: 'Crew Member Created',
                description: `"${fullnameFirst} ${fullnameLast}" has been added to your crew`,
            });

            resetForm();
            onCrewCreated(); // This will be a refetch function
            onClose();
        } catch (error) {
            console.error("Failed to create crew member", error);
            toast({
                title: 'Error Creating Crew Member',
                description: error.message || 'Something went wrong',
                status: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} onCloseComplete={resetForm}>
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
                    <HStack spacing={4} mb={4}>
                        <FormControl isRequired>
                            <FormLabel>First Name</FormLabel>
                            <Input
                                value={fullnameFirst}
                                onChange={(e) => setFullnameFirst(e.target.value)}
                                placeholder="First name"
                            />
                        </FormControl>
                        <FormControl isRequired>
                            <FormLabel>Last Name</FormLabel>
                            <Input
                                value={fullnameLast}
                                onChange={(e) => setFullnameLast(e.target.value)}
                                placeholder="Last name"
                            />
                        </FormControl>
                    </HStack>

                    <FormControl isRequired mb={4}>
                        <FormLabel>Email Address</FormLabel>
                        <Input
                            type="email"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            placeholder="crew@example.com"
                        />
                    </FormControl>

                    <FormControl isRequired>
                        <FormLabel>Role</FormLabel>
                        <Select
                            value={userRole}
                            onChange={(e) => setUserRole(e.target.value)}
                        >
                            {roleOptions.map((role) => (
                                <option key={role.value} value={role.value}>
                                    {role.label}
                                </option>
                            ))}
                        </Select>
                    </FormControl>
                </ModalBody>
                <ModalFooter>
                    <Button
                        bg="blue.400"
                        color="white"
                        size="xs"
                        mr={3}
                        type="submit"
                        isLoading={isSubmitting}
                        isDisabled={!emailAddress.trim() || !fullnameFirst.trim() || !fullnameLast.trim()}
                        _hover={{ bg: 'orange.400' }}
                    >
                        Add Crew Member
                    </Button>
                    <Button
                        size="xs"
                        onClick={onClose}
                        _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                    >
                        Cancel
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};