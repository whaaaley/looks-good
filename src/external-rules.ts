import pluginJs from '@eslint/js'
import importPlugin from 'eslint-plugin-import-x'
import tseslint from 'typescript-eslint'
import type { Linter } from 'eslint'

// Rules from other people's plugins, configured the way this project wants them.
// The rules written here live in the plugin, which a consumer imports separately.

const base: Linter.Config[] = [
  { files: ['**/*.ts'] },
  pluginJs.configs.recommended,
]

const imports: Linter.Config[] = [
  importPlugin.flatConfigs.recommended,
  {
    rules: {
      // TypeScript resolves modules more accurately than the import plugin can.
      'import-x/no-unresolved': 0,
      'import-x/named': 0,

      'import-x/export': 'error',
      'import-x/first': 'error',
      'import-x/no-absolute-path': ['error', { esmodule: true, commonjs: true, amd: false }],
      'import-x/no-duplicates': 'error',
      'import-x/no-named-default': 'error',
      'import-x/no-named-as-default': 'error',
      'import-x/no-named-as-default-member': 'error',

      // Order is built-ins, external packages, internal modules, relative imports, then types.
      'import-x/order': ['error', {
        'newlines-between': 'never',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
          orderImportKind: 'asc',
        },
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
          'type',
        ],
      }],

      // Sort the names inside a single import declaration.
      'sort-imports': ['error', {
        ignoreDeclarationSort: true,
        allowSeparatedGroups: false,
        ignoreCase: true,
      }],
    },
  },
]

const typescript: Linter.Config[] = [
  ...tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
    },
  },
]

export const recommended: Linter.Config[] = [
  ...base,
  ...imports,
  ...typescript,
]

export default { recommended }
