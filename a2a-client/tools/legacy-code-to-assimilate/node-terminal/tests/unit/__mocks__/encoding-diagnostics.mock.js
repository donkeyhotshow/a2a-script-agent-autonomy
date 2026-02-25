/**
 * Mock для EncodingDiagnostics
 * Предоставляет методы для диагностики и исправления проблем с кодировкой
 */

export class EncodingDiagnostics {
  constructor() { 
    this.issues = [];
    this.safeEncodings = ['utf8', 'ascii'];
  }

  /**
   * Диагностирует проблемы с кодировкой в буфере
   */
  diagnoseEncoding(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Input must be a Buffer');
    }

    const issues = [];
    
    // Проверяем на null байты
    if (buffer.includes(0x00)) {
      issues.push('null_bytes');
    }
    
    // Проверяем на не-ASCII символы
    if (buffer.some(b => b > 127)) {
      issues.push('non_ascii');
    }
    
    // Проверяем на пустой буфер
    if (buffer.length === 0) {
      issues.push('empty_buffer');
    }
    
    // Проверяем на символы замены Unicode
    const text = buffer.toString('utf8');
    if (text.includes('\uFFFD')) {
      issues.push('unicode_replacement_characters');
    }
    
    // Проверяем на невалидные UTF-8 последовательности
    try {
      buffer.toString('utf8');
    } catch (error) {
      issues.push('invalid_utf8_sequence');
    }
    
    this.issues.push(...issues);
    
    return { 
      issues, 
      encoding: this.detectEncoding(buffer),
      confidence: this.calculateConfidence(buffer, issues)
    };
  }

  /**
   * Исправляет проблемы с кодировкой в данных
   */
  fixEncodingProblems(data) {
    if (typeof data !== 'string') {
      return data;
    }
    
    // Убираем проблемные символы
    let fixed = data.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
    
    // Заменяем символы замены Unicode на знаки вопроса
    fixed = fixed.replace(/\uFFFD/g, '?');
    
    // Нормализуем Unicode
    try {
      fixed = fixed.normalize();
    } catch (error) {
      // Если нормализация не поддерживается, оставляем как есть
    }
    
    return fixed;
  }

  /**
   * Валидирует Unicode текст
   */
  validateUnicode(text) {
    if (typeof text !== 'string') {
      return false;
    }
    
    try {
      // Проверяем нормализацию
      const normalized = text.normalize();
      if (text !== normalized) {
        return false;
      }
      
      // Проверяем на символы замены
      if (text.includes('\uFFFD')) {
        return false;
      }
      
      // Проверяем на невалидные символы
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        if (charCode === 0xFFFD) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Конвертирует данные в безопасную кодировку
   */
  convertToSafeEncoding(data) {
    if (typeof data === 'string') {
      // Для строк - конвертируем в ASCII, заменяя не-ASCII символы
      return Buffer.from(data, 'utf8').toString('ascii');
    } else if (Buffer.isBuffer(data)) {
      // Для буферов - конвертируем в ASCII
      return data.toString('ascii');
    }
    
    return data;
  }

  /**
   * Определяет кодировку буфера
   */
  detectEncoding(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Input must be a Buffer');
    }
    
    // Проверяем на UTF-16 (little-endian)
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return 'utf16le';
    }
    
    // Проверяем на UTF-16 (big-endian)
    if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      return 'utf16be';
    }
    
    // Проверяем на UTF-8 BOM
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'utf8';
    }
    
    // Проверяем на null байты (признак UTF-16)
    if (buffer.includes(0x00)) {
      return 'utf16';
    }
    
    // Проверяем на не-ASCII символы
    if (buffer.some(b => b > 127)) {
      return 'utf8';
    }
    
    return 'ascii';
  }

  /**
   * Вычисляет уверенность в определении кодировки
   */
  calculateConfidence(buffer, issues) {
    if (issues.length === 0) {
      return 1.0;
    }
    
    // Чем больше проблем, тем меньше уверенность
    const baseConfidence = 1.0 - (issues.length * 0.1);
    return Math.max(0.1, baseConfidence);
  }

  /**
   * Получает список найденных проблем
   */
  getIssues() { 
    return [...this.issues]; 
  }

  /**
   * Очищает список проблем
   */
  clearIssues() {
    this.issues = [];
  }

  /**
   * Анализирует текст на проблемы с кодировкой
   */
  analyzeText(text) {
    if (typeof text !== 'string') {
      return {
        hasIssues: true,
        issues: ['Input is not a string'],
        confidence: 0.0
      };
    }
    
    const issues = [];
    
    // Проверяем на символы замены
    if (text.includes('\uFFFD')) {
      issues.push('unicode_replacement_characters');
    }
    
    // Проверяем на null символы
    if (text.includes('\u0000')) {
      issues.push('null_characters');
    }
    
    // Проверяем на невалидные Unicode символы
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      if (charCode === 0xFFFD) {
        issues.push('invalid_unicode_characters');
        break;
      }
    }
    
    // Проверяем нормализацию
    try {
      const normalized = text.normalize();
      if (text !== normalized) {
        issues.push('non_normalized_unicode');
      }
    } catch (error) {
      issues.push('unicode_normalization_error');
    }
    
    return {
      hasIssues: issues.length > 0,
      issues,
      confidence: this.calculateConfidence(Buffer.from(text, 'utf8'), issues)
    };
  }
}

export default EncodingDiagnostics;
