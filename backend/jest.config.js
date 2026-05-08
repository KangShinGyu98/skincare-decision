// Jest unit-test configuration pinned to workspace-local runner modules.
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: require.resolve('jest-environment-node'),
  runner: require.resolve('jest-runner'),
  testRunner: require.resolve('jest-circus/runner'),
  testSequencer: require.resolve('@jest/test-sequencer'),
};
