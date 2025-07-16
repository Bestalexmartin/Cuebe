// frontend/src/DepartmentsView.jsx

import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { AppIcon } from './components/AppIcon';

export const DepartmentsView = ({
    sortedDepartments,
    isLoading,
    error,
    sortBy,
    sortDirection,
    handleSortClick,
    onDepartmentModalOpen,
}) => {
    return (
        <Flex direction="column" height="100%">
            {/* Header Section */}
            <Flex justify="space-between" align="center" flexShrink={0}>
                <HStack spacing="2" align="center">
                    <AppIcon name="department" boxSize="25px" />
                    <Heading as="h2" size="md">Departments</Heading>
                </HStack>
                <HStack spacing="2">
                    <Menu>
                        <MenuButton as={Button} size="xs" rightIcon={<AppIcon name="openmenu" />}>
                            Sort by: {sortBy === 'departmentName' ? 'Name' : 'Date Added'}
                        </MenuButton>
                        <MenuList>
                            <MenuItem onClick={() => handleSortClick('departmentName')}>Name</MenuItem>
                            <MenuItem onClick={() => handleSortClick('dateAdded')}>Date Added</MenuItem>
                        </MenuList>
                    </Menu>
                    <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
                    <Button
                        bg="blue.400"
                        color="white"
                        size="xs"
                        onClick={onDepartmentModalOpen}
                        _hover={{ bg: 'orange.400' }}
                        _focus={{ boxShadow: 'none' }}
                    >
                        Add Department
                    </Button>
                </HStack>
            </Flex>

            <Box
                mt="4"
                border="1px solid"
                borderColor="container.border"
                p="4"
                borderRadius="md"
                flexGrow={1}
                overflowY="auto"
                className="hide-scrollbar"
            >
                {isLoading && (
                    <Flex justify="center" align="center" height="200px">
                        <Spinner />
                    </Flex>
                )}
                {error && (
                    <Text color="red.500" textAlign="center" p="4">
                        {error}
                    </Text>
                )}
                {!isLoading && !error && (
                    sortedDepartments.length > 0 ? (
                        <VStack spacing={4} align="stretch">
                            {sortedDepartments.map(department => (
                                <Box
                                    key={department.departmentID}
                                    p="4"
                                    borderWidth="2px"
                                    borderRadius="md"
                                    shadow="sm"
                                    borderColor="gray.600"
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    <Flex justify="space-between" align="center">
                                        <Text fontWeight="medium">{department.departmentName}</Text>
                                        {department.departmentColor && (
                                            <Box
                                                w="20px"
                                                h="20px"
                                                borderRadius="full"
                                                bg={department.departmentColor}
                                                border="1px solid"
                                                borderColor="gray.300"
                                            />
                                        )}
                                    </Flex>
                                    {department.departmentDescription && (
                                        <Text fontSize="sm" color="gray.500" mt="2">
                                            {department.departmentDescription}
                                        </Text>
                                    )}
                                </Box>
                            ))}
                        </VStack>
                    ) : (
                        <Flex direction="column" align="center" justify="center" height="200px" gap="4">
                            <AppIcon name="department" boxSize="40px" color="gray.400" />
                            <Text color="gray.500" textAlign="center">
                                You haven't added any departments yet.
                            </Text>
                            <Button
                                bg="blue.400"
                                color="white"
                                size="sm"
                                onClick={onDepartmentModalOpen}
                                _hover={{ bg: 'orange.400' }}
                                _focus={{ boxShadow: 'none' }}
                            >
                                Add Your First Department
                            </Button>
                        </Flex>
                    )
                )}
            </Box>
        </Flex>
    );
};