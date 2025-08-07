// frontend/src/components/AppIcon.tsx

import React from "react";
import { Icon, IconProps } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon, DeleteIcon, CopyIcon, MoonIcon, SunIcon, TriangleDownIcon, TriangleUpIcon, CalendarIcon, TimeIcon, SearchIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { TiPin } from "react-icons/ti";
import { IoPeopleSharp } from "react-icons/io5";
import { CiMenuBurger } from "react-icons/ci";
import { BiSolidMegaphone, BiSolidMoviePlay } from "react-icons/bi";
import { FaMasksTheater, FaMapLocationDot, FaScroll } from "react-icons/fa6";
import { FaCompass, FaPlay, FaEye, FaEdit, FaShare, FaInfoCircle, FaClipboardList, FaPlus, FaLayerGroup, FaPencilAlt, FaAngleDoubleUp, FaAngleDoubleDown, FaHistory, FaEllipsisV, FaRedo } from "react-icons/fa";
import { LuLayers3 } from "react-icons/lu";
import { RiDashboard2Fill } from "react-icons/ri";
import { EditIcon } from "@chakra-ui/icons";
import { GoSortAsc, GoSortDesc, GoAlertFill } from "react-icons/go";
import { MdOutlineMenuBook } from "react-icons/md";
import { SiDocsify } from "react-icons/si";
import { VscCode } from "react-icons/vsc";
import { MdSpeed } from "react-icons/md";
import { BiTestTube } from "react-icons/bi";
import { FaArchive } from "react-icons/fa";
import { ImExit } from "react-icons/im";

// TypeScript interfaces
export type IconName =
  | 'openmenu'
  | 'closemenu'
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
  | 'archive'
  | 'roadmap'
  | 'script'
  | 'view'
  | 'play'
  | 'script-edit'
  | 'share'
  | 'info'
  | 'dashboard'
  | 'planning'
  | 'add'
  | 'group'
  | 'element-edit'
  | 'jump-top'
  | 'jump-bottom'
  | 'history'
  | 'exit'
  | 'moon'
  | 'sun'
  | 'triangle-down'
  | 'triangle-up'
  | 'ungroup'
  | 'calendar'
  | 'time'
  | 'search'
  | 'external-link'
  | 'more-vertical'
  | 'refresh';

interface AppIconProps extends Omit<IconProps, 'as'> {
  name: IconName;
}

export const AppIcon: React.FC<AppIconProps> = ({ name, ...props }) => {
  switch (name) {
    case 'openmenu':
      return <Icon as={ChevronDownIcon} {...props} />;
    case 'closemenu':
      return <Icon as={ChevronUpIcon} {...props} />;
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
    case 'roadmap':
      return <Icon as={FaMapLocationDot} {...props} />;
    case 'script':
      return <Icon as={FaScroll} {...props} />;
    case 'view':
      return <Icon as={FaEye} {...props} />;
    case 'play':
      return <Icon as={FaPlay} {...props} />;
    case 'script-edit':
      return <Icon as={FaPencilAlt} {...props} />;
    case 'share':
      return <Icon as={FaShare} {...props} />;
    case 'info':
      return <Icon as={FaInfoCircle} {...props} />;
    case 'dashboard':
      return <Icon as={RiDashboard2Fill} {...props} />;
    case 'planning':
      return <Icon as={FaClipboardList} {...props} />;
    case 'add':
      return <Icon as={FaPlus} {...props} />;
    case 'group':
      return <Icon as={FaLayerGroup} {...props} />;
    case 'element-edit':
      return <Icon as={FaEdit} {...props} />;
    case 'jump-top':
      return <Icon as={FaAngleDoubleUp} {...props} />;
    case 'jump-bottom':
      return <Icon as={FaAngleDoubleDown} {...props} />;
    case 'history':
      return <Icon as={FaHistory} {...props} />;
    case 'exit':
      return <Icon as={ImExit} {...props} />;
    case 'moon':
      return <Icon as={MoonIcon} {...props} />;
    case 'sun':
      return <Icon as={SunIcon} {...props} />;
    case 'triangle-down':
      return <Icon as={TriangleDownIcon} {...props} />;
    case 'triangle-up':
      return <Icon as={TriangleUpIcon} {...props} />;
    case 'ungroup':
      return <Icon as={LuLayers3} {...props} />;
    case 'calendar':
      return <Icon as={CalendarIcon} {...props} />;
    case 'time':
      return <Icon as={TimeIcon} {...props} />;
    case 'search':
      return <Icon as={SearchIcon} {...props} />;
    case 'external-link':
      return <Icon as={ExternalLinkIcon} {...props} />;
    case 'more-vertical':
      return <Icon as={FaEllipsisV} {...props} />;
    case 'refresh':
      return <Icon as={FaRedo} {...props} />;
    default:
      return null;
  }
};