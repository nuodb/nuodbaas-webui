// (C) Copyright 2025-2026 Dassault Systemes SE.  All Rights Reserved.
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import reactPlugin from "eslint-plugin-react";
import tseslint from "typescript-eslint";
import pluginSecurity from "eslint-plugin-security";

export default defineConfig(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  pluginSecurity.configs.recommended,
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx,js}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      react: reactPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "react/no-danger": "error",

      "@typescript-eslint/no-explicit-any": "warn",
      "no-useless-assignment": "warn",
      "@typescript-eslint/no-wrapper-object-types": "warn",
      "@typescript-eslint/no-this-alias": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/globals": "warn",
      "react-hooks/static-components": "warn",
    },
  },
);
