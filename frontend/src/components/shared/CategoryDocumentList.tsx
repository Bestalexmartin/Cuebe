// frontend/src/components/shared/CategoryDocumentList.tsx

import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  Button,
  Divider,
  useColorModeValue
} from '@chakra-ui/react';
import { AppIcon, IconName } from '../AppIcon';
import { DocFile } from '../../utils/documentSorting';

interface CategoryDocumentListProps {
  category: string;
  documents: DocFile[];
  categoryIcon: IconName;
  onDocumentClick: (docName: string) => void;
  onBackToOverview: () => void;
}

export const CategoryDocumentList: React.FC<CategoryDocumentListProps> = ({
  category,
  documents,
  categoryIcon,
  onDocumentClick,
  onBackToOverview
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.900', 'white');
  const iconColor = useColorModeValue('gray.600', 'white');

  return (
    <VStack spacing={0} align="stretch" height="100%">
      {/* Sticky Header */}
      <Box position="sticky" top={0} bg="page.background" zIndex={10} pb="4px">
        <VStack spacing={4} align="stretch">
          <HStack spacing={3} align="center" justify="space-between">
            <HStack spacing={3} align="center">
              <AppIcon
                name={categoryIcon}
                boxSize="24px"
                color={iconColor}
              />
              <Text fontWeight="semibold" fontSize="lg">{category} Documentation</Text>
              <Text fontSize="sm" color="gray.500">
                {documents.length} documents
              </Text>
            </HStack>
            <Button
              size="xs"
              variant="outline"
              onClick={onBackToOverview}
            >
              Back to Overview
            </Button>
          </HStack>
          <Divider />
        </VStack>
      </Box>
      
      {/* Scrollable Content */}
      <Box flex={1} overflowY="auto" className="hide-scrollbar">
        <VStack spacing={3} align="stretch">
          {documents.map((doc) => (
            <HStack
              key={doc.name}
              spacing={3}
              p={3}
              rounded="md"
              shadow="sm"
              bg={cardBg}
              borderWidth="2px"
              borderColor="gray.600"
              cursor="pointer"
              _hover={{ borderColor: "orange.400" }}
              onClick={() => onDocumentClick(doc.name)}
              align="start"
            >
              <Box px={2}>
                <AppIcon name={doc.icon} boxSize="16px" color={iconColor} />
              </Box>
              <VStack align="start" spacing={1} flex={1}>
                <Text fontWeight="medium" fontSize="sm" color={textColor}>
                  {doc.name}
                </Text>
                <Text fontSize="xs" color="cardText">
                  {doc.description}
                </Text>
              </VStack>
            </HStack>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
};