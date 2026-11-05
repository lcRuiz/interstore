// @ts-check
/**
 * Configuración de ESLint del frontend.
 *
 * Cada bloque traduce a reglas verificables las convenciones de CLAUDE.md
 * (las secciones se citan como §N). Si cambias una regla aquí, actualiza CLAUDE.md
 * en el mismo commit, y viceversa.
 */
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const jsdoc = require('eslint-plugin-jsdoc');
const prettier = require('eslint-config-prettier');

/** Imports prohibidos en todo el proyecto (§2 alias, §4 bindings). */
const baseRestrictedImports = {
  paths: [
    {
      name: '@angular/common',
      importNames: ['NgClass', 'NgStyle'],
      message: 'Usa [class.x] / [style.x] (CLAUDE.md §4).',
    },
  ],
  patterns: [
    {
      group: ['../../../*'],
      message: 'Usa los alias @core/*, @shared/* o @features/* (CLAUDE.md §2).',
    },
  ],
};

/** Selectores de propiedades `input()`, `input.required()`, `output()` y `model()`. */
const signalApiProperties = [
  'PropertyDefinition:has(> CallExpression.value[callee.name=/^(input|output|model)$/])',
  'PropertyDefinition:has(> CallExpression.value > MemberExpression.callee[object.name=/^(input|model)$/])',
];

module.exports = defineConfig([
  { ignores: ['dist/**', '.angular/**', 'coverage/**'] },

  // ── TypeScript ───────────────────────────────────────────────
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      angular.configs.tsRecommended,
    ],
    // Linting con información de tipos (necesario para reglas de signals y promesas).
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    processor: angular.processInlineTemplates,
    plugins: { jsdoc },
    rules: {
      // Selectores con prefijo `app` (§3).
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],

      // Componentes modernos (§4).
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/prefer-output-readonly': 'error',
      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/prefer-host-metadata-property': 'error',
      '@angular-eslint/no-uncalled-signals': 'error',
      '@angular-eslint/component-max-inline-declarations': [
        'error',
        { template: 15, styles: 20, animations: 15 },
      ],

      // Estado y RxJS (§5).
      '@angular-eslint/no-implicit-take-until-destroyed': 'error',

      // TypeScript estricto.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-imports': ['error', baseRestrictedImports],

      // Documentación (§12): TSDoc sin tipos, etiquetas válidas, API pública documentada.
      'jsdoc/no-types': 'error',
      'jsdoc/check-tag-names': ['error', { typed: true }],
      'jsdoc/check-param-names': 'error',
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: { ClassDeclaration: true, FunctionDeclaration: true },
          contexts: signalApiProperties,
        },
      ],
    },
  },

  // Stores y APIs: cada método público documentado (§12.2).
  {
    files: ['src/app/**/*-store.ts', 'src/app/**/*-api.ts'],
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: { ClassDeclaration: true, FunctionDeclaration: true },
          contexts: [
            ...signalApiProperties,
            'MethodDefinition[kind="method"][accessibility!="private"][accessibility!="protected"]',
          ],
        },
      ],
    },
  },

  // Límites entre zonas (§2).
  {
    files: ['src/app/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: baseRestrictedImports.paths,
          patterns: [
            ...baseRestrictedImports.patterns,
            {
              group: ['@features/*', '@core/layout/*', '@core/session/*'],
              message:
                'shared no depende de features ni de core (salvo tipos de @core/api) (CLAUDE.md §2).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/features/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: baseRestrictedImports.paths,
          patterns: [
            ...baseRestrictedImports.patterns,
            {
              group: ['@features/*/ui/*', '@features/*/pages/*'],
              message:
                'No importes internals de otra feature; usa su store en data-access (CLAUDE.md §2). Dentro de la misma feature usa rutas relativas.',
            },
          ],
        },
      ],
    },
  },

  // Tests: más laxos en documentación y aserciones.
  {
    files: ['**/*.spec.ts'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // ── Templates HTML (externos e inline) ──────────────────────
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // Control flow y bindings modernos (§4).
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/prefer-class-binding': 'error',
      '@angular-eslint/template/prefer-ngsrc': 'error',
      '@angular-eslint/template/no-inline-styles': ['error', { allowBindToStyle: true }],
      // Templates sin lógica (§4).
      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/no-any': 'error',
      '@angular-eslint/template/cyclomatic-complexity': ['warn', { maxComplexity: 8 }],
      // Accesibilidad (§10).
      '@angular-eslint/template/button-has-type': 'error',
    },
  },

  // Siempre al final: desactiva reglas de formato que pelean con Prettier.
  prettier,
]);
