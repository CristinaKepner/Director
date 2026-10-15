import tseslint from "typescript-eslint";
export default [
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "max-lines-per-function": [
        "error",
        { max: 10, skipBlankLines: false, skipComments: false, IIFEs: true },
      ],
    },
  },
  { files: ["**/*.tsx"], rules: { "max-lines": ["error", { max: 500 }] } },
];
