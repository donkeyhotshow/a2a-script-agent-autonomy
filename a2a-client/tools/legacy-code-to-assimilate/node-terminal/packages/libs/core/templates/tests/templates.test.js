const { TemplateUtils, templateUtils } = require('../index.js');
const fs = require('fs').promises;
const path = require('path');

// TODO: Создать полные тесты для TemplateUtils
describe('TemplateUtils', () => {
  let templateUtilsInstance;
  let testTemplatesDir;

  beforeEach(() => {
    templateUtilsInstance = new TemplateUtils();
    testTemplatesDir = path.join(__dirname, 'test-templates');
  });

  afterEach(async () => {
    // TODO: Очистка тестовых файлов и директорий
    try {
      // Очистка кэша
      templateUtilsInstance.templateCache.clear();
      templateUtilsInstance.compiledTemplates.clear();
    } catch (error) {
      // Игнорируем ошибки очистки
    }
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      // TODO: Протестировать инициализацию с дефолтными опциями
      expect(templateUtilsInstance).toBeDefined();
      expect(templateUtilsInstance.defaultTemplatesDir).toBe('templates');
      expect(templateUtilsInstance.maxCacheSize).toBe(100);
    });

    test('should initialize with custom options', () => {
      // TODO: Протестировать инициализацию с кастомными опциями
      const customUtils = new TemplateUtils({
        templatesDir: 'custom-templates',
        maxCacheSize: 50
      });
      expect(customUtils.defaultTemplatesDir).toBe('custom-templates');
      expect(customUtils.maxCacheSize).toBe(50);
    });
  });

  describe('renderHandlebarsTemplate', () => {
    test('should render Handlebars template', async () => {
      // TODO: Создать тестовый Handlebars шаблон и протестировать рендеринг
      // Нужно создать временный .hbs файл для тестирования
    });

    test('should handle template not found', async () => {
      // TODO: Протестировать обработку отсутствующего шаблона
      await expect(templateUtilsInstance.renderHandlebarsTemplate('nonexistent.hbs'))
        .rejects.toThrow('Шаблон Handlebars не найден');
    });

    test('should cache compiled templates', async () => {
      // TODO: Протестировать кэширование скомпилированных шаблонов
    });
  });

  describe('renderTextTemplate', () => {
    test('should render text template with variables', async () => {
      // TODO: Создать тестовый текстовый шаблон и протестировать рендеринг с переменными
      // Нужно создать временный .txt файл с плейсхолдерами {{VAR}}
    });

    test('should handle template not found', async () => {
      // TODO: Протестировать обработку отсутствующего текстового шаблона
      await expect(templateUtilsInstance.renderTextTemplate('nonexistent.txt'))
        .rejects.toThrow('Шаблон не найден');
    });

    test('should replace multiple variables', async () => {
      // TODO: Протестировать замену нескольких переменных
    });
  });

  describe('getTemplateContent', () => {
    test('should return null for non-existent template', async () => {
      // TODO: Протестировать возврат null для несуществующего шаблона
      const content = await templateUtilsInstance.getTemplateContent('nonexistent.txt');
      expect(content).toBeNull();
    });

    test('should cache template content', async () => {
      // TODO: Создать временный файл и протестировать кэширование содержимого
    });

    test('should refresh cache after timeout', async () => {
      // TODO: Протестировать обновление кэша после таймаута
    });
  });

  describe('getAllTemplates', () => {
    test('should return empty array for non-existent directory', async () => {
      // TODO: Протестировать возврат пустого массива для несуществующей директории
      const templates = await templateUtilsInstance.getAllTemplates('nonexistent-dir');
      expect(templates).toEqual([]);
    });

    test('should list all template files', async () => {
      // TODO: Создать несколько тестовых файлов шаблонов и проверить их перечисление
      // .md, .json, .txt, .hbs, .handlebars файлы
    });
  });

  describe('createTemplate', () => {
    test('should create new template file', async () => {
      // TODO: Протестировать создание нового файла шаблона
    });

    test('should return false for existing template', async () => {
      // TODO: Протестировать возврат false при попытке создать существующий шаблон
    });
  });

  describe('updateTemplate', () => {
    test('should update existing template', async () => {
      // TODO: Создать файл, обновить его и проверить изменения
    });

    test('should return false for non-existent template', async () => {
      // TODO: Протестировать возврат false при обновлении несуществующего шаблона
    });
  });

  describe('deleteTemplate', () => {
    test('should delete existing template', async () => {
      // TODO: Создать файл, удалить его и проверить удаление
    });

    test('should return false for non-existent template', async () => {
      // TODO: Протестировать возврат false при удалении несуществующего шаблона
    });
  });

  describe('cache management', () => {
    test('should manage cache size', () => {
      // TODO: Протестировать управление размером кэша
      const smallCacheUtils = new TemplateUtils({ maxCacheSize: 2 });
      // Добавить элементы сверх лимита и проверить очистку
    });

    test('should clear template cache', () => {
      // TODO: Протестировать очистку кэша шаблонов
    });
  });

  describe('_validateAgainstSchema', () => {
    test('should validate required fields', () => {
      // TODO: Протестировать валидацию обязательных полей
      const schema = { required: ['name', 'email'] };
      const validData = { name: 'John', email: 'john@example.com' };
      const invalidData = { name: 'John' };

      // Тестирование приватного метода требует рефлексии или изменения дизайна
    });

    test('should validate field types', () => {
      // TODO: Протестировать валидацию типов полей
    });

    test('should validate enum values', () => {
      // TODO: Протестировать валидацию значений enum
    });
  });

  describe('default instance', () => {
    test('should be instance of TemplateUtils', () => {
      // TODO: Проверить что templateUtils является экземпляром TemplateUtils
      expect(templateUtils).toBeInstanceOf(TemplateUtils);
    });
  });
});

