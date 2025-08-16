// frontend/src/components/shared/BorderedContainer.tsx

import React from 'react';
import { Flex, FlexProps } from '@chakra-ui/react';

interface BorderedContainerProps extends FlexProps {
  /** Size of the container - either a specific size or 'auto' for content-based sizing */
  containerSize?: string | 'auto';
  /** Border radius - defaults to 'full' for circular containers */
  borderRadius?: string;
  /** Border width - defaults to '3px' */
  borderWidth?: string;
  /** Whether to show hover effect (orange border on hover) - defaults to true */
  showHoverEffect?: boolean;
  children: React.ReactNode;
}

export const BorderedContainer: React.FC<BorderedContainerProps> = ({
  containerSize = "40px",
  borderRadius = "full",
  borderWidth = "3px",
  showHoverEffect = true,
  children,
  ...flexProps
}) => {
  const sizeProps = containerSize === 'auto' ? {} : { boxSize: containerSize };
  const hoverProps = showHoverEffect ? { _hover: { borderColor: 'orange.400' } } : {};

  return (
    <Flex
      justify="center"
      align="center"
      borderRadius={borderRadius}
      border={`${borderWidth} solid`}
      borderColor="blue.400"
      {...sizeProps}
      {...hoverProps}
      {...flexProps}
    >
      {children}
    </Flex>
  );
};