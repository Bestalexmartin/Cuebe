// frontend/src/components/base/BaseModal.tsx

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
  ModalContentProps,
  HStack,
  Text
} from '@chakra-ui/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { ValidationErrors } from './ValidationErrors';
import { FieldError } from '../../types/validation';
import { AppIcon, IconName } from '../AppIcon';

export interface BaseModalAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  isLoading?: boolean;
  isDisabled?: boolean;
  loadingText?: string;
}

export interface BaseModalProps extends Omit<ModalContentProps, 'children'> {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onCloseComplete?: () => void;

  // Header customization
  headerIcon?: IconName;
  headerIconColor?: string;

  // Content
  children: React.ReactNode;

  // Form handling
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;

  // Actions
  primaryAction?: BaseModalAction;
  secondaryAction?: BaseModalAction;
  customActions?: BaseModalAction[];

  // Validation
  validationErrors?: FieldError[];
  showValidationErrors?: boolean;

  // Error boundary context
  errorBoundaryContext?: string;

  // UI Options
  showCloseButton?: boolean;
  rightAlignActions?: boolean;
}

const BaseModalComponent: React.FC<BaseModalProps> = ({
  title,
  isOpen,
  onClose,
  onCloseComplete,
  headerIcon,
  headerIconColor,
  children,
  onSubmit,
  primaryAction,
  secondaryAction,
  customActions,
  validationErrors = [],
  showValidationErrors = true,
  errorBoundaryContext,
  showCloseButton = false,
  rightAlignActions = false,
  ...modalContentProps
}) => {
  const getButtonVariant = (variant: BaseModalAction['variant'] = 'secondary') => {
    switch (variant) {
      case 'primary':
        return {
          bg: 'blue.400',
          color: 'white',
          _hover: { bg: 'orange.400' }
        };
      case 'danger':
        return {
          bg: 'red.500',
          color: 'white',
          _hover: { bg: 'red.600' }
        };
      case 'secondary':
      default:
        return {
          _hover: { bg: 'gray.100', _dark: { bg: 'gray.700' } }
        };
    }
  };

  const defaultSecondaryAction: BaseModalAction = {
    label: 'Cancel',
    onClick: onClose,
    variant: 'secondary'
  };

  const finalSecondaryAction = secondaryAction || defaultSecondaryAction;

  const renderActions = () => {
    if (customActions) {
      return customActions.map((action, index) => (
        <Button
          key={index}
          size="sm"
          onClick={action.onClick}
          isLoading={action.isLoading}
          isDisabled={action.isDisabled}
          loadingText={action.loadingText}
          mr={index < customActions.length - 1 ? 3 : 0}
          {...getButtonVariant(action.variant)}
        >
          {action.label}
        </Button>
      ));
    }

    return (
      <>
        <Button
          size="sm"
          mr={3}
          onClick={finalSecondaryAction.onClick}
          isDisabled={finalSecondaryAction.isDisabled}
          {...getButtonVariant(finalSecondaryAction.variant)}
        >
          {finalSecondaryAction.label}
        </Button>

        {primaryAction && (
          <Button
            size="sm"
            type={onSubmit ? "submit" : "button"}
            onClick={onSubmit ? undefined : primaryAction.onClick}
            isLoading={primaryAction.isLoading}
            isDisabled={primaryAction.isDisabled}
            loadingText={primaryAction.loadingText}
            {...getButtonVariant(primaryAction.variant)}
          >
            {primaryAction.label}
          </Button>
        )}
      </>
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (onSubmit) {
      // Blur any focused element to trigger validation and save changes
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // Small delay to allow onBlur handlers to complete
      setTimeout(() => {
        onSubmit(event);
      }, 10);
    }
  };

  const content = (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onCloseComplete={onCloseComplete}
    >
      <ModalOverlay />
      <ModalContent
        as={onSubmit ? "form" : "div"}
        onSubmit={handleSubmit}
        bg="page.background"
        border="2px solid"
        borderColor="gray.600"
        {...modalContentProps}
      >
        <ModalHeader>
          {headerIcon ? (
            <HStack spacing={3}>
              <AppIcon name={headerIcon} boxSize="20px" color={headerIconColor} />
              <Text>{title}</Text>
            </HStack>
          ) : (
            title
          )}
        </ModalHeader>
        {showCloseButton && <ModalCloseButton />}

        <ModalBody pb={6}>
          {children}
        </ModalBody>

        <ModalFooter justifyContent={rightAlignActions ? "flex-end" : "flex-start"}>
          {renderActions()}
        </ModalFooter>

        {/* Validation Errors */}
        <ValidationErrors
          errors={validationErrors}
          show={showValidationErrors}
        />
      </ModalContent>
    </Modal>
  );

  return errorBoundaryContext ? (
    <ErrorBoundary context={errorBoundaryContext}>
      {content}
    </ErrorBoundary>
  ) : content;
};

// Custom comparison function for React.memo
const areModalPropsEqual = (prevProps: BaseModalProps, nextProps: BaseModalProps): boolean => {
  // Compare primitive props
  if (
    prevProps.title !== nextProps.title ||
    prevProps.isOpen !== nextProps.isOpen ||
    prevProps.showValidationErrors !== nextProps.showValidationErrors ||
    prevProps.errorBoundaryContext !== nextProps.errorBoundaryContext
  ) {
    return false;
  }

  // Compare children (shallow comparison)
  if (prevProps.children !== nextProps.children) {
    return false;
  }

  // Compare validation errors array
  const prevErrors = prevProps.validationErrors || [];
  const nextErrors = nextProps.validationErrors || [];
  if (prevErrors.length !== nextErrors.length) {
    return false;
  }
  for (let i = 0; i < prevErrors.length; i++) {
    if (prevErrors[i].field !== nextErrors[i].field ||
      prevErrors[i].message !== nextErrors[i].message ||
      prevErrors[i].code !== nextErrors[i].code) {
      return false;
    }
  }

  // Compare primary action
  const prevPrimary = prevProps.primaryAction;
  const nextPrimary = nextProps.primaryAction;
  if ((prevPrimary && !nextPrimary) || (!prevPrimary && nextPrimary)) {
    return false;
  }
  if (prevPrimary && nextPrimary) {
    if (prevPrimary.label !== nextPrimary.label ||
      prevPrimary.variant !== nextPrimary.variant ||
      prevPrimary.isLoading !== nextPrimary.isLoading ||
      prevPrimary.isDisabled !== nextPrimary.isDisabled ||
      prevPrimary.loadingText !== nextPrimary.loadingText) {
      return false;
    }
  }

  // Compare secondary action
  const prevSecondary = prevProps.secondaryAction;
  const nextSecondary = nextProps.secondaryAction;
  if ((prevSecondary && !nextSecondary) || (!prevSecondary && nextSecondary)) {
    return false;
  }
  if (prevSecondary && nextSecondary) {
    if (prevSecondary.label !== nextSecondary.label ||
      prevSecondary.variant !== nextSecondary.variant ||
      prevSecondary.isLoading !== nextSecondary.isLoading ||
      prevSecondary.isDisabled !== nextSecondary.isDisabled ||
      prevSecondary.loadingText !== nextSecondary.loadingText) {
      return false;
    }
  }

  // Compare custom actions array
  const prevCustom = prevProps.customActions || [];
  const nextCustom = nextProps.customActions || [];
  if (prevCustom.length !== nextCustom.length) {
    return false;
  }
  for (let i = 0; i < prevCustom.length; i++) {
    if (prevCustom[i].label !== nextCustom[i].label ||
      prevCustom[i].variant !== nextCustom[i].variant ||
      prevCustom[i].isLoading !== nextCustom[i].isLoading ||
      prevCustom[i].isDisabled !== nextCustom[i].isDisabled ||
      prevCustom[i].loadingText !== nextCustom[i].loadingText) {
      return false;
    }
  }

  return true;
};

// Memoized BaseModal component
export const BaseModal = React.memo(BaseModalComponent, areModalPropsEqual);