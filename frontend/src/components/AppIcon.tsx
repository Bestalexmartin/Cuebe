// frontend/src/components/AppIcon.tsx

import React from "react";
import { Icon, IconProps } from "@chakra-ui/react";
import { ChevronDownIcon, DeleteIcon, WarningIcon } from '@chakra-ui/icons';
import { TiPin } from "react-icons/ti";
import { IoPeopleSharp } from "react-icons/io5";
import { CiMenuBurger } from "react-icons/ci";
import { BiSolidMegaphone, BiSolidMoviePlay } from "react-icons/bi";
import { FaMasksTheater } from "react-icons/fa6";
import { EditIcon } from "@chakra-ui/icons";

// TypeScript interfaces
type IconName = 
  | 'openmenu' 
  | 'hamburger' 
  | 'edit' 
  | 'delete'
  | 'warning'
  | 'pinned' 
  | 'show' 
  | 'venue' 
  | 'department' 
  | 'crew';

interface AppIconProps extends Omit<IconProps, 'as'> {
  name: IconName;
}

export const AppIcon: React.FC<AppIconProps> = ({ name, ...props }) => {
  switch (name) {
    case 'openmenu':
      return <Icon as={ChevronDownIcon} {...props} />;
    case 'hamburger':
      return <Icon as={CiMenuBurger} {...props} />;
    case 'edit':
      return <Icon as={EditIcon} {...props} />;
    case 'delete':
      return <Icon as={DeleteIcon} {...props} />;
    case 'warning':
      return <Icon as={WarningIcon} {...props} />;
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