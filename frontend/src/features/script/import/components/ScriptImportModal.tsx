// frontend/src/features/script/import/components/ScriptImportModal.tsx

import React, { useState, useCallback, useRef } from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  Input,
  FormLabel,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Badge,
  Divider,
  useBreakpointValue
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';
import { AppIcon } from '../../../../components/AppIcon';
import { useEnhancedToast } from '../../../../utils/toastUtils';
import { parseCSVFile, convertCSVToCleanImport, detectColumnMappings } from '../utils/csvParser';
import { CSVParseResult, CleanScriptImport, CSVColumnMapping, ImportValidationResult } from '../types/importSchema';
import { formatTimeFromMs } from '../utils/timeConverter';

interface ScriptImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (scriptId: string) => void;
  showId: string;
  initialScriptName?: string;
}

type ImportStep = 'upload' | 'preview' | 'importing';

interface ImportState {
  step: ImportStep;
  file: File | null;
  csvData: CSVParseResult | null;
  columnMappings: CSVColumnMapping | null;
  validationResult: ImportValidationResult | null;
  scriptMetadata: {
    script_name: string;
    script_status: 'DRAFT' | 'COPY' | 'WORKING' | 'FINAL' | 'IMPORTED' | 'BACKUP';
    script_notes: string;
  };
}

