// frontend/src/hooks/useFormManager.js

import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useToast } from '@chakra-ui/react';
import { toastConfig } from '../ChakraTheme';

export const useFormManager = (initialState = {}) => {
    const [formData, setFormData] = useState(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { getToken } = useAuth();
    const toast = useToast();

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setFormData(initialState);
        setIsSubmitting(false);
    };

    const submitForm = async (endpoint, method = 'POST', successMessage = 'Operation successful', customData = null) => {
        setIsSubmitting(true);
        try {
            const token = await getToken();
            const dataToSubmit = customData || formData;

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dataToSubmit)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || errorData.detail || `Failed to ${method.toLowerCase()} resource`);
            }

            const result = await response.json();

            toast({
                title: 'Success',
                description: successMessage,
                status: 'success',
                ...toastConfig,
            });

            return result;
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Something went wrong',
                status: 'error',
                ...toastConfig,
            });
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        formData,
        isSubmitting,
        updateField,
        resetForm,
        submitForm,
        setFormData,
    };
};