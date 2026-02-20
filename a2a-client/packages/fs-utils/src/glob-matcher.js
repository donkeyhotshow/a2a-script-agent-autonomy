/**
 * Glob Matcher
 * 
 * Утилита для матчинга glob паттернов с поддержкой Windows путей
 */

class GlobMatcher {
  constructor(patterns = []) {
    this.patterns = Array.isArray(patterns) ? patterns : [patterns];
    this.compiledPatterns = this.patterns.map(p => this.compilePattern(p));
  }
  
  /**
   * Компиляция glob паттерна в RegExp
   */
  compilePattern(pattern) {
    // Используем более простой подход - конвертируем glob в regex вручную
    let regexStr = '';
    let i = 0;
    
    while (i < pattern.length) {
      const char = pattern[i];
      
      if (char === '*' && pattern[i + 1] === '*') {
        // ** - любой путь (включая подпапки)
        if (pattern[i + 2] === '/') {
          // **/ - ноль или более директорий
          regexStr += '(?:.*[/\\\\])?';
          i += 3;
        } else {
          // ** в конце - любой путь
          regexStr += '.*';
          i += 2;
        }
      } else if (char === '*') {
        // * - любой файл в текущей директории
        regexStr += '[^/\\\\]*';
        i++;
      } else if (char === '/') {
        // / соответствует / или \
        regexStr += '[/\\\\]';
        i++;
      } else if ('.+?^${}()|[]\\'.includes(char)) {
        // Экранируем специальные regex символы
        regexStr += '\\' + char;
        i++;
      } else {
        regexStr += char;
        i++;
      }
    }
    
    // Добавляем якоря
    regexStr = '^' + regexStr + '$';
    
    return {
      pattern,
      regex: new RegExp(regexStr, 'i')  // i для case-insensitive на Windows
    };
  }
  
  /**
   * Проверка соответствия пути паттерну
   */
  match(filePath) {
    // Нормализуем путь (заменяем \ на / для консистентности)
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    return this.compiledPatterns.some(({ regex }) => regex.test(normalizedPath));
  }
  
  /**
   * Статический метод для быстрого матчинга
   */
  static match(pattern, filePath) {
    const matcher = new GlobMatcher(pattern);
    return matcher.match(filePath);
  }
  
  /**
   * Получить все совпадающие паттерны для пути
   */
  getMatchingPatterns(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    return this.compiledPatterns
      .filter(({ regex }) => regex.test(normalizedPath))
      .map(({ pattern }) => pattern);
  }
}

// Предустановленные паттерны для разных типов файлов
GlobMatcher.PATTERNS = {
  PHP: ['**/*.php'],
  JS: ['**/*.js', '**/*.mjs', '**/*.cjs'],
  TS: ['**/*.ts', '**/*.tsx'],
  VUE: ['**/*.vue'],
  JSON: ['**/*.json'],
  MD: ['**/*.md'],
  CODE: ['**/*.php', '**/*.js', '**/*.ts', '**/*.tsx', '**/*.vue', '**/*.py', '**/*.java', '**/*.go'],
  CONFIG: ['**/*.json', '**/*.yaml', '**/*.yml', '**/*.toml', '**/*.ini'],
  
  // Паттерны для исключения
  EXCLUDE: [
    'node_modules/**',
    'vendor/**',
    '.git/**',
    'dist/**',
    'build/**',
    'storage/**',
    '.a2a/**',
    '**/*.min.js',
    '**/*.min.css'
  ]
};

module.exports = GlobMatcher;
