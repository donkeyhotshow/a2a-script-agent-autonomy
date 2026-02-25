module.exports = {
    env: {
        browser: false,
        commonjs: true,
        es2022: true,
        node: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script' // Для CommonJS файлов
    },
    rules: {
        // Правила для CommonJS проекта
        'no-unused-vars': 'warn',
        'no-console': 'warn',
        'no-undef': 'error',
        'no-var': 'warn',
        'prefer-const': 'warn',
        'strict': ['error', 'global'],
        // Дополнительные правила для качества кода
        'prefer-arrow-callback': 'warn',
        'arrow-spacing': ['error', {'before': true, 'after': true}],
        'brace-style': ['error', '1tbs', {'allowSingleLine': true}],
        'comma-dangle': ['error', 'never'],
        'comma-spacing': ['error', {'before': false, 'after': true}],
        'eol-last': 'error',
        'indent': ['error', 2, {'SwitchCase': 1}],
        'key-spacing': ['error', {'beforeColon': false, 'afterColon': true}],
        'keyword-spacing': 'error',
        'linebreak-style': 'off', // Отключаем для Windows совместимости
        'no-multiple-empty-lines': ['warn', {'max': 2, 'maxEOF': 1}],
        'no-trailing-spaces': 'warn',
        'object-curly-spacing': ['error', 'always'],
        'quotes': ['error', 'single', {'avoidEscape': true}],
        'semi': ['error', 'always'],
        'space-before-blocks': 'error',
        'space-before-function-paren': ['error', {'anonymous': 'always', 'named': 'never', 'asyncArrow': 'always'}],
        'space-in-parens': ['error', 'never'],
        'space-infix-ops': 'error',
        'space-unary-ops': 'error',
        // Дополнительные правила для качества
        'no-redeclare': 'error', // Предупреждение о повторном объявлении
        'valid-typeof': 'error', // Проверка правильности typeof
        'no-duplicate-imports': 'error',
        'no-return-await': 'error'
    },
    overrides: [
        // Специальные правила для .cjs файлов
        {
            files: ['**/*.cjs'],
            env: {
                node: true,
                commonjs: true
            },
            rules: {
                'no-console': 'off', // В .cjs файлах console разрешен для логов
                'no-control-regex': 'off', // Разрешить управляющие символы в regex
                'no-unused-vars': 'warn' // Мягче для .cjs файлов
            }
        },
        // Специальные правила для основного сервера
        {
            files: ['mcp-server.cjs'],
            rules: {
                'no-console': 'off', // Сервер использует console для JSON ответов
                'no-redeclare': 'warn', // Разрешить переопределение console
                'no-undef': 'warn' // Мягче для сервера с динамическими импортами
            }
        },
        // Специальные правила для .js файлов (ES модули)
        {
            files: ['**/*.js'],
            parserOptions: {
                sourceType: 'module'
            },
            rules: {
                'no-console': 'warn'
            }
        },
        // Специальные правила для CLI скриптов и инструментов анализа
        {
            files: ['analyze-dependencies.js', 'fix-absolute-paths.js', 'fix-imports.js', 'check_config.js', 'cli.js', 'scripts/**/*.js', 'scripts/**/*.cjs'],
            env: {
                node: true,
                commonjs: true
            },
            rules: {
                'no-console': 'off', // CLI инструменты могут использовать console
                'prefer-const': 'warn'
            }
        },
        // Специальные правила для тестов
        {
            files: ['tests/**/*.js', 'tests/**/*.cjs'],
            env: {
                jest: true,
                node: true
            },
            rules: {
                'no-console': 'off',
                'no-control-regex': 'off' // Разрешить управляющие символы в mock файлах
            }
        },
        // Игнорировать TypeScript файлы пока нет TS линтера
        {
            files: ['**/*.ts', '**/*.tsx'],
            rules: {}
        }
    ],
    ignorePatterns: [
        'node_modules/',
        'dist/',
        'coverage/',
        '*.min.js',
        'archive/',
        'test-reports/',
        'logs/',
        'work/',
        'vitest.config.ts',
        'jest.config.js',
        'babel.config.js',
        '**/*.ts',
        '**/*.tsx'
    ]
};
