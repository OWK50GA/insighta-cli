import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const sharedRules = {
  ...tsPlugin.configs.recommended.rules,
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
  ],
  "@typescript-eslint/explicit-function-return-type": "off",
  "@typescript-eslint/no-explicit-any": "warn",
};

export default [
  // Source files — use strict tsconfig (excludes test files)
  {
    files: ["src/**/*.ts", "bin/**/*.ts"],
    ignores: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: sharedRules,
  },
  // Test files — use tsconfig.test.json which includes test files
  {
    files: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.test.json",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: sharedRules,
  },
];