export const ScriptImportModal: React.FC<ScriptImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  showId,
  initialScriptName
}) => {
  const { showSuccess, showError } = useEnhancedToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useBreakpointValue({ base: true, md: false });

  const [importState, setImportState] = useState<ImportState>({
    step: 'upload',
    file: null,
    csvData: null,
    columnMappings: null,
    validationResult: null,
    scriptMetadata: {
      script_name: initialScriptName || '',
      script_status: 'IMPORTED',
      script_notes: ''
    }
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [existingDepartments, setExistingDepartments] = useState<any[]>([]);

  // Fetch existing departments when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const fetchDepartments = async () => {
        try {
          const response = await fetch('/api/me/departments', {
            headers: {
              'Authorization': `Bearer ${await window.Clerk?.session?.getToken()}`
            }
          });
          if (response.ok) {
            const departments = await response.json();
            setExistingDepartments(departments);
          }
        } catch (error) {
          console.warn('Failed to fetch existing departments:', error);
          setExistingDepartments([]);
        }
      };

      fetchDepartments();
    }
  }, [isOpen]);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setImportState({
        step: 'upload',
        file: null,
        csvData: null,
        columnMappings: null,
        validationResult: null,
        scriptMetadata: {
          script_name: initialScriptName || '',
          script_status: 'IMPORTED',
          script_notes: ''
        }
      });
      setIsProcessing(false);
    }
  }, [isOpen, initialScriptName]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    setImportState(prev => ({
      ...prev,
      file,
      scriptMetadata: {
        ...prev.scriptMetadata,
        script_name: prev.scriptMetadata.script_name || file.name.replace(/\.[^/.]+$/, '') // Remove extension
      }
    }));

    try {
      const parseResult = await parseCSVFile(file);
      
      if (!parseResult.success) {
        showError('CSV Parse Error', {
          description: parseResult.errors.join(', ')
        });
        setIsProcessing(false);
        return;
      }

      // Auto-detect column mappings
      const detectedMappings = detectColumnMappings(parseResult.meta.fields);
      
      setImportState(prev => ({
        ...prev,
        csvData: parseResult,
        columnMappings: detectedMappings,
        step: 'preview'
      }));

    } catch (error) {
      showError('File Processing Error', {
        description: error instanceof Error ? error.message : 'Failed to process file'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [showError]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        showError('Invalid File Type', {
          description: 'Please select a CSV file'
        });
        return;
      }
      handleFileSelect(file);
    }
  }, [handleFileSelect, showError]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        showError('Invalid File Type', {
          description: 'Please select a CSV file'
        });
        return;
      }
      handleFileSelect(file);
    }
  }, [handleFileSelect, showError]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const validateAndPreview = useCallback(() => {
    if (!importState.csvData || !importState.columnMappings) return;

    const validationResult = convertCSVToCleanImport(
      importState.csvData.data,
      importState.columnMappings,
      importState.scriptMetadata,
      existingDepartments,
      importState.file?.name || 'unknown.csv'
    );

    setImportState(prev => ({
      ...prev,
      validationResult
    }));
  }, [importState.csvData, importState.columnMappings, importState.scriptMetadata, importState.file, existingDepartments]);

  // Validate on data changes
  React.useEffect(() => {
    if (importState.step === 'preview' && importState.csvData && importState.columnMappings) {
      validateAndPreview();
    }
  }, [importState.step, importState.csvData, importState.columnMappings, importState.scriptMetadata, validateAndPreview]);

  const handleImportConfirm = useCallback(async () => {
    if (!importState.validationResult?.cleanImport) return;

    setImportState(prev => ({ ...prev, step: 'importing' }));
    setIsProcessing(true);

    try {
      // Prepare the import request with showId
      const importRequest = {
        ...importState.validationResult.cleanImport,
        show_id: showId
      };


      const response = await fetch('/api/scripts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await window.Clerk?.session?.getToken()}`
        },
        body: JSON.stringify(importRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Import failed');
      }

      const result = await response.json();
      
      showSuccess('Script Imported', `Successfully imported ${result.elements_created} elements`);
      
      // Close modal and callback immediately
      onImportSuccess(result.script_id);
      onClose();

    } catch (error) {
      showError('Import Failed', {
        description: error instanceof Error ? error.message : 'Failed to import script'
      });
      setImportState(prev => ({ ...prev, step: 'preview' }));
    } finally {
      setIsProcessing(false);
    }
  }, [importState.validationResult, showId, showSuccess, showError, onImportSuccess, onClose]);

  const renderUploadStep = () => (
    <VStack spacing={6} align="stretch">
      <Text fontSize="sm">
        Upload a CSV file containing your script elements. The file should include columns for timing, element type, descriptions, and departments.
      </Text>

      <Box
        border="2px dashed"
        borderColor="gray.300"
        _dark={{ borderColor: "gray.600" }}
        borderRadius="md"
        p={8}
        textAlign="center"
        bg="card.background"
        _hover={{ borderColor: "orange.400" }}
        cursor="pointer"
        transition="all 0.2s"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <VStack spacing={4}>
          <AppIcon name="upload" boxSize="48px" color="gray.400" />
          <VStack spacing={2}>
            <Text fontWeight="medium">Drop CSV file here or click to browse</Text>
            <Text fontSize="sm" opacity="0.7">
              Supports common CSV formats with headers
            </Text>
          </VStack>
        </VStack>
        
        <Input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </Box>
    </VStack>
  );

  const renderPreviewStep = () => {
    if (!importState.validationResult) return null;

    const { cleanImport, errors, warnings } = importState.validationResult;

    return (
      <VStack spacing={4} align="stretch">
        {/* Validation Results */}
        {errors.length > 0 && (
          <Alert status="error" bg="red.50" _dark={{ bg: "red.900", borderColor: "red.700" }} border="1px solid" borderColor="red.200">
            <AlertIcon />
            <Box>
              <AlertTitle>Validation Errors</AlertTitle>
              <AlertDescription>
                <VStack align="start" spacing={1}>
                  {errors.slice(0, 5).map((error, index) => (
                    <Text key={index} fontSize="xs">
                      Row {error.row}: {error.message}
                    </Text>
                  ))}
                  {errors.length > 5 && (
                    <Text fontSize="xs" fontStyle="italic">
                      ... and {errors.length - 5} more errors
                    </Text>
                  )}
                </VStack>
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {warnings.length > 0 && (
          <Alert status="warning" bg="orange.50" _dark={{ bg: "orange.900", borderColor: "orange.700" }} border="1px solid" borderColor="orange.200">
            <AlertIcon />
            <Box>
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription>
                <VStack align="start" spacing={1}>
                  {warnings.slice(0, 3).map((warning, index) => (
                    <Text key={index} fontSize="xs">
                      Row {warning.row}: {warning.message}
                    </Text>
                  ))}
                  {warnings.length > 3 && (
                    <Text fontSize="xs" fontStyle="italic">
                      ... and {warnings.length - 3} more warnings
                    </Text>
                  )}
                </VStack>
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Preview Elements */}
        {cleanImport && (
          <Box>
            <HStack justify="space-between" mb={3}>
              <Text fontSize="sm" fontWeight="medium">
                Preview ({cleanImport.script_elements.length} elements)
              </Text>
              <Badge colorScheme={errors.length > 0 ? 'red' : 'green'}>
                {errors.length > 0 ? 'Validation Failed' : 'Ready to Import'}
              </Badge>
            </HStack>
            
            <Box maxHeight="200px" overflowY="auto" border="1px solid" borderColor="gray.200" _dark={{ borderColor: "gray.600" }} borderRadius="md" bg="card.background">
              {cleanImport.script_elements.slice(0, 10).map((element, index) => (
                <Box key={index} p={2} borderBottom="1px solid" borderColor="gray.100" _dark={{ borderColor: "gray.700" }} _last={{ borderBottom: 'none' }}>
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={0} flex={1}>
                      <HStack spacing={2}>
                        <Badge size="sm" colorScheme="blue">{element.element_type}</Badge>
                        <Text fontSize="sm" fontWeight="medium">{element.element_name}</Text>
                      </HStack>
                      {element.cue_notes && (
                        <Text fontSize="xs" opacity="0.8">{element.cue_notes}</Text>
                      )}
                    </VStack>
                    <VStack align="end" spacing={0}>
                      <Text fontSize="xs" fontFamily="mono">{formatTimeFromMs(element.offset_ms)}</Text>
                      {element.department_name && (
                        <Text fontSize="xs" opacity="0.7">{element.department_name}</Text>
                      )}
                    </VStack>
                  </HStack>
                </Box>
              ))}
              {cleanImport.script_elements.length > 10 && (
                <Box p={2} textAlign="center" opacity="0.7" fontSize="xs">
                  ... and {cleanImport.script_elements.length - 10} more elements
                </Box>
              )}
            </Box>
          </Box>
        )}
      </VStack>
    );
  };

  const renderImportingStep = () => (
    <VStack spacing={6} align="center">
      <AppIcon name="script" boxSize="48px" color="blue.400" />
      <VStack spacing={2}>
        <Text fontSize="lg" fontWeight="medium">Importing Script...</Text>
        <Text fontSize="sm" color="gray.600">
          Creating script elements and processing data
        </Text>
      </VStack>
      <Progress width="100%" colorScheme="blue" isIndeterminate />
    </VStack>
  );

  const getStepContent = () => {
    switch (importState.step) {
      case 'upload':
        return renderUploadStep();
      case 'preview':
        return renderPreviewStep();
      case 'importing':
        return renderImportingStep();
      default:
        return renderUploadStep();
    }
  };

  const getModalActions = () => {
    switch (importState.step) {
      case 'upload':
        return {
          primaryAction: {
            label: 'Continue',
            onClick: () => setImportState(prev => ({ ...prev, step: 'preview' })),
            variant: 'primary' as const,
            isDisabled: !importState.file
          },
          secondaryAction: {
            label: 'Cancel',
            onClick: onClose,
            variant: 'outline' as const
          }
        };
      case 'preview':
        return {
          primaryAction: {
            label: 'Import Script',
            onClick: handleImportConfirm,
            variant: 'primary' as const,
            isDisabled: !importState.validationResult?.isValid || isProcessing,
            isLoading: isProcessing
          },
          secondaryAction: {
            label: 'Cancel',
            onClick: onClose,
            variant: 'outline' as const
          }
        };
      case 'importing':
        return {}; // No actions during import
      default:
        return {};
    }
  };

  const getStepTitle = () => {
    switch (importState.step) {
      case 'upload':
        return 'Import Script from CSV';
      case 'preview':
        return 'Preview & Confirm Import';
      case 'importing':
        return 'Importing Script';
      default:
        return 'Import Script';
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={getStepTitle()}
      headerIcon="upload"
      size={isMobile ? 'full' : 'xl'}
      closeOnOverlayClick={importState.step === 'upload'}
      closeOnEsc={importState.step === 'upload'}
      {...getModalActions()}
    >
      {getStepContent()}
    </BaseModal>
  );
};