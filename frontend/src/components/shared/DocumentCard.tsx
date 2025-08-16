// frontend/src/components/shared/DocumentCard.tsx

import React from 'react';
import {
  Card,
  CardBody,
  VStack,
  HStack,
  Badge,
  Text,
  Box,
  useColorModeValue
} from '@chakra-ui/react';
import { AppIcon } from '../AppIcon';
import { DocFile } from '../../utils/documentSorting';

interface DocumentCardProps {
  category: string;
  documents: DocFile[];
  onCategoryClick: (category: string) => void;
  onDocumentClick: (docName: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  category,
  documents,
  onCategoryClick,
  onDocumentClick
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.900', 'white');
  const iconColor = useColorModeValue('gray.600', 'white');

  return (
    <Card 
      size="sm" 
      bg={cardBg}
      borderWidth="2px"
      borderRadius="md"
      shadow="sm"
      borderColor="gray.600"
      cursor="pointer"
      _hover={{ borderColor: "orange.400" }}
      onClick={() => onCategoryClick(category)}
    >
      <CardBody>
        <VStack align="stretch" spacing={3}>
          <HStack spacing={4}>
            <Badge
              colorScheme="blue"
              fontSize="sm"
              px={2}
              py={1}
              cursor="pointer"
              _hover={{ bg: "blue.600", color: "white" }}
              onClick={(e) => {
                e.stopPropagation();
                onCategoryClick(category);
              }}
            >
              {category}
            </Badge>
            <Text fontWeight="semibold" fontSize="sm" color="cardText">
              {documents.length} document{documents.length > 1 ? 's' : ''}
            </Text>
          </HStack>
          <VStack spacing={2} align="stretch">
            {documents.map((doc) => (
              <HStack
                key={doc.name}
                spacing={3}
                p={2}
                rounded="md"
                shadow="sm"
                bg="app.background"
                borderWidth="2px"
                borderColor="gray.600"
                cursor="pointer"
                _hover={{ borderColor: "orange.400" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDocumentClick(doc.name);
                }}
              >
                <Box px={2}>
                  <AppIcon name={doc.icon} boxSize="21px" color={iconColor} />
                </Box>
                <VStack align="start" spacing={0} flex={1}>
                  <Text fontWeight="medium" fontSize="sm" color={textColor}>
                    {doc.name}
                  </Text>
                  <Text fontSize="xs" color="cardText" noOfLines={1}>
                    {doc.description}
                  </Text>
                </VStack>
              </HStack>
            ))}
          </VStack>
        </VStack>
      </CardBody>
    </Card>
  );
};