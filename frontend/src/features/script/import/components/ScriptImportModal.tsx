// frontend/src/features/script/import/components/ScriptImportModal.tsx

import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  VStack,
  HStack,
  Text,
  Box,
  Input,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Badge,
  useBreakpointValue
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';
import { AppIcon } from '../../../../components/AppIcon';
import { useEnhancedToast } from '../../../../utils/toastUtils';
import { parseCSVFile, convertCSVToCleanImport, detectColumnMappings } from '../utils/csvParser';
import { CSVParseResult, CleanScriptImport, CSVColumnMapping, ImportValidationResult } from '../types/importSchema';
import { formatTimeFromMs } from '../utils/timeConverter';
import { matchDepartment } from '../utils/departmentMatcher';
import { loadSavedDepartmentMappings, saveDepartmentMappings } from '../utils/departmentMappingStorage';
import { DepartmentMappingStep } from './DepartmentMappingStep';

interface ScriptImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (scriptId: string) => void;
  showId: string;
  initialScriptName?: string;
}

type ImportStep = 'upload' | 'preview' | 'department-mapping' | 'importing';

interface DepartmentMapping {
  incomingName: string;
  mappedTo: { department_id: string; department_name: string; department_color?: string } | null;
}

interface ImportState {
  step: ImportStep;
  file: File | null;
  csvData: CSVParseResult | null;
  columnMappings: CSVColumnMapping | null;
  validationResult: ImportValidationResult | null;
  departmentMappings: DepartmentMapping[];
  unmappedDepartments: string[];
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
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useBreakpointValue({ base: true, md: false });

  const [importState, setImportState] = useState<ImportState>({
    step: 'upload',
    file: null,
    csvData: null,
    columnMappings: null,
    validationResult: null,
    departmentMappings: [],
    unmappedDepartments: [],
    scriptMetadata: {
      script_name: initialScriptName || '',
      script_status: 'IMPORTED',
      script_notes: ''
    }
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [existingDepartments, setExistingDepartments] = useState<any[]>([]);

  // Function to detect unmapped departments from the validation result
  const detectUnmappedDepartments = useCallback(() => {
    if (!importState.validationResult?.cleanImport) return [];

    const departmentCounts = new Map<string, number>();
    
    // Count department usage in script elements
    importState.validationResult.cleanImport.script_elements.forEach(element => {
      if (element.department_name && element.department_name.trim()) {
        const deptName = element.department_name.trim();
        departmentCounts.set(deptName, (departmentCounts.get(deptName) || 0) + 1);
      }
    });

    const unmappedDepartments: Array<{
      name: string;
      count: number;
      suggestedMatches: any[];
    }> = [];

    // Check each department against existing departments
    departmentCounts.forEach((count, departmentName) => {
      const matchResult = matchDepartment(departmentName, existingDepartments);
      
      if (!matchResult.matched) {
        // Find potential matches using fuzzy matching for suggestions
        const suggestions = existingDepartments
          .map(dept => ({
            ...dept,
            similarity: calculateSimilarity(departmentName.toLowerCase(), dept.department_name.toLowerCase())
          }))
          .filter(dept => dept.similarity > 0.3) // Only include reasonably similar matches
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 3); // Top 3 suggestions

        unmappedDepartments.push({
          name: departmentName,
          count,
          suggestedMatches: suggestions
        });
      }
    });

    return unmappedDepartments;
  }, [importState.validationResult, existingDepartments]);

  // Simple similarity calculation for department matching suggestions
  const calculateSimilarity = (str1: string, str2: string): number => {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };

  // Levenshtein distance implementation
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array.from({ length: str2.length + 1 }, (_, i) => [i]);
    matrix[0] = Array.from({ length: str1.length + 1 }, (_, i) => i);

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        const cost = str1[j - 1] === str2[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  };

  // Fetch existing departments when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const fetchDepartments = async () => {
        try {
          const token = await getToken();
          const response = await fetch('/api/me/departments', {
            headers: {
              'Authorization': `Bearer ${token}`
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
      const savedMappings = loadSavedDepartmentMappings();
      setImportState({
        step: 'upload',
        file: null,
        csvData: null,
        columnMappings: null,
        validationResult: null,
        departmentMappings: savedMappings,
        unmappedDepartments: [],
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

  // Apply department mappings to the clean import data
  const applyDepartmentMappings = useCallback((cleanImport: CleanScriptImport, mappings: DepartmentMapping[]) => {
    const mappingLookup = new Map<string, string>();
    
    // Create a lookup map from incoming department names to mapped department names
    mappings.forEach(mapping => {
      if (mapping.mappedTo) {
        mappingLookup.set(mapping.incomingName, mapping.mappedTo.department_name);
      }
      // If mappedTo is null, the department will be created as-is (no mapping needed)
    });

    // Apply mappings to script elements
    const updatedElements = cleanImport.script_elements.map(element => {
      if (element.department_name && mappingLookup.has(element.department_name)) {
        return {
          ...element,
          department_name: mappingLookup.get(element.department_name)!
        };
      }
      return element;
    });

    return {
      ...cleanImport,
      script_elements: updatedElements
    };
  }, []);

  const handleImportConfirm = useCallback(async () => {
    if (!importState.validationResult?.cleanImport) return;

    setImportState(prev => ({ ...prev, step: 'importing' }));
    setIsProcessing(true);

    try {
      // Apply department mappings to the clean import data
      const mappedImportData = applyDepartmentMappings(
        importState.validationResult.cleanImport,
        importState.departmentMappings
      );

      // Prepare the import request with showId
      const importRequest = {
        ...mappedImportData,
        show_id: showId
      };


      const response = await fetch('/api/scripts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
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
  }, [importState.validationResult, importState.departmentMappings, applyDepartmentMappings, showId, showSuccess, showError, onImportSuccess, onClose]);

  const renderUploadStep = () => (
    <VStack spacing={6} align="stretch">
      <Text fontSize="sm">
        Upload a CSV file containing your script elements. The file should include columns for timing, element type, descriptions, and departments.
      </Text>

      <Box
        border="2px dashed"
        borderColor="blue.400"
        _dark={{ borderColor: "blue.400" }}
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
          <AppIcon name="add" boxSize="48px" color="gray.400" />
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

  const renderDepartmentMappingStep = () => {
    const unmappedDepartments = detectUnmappedDepartments();

    return (
      <DepartmentMappingStep
        unmappedDepartments={unmappedDepartments}
        existingDepartments={existingDepartments}
        onMappingsChange={(mappings) => {
          setImportState(prev => ({ 
            ...prev, 
            departmentMappings: mappings 
          }));
          // Save mappings to session storage
          saveDepartmentMappings(mappings);
        }}
        initialMappings={importState.departmentMappings}
      />
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
      case 'department-mapping':
        return renderDepartmentMappingStep();
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
        const unmappedDepartments = detectUnmappedDepartments();
        const hasUnmappedDepartments = unmappedDepartments.length > 0;
        
        return {
          primaryAction: {
            label: hasUnmappedDepartments ? 'Next: Map Departments' : 'Import Script',
            onClick: hasUnmappedDepartments 
              ? () => setImportState(prev => ({ ...prev, step: 'department-mapping' }))
              : handleImportConfirm,
            variant: 'primary' as const,
            isDisabled: !importState.validationResult?.isValid,
            isLoading: !hasUnmappedDepartments && isProcessing
          },
          secondaryAction: {
            label: 'Cancel',
            onClick: onClose,
            variant: 'outline' as const
          }
        };
      case 'department-mapping':
        return {
          primaryAction: {
            label: 'Import Script',
            onClick: handleImportConfirm,
            variant: 'primary' as const,
            isDisabled: isProcessing,
            isLoading: isProcessing
          },
          secondaryAction: {
            label: 'Back',
            onClick: () => setImportState(prev => ({ ...prev, step: 'preview' })),
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
      case 'department-mapping':
        return 'Map Departments';
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
      headerIcon="add"
      size={isMobile ? 'full' : 'xl'}
      closeOnOverlayClick={importState.step === 'upload'}
      closeOnEsc={importState.step === 'upload'}
      {...getModalActions()}
    >
      {getStepContent()}
    </BaseModal>
  );
};