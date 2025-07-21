import { extendTheme } from '@chakra-ui/react';

// TypeScript interfaces
interface ToastConfig {
  containerStyle: {
    bg: string;
    color: string;
    width: string;
    maxWidth: string;
    border: string;
    borderColor: string;
    boxShadow: string;
  };
}

// Chakra Config
const config = {
  initialColorMode: 'system' as const,
  useSystemColorMode: true,
};

const colors = {
  blue: { 400: '#6495ED' },
  orange: { 400: '#e79e40' }
}

const semanticTokens = {
  colors: {
    'page.background': {
      _light: 'gray.50',
      _dark: 'gray.800',
    },
    'page.text': {
      _light: 'gray.800',
      _dark: 'whiteAlpha.900',
    },
    'detail.text': {
      _light: 'gray.600',
      _dark: 'gray.400',
    },
    'ui.border': {
      _light: 'gray.200',
      _dark: 'whiteAlpha.300',
    },
    'container.border': {
      _light: 'gray.600',
      _dark: 'gray.300',
    },
    'toast.bg': {
      _light: '#6495ED',
      _dark: '#6495ED',
    },
    'toast.color': {
      _light: 'white',
      _dark: 'white',
    },
    'toast.border': {
      _light: '#4169E1',
      _dark: 'transparent',
    },
    'toast.shadow': {
      _light: '0 4px 12px rgba(100, 149, 237, 0.15)',
      _dark: '0 4px 12px rgba(0, 0, 0, 0.3)',
    }
  },
};

const components = {
  Button: {
    baseStyle: {
      _focusVisible: {
        boxShadow: 'none',
      },
    },
  },
  IconButton: {
    baseStyle: {
      _focusVisible: {
        boxShadow: 'none',
      },
    },
  },
};

// Toast configuration - distinct styling for light/dark modes with same colors
export const toastConfig: ToastConfig = {
  containerStyle: {
    bg: 'toast.bg',
    color: 'toast.color',
    width: '400px',
    maxWidth: '400px',
    border: '2px solid',
    borderColor: 'toast.border',
    boxShadow: 'toast.shadow',
  },
};

const styles = {
  global: () => ({
    body: {
      bg: 'page.background',
      color: 'page.text',
    },
  }),
};

const chakraTheme = extendTheme({ config, colors, semanticTokens, components, styles });

export default chakraTheme;