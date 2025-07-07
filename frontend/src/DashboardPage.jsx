// frontend/src/DashboardPage.jsx

import { Flex, Box, Heading, Button } from "@chakra-ui/react";

const DashboardPage = () => {
  return (
    // The main container is a <Flex> component with a theme-based gap
    <Flex width="100%" gap="8">

      {/* Main Content Area (70%) */}
      <Box flexBasis="70%">
        <Heading as="h2" size="md" mb="4">
          Library
        </Heading>
        
        {/* Placeholder for the show list */}
        <Box 
          mt="4" 
          border="1px dashed" 
          borderColor="gray.300" 
          p="8" 
          borderRadius="md"
        >
          Library Cards
        </Box>
        <Button
          mt="4"
          bg="blue.400" // Set the background to your specific blue
          color="white"   // Set the text color to white for contrast
          _hover={{ bg: 'orange.400' }}
        >
          Create New Show
        </Button>
      </Box>

      {/* Quick Access Sidebar (30%) */}
      <Box flexBasis="30%">
        <Heading as="h2" size="md" mb="4">
          QuickStart
        </Heading>
        
        {/* Placeholder for pinned items */}
        <Box 
          border="1px dashed" 
          borderColor="gray.300" 
          p="8" 
          borderRadius="md"
        >
          Quickstart Cards
        </Box>
      </Box>
    </Flex>
  );
};

export default DashboardPage;