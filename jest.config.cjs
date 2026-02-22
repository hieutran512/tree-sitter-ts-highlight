/** @type {import('jest').Config} */
module.exports = {
  transform: {
    "^.+\\.tsx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
          },
          target: "es2022",
        },
        module: {
          type: "es6",
        },
      },
    ],
  },
  extensionsToTreatAsEsm: [".ts"],
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
