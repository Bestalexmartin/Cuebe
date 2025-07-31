// frontend/src/hooks/useFormManager.ts

import { useState, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useEnhancedToast } from '../utils/toastUtils';

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
    const { showSuccess, showError } = useEnhancedToast();

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

            showSuccess('Success', successMessage);

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Something went wrong';
            showError(errorMessage);
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };

    return useMemo(() => ({
        formData,
        isSubmitting,
        updateField,
        resetForm,
        submitForm,
        setFormData,
    }), [formData, isSubmitting, updateField, resetForm, submitForm, setFormData]);
};