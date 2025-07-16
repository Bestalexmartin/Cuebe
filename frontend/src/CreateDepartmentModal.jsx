// frontend/src/CreateDepartmentModal.jsx

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
    Textarea,
    HStack,
    Box,
    useToast
} from '@chakra-ui/react';

export const CreateDepartmentModal = ({ isOpen, onClose, onDepartmentCreated }) => {
    const { getToken } = useAuth();
    const toast = useToast();
    const [departmentName, setDepartmentName] = useState('');
    const [departmentDescription, setDepartmentDescription] = useState('');
    const [departmentColor, setDepartmentColor] = useState('#3B82F6'); // Default to blue.500
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Preset color options for quick selection
    const colorOptions = [
        '#3B82F6', // blue.500
        '#EF4444', // red.500
        '#10B981', // emerald.500
        '#F59E0B', // amber.500
        '#8B5CF6', // violet.500
        '#EC4899', // pink.500
        '#6B7280', // gray.500
        '#F97316', // orange.500
    ];

    const resetForm = () => {
        setDepartmentName('');
        setDepartmentDescription('');
        setDepartmentColor('#3B82F6');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const token = await getToken();
            const response = await fetch('/api/departments/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    departmentName: departmentName,
                    departmentDescription: departmentDescription || null,
                    departmentColor: departmentColor
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create department');
            }

            toast({
                title: 'Department Created',
                description: `"${departmentName}" has been added to your departments`,
            });

            resetForm();
            onDepartmentCreated(); // This will be a refetch function
            onClose();
        } catch (error) {
            console.error("Failed to create department", error);
            toast({
                title: 'Error Creating Department',
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
                <ModalHeader>Create New Department</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <FormControl isRequired mb={4}>
                        <FormLabel>Department Name</FormLabel>
                        <Input
                            value={departmentName}
                            onChange={(e) => setDepartmentName(e.target.value)}
                            placeholder="e.g., Lighting, Sound, Stage Management"
                        />
                    </FormControl>

                    <FormControl mb={4}>
                        <FormLabel>Description (optional)</FormLabel>
                        <Textarea
                            value={departmentDescription}
                            onChange={(e) => setDepartmentDescription(e.target.value)}
                            placeholder="Brief description of department responsibilities"
                            rows={3}
                        />
                    </FormControl>

                    <FormControl>
                        <FormLabel>Department Color</FormLabel>
                        <HStack spacing={2} mb={3}>
                            {colorOptions.map((color) => (
                                <Box
                                    key={color}
                                    w="30px"
                                    h="30px"
                                    bg={color}
                                    borderRadius="md"
                                    cursor="pointer"
                                    border={departmentColor === color ? "3px solid" : "1px solid"}
                                    borderColor={departmentColor === color ? "gray.800" : "gray.300"}
                                    _hover={{ transform: "scale(1.1)" }}
                                    onClick={() => setDepartmentColor(color)}
                                />
                            ))}
                        </HStack>
                        <Input
                            type="color"
                            value={departmentColor}
                            onChange={(e) => setDepartmentColor(e.target.value)}
                            w="60px"
                            h="30px"
                            p={1}
                            border="1px solid"
                            borderColor="gray.300"
                            borderRadius="md"
                        />
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
                        isDisabled={!departmentName.trim()}
                        _hover={{ bg: 'orange.400' }}
                    >
                        Create Department
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