import baseConfig from '@chriswa/ts-config/eslint'
import globals from 'globals'

export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: globals.node
    }
  },
  {
    ignores: ['test/expected/**', 'test/fixtures/**']
  }
]