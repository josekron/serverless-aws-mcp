module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: [
    "**/test/**/*.test.ts",
    "**/test/**/*.spec.ts",
    "**/test/**/*.test.mjs",
    "**/test/**/*.spec.mjs",
  ],
  transform: {
    "^.+\\.ts$": "ts-jest",
    "^.+\\.mjs$": "babel-jest",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "src/**/*.mjs",
    "!src/**/*.d.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.mjs",
    "!src/**/*.spec.mjs",
    "!src/**/__tests__/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testTimeout: 10000,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};
