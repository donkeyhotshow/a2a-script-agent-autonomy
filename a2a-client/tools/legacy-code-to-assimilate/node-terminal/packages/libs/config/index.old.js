/**
 * Config библиотеки - управление конфигурацией
 */

// Импортируем все config модули
const loader = require('./loader');
const validator = require('./validator');
const manager = require('./manager');
const parser = require('./parser');

// Экспортируем все модули
export { // Загрузчик конфигурации
  ...loader,
  
  // Валидатор конфигурации
  ...validator,
  
  // Менеджер конфигурации
  ...manager,
  
  // Парсер конфигурации
  ...parser };
