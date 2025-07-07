import { extendTheme } from '@chakra-ui/react';

// Chakra Config
const config = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

const colors = {
  blue: {400: '#6495ED'},
  orange: {400: '#e79e40'}
}

const semanticTokens = {
  colors: {
    'page.background': {
      _light: 'gray.50',
      _dark: 'gray.1000',
    },
    'page.text': {
      _light: 'gray.800',
      _dark: 'whiteAlpha.900',
    },
    'ui.border': {
        _light: 'gray.200',
        _dark: 'whiteAlpha.300',
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