import type { Config } from 'jest';

const config: Config = {
  displayName: 'Regression Tests',
  testMatch: ['<rootDir>/test/suites/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        target: 'ES2021',
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        strictNullChecks: false,
        noImplicitAny: false,
        skipLibCheck: true,
      },
    }],
  },
  moduleNameMapper: {
    '@shared/(.*)': '<rootDir>/../../packages/shared/src/$1',
  },
  globalSetup: '<rootDir>/test/global.setup.ts',
  globalTeardown: '<rootDir>/test/global.teardown.ts',
  // Run suites sequentially — later suites reuse IDs created by earlier ones
  runInBand: true,
  testTimeout: 30_000,
  verbose: true,
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test/reports',
        filename: 'regression-report.html',
        pageTitle: 'Workforce Platform — Regression Test Report',
        expand: true,
        hideIcon: false,
        testCaseFormat: '{title}',
      },
    ],
  ],
};

export default config;
