// Jest e2e configuration pinned to workspace-local runner modules.
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: require.resolve('jest-environment-node'),
  runner: require.resolve('jest-runner'),
  testRunner: require.resolve('jest-circus/runner'),
  testSequencer: require.resolve('@jest/test-sequencer'),
};
