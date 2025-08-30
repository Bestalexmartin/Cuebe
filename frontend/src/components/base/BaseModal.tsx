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
  VStack,
  Text,
  Spinner,
  Box
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
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  onCloseComplete?: () => void;

  // Modal variants for common patterns
  variant?: 'default' | 'warning' | 'danger' | 'processing';
  warningLevel?: 'standard' | 'final';
  
  // Warning modal content (when variant is 'warning' or 'danger')
  mainText?: string;
  subText?: string | React.ReactNode;
  bottomText?: string;

  // Processing modal content (when variant is 'processing')
  processingTitle?: string;
  processingMessage?: string;
  showSpinner?: boolean;
  spinnerSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  spinnerColor?: string;

  // Header customization
  headerIcon?: IconName;
  headerIconColor?: string;
  showHeader?: boolean;

  // Content
  children?: React.ReactNode;

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
  showFooter?: boolean;
  rightAlignActions?: boolean;
  
  // Modal behavior
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  isCentered?: boolean;
  size?: string;
}

const BaseModalComponent: React.FC<BaseModalProps> = ({
  title,
  isOpen,
  onClose,
  onCloseComplete,
  variant = 'default',
  warningLevel = 'standard',
  mainText,
  subText,
  bottomText,
  processingTitle = "Processing",
  processingMessage = "Please wait while we process your request...",
  showSpinner = true,
  spinnerSize = 'xl',
  spinnerColor = 'blue.400',
  headerIcon,
  headerIconColor,
  showHeader = true,
  children,
  onSubmit,
  primaryAction,
  secondaryAction,
  customActions,
  validationErrors = [],
  showValidationErrors = true,
  errorBoundaryContext,
  showCloseButton = false,
  showFooter = true,
  rightAlignActions = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  isCentered = false,
  size,
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
      case 'outline':
        return {
          variant: 'outline',
          _hover: { bg: 'card.background' }
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

  // Get variant-specific styling and configuration
  const getVariantConfig = () => {
    switch (variant) {
      case 'danger':
        return {
          modalBg: 'red.800',
          borderColor: 'red.400',
          textColor: 'white',
          icon: headerIcon || 'warning',
          iconColor: headerIconColor || 'red.300',
          title: title || 'FINAL WARNING',
          finalBottomText: bottomText !== undefined ? bottomText : 'THIS ACTION CAN NOT BE UNDONE!',
          showHeader: showHeader,
          showFooter: showFooter,
          closeOnOverlayClick: closeOnOverlayClick,
          closeOnEsc: closeOnEsc
        };
      case 'warning':
        return {
          modalBg: 'orange.800',
          borderColor: 'orange.400', 
          textColor: 'white',
          icon: headerIcon || 'warning',
          iconColor: headerIconColor || 'orange.300',
          title: title || 'Warning',
          finalBottomText: bottomText || 'This action cannot be undone.',
          showHeader: showHeader,
          showFooter: showFooter,
          closeOnOverlayClick: closeOnOverlayClick,
          closeOnEsc: closeOnEsc
        };
      case 'processing':
        return {
          modalBg: 'page.background',
          borderColor: 'gray.600',
          textColor: 'inherit',
          icon: headerIcon,
          iconColor: headerIconColor,
          title: title || processingTitle,
          finalBottomText: bottomText,
          showHeader: false, // Processing modals typically don't show headers
          showFooter: false, // Processing modals don't have actions
          closeOnOverlayClick: false, // Can't close processing modals
          closeOnEsc: false // Can't close processing modals
        };
      default:
        return {
          modalBg: 'page.background',
          borderColor: 'gray.600',
          textColor: 'inherit',
          icon: headerIcon,
          iconColor: headerIconColor,
          title: title,
          finalBottomText: bottomText,
          showHeader: showHeader,
          showFooter: showFooter,
          closeOnOverlayClick: closeOnOverlayClick,
          closeOnEsc: closeOnEsc
        };
    }
  };

  const variantConfig = getVariantConfig();

  // Render variant-specific content
  const renderVariantContent = () => {
    switch (variant) {
      case 'warning':
      case 'danger':
        return (
          <VStack spacing="4" align="center" width="100%">
            {mainText && (
              <Text fontSize="lg" textAlign="center" fontWeight="bold">
                {mainText}
              </Text>
            )}
            {subText && (
              <Text 
                fontSize="md" 
                textAlign="center" 
                color={variant === 'danger' ? 'red.200' : 'orange.200'} 
                lineHeight="1.6"
              >
                {subText}
              </Text>
            )}
            {children}
            {variantConfig.finalBottomText && warningLevel === 'final' && (
              <Text 
                fontSize={variant === 'danger' ? 'md' : 'lg'} 
                textAlign="center" 
                color={variant === 'danger' ? 'red.300' : 'orange.300'} 
                fontWeight="bold"
              >
                {variantConfig.finalBottomText}
              </Text>
            )}
            {variantConfig.finalBottomText && warningLevel === 'standard' && (
              <Text 
                fontSize="md" 
                textAlign="center" 
                color={variant === 'danger' ? 'red.300' : 'orange.300'} 
                fontWeight="bold"
              >
                {variantConfig.finalBottomText}
              </Text>
            )}
          </VStack>
        );
      
      case 'processing':
        return (
          <VStack spacing={6} align="center" py="8">
            {showSpinner && (
              <Box>
                <Spinner
                  size={spinnerSize}
                  thickness="4px"
                  speed="0.8s"
                  color={spinnerColor}
                />
              </Box>
            )}

            <VStack spacing={2} textAlign="center">
              <Text
                fontSize="lg"
                fontWeight="semibold"
                color="gray.700"
                _dark={{ color: "gray.200" }}
              >
                {processingTitle}
              </Text>
              <Text
                fontSize="sm"
                color="gray.600"
                _dark={{ color: "gray.400" }}
              >
                {processingMessage}
              </Text>
            </VStack>
          </VStack>
        );
      
      default:
        return children;
    }
  };

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
          onClick={finalSecondaryAction.onClick}
          isDisabled={finalSecondaryAction.isDisabled}
          {...getButtonVariant(finalSecondaryAction.variant)}
        >
          {finalSecondaryAction.label}
        </Button>

        {primaryAction && (
          <Button
            size="sm"
            ml={3}
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
      closeOnOverlayClick={variantConfig.closeOnOverlayClick}
      closeOnEsc={variantConfig.closeOnEsc}
      isCentered={isCentered}
      size={size}
    >
      <ModalOverlay />
      <ModalContent
        as={onSubmit ? "form" : "div"}
        onSubmit={handleSubmit}
        bg={variantConfig.modalBg}
        border="2px solid"
        borderColor={variantConfig.borderColor}
        color={variantConfig.textColor}
        {...modalContentProps}
      >
        {variantConfig.showHeader && (
          <ModalHeader>
            {variantConfig.icon && variantConfig.title ? (
              <HStack spacing={3}>
                <AppIcon name={variantConfig.icon} boxSize="20px" color={variantConfig.iconColor} />
                <Text>{variantConfig.title}</Text>
              </HStack>
            ) : (
              variantConfig.title
            )}
          </ModalHeader>
        )}
        {showCloseButton && <ModalCloseButton />}

        <ModalBody pb={variantConfig.showFooter ? 6 : 4}>
          {renderVariantContent()}
        </ModalBody>

        {variantConfig.showFooter && (
          <ModalFooter justifyContent={rightAlignActions === false ? "flex-start" : "flex-end"}>
            {renderActions()}
          </ModalFooter>
        )}

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
    prevProps.variant !== nextProps.variant ||
    prevProps.warningLevel !== nextProps.warningLevel ||
    prevProps.mainText !== nextProps.mainText ||
    prevProps.subText !== nextProps.subText ||
    prevProps.bottomText !== nextProps.bottomText ||
    prevProps.processingTitle !== nextProps.processingTitle ||
    prevProps.processingMessage !== nextProps.processingMessage ||
    prevProps.showSpinner !== nextProps.showSpinner ||
    prevProps.spinnerSize !== nextProps.spinnerSize ||
    prevProps.spinnerColor !== nextProps.spinnerColor ||
    prevProps.showValidationErrors !== nextProps.showValidationErrors ||
    prevProps.errorBoundaryContext !== nextProps.errorBoundaryContext ||
    prevProps.showHeader !== nextProps.showHeader ||
    prevProps.showFooter !== nextProps.showFooter ||
    prevProps.showCloseButton !== nextProps.showCloseButton ||
    prevProps.rightAlignActions !== nextProps.rightAlignActions ||
    prevProps.closeOnOverlayClick !== nextProps.closeOnOverlayClick ||
    prevProps.closeOnEsc !== nextProps.closeOnEsc ||
    prevProps.isCentered !== nextProps.isCentered ||
    prevProps.size !== nextProps.size ||
    prevProps.headerIcon !== nextProps.headerIcon ||
    prevProps.headerIconColor !== nextProps.headerIconColor
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