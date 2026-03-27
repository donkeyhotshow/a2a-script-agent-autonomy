#!/usr/bin/env tsx

/**
 * CLI для валидаций и проверки симуляций протокола
 *
 * Модульная структура (`scripts/sim-validate/`):
 * - scanner.ts    - сканирование симуляций
 * - validators.ts - валидация по схемам
 * - reporters.ts  - отчёты и `main()`
 *
 * Использование:
 *   npm run sim:validate <sim-dir> [options]
 *   npm run sim:validate --all [options]
 *
 * Опции:
 *   --sim <name>       Имя симуляции для валидации
 *   --all              Валидировать все симуляции
 *   --json             Вывод в формате JSON
 *   --verbose, -v      Подробный вывод
 *   --strict           Без нормализации и с полной AJV-проверкой server-transforms-*.json
 *   --help, -h         Показать справку
 *
 * Примеры:
 *   npm run sim:validate -- --sim agent-coder/3
 *   npm run sim:validate -- --all --verbose
 *   npm run sim:validate -- --sim agent-coder/3 --json
 */

import {main} from './sim-validate/reporters.js';

main();