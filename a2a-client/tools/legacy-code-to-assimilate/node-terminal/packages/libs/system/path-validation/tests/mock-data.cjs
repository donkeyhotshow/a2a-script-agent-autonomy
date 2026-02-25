const path = require('path');

module.exports = {
  ALLOWED_PATH_CATEGORIES: {
    TESTS: {
      patterns: [/^tests\//, /^test\//, /\.test\.js$/, /\.spec\.js$/],
      description: 'Тесты'
    },
    BUILD_DIST: {
      patterns: [/^build\//, /^dist\//, /^out\//],
      description: 'Сборки и дистрибутивы'
    },
    DOCS_CONFIG: {
      patterns: [/^docs\//, /^config\//, /^\.env/, /^package\.json$/],
      description: 'Документация и конфигурация'
    },
    SOURCE_CODE: {
      patterns: [/^libs\//, /^app\//, /\.js$/, /\.ts$/],
      description: 'Исходный код'
    },
    WORKSPACE: {
      patterns: [/^workspace\//, /^project\//, /^src\//],
      description: 'Рабочая область проекта'
    },
    TEMP_LOGS: {
      patterns: [/^tmp\//, /^temp\//, /^logs\//, /\.log$/],
      description: 'Временные файлы и логи'
    },
    WORK_REPORTS: {
      patterns: [/^work\//, /^reports\//, /^output\//],
      description: 'Рабочие отчеты'
    },
    ARCHIVE: {
      patterns: [/^archive\//, /^backup\//, /\.zip$/, /\.tar\.gz$/],
      description: 'Архивы'
    }
  },
  FORBIDDEN_PATH_PATTERNS: [
    /\/etc\//,
    /\/usr\/bin\//,
    /\/bin\//,
    /\/sbin\//,
    /\/var\/log\//,
    /\/proc\//,
    /\/sys\//,
    /\/dev\//,
    /\/root\//,
    /\/home\/[^\/]+\/\.ssh\//,
    /\/\.\.\//,
    /^[a-zA-Z]:\//
  ]
};
