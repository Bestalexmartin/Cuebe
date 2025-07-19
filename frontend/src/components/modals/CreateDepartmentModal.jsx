// frontend/src/components/modals/CreateDepartmentModal.jsx

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
    VStack,
    HStack,
    Box,
    Text,
} from '@chakra-ui/react';
import { useFormManager } from '../../hooks/useFormManager';

const INITIAL_FORM_STATE = {
    departmentName: '',
    departmentDescription: '',
    departmentColor: '#6495ED',
};

const PRESET_COLORS = [
    { name: 'Blue', value: '#6495ED' },
    { name: 'Orange', value: '#e79e40' },
    { name: 'Green', value: '#48BB78' },
    { name: 'Red', value: '#F56565' },
    { name: 'Purple', value: '#9F7AEA' },
    { name: 'Teal', value: '#38B2AC' },
    { name: 'Pink', value: '#ED64A6' },
    { name: 'Yellow', value: '#ECC94B' },
];

export const CreateDepartmentModal = ({ isOpen, onClose, onDepartmentCreated }) => {
    const {
        formData,
        isSubmitting,
        updateField,
        resetForm,
        submitForm,
    } = useFormManager(INITIAL_FORM_STATE);

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            const departmentData = {
                departmentName: formData.departmentName,
                departmentColor: formData.departmentColor,
                ...(formData.departmentDescription.trim() && {
                    departmentDescription: formData.departmentDescription.trim()
                }),
            };

            await submitForm(
                '/api/departments/',
                'POST',
                `"${formData.departmentName}" department has been created`,
                departmentData
            );

            handleModalClose();
            onDepartmentCreated();

        } catch (error) {
        }
    };

    const handleModalClose = () => {
        resetForm();
        onClose();
    };

    const isFormValid = () => {
        return formData.departmentName.trim();
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
                <ModalHeader>Create New Department</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack spacing={4} align="stretch">
                        <FormControl isRequired>
                            <FormLabel>Department Name</FormLabel>
                            <Input
                                placeholder="Enter department name"
                                value={formData.departmentName}
                                onChange={(e) => updateField('departmentName', e.target.value)}
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Description</FormLabel>
                            <Textarea
                                placeholder="Describe the department's role and responsibilities"
                                value={formData.departmentDescription}
                                onChange={(e) => updateField('departmentDescription', e.target.value)}
                                rows={3}
                                resize="vertical"
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Department Color</FormLabel>
                            <VStack align="stretch" spacing={3}>
                                <HStack>
                                    <Input
                                        type="color"
                                        value={formData.departmentColor}
                                        onChange={(e) => updateField('departmentColor', e.target.value)}
                                        width="60px"
                                        height="40px"
                                        padding="1"
                                        cursor="pointer"
                                    />
                                    <Input
                                        value={formData.departmentColor}
                                        onChange={(e) => updateField('departmentColor', e.target.value)}
                                        placeholder="#6495ED"
                                        flex="1"
                                    />
                                </HStack>

                                <Box>
                                    <Text fontSize="sm" color="gray.500" mb={2}>
                                        Quick Colors:
                                    </Text>
                                    <HStack spacing={2} flexWrap="wrap">
                                        {PRESET_COLORS.map((color) => (
                                            <Button
                                                key={color.value}
                                                size="sm"
                                                height="30px"
                                                width="30px"
                                                minWidth="30px"
                                                backgroundColor={color.value}
                                                border={formData.departmentColor === color.value ? '3px solid' : '1px solid'}
                                                borderColor={formData.departmentColor === color.value ? 'white' : 'gray.300'}
                                                onClick={() => updateField('departmentColor', color.value)}
                                                _hover={{ transform: 'scale(1.1)' }}
                                                title={color.name}
                                            />
                                        ))}
                                    </HStack>
                                </Box>

                                <HStack>
                                    <Text fontSize="sm" color="gray.500">Preview:</Text>
                                    <Box
                                        width="100px"
                                        height="30px"
                                        backgroundColor={formData.departmentColor}
                                        border="1px solid"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                    />
                                    <Text fontSize="sm" fontWeight="bold" color={formData.departmentColor}>
                                        {formData.departmentName || 'Department Name'}
                                    </Text>
                                </HStack>
                            </VStack>
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
                        Create Department
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