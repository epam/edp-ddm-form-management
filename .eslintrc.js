module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'max-len': ['error', { code: 120, ignoreComments: true }],
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    'class-methods-use-this': 'off',
    'no-underscore-dangle': 'off',
    // TODO: Disabled due poor code quality of original project
    'consistent-return': 'off',
    'no-param-reassign': 'off',
    'global-require': 'off',
    'prefer-rest-params': 'off',
    'no-shadow': 'off',
    'no-prototype-builtins': 'off',
    'prefer-promise-reject-errors': 'off',
    'prefer-spread': 'off',
    'func-names': 'off',
    'no-multi-assign': 'off',
    'linebreak-style': 'off',
  },
};
