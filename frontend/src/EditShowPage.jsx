// frontend/src/EditShowPage.jsx

import { Box, Heading } from "@chakra-ui/react";
import { useParams } from "react-router-dom";

export const EditShowPage = () => {
    // This hook gets the showId from the URL
    const { showId } = useParams();

    return (
        <Box>
            <Heading>Edit Show</Heading>
            <p>Editing show with ID: {showId}</p>
            {/* The edit form will go here */}
        </Box>
    );
};