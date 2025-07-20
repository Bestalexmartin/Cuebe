// frontend/src/hooks/useFormManager.ts

import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useToast } from '@chakra-ui/react';
import { toastConfig } from '../ChakraTheme';

// TypeScript interfaces
interface FormData {
  [key: string]: any;
}

interface UseFormManagerReturn<T extends FormData> {
  formData: T;
  isSubmitting: boolean;
  updateField: (field: keyof T, value: any) => void;
  resetForm: () => void;
  submitForm: (
    endpoint: string,
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    successMessage?: string,
    customData?: FormData | null
  ) => Promise<any>;
  setFormData: (data: T | ((prev: T) => T)) => void;
}

export const useFormManager = <T extends FormData>(initialState: T = {} as T): UseFormManagerReturn<T> => {
    const [formData, setFormData] = useState<T>(initialState);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const { getToken } = useAuth();
    const toast = useToast();

    const updateField = (field: keyof T, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setFormData(initialState);
        setIsSubmitting(false);
    };

    const submitForm = async (
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'POST',
        successMessage: string = 'Operation successful',
        customData: FormData | null = null
    ): Promise<any> => {
        setIsSubmitting(true);
        try {
            const token = await getToken();
            if (!token) {
                throw new Error('Authentication token not available');
            }
            
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
            const errorMessage = error instanceof Error ? error.message : 'Something went wrong';
            toast({
                title: 'Error',
                description: errorMessage,
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