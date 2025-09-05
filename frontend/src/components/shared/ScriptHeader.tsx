import React from 'react';
import { Flex, HStack, Heading, Badge, Button, Divider } from '@chakra-ui/react';
import { AppIcon } from '../AppIcon';
import { ActionsMenu } from '../ActionsMenu';
import { formatRoleBadge } from '../../constants/userRoles';
// No playback state needed in this header; overlay handles timing/status

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
  // kept for API compatibility, unused locally
  useMilitaryTime?: boolean;
  actions?: any[];
}

export const ScriptHeader: React.FC<ScriptHeaderProps> = React.memo(({
  currentScript,
  crewContext,
  onBackToShows,
  useMilitaryTime: _useMilitaryTime = false,
  actions = []
}) => {
  // Playback state not displayed here; keep header lean

  return (
    <Flex justify="space-between" align="center" flexShrink={0} mb={4} mt="-2px">
      <HStack spacing="3" align="center">
        <AppIcon name="script" boxSize="20px" display={{ base: 'none', lg: 'block' }} />
        <Heading as="h2" size="md" display={{ base: 'none', lg: 'block' }}>{currentScript?.script_name || 'Script'}</Heading>
        {crewContext?.department_name && (
          <Badge 
            colorScheme="blue"
            variant="solid"
            fontSize="sm"
            style={{ backgroundColor: crewContext.department_color || '#3182CE' }}
          >
            {crewContext.department_name}
          </Badge>
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
        {actions.length > 0 && (
          <>
            <ActionsMenu
              actions={actions}
              isDisabled={false}
            />
            <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
          </>
        )}
        <Button
          size="xs"
          bg="blue.400"
          color="white"
          _hover={{ bg: 'orange.400' }}
          onClick={onBackToShows}
        >
          Back to Shows
        </Button>
      </HStack>
    </Flex>
  );
});
