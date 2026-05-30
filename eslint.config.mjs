import nextConfig from "eslint-config-next";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = [
  ...nextConfig,
  prettierConfig,
  {
    rules: {
      "no-unused-vars": "off",
      // The repo has existing React Compiler diagnostics in older UI
      // surfaces. Keep lint usable while those files are refactored
      // behind focused tests.
      "react-hooks/refs": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/set-state-in-effect": "off",
      // Import ordering (replaces @ianvs/prettier-plugin-sort-imports). The
      // `import` plugin ships with eslint-config-next; `eslint --fix` sorts.
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          "newlines-between": "never",
          alphabetize: { order: "asc", caseInsensitive: true }
        }
      ]
    }
  }
];

export default eslintConfig;
