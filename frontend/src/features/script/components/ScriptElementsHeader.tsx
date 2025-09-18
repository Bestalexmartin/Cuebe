// frontend/src/features/script/components/ScriptElementsHeader.tsx

import React from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';

interface ScriptElementsHeaderProps {
    colorizeDepNames?: boolean;
}

export const ScriptElementsHeader: React.FC<ScriptElementsHeaderProps> = () => {
    // When colorizeDepNames is true, most borders should be hidden for clean department color display
    return (
        <Box
            bg="gray.600"
            border="3px solid"
            borderColor="gray.600"
            _dark={{ bg: "black", borderColor: "black" }}
            borderRadius="sm"
            position="sticky"
            top={0}
            zIndex={10}
            mb="1px"
        >
            <HStack spacing={0} align="center" h="30px">
                {/* Department Color Bar */}
                <Box
                    w="10px"
                    h="28px"
                    bg="gray.600"
                    _dark={{ bg: "black" }}
                    flexShrink={0}
                />

                {/* Time Offset Header */}
                <Box w="120px" minW="100px" pl={5} pr={4} py={.5} flexShrink={1}>
                    <Text fontSize="sm" color="white" _dark={{ color: "#cccccc" }} fontWeight="bold" textAlign="center">
                        TIME
                    </Text>
                </Box>

                {/* Duration Header - hidden third/last (< 768px), compressible */}
                <Box
                    w="100px"
                    minW="60px"
                    height="28px"
                    borderLeft="1px solid"
                    borderColor="white"
                    display={{ base: 'none', md: 'flex' }}
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={2}
                >
                    <Text py={.5} fontSize="sm" color="white" _dark={{ color: "#cccccc" }} fontWeight="bold" textAlign="center">
                        DUR
                    </Text>
                </Box>

                {/* Department Header */}
                <Box w="100px" minW="99px" height="28px" display={{ base: 'none', sm: 'flex' }} alignItems="center" justifyContent="center" flexShrink={0} borderLeft="1px solid" borderColor="white">
                    <Text fontSize="sm" color="white" _dark={{ color: "#cccccc" }} fontWeight="bold" textAlign="center" isTruncated width="100%">
                        DEPT
                    </Text>
                </Box>

                {/* Cue ID Header */}
                <Box w="80px" minW="80px" height="28px" display="flex" alignItems="center" justifyContent="center" flexShrink={0} borderLeft="1px solid" borderColor="white">
                    <Text py={.5} fontSize="sm" color="white" _dark={{ color: "#cccccc" }} fontWeight="bold" textAlign="center">
                        ID
                    </Text>
                </Box>

                {/* Description Header */}
                <Box flex={1} minW="120px" pl={3} pr={3} height="28px" display="flex" alignItems="center" flexShrink={1} borderLeft="1px solid" borderColor="white">
                    <Text py={.5} fontSize="sm" color="white" _dark={{ color: "#cccccc" }} fontWeight="bold" textAlign="left" isTruncated>
                        CUE
                    </Text>
                </Box>

                {/* Cue Notes Header - hidden second (< 900px) */}
                <Box 
                    flex={1} 
                    pl={3} 
                    pr={3} 
                    height="28px"
                    display={{ base: 'none', lg: 'flex' }}
                    alignItems="center"
                    minW="150px"
                    borderLeft="1px solid"
                    borderColor="white"
                >
                    <Text py={.5} fontSize="sm" color="white" _dark={{ color: "#cccccc" }} fontWeight="bold" textAlign="left" isTruncated>
                        NOTES
                    </Text>
                </Box>

                {/* Location Header - hidden first (< 1200px) */}
                <Box 
                    w="180px" 
                    minW="180px" 
                    pl={6} 
                    pr={3} 
                    height="28px"
                    display={{ base: 'none', xl: 'flex' }}
                    alignItems="center"
                    flexShrink={0}
                    borderLeft="1px solid"
                    borderColor="white"
                >
                    <Text py={.5} fontSize="sm" color="white" _dark={{ color: "#cccccc" }} fontWeight="bold" textAlign="left" isTruncated>
                        LOCATION
                    </Text>
                </Box>

                {/* Priority Header */}
                <Box w="122px" minW="122px" height="28px" display={{ base: 'none', sm: 'flex' }} alignItems="center" justifyContent="center" flexShrink={0} borderLeft="1px solid" borderColor="white">
                    <Text py={.5} fontSize="sm" color="white" _dark={{ color: "#cccccc" }} fontWeight="bold" textAlign="center">
                        PRIORITY
                    </Text>
                </Box>
            </HStack>
        </Box>
    );
};
