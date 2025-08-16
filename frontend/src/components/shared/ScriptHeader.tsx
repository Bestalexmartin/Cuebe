import React from 'react';
import { Flex, HStack, Heading, Text, Badge, Button } from '@chakra-ui/react';
import { AppIcon } from '../AppIcon';
import { formatRoleBadge } from '../../constants/userRoles';

interface Script {
  script_id: string;
  script_name: string;
}

interface CrewContext {
  department_name?: string;
  department_initials?: string;
  department_color?: string;
  show_role?: string;
  user_name?: string;
}

interface ScriptHeaderProps {
  currentScript: Script | null;
  crewContext: CrewContext | null;
  onBackToShows: () => void;
}

export const ScriptHeader: React.FC<ScriptHeaderProps> = React.memo(({
  currentScript,
  crewContext,
  onBackToShows,
}) => {
  return (
    <Flex justify="space-between" align="center" flexShrink={0} mb={4}>
      <HStack spacing="3" align="center">
        <AppIcon name="script" boxSize="20px" />
        <Heading as="h2" size="md">{currentScript?.script_name || 'Script'}</Heading>
        {crewContext?.department_name && (
          <>
            <Text color="gray.400" fontSize="lg">—</Text>
            <Badge 
              colorScheme="blue"
              variant="solid"
              fontSize="sm"
              style={{ backgroundColor: crewContext.department_color || '#3182CE' }}
            >
              {crewContext.department_name}
            </Badge>
          </>
        )}
        {crewContext?.show_role && (
          <Badge 
            colorScheme="green"
            variant="solid"
            fontSize="sm"
          >
            {formatRoleBadge(crewContext.show_role)}
          </Badge>
        )}
      </HStack>
      <HStack spacing="2">
        <Button
          size="xs"
          variant="outline"
          onClick={onBackToShows}
          _hover={{ bg: 'gray.100' }}
          _dark={{ _hover: { bg: 'gray.700' } }}
        >
          Back
        </Button>
      </HStack>
    </Flex>
  );
});