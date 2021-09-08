module.exports = {
  root: true,
  extends: ["eslint:recommended", "eslint", "prettier"],
  parserOptions: {
    sourceType: "module",
    ecmaVersion: "latest",
  },
  env: {
    es2021: true,
    node: true,
  },
  rules: {
    "jsdoc/require-jsdoc": "off",
    "no-console": "warn",
  },
};
