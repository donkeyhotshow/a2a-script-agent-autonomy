const path = require('path');
const JestGuard = require('./jest-guard');

const guard = new JestGuard({
  enabled: true,
  showCommands: true,
  showFileCount: true,
  customMessage: 'JestGuard активно защищает от несанкционированных запусков тестов.'
});

module.exports = {
  rootDir: path.resolve(__dirname, '../'), // Устанавливаем корневую директорию проекта (C:\apps\libs)
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'], // Удаляем .cjs
  roots: [
    "<rootDir>/app-framework",
    "<rootDir>/core",
    "<rootDir>/testing",
    "<rootDir>/standards",
    "<rootDir>/docs",
    "<rootDir>/assets",
    "<rootDir>/config",
    "<rootDir>/system",
    "<rootDir>/integrations",
    "<rootDir>/error-management"
    // Удаляем "<rootDir>/root" так как директория не найдена
  ],
  testMatch: [
    "<rootDir>/**/*.(test).js",
    "<rootDir>/**/*.(test).cjs",
    "<rootDir>/**/__tests__/**/*.(test).js",
    "<rootDir>/**/__tests__/**/*.(test).cjs"
  ],
  testPathIgnorePatterns: [
    "<rootDir>/app-framework/ui/ui/auth-composables/tests/auth-composables.test.js"
  ],
  collectCoverageFrom: [
    "<rootDir>/app-framework/**/*.js",
    "<rootDir>/app-framework/**/*.cjs",
    "<rootDir>/core/**/*.js",
    "<rootDir>/core/**/*.cjs",
    "<rootDir>/testing/**/*.js",
    "<rootDir>/testing/**/*.cjs",
    "<rootDir>/standards/**/*.js",
    "<rootDir>/standards/**/*.cjs",
    "<rootDir>/docs/**/*.js",
    "<rootDir>/docs/**/*.cjs",
    "<rootDir>/assets/**/*.js",
    "<rootDir>/assets/**/*.cjs",
    "<rootDir>/config/**/*.js",
    "<rootDir>/config/**/*.cjs",
    "<rootDir>/system/**/*.js",
    "<rootDir>/system/**/*.cjs",
    "<rootDir>/integrations/**/*.js",
    "<rootDir>/integrations/**/*.cjs",
    "<rootDir>/error-management/**/*.js",
    "<rootDir>/error-management/**/*.cjs",
    "!**/node_modules/**",
    "!**/coverage/**"
  ],
  transform: {
    '^.+\\.(js|cjs|ts)$' : ['babel-jest', { configFile: path.resolve(__dirname, '../babel.config.js') }],
    // '^.+\\.vue$': '@vue/vue3-jest' // Временно отключено из-за проблем совместимости с babel-jest@30.x
  },
  moduleFileExtensions: ['js', 'cjs', 'vue', 'ts'],
  moduleDirectories: [
    'node_modules',
    '<rootDir>/app-framework',
    '<rootDir>/core',
    '<rootDir>/testing',
    '<rootDir>/standards',
    '<rootDir>/docs',
    '<rootDir>/assets',
    '<rootDir>/config',
    '<rootDir>/system',
    '<rootDir>/integrations',
    '<rootDir>/error-management'
    // Удаляем '<rootDir>/root' из moduleDirectories
  ],
  moduleNameMapper: {
    '^@libs/(.*)$': '<rootDir>/$1',
    '^(.*)/logging-monitoring/logging$': '<rootDir>/logging-monitoring/logging/index.cjs',
    '^@root/(.*)$': '<rootDir>/root/$1' // Может быть удалено, если нет директории root
  },
  modulePathIgnorePatterns: [],
  transformIgnorePatterns: [
    "node_modules/(?!(execa|@jest)/)"
  ],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};
