const shared = {
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: false },
          target: "es2022",
          experimental: { keepImportAttributes: true },
        },
        module: { type: "es6" },
      },
    ],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  restoreMocks: true,
};

const config = {
  watchman: false,
  collectCoverageFrom: [
    "_11ty/**/*.ts",
    "src/**/*.11ty.ts",
    "src/js/**/*.ts",
    "!src/js/entries/**",
    "!**/*.test.ts",
    "!**/*.d.ts",
    "!**/types.ts",
  ],
  coverageReporters: ["text", "text-summary", "lcov", "html"],
  coverageThreshold: {
    global: { branches: 90, functions: 90, lines: 90, statements: 90 },
    "./src/js/**/*.ts": { branches: 80, functions: 80, lines: 80, statements: 80 },
    "./_11ty/*.ts": { branches: 80, functions: 80, lines: 80, statements: 80 },
    "./src/*.11ty.ts": { branches: 80, functions: 80, lines: 80, statements: 80 },
    "./src/css/*.11ty.ts": { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  projects: [
    {
      ...shared,
      displayName: "node",
      testEnvironment: "node",
      testMatch: [
        "<rootDir>/tests/unit/**/*.test.js",
        "<rootDir>/tests/integration/js/**/*.test.js",
      ],
    },
    {
      ...shared,
      displayName: "client",
      testEnvironment: "jsdom",
      testEnvironmentOptions: { url: "http://localhost:8080/" },
      testMatch: ["<rootDir>/src/js/**/*.test.ts"],
      setupFilesAfterEnv: ["<rootDir>/tests/setup/dom.ts"],
    },
    {
      ...shared,
      displayName: "enhance",
      testEnvironment: "jsdom",
      testEnvironmentOptions: { url: "http://localhost:8080/" },
      testMatch: ["<rootDir>/tests/integration/enhance/**/*.test.ts"],
      globalSetup: "<rootDir>/tests/setup/build-site.ts",
      setupFilesAfterEnv: ["<rootDir>/tests/setup/dom.ts"],
    },
  ],
};

export default config;
