// frontend/src/components/AppIcon.jsx

import { Icon } from "@chakra-ui/react";
import { ChevronDownIcon } from '@chakra-ui/icons';
import { TiPin } from "react-icons/ti";
import { IoPeopleSharp } from "react-icons/io5";
import { BiSolidMegaphone, BiSolidMoviePlay } from "react-icons/bi";
import { FaMasksTheater } from "react-icons/fa6";
import { EditIcon } from "@chakra-ui/icons";

export const AppIcon = ({ name, ...props }) => {
    switch (name) {
        case 'openmenu':
            return <Icon as={ChevronDownIcon} {...props} />;
        case 'hamburger':
            return <Icon as={CiMenuBurger} {...props} />;
        case 'edit':
            return <Icon as={EditIcon} {...props} />;
        case 'pinned':
            return <Icon as={TiPin} {...props} />;
        case 'show':
            return <Icon as={BiSolidMoviePlay} {...props} />;
        case 'venue':
            return <Icon as={FaMasksTheater} {...props} />;
        case 'department':
            return <Icon as={BiSolidMegaphone} {...props} />;
        case 'crew':
            return <Icon as={IoPeopleSharp} {...props} />;
        default:
            return null;
    }
};