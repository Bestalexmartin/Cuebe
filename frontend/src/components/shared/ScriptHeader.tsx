import React from 'react';
import { Flex, HStack, Heading, Badge, Button, Box, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { AppIcon } from '../AppIcon';
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
  onOptionsClick?: () => void;
  // kept for API compatibility, unused locally
  useMilitaryTime?: boolean;
  actions?: any[];
  // New props for View Mode menu
  showPreferences?: boolean;
  showTutorials?: boolean;
  setShowPreferences?: (show: boolean) => void;
  setShowTutorials?: (show: boolean) => void;
}

export const ScriptHeader: React.FC<ScriptHeaderProps> = React.memo(({
  currentScript,
  crewContext,
  onBackToShows,
  onOptionsClick: _onOptionsClick,
  useMilitaryTime: _useMilitaryTime = false,
  actions: _actions = [],
  showPreferences: _showPreferences = false,
  showTutorials: _showTutorials = false,
  setShowPreferences,
  setShowTutorials
}) => {
  // Playback state not displayed here; keep header lean

  return (
    <Flex justify="space-between" align="center" flexShrink={0} mb={4} mt={{ base: "-2px", sm: "-1px" }} px={{ base: "1rem", sm: "0" }}>
      <HStack spacing="3" align="center">
        <AppIcon name="script" boxSize="20px" display={{ base: 'none', lg: 'block' }} />
        <Heading as="h2" size="md" display={{ base: 'none', lg: 'block' }}>{currentScript?.script_name || 'Script'}</Heading>
        <Box display={{ base: 'none', sm: 'flex' }} gap="2">
          {crewContext?.department_name && (
            <Badge 
              colorScheme="blue"
              variant="solid"
              fontSize="sm"
              size="md"
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
              size="md"
            >
              {formatRoleBadge(crewContext.show_role)}
            </Badge>
          )}
        </Box>
      </HStack>


      <HStack spacing="2" display={{ base: 'none', sm: 'flex' }}>
        {setShowPreferences && setShowTutorials && (
          <Menu>
            <MenuButton
              as={Button}
              bg="blue.400"
              color="white"
              size="xs"
              _hover={{ bg: 'orange.400' }}
              rightIcon={<AppIcon name="openmenu" />}
            >
              View Mode
            </MenuButton>
            <MenuList minW="140px">
              <MenuItem 
                onClick={() => {
                  setShowTutorials(false);
                  setShowPreferences(false);
                  onBackToShows();
                }}
              >
                <AppIcon name="show" boxSize="16px" mr={2} />
                Shows
              </MenuItem>
              <MenuItem 
                onClick={() => {
                  onBackToShows(); // Exit script mode first
                  setShowTutorials(false);
                  setShowPreferences(true);
                }}
              >
                <AppIcon name="options" boxSize="16px" mr={2} />
                Preferences
              </MenuItem>
              <MenuItem 
                onClick={() => {
                  onBackToShows(); // Exit script mode first
                  setShowTutorials(true);
                  setShowPreferences(false);
                }}
              >
                <AppIcon name="compass" boxSize="16px" mr={2} />
                Tutorials
              </MenuItem>
            </MenuList>
          </Menu>
        )}
      </HStack>
    </Flex>
  );
});
