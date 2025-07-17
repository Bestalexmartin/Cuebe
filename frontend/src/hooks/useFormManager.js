// frontend/src/hooks/useFormManager.js

import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useToast } from '@chakra-ui/react';

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
                console.error('Server response:', response.status, errorData);
                throw new Error(errorData.message || errorData.detail || `Failed to ${method.toLowerCase()} resource`);
            }

            const result = await response.json();

            toast({
                title: 'Success',
                description: successMessage,
                status: 'success',
                containerStyle: {
                    width: '400px',
                    maxWidth: '400px',
                },
            });

            return result;
        } catch (error) {
            console.error('Form submission error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Something went wrong',
                status: 'error',
                containerStyle: {
                    width: '400px',
                    maxWidth: '400px',
                },
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