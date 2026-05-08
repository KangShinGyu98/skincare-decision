// Local Jest launcher that bypasses import-local lookups outside the workspace.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const localRequire = createRequire(path.resolve(__dirname, 'package.json'));
const jestPackageJson = fs.realpathSync(localRequire.resolve('jest/package.json'));
const jestCliEntry = path.join(path.dirname(jestPackageJson), '..', 'jest-cli', 'build', 'index.js');

if (process.env.NODE_ENV == null) {
  process.env.NODE_ENV = 'test';
}

const { run } = localRequire(jestCliEntry);

run();
