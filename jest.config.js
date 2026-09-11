const config = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.js"],
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
  watchman: false,
  clearMocks: true,
  restoreMocks: true,
};

export default config;
