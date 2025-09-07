// frontend/src/ChakraTheme.ts

import { extendTheme } from "@chakra-ui/react";

// TypeScript interfaces
interface ToastStyle {
  bg: string;
  color: string;
  width: string;
  maxWidth: string;
  border: string;
  borderColor: string;
  boxShadow: string;
}

interface ToastConfigs {
  success: { containerStyle: ToastStyle };
  error: { containerStyle: ToastStyle };
  warning: { containerStyle: ToastStyle };
  info: { containerStyle: ToastStyle };
}

// Chakra Config
const config = {
  initialColorMode: "system" as const,
  useSystemColorMode: true,
};

const colors = {
  blue: { 400: "#6495ED" },
  orange: { 400: "#e79e40" },
};

const semanticTokens = {
  colors: {
    "page.background": {
      _light: "gray.50",
      _dark: "gray.900",
    },
    "page.text": {
      _light: "gray.800",
      _dark: "whiteAlpha.900",
    },
    "detail.text": {
      _light: "gray.600",
      _dark: "gray.400",
    },
    cardText: {
      _light: "gray.600",
      _dark: "gray.400",
    },
    "ui.border": {
      _light: "gray.200",
      _dark: "whiteAlpha.300",
    },
    "container.border": {
      _light: "gray.600",
      _dark: "gray.400",
    },
    "card.background": {
      _light: "gray.100",
      _dark: "gray.800",
    },
    "window.background": {
      _light: "white",
      _dark: "gray.700",
    },
    "row.hover": {
      _light: "gray.100",
      _dark: "gray.600",
    },
    "button.disabled.bg": {
      _light: "gray.200",
      _dark: "gray.800",
    },
    "button.disabled.text": {
      _light: "gray.400",
      _dark: "gray.600",
    },
    "button.text": {
      _light: "gray.600",
      _dark: "gray.300",
    },
    // Success/Info Toast (default blue)
    "toast.success.bg": {
      _light: "#6495ED",
      _dark: "#6495ED",
    },
    "toast.success.color": {
      _light: "white",
      _dark: "white",
    },
    "toast.success.border": {
      _light: "#4169E1",
      _dark: "transparent",
    },
    "toast.success.shadow": {
      _light: "0 4px 12px rgba(100, 149, 237, 0.15)",
      _dark: "0 4px 12px rgba(0, 0, 0, 0.3)",
    },
    // Error Toast (red)
    "toast.error.bg": {
      _light: "#E53E3E",
      _dark: "#E53E3E",
    },
    "toast.error.color": {
      _light: "white",
      _dark: "white",
    },
    "toast.error.border": {
      _light: "#C53030",
      _dark: "transparent",
    },
    "toast.error.shadow": {
      _light: "0 4px 12px rgba(229, 62, 62, 0.15)",
      _dark: "0 4px 12px rgba(0, 0, 0, 0.3)",
    },
    // Warning Toast (orange)
    "toast.warning.bg": {
      _light: "#DD6B20",
      _dark: "#DD6B20",
    },
    "toast.warning.color": {
      _light: "white",
      _dark: "white",
    },
    "toast.warning.border": {
      _light: "#C05621",
      _dark: "transparent",
    },
    "toast.warning.shadow": {
      _light: "0 4px 12px rgba(221, 107, 32, 0.15)",
      _dark: "0 4px 12px rgba(0, 0, 0, 0.3)",
    },
    // Info Toast (teal)
    "toast.info.bg": {
      _light: "#319795",
      _dark: "#319795",
    },
    "toast.info.color": {
      _light: "white",
      _dark: "white",
    },
    "toast.info.border": {
      _light: "#2C7A7B",
      _dark: "transparent",
    },
    "toast.info.shadow": {
      _light: "0 4px 12px rgba(49, 151, 149, 0.15)",
      _dark: "0 4px 12px rgba(0, 0, 0, 0.3)",
    },
    // Note preset colors - consistent across app
    "note.preset.default": {
      _light: "#E2E8F0",
      _dark: "#E2E8F0",
    },
    "note.preset.red": {
      _light: "#EF4444",
      _dark: "#EF4444",
    },
    "note.preset.grey": {
      _light: "#808080",
      _dark: "#808080",
    },
    "note.preset.black": {
      _light: "#10151C",
      _dark: "#10151C",
    },
    "note.preset.blue": {
      _light: "#3B82F6",
      _dark: "#3B82F6",
    },
    "note.preset.yellow": {
      _light: "#EAB308",
      _dark: "#EAB308",
    },
    // Interactive states
    "hover.border": {
      _light: "orange.400",
      _dark: "orange.400",
    },
    // Clock colors
    "amber": {
      _light: "#FFBF00",
      _dark: "#FFBF00",
    },
  },
};

const components = {
  Button: {
    baseStyle: {
      _focusVisible: {
        boxShadow: "none",
      },
    },
    variants: {
      primary: {
        bg: "blue.400",
        color: "white",
        _hover: { bg: "orange.400" },
        _disabled: {
          bg: "gray.400",
          _hover: { bg: "gray.400" },
        },
      },
      secondary: {
        bg: "transparent",
        color: "inherit",
        _hover: {
          bg: "gray.100",
          _dark: { bg: "gray.700" },
        },
      },
      danger: {
        bg: "red.500",
        color: "white",
        _hover: { bg: "red.600" },
        _disabled: {
          bg: "gray.400",
          _hover: { bg: "gray.400" },
        },
      },
    },
  },
  IconButton: {
    baseStyle: {
      _focusVisible: {
        boxShadow: "none",
      },
    },
  },
};

// Toast configuration - distinct styling for different severities
export const toastConfigs: ToastConfigs = {
  success: {
    containerStyle: {
      bg: "toast.success.bg",
      color: "toast.success.color",
      width: "400px",
      maxWidth: "400px",
      border: "2px solid",
      borderColor: "toast.success.border",
      boxShadow: "toast.success.shadow",
    },
  },
  error: {
    containerStyle: {
      bg: "toast.error.bg",
      color: "toast.error.color",
      width: "400px",
      maxWidth: "400px",
      border: "2px solid",
      borderColor: "toast.error.border",
      boxShadow: "toast.error.shadow",
    },
  },
  warning: {
    containerStyle: {
      bg: "toast.warning.bg",
      color: "toast.warning.color",
      width: "400px",
      maxWidth: "400px",
      border: "2px solid",
      borderColor: "toast.warning.border",
      boxShadow: "toast.warning.shadow",
    },
  },
  info: {
    containerStyle: {
      bg: "toast.info.bg",
      color: "toast.info.color",
      width: "400px",
      maxWidth: "400px",
      border: "2px solid",
      borderColor: "toast.info.border",
      boxShadow: "toast.info.shadow",
    },
  },
};

const styles = {
  global: () => ({
    body: {
      bg: "page.background",
      color: "page.text",
    },
  }),
};

const chakraTheme = extendTheme({
  config,
  colors,
  semanticTokens,
  components,
  styles,
});

export default chakraTheme;
