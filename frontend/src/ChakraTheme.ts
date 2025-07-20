import { extendTheme } from '@chakra-ui/react';

// TypeScript interfaces
interface ToastConfig {
  containerStyle: {
    bg: string;
    color: string;
    width: string;
    maxWidth: string;
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

// Toast configuration - use this for consistent toast styling
export const toastConfig: ToastConfig = {
  containerStyle: {
    bg: 'blue.400',
    color: 'white',
    width: '400px',
    maxWidth: '400px',
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