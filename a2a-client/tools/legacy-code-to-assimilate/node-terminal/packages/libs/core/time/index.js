/**
 * Unified Time Utilities Library
 * Объединенная библиотека утилит времени
 */

const { format } = require('date-fns');

class TimeUtils {
  /**
   * Форматирование временной метки для логов
   */
  formatLogTimestamp(date = new Date()) {
    return format(date, 'yyyy-MM-dd HH:mm:ss.SSS');
  }

  /**
   * Форматирование времени
   */
  formatTime(ms, format = 'auto') {
    if (format === 'auto') {
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
      if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
      return `${(ms / 3600000).toFixed(2)}h`;
    }
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (format === 'detailed') {
      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours % 24 > 0) parts.push(`${hours % 24}h`);
      if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
      if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);
      return parts.join(' ') || '0s';
    }
    
    return `${seconds}s`;
  }

  /**
   * Форматирование даты
   */
  formatDate(date, format = 'ISO') {
    const d = new Date(date);
    
    switch (format) {
      case 'ISO':
        return d.toISOString();
      case 'short':
        return d.toLocaleDateString();
      case 'long':
        return d.toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      case 'filename':
        return d.toISOString().replace(/[:.]/g, '-').split('T')[0];
      default:
        return d.toISOString();
    }
  }

  /**
   * Возвращает количество дней между двумя датами
   */
  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Добавляет дни к дате
   */
  addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * Асинхронная задержка
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получение текущего времени в миллисекундах
   */
  now() {
    return Date.now();
  }

  /**
   * Получение текущей даты
   */
  currentDate() {
    return new Date();
  }

  /**
   * Проверка, является ли дата валидной
   */
  isValidDate(date) {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
  }

  /**
   * Получение разницы между двумя датами в миллисекундах
   */
  timeDiff(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs(d2 - d1);
  }

  /**
   * Форматирование продолжительности
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}д ${hours % 24}ч ${minutes % 60}м`;
    } else if (hours > 0) {
      return `${hours}ч ${minutes % 60}м ${seconds % 60}с`;
    } else if (minutes > 0) {
      return `${minutes}м ${seconds % 60}с`;
    } else {
      return `${seconds}с`;
    }
  }
}

const timeUtils = new TimeUtils();
export { TimeUtils, timeUtils };
