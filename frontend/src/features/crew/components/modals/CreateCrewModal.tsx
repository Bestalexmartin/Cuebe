// frontend/src/features/crew/components/modals/CreateCrewModal.tsx

import React from 'react';
import {
    FormControl,
    FormLabel,
    Select,
    VStack,
    HStack,
} from '@chakra-ui/react';
import { useAuth } from '@clerk/clerk-react';
import { useValidatedFormSchema } from '../../../../components/forms/ValidatedForm';
import { FormInput } from '../../../../components/form/FormField';
import { BaseModal } from '../../../../components/base/BaseModal';
import { useStandardFormValidation } from '../../../../hooks/useFormValidation';
import { USER_ROLE_OPTIONS } from '../../../../constants/userRoles';
import { getApiUrl } from '../../../../config/api';

// TypeScript interfaces
interface CrewFormData {
    email_address: string;
    fullname_first: string;
    fullname_last: string;
    user_role: string;
}

interface CreateCrewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCrewCreated: () => void;
}


interface ExistingUser {
    ID: string;
    fullname_first: string;
    fullname_last: string;
}

const INITIAL_FORM_STATE: CrewFormData = {
    email_address: '',
    fullname_first: '',
    fullname_last: '',
    user_role: 'CREW',
};



export const CreateCrewModal: React.FC<CreateCrewModalProps> = ({
    isOpen,
    onClose,
    onCrewCreated
}) => {
    const { getToken } = useAuth();

    const form = useValidatedFormSchema<CrewFormData>(
        INITIAL_FORM_STATE,
        'crew',
        'crew',
        undefined,
        {
            validateOnBlur: true,
            showFieldErrorsInToast: false // Only show validation errors in red alert box
        }
    );

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            const checkEmailResponse = await fetch(getApiUrl(`/api/users/check-email?email=${encodeURIComponent(form.formData.email_address)}`), {
                headers: {
                    'Authorization': `Bearer ${await getToken()}`
                }
            });

            if (checkEmailResponse.ok) {
                const existingUser: ExistingUser | null = await checkEmailResponse.json();

                if (existingUser) {
                    const relationshipData = {
                        crew_user_id: existingUser.ID
                    };

                    await form.submitForm(
                        '/api/crew-relationships/',
                        'POST',
                        `"${existingUser.fullname_first} ${existingUser.fullname_last}" has been added to your crew`,
                        relationshipData
                    );
                } else {
                    const userData = {
                        email_address: form.formData.email_address,
                        fullname_first: form.formData.fullname_first,
                        fullname_last: form.formData.fullname_last,
                        user_role: form.formData.user_role,
                    };

                    await form.submitForm(
                        '/api/users/create-guest-with-relationship',
                        'POST',
                        `"${form.formData.fullname_first} ${form.formData.fullname_last}" has been added as a guest user`,
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
        form.resetForm();
        onClose();
    };

    const { canSubmit } = useStandardFormValidation(form, ['email_address', 'fullname_first', 'fullname_last']);

    return (
        <BaseModal
            title="Add New Crew"
            isOpen={isOpen}
            onClose={handleModalClose}
            onCloseComplete={form.resetForm}
            onSubmit={handleSubmit}
            primaryAction={{
                label: "Add Crew",
                variant: "primary",
                onClick: () => handleSubmit({} as React.FormEvent<HTMLFormElement>),
                isLoading: form.isSubmitting,
                isDisabled: !canSubmit
            }}
            validationErrors={form.fieldErrors}
            showValidationErrors={form.fieldErrors.length > 0}
            errorBoundaryContext="CreateCrewModal"
        >
            <VStack spacing={4} align="stretch">
                <HStack spacing={4}>
                    <FormInput
                        form={form}
                        name="fullname_first"
                        label="First Name"
                        placeholder="Enter first name"
                        isRequired
                    />

                    <FormInput
                        form={form}
                        name="fullname_last"
                        label="Last Name"
                        placeholder="Enter last name"
                        isRequired
                    />
                </HStack>

                <FormInput
                    form={form}
                    name="email_address"
                    label="Email Address"
                    type="email"
                    placeholder="crew@example.com"
                    isRequired
                />

                <FormControl isRequired>
                    <FormLabel>Role</FormLabel>
                    <Select
                        value={form.formData.user_role}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => form.updateField('user_role', e.target.value)}
                    >
                        {USER_ROLE_OPTIONS.map((role) => (
                            <option key={role.value} value={role.value}>
                                {role.label}
                            </option>
                        ))}
                    </Select>
                </FormControl>
            </VStack>
        </BaseModal>
    );
};
