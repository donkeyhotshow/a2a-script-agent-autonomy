const { execSync } = require('child_process');
const path = require('path');

class JestGuard {
    constructor(options = {}) {
        this.options = {
            enabled: options.enabled !== undefined ? options.enabled : true,
            showCommands: options.showCommands !== undefined ? options.showCommands : true,
            showFileCount: options.showFileCount !== undefined ? options.showFileCount : true,
            customMessage: options.customMessage || '',
            allowedCommands: [
                'test:safe',
                'test:safe:list',
                'test:safe:run',
                '--testPathPattern',
                '--testNamePattern',
                '--runInBand',
                '-t'
            ],
            forbiddenPatterns: [
                /^jest$/,
                /^npm\s+test$/,
                /^npm\s+run\s+test$/
            ]
        };
        if (this.options.enabled) {
            this.enforceGuard();
        }
    }

    enforceGuard() {
        const command = process.argv.slice(2).join(' ');

        const isForbidden = this.options.forbiddenPatterns.some(pattern => {
            const fullCommand = process.env.npm_lifecycle_event ? `npm run ${process.env.npm_lifecycle_event}` : command;
            return pattern.test(fullCommand) || pattern.test(command);
        });

        const isAllowed = this.options.allowedCommands.some(allowedCmd => command.includes(allowedCmd));

        if (isForbidden && !isAllowed) {
            console.error('\n🚨 JestGuard: Запуск всех тестов заблокирован! 🚨');
            if (this.options.customMessage) {
                console.error(`\n${this.options.customMessage}`);
            }
            console.error('\nПочему заблокировано? Проект содержит 18+ тестовых файлов, запуск всех сразу может занять 5+ минут и перегрузить систему.');

            if (this.options.showFileCount) {
                try {
                    const testFiles = this.getTestFiles();
                    console.error(`\n📊 Обнаружено тестовых файлов: ${testFiles.length}`);
                    console.error('   Список директорий с тестами:');
                    this.getTestDirectories(testFiles).forEach(dir => console.error(`   - ${dir}`));
                } catch (error) {
                    console.error('\n⚠️ Не удалось получить информацию о тестовых файлах.', error.message);
                }
            }

            if (this.options.showCommands) {
                console.error('\n✅ Используйте разрешенные команды:');
                console.error('   - npm run test:safe             (Показать интерактивное меню всех тестов)');
                console.error('   - npm test -- tests/unit/models.test.js (Запустить конкретный тест)');
                console.error('   - npx jest --testPathPattern="unit" (Запустить все unit тесты)');
                console.error('   - npx jest --testPathPattern="integration" (Запустить все integration тесты)');
                console.error('   - npm test -- --testNamePattern="specific test name" (Запуск по паттерну имени)');
                console.error('   - npm run test:safe:list        (Показать статистику тестов)');
                console.error('   - npm run test:safe:run tests/unit/models.test.js (Запустить конкретный тест через менеджер)');
            }
            console.error('\n🚫 Для временного отключения: измените `enabled: true` на `enabled: false` в jest.config.js (НЕ ЗАБУДЬТЕ ВКЛЮЧИТЬ ОБРАТНО!)');
            process.exit(1);
        }
    }

    getTestFiles() {
        // This command assumes `grep` or `rg` is available and configured to find test files
        // Adjust if your project uses a different method to locate test files
        const command = 'rg --files --hidden -g "*{test,spec}.{js,cjs,ts}"';
        const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        return result.split('\n').filter(file => file.trim() !== '');
    }

    getTestDirectories(files) {
        const directories = new Set();
        files.forEach(file => {
            const dir = path.dirname(file);
            directories.add(dir);
        });
        return Array.from(directories).sort();
    }
}

module.exports = JestGuard;
