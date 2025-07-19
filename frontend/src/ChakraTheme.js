import { extendTheme } from '@chakra-ui/react';

// Chakra Config
const config = {
  initialColorMode: 'system',
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
  Alert: {
    baseStyle: {
      container: {
        width: '400px',
        maxWidth: '400px',
      },
    },
    variants: {
      'left-accent': {
        container: {
          bg: 'blue.400',
          color: 'white',
          width: '400px',
          maxWidth: '400px',
        },
      },
      'top-accent': {
        container: {
          bg: 'blue.400',
          color: 'white',
          width: '400px',
          maxWidth: '400px',
        },
      },
      'solid': {
        container: {
          bg: 'blue.400',
          color: 'white',
          width: '400px',
          maxWidth: '400px',
        },
      },
    },
  },
};

const styles = {
  global: (props) => ({
    body: {
      bg: 'page.background',
      color: 'page.text',
    },
  }),
};

const chakraTheme = extendTheme({ config, colors, semanticTokens, components, styles });

export default chakraTheme;