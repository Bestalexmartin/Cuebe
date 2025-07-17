// frontend/src/QuickAccessPanel.jsx

import { Flex, Box, VStack, Heading, Button, Text, HStack } from "@chakra-ui/react";
import { AppIcon } from './components/AppIcon';

const NavigationItem = ({ icon, title, description, isActive, onClick }) => (
    <Box
        borderWidth="2px"
        borderRadius="md"
        p="4"
        shadow="sm"
        cursor="pointer"
        borderColor={isActive ? 'blue.400' : 'gray.600'}
        _hover={{ borderColor: 'orange.400' }}
        _focus={{ boxShadow: 'outline', borderColor: 'blue.400' }}
        onClick={onClick}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
            }
        }}
    >
        <HStack spacing="1" align="center">
            <AppIcon name={icon} />
            <Heading size="xs" textTransform="uppercase">{title}</Heading>
        </HStack>
        <Text pt="2" fontSize="sm">{description}</Text>
    </Box>
);

export const QuickAccessPanel = ({ activeView, setActiveView }) => {
    const navigationItems = [
        {
            id: 'shows',
            icon: 'show',
            title: 'Shows',
            description: 'Manage your list of shows.'
        },
        {
            id: 'venues',
            icon: 'venue',
            title: 'Venues',
            description: 'Manage your list of venues.'
        },
        {
            id: 'departments',
            icon: 'department',
            title: 'Departments',
            description: 'Manage your list of departments.'
        },
        {
            id: 'crew',
            icon: 'crew',
            title: 'Crew',
            description: 'Manage your crew members.'
        }
    ];

    return (
        <>
            <Flex justify="flex-end" align="center">
                <Button
                    bg="blue.400"
                    color="white"
                    size="xs"
                    _hover={{ bg: 'orange.400' }}
                    _focus={{ boxShadow: 'none' }}
                >
                    Options
                </Button>
            </Flex>

            <Box
                mt="4"
                border="1px solid"
                borderColor="container.border"
                p="4"
                borderRadius="md"
            >
                <VStack spacing={4} align="stretch">
                    {navigationItems.map((item) => (
                        <NavigationItem
                            key={item.id}
                            icon={item.icon}
                            title={item.title}
                            description={item.description}
                            isActive={activeView === item.id}
                            onClick={() => setActiveView(item.id)}
                        />
                    ))}
                </VStack>
            </Box>
        </>
    );
};