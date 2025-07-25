// frontend/src/components/AppIcon.tsx

import React from "react";
import { Icon, IconProps } from "@chakra-ui/react";
import { ChevronDownIcon, DeleteIcon, WarningIcon, CopyIcon } from '@chakra-ui/icons';
import { TiPin } from "react-icons/ti";
import { IoPeopleSharp } from "react-icons/io5";
import { CiMenuBurger } from "react-icons/ci";
import { BiSolidMegaphone, BiSolidMoviePlay } from "react-icons/bi";
import { FaMasksTheater } from "react-icons/fa6";
import { FaCompass } from "react-icons/fa";
import { EditIcon } from "@chakra-ui/icons";
import { GoSortAsc, GoSortDesc, GoAlertFill } from "react-icons/go";
import { MdOutlineMenuBook } from "react-icons/md";
import { SiDocsify } from "react-icons/si";
import { VscCode } from "react-icons/vsc";
import { MdSpeed } from "react-icons/md";
import { BiTestTube } from "react-icons/bi";
import { FaArchive } from "react-icons/fa";

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
  | 'crew'
  | 'asc'
  | 'desc'
  | 'compass'
  | 'copy'
  | 'api-docs'
  | 'docs'
  | 'component'
  | 'performance'
  | 'test'
  | 'archive';

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
      return <Icon as={GoAlertFill} {...props} />;
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
    case 'asc':
      return <Icon as={GoSortAsc} {...props} />;
    case 'desc':
      return <Icon as={GoSortDesc} {...props} />;
    case 'compass':
      return <Icon as={FaCompass} {...props} />;
    case 'copy':
      return <Icon as={CopyIcon} {...props} />;
    case 'api-docs':
      return <Icon as={MdOutlineMenuBook} {...props} />;
    case 'docs':
      return <Icon as={SiDocsify} {...props} />;
    case 'component':
      return <Icon as={VscCode} {...props} />;
    case 'performance':
      return <Icon as={MdSpeed} {...props} />;
    case 'test':
      return <Icon as={BiTestTube} {...props} />;
    case 'archive':
      return <Icon as={FaArchive} {...props} />;
    default:
      return null;
  }
};