import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import jest from "eslint-plugin-jest";
import playwright from "eslint-plugin-playwright";
import testingLibrary from "eslint-plugin-testing-library";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const CLIENT_BOUNDARY_MESSAGE =
  "Access browser capabilities through src/js/platform.ts and inject them via deps (SPEC_BUILD_TS.md §5.2).";

export default defineConfig([
  globalIgnores([
    "_site/**",
    "coverage/**",
    "node_modules/**",
    ".cache/**",
    "playwright-report/**",
    "test-results/**",
    "_11ty/__fixtures__/**",
  ]),

  // ---------- Base: all TypeScript ----------
  {
    files: ["**/*.ts"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      comments.recommended,
      unicorn.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      // Correctness
      eqeqeq: ["error", "always"],
      "no-console": "error",
      "no-param-reassign": "error",
      "prefer-const": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          fixStyle: "separate-type-imports",
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",

      // Security
      "no-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",

      // Keep functions small enough to test every branch
      complexity: ["error", 10],
      "max-depth": ["error", 3],
      "max-params": ["error", 3],

      // Node type stripping only supports erasable syntax (SPEC_BUILD_TS.md §2)
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message: "Use an `as const` object and a union type instead of enum.",
        },
        {
          selector: "TSModuleDeclaration[kind!='global']",
          message: "Namespaces are not erasable; use ES modules.",
        },
        {
          selector: "TSParameterProperty",
          message: "Parameter properties are not erasable; declare fields explicitly.",
        },
      ],

      // Every disable comment must say why
      "@eslint-community/eslint-comments/require-description": [
        "error",
        {
          ignore: [],
        },
      ],
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
    },
  },

  // ---------- Build code (Node) ----------
  {
    files: ["eleventy.config.ts", "_11ty/**/*.ts", "src/**/*.11ty.ts", "playwright.config.ts"],
    languageOptions: { globals: globals.node },
  },

  // ---------- Client code (browser), excluding tests ----------
  {
    files: ["src/js/**/*.ts"],
    ignores: ["**/*.test.ts"],
    languageOptions: { globals: globals.browser },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*"],
              message: "Client code cannot import Node built-ins.",
            },
          ],
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "document",
          property: "write",
          message: "Never use document.write.",
        },
        {
          object: "document",
          property: "writeln",
          message: "Never use document.writeln.",
        },
        {
          object: "navigator",
          property: "clipboard",
          message: CLIENT_BOUNDARY_MESSAGE,
        },
        {
          object: "window",
          property: "localStorage",
          message: CLIENT_BOUNDARY_MESSAGE,
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "localStorage", message: CLIENT_BOUNDARY_MESSAGE },
        { name: "sessionStorage", message: CLIENT_BOUNDARY_MESSAGE },
        { name: "fetch", message: CLIENT_BOUNDARY_MESSAGE },
        { name: "matchMedia", message: CLIENT_BOUNDARY_MESSAGE },
        { name: "IntersectionObserver", message: CLIENT_BOUNDARY_MESSAGE },
        { name: "ResizeObserver", message: CLIENT_BOUNDARY_MESSAGE },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message: "Use an `as const` object and a union type instead of enum.",
        },
        {
          selector: "TSModuleDeclaration[kind!='global']",
          message: "Namespaces are not erasable; use ES modules.",
        },
        {
          selector: "TSParameterProperty",
          message: "Parameter properties are not erasable; declare fields explicitly.",
        },
        {
          selector:
            "AssignmentExpression > MemberExpression.left[property.name=/^(innerHTML|outerHTML)$/]",
          message:
            "Build nodes with the DOM API or parse with DOMParser and adopt nodes. No HTML string sinks.",
        },
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: "No HTML string sinks. Use insertAdjacentElement or the DOM API.",
        },
        {
          selector:
            "AssignmentExpression > MemberExpression.left[object.name=/^(window|globalThis|self)$/]",
          message: "No globals. Export functions and import them (SPEC_BUILD_TS.md §5.3).",
        },
      ],
    },
  },

  // platform.ts is the single place allowed to touch browser capability globals
  {
    files: ["src/js/platform.ts"],
    rules: {
      "no-restricted-globals": "off",
      "no-restricted-properties": "off",
    },
  },

  // ---------- Unit and integration tests (Jest) ----------
  {
    files: ["**/*.test.ts"],
    extends: [jest.configs["flat/recommended"], jest.configs["flat/style"]],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      "jest/no-focused-tests": "error",
      "jest/no-disabled-tests": "error",
      "jest/expect-expect": "error",
      "jest/no-conditional-expect": "error",
      "jest/no-conditional-in-test": "error",
      "jest/valid-title": "error",
      "jest/prefer-each": "error",
      "jest/no-restricted-jest-methods": [
        "error",
        {
          mock: "Do not mock in-repo modules. Inject boundaries instead (SPEC_TEST_TS.md §6.3).",
        },
      ],
      "@typescript-eslint/unbound-method": "off",
      "jest/unbound-method": "error",
      "@typescript-eslint/no-non-null-assertion": "off",
      "max-params": "off",
    },
  },
  {
    files: ["src/js/**/*.test.ts", "tests/integration/enhance/**/*.test.ts"],
    extends: [testingLibrary.configs["flat/dom"]],
    rules: {
      "testing-library/prefer-screen-queries": "error",
      "testing-library/prefer-user-event": "error",
      "testing-library/no-node-access": [
        "error",
        {
          allowContainerFirstChild: false,
        },
      ],
    },
  },

  // ---------- Visual tests (Playwright) ----------
  {
    files: ["tests/visual/**/*.ts"],
    extends: [playwright.configs["flat/recommended"]],
    languageOptions: { globals: globals.node },
    rules: {
      "playwright/no-focused-test": "error",
      "playwright/no-skipped-test": "error",
      "playwright/no-wait-for-timeout": "error",
      "playwright/no-networkidle": "error",
      "playwright/prefer-web-first-assertions": "error",
    },
  },

  // ---------- Plain JS (build + client, until TypeScript conversion) ----------
  {
    files: ["**/*.js"],
    extends: [
      js.configs.recommended,
      tseslint.configs.disableTypeChecked,
      comments.recommended,
      unicorn.configs.recommended,
    ],
    languageOptions: { globals: globals.node },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      "@eslint-community/eslint-comments/require-description": [
        "error",
        {
          ignore: [],
        },
      ],
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
    },
  },
  {
    files: [".eleventy.js", "_11ty/**/*.js", "src/**/*.js", "eslint.config.js", "jest.config.js"],
    ignores: ["**/*.test.js", "src/js/**/*.js"],
    rules: {
      eqeqeq: ["error", "always"],
      "no-console": "error",
      "no-param-reassign": "error",
      "prefer-const": "error",
      "no-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      complexity: ["error", 10],
      "max-depth": ["error", 3],
      "max-params": ["error", 3],
    },
  },
  {
    files: ["src/js/**/*.js"],
    languageOptions: { globals: globals.browser },
    rules: {
      eqeqeq: ["error", "always"],
      "no-console": "error",
      "no-param-reassign": "error",
      "prefer-const": "error",
      "no-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      complexity: ["error", 10],
      "max-depth": ["error", 3],
      "max-params": ["error", 3],
      // Classic deferred scripts until Phase 9 (module contract + platform.ts).
      "unicorn/prefer-module": "off",
      "unicorn/no-global-object-property-assignment": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "AssignmentExpression > MemberExpression.left[property.name=/^(innerHTML|outerHTML)$/]",
          message:
            "Build nodes with the DOM API or parse with DOMParser and adopt nodes. No HTML string sinks.",
        },
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: "No HTML string sinks. Use insertAdjacentElement or the DOM API.",
        },
      ],
    },
  },
  {
    files: ["tests/unit/**/*.test.js"],
    extends: [jest.configs["flat/recommended"], jest.configs["flat/style"]],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      "jest/no-focused-tests": "error",
      "jest/no-disabled-tests": "error",
      "jest/expect-expect": "error",
      "jest/no-conditional-expect": "error",
      "jest/no-conditional-in-test": "error",
      "jest/valid-title": "error",
      "jest/prefer-each": "error",
      "max-params": "off",
    },
  },

  // Must be last: turns off every rule that conflicts with Prettier
  prettier,
]);
