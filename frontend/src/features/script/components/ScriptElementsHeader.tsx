// frontend/src/features/script/components/ScriptElementsHeader.tsx

import React from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';

export const ScriptElementsHeader: React.FC = () => {
    return (
        <Box
            bg="black"
            borderRadius="sm"
            position="sticky"
            top={0}
            zIndex={10}
            mb="1px"
        >
            <HStack spacing={0} align="center" h="33px">
                {/* Department Color Bar */}
                <Box
                    w="10px"
                    h="100%"
                    bg="black"
                    flexShrink={0}
                />

                {/* Time Offset Header */}
                <Box w="123px" pl={5} pr={4} borderRight="1px solid" borderColor="gray.500">
                    <Text py={.5} fontSize="sm" color="white" fontWeight="bold" textAlign="center">
                        TIME
                    </Text>
                </Box>

                {/* Duration Header */}
                <Box w="100px" borderRight="1px solid" borderColor="gray.500">
                    <Text py={.5} fontSize="sm" color="white" fontWeight="bold" textAlign="center">
                        DUR
                    </Text>
                </Box>

                {/* Department Header */}
                <Box w="100px" height="100%" display="flex" alignItems="center">
                    <Text fontSize="sm" color="white" fontWeight="bold" textAlign="center" isTruncated width="100%">
                        DEPT
                    </Text>
                </Box>

                {/* Cue ID Header */}
                <Box w="80px" borderRight="1px solid" borderLeft="1px solid" borderColor="gray.500">
                    <Text py={.5} fontSize="sm" color="white" fontWeight="bold" textAlign="center">
                        ID
                    </Text>
                </Box>

                {/* Description Header */}
                <Box w="240px" pl={6} pr={3} borderRight="1px solid" borderColor="gray.500">
                    <Text py={.5} fontSize="sm" color="white" fontWeight="bold" textAlign="left" isTruncated>
                        CUE
                    </Text>
                </Box>

                {/* Cue Notes Header */}
                <Box flex={1} pl={6} pr={3} borderRight="1px solid" borderColor="gray.500">
                    <Text py={.5} fontSize="sm" color="white" fontWeight="bold" textAlign="left" isTruncated>
                        NOTES
                    </Text>
                </Box>

                {/* Location Header */}
                <Box w="180px" pl={6} pr={3} borderRight="1px solid" borderColor="gray.500">
                    <Text py={.5} fontSize="sm" color="white" fontWeight="bold" textAlign="left" isTruncated>
                        LOCATION
                    </Text>
                </Box>

                {/* Priority Header */}
                <Box w="123px">
                    <Text py={.5} fontSize="sm" color="white" fontWeight="bold" textAlign="center">
                        PRIORITY
                    </Text>
                </Box>
            </HStack>
        </Box>
    );
};
