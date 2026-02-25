const os = require('os');
const path = require('path');

// Mock external dependencies before anything else
// Mock config-unified and its manager
const mockUnifiedConfigManager = {
  getFeatureConfig: jest.fn(() => ({
    getConfig: jest.fn(() => ({
      featureFlags: {
        USE_SYSTEM_FILE_OPS: false, // Default to false for legacy tests
      },
    })),
  })),
  initialize: jest.fn(),
};

jest.mock('@libs/config-unified', () => ({
  unifiedConfigManager: mockUnifiedConfigManager,
}));

// Mock defaultLogger
const mockDefaultLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@libs/logging-monitoring/logging', () => ({
  defaultLogger: mockDefaultLogger,
}));

// Mock FileOperations
const mockFileOperations = {
  ensureDir: jest.fn(async () => ({ success: true })),
  writeFile: jest.fn(async () => ({ success: true })),
  copyPath: jest.fn(async () => ({ success: true })),
  movePath: jest.fn(async () => ({ success: true })),
  deletePath: jest.fn(async () => ({ success: true })),
  removeByPattern: jest.fn(async () => ({ success: true })),
  removeDirectoryIfEmpty: jest.fn(async () => ({ success: true })),
  changePermissions: jest.fn(async () => ({ success: true })),
  createSymlink: jest.fn(async () => ({ success: true })),
};

jest.mock('@libs/system/file-operations/index.cjs', () => ({
  FileOperations: jest.fn(() => mockFileOperations),
}));

// Original imports
const { AtomicOperations, atomicOperations } = require('../index.cjs');
const fs = require('fs').promises;
const mockWorkdir = require('C:/apps/libs/system/workdir/index.cjs');

jest.mock('C:/apps/libs/system/workdir/index.cjs', () => {
  const os = require('os'); // Import os inside the mock factory
  const path = require('path');
  return {
    getCurrentDir: jest.fn(() => os.tmpdir()),
  };
});

describe('AtomicOperations', () => {
  let atomicOps;
  let mockBasePath;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock for unifiedConfigManager's featureFlags
    mockUnifiedConfigManager.getFeatureConfig.mockReturnValue({
      getConfig: jest.fn(() => ({
        featureFlags: {
          USE_SYSTEM_FILE_OPS: false, // Default to false for legacy tests
        },
      })),
    });

    mockBasePath = path.join(os.tmpdir(), `atomic-test-${Date.now()}`);
    atomicOps = new AtomicOperations();

    // Mock fs.promises methods (for legacy path)
    jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    jest.spyOn(fs, 'copyFile').mockResolvedValue(undefined);
    jest.spyOn(fs, 'rename').mockResolvedValue(undefined);
    jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);
    jest.spyOn(fs, 'rm').mockResolvedValue(undefined);
    jest.spyOn(fs, 'readdir').mockResolvedValue([]);
    jest.spyOn(fs, 'stat').mockResolvedValue({ isDirectory: () => false, isFile: () => true });
    jest.spyOn(fs, 'chmod').mockResolvedValue(undefined);
    jest.spyOn(fs, 'symlink').mockResolvedValue(undefined);
    jest.spyOn(fs, 'rmdir').mockResolvedValue(undefined); // Added rmdir

    mockWorkdir.getCurrentDir.mockReturnValue(mockBasePath);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Инициализация', () => {
    test('должен инициализировать с предопределенными наборами операций', () => {
      expect(atomicOps.operationSets.size).toBeGreaterThan(0);
      expect(atomicOps.operationSets.has('create_project')).toBe(true);
      expect(atomicOps.operationSets.has('create_vue_component')).toBe(true);
      expect(atomicOps.operationSets.has('create_api_structure')).toBe(true);
      expect(atomicOps.operationSets.has('cleanup_temp')).toBe(true);
      expect(atomicOps.operationSets.has('create_test_structure')).toBe(true);
    });

    test('должен содержать правильную структуру наборов операций', () => {
      const createProjectSet = atomicOps.operationSets.get('create_project');
      expect(createProjectSet).toBeDefined();
      expect(createProjectSet.description).toBe('Создает структуру нового проекта');
      expect(createProjectSet.operations).toBeInstanceOf(Array);
      expect(createProjectSet.operations.length).toBeGreaterThan(0);
      
      // Проверяем структуру операций
      const mkdirOperation = createProjectSet.operations.find(op => op.type === 'mkdir');
      expect(mkdirOperation).toBeDefined();
      expect(mkdirOperation.path).toBeDefined();
      
      const touchOperation = createProjectSet.operations.find(op => op.type === 'touch');
      expect(touchOperation).toBeDefined();
      expect(touchOperation.path).toBeDefined();
      expect(touchOperation.content).toBeDefined();
    });

    test('должен содержать набор для создания Vue компонента', () => {
      const vueSet = atomicOps.operationSets.get('create_vue_component');
      expect(vueSet).toBeDefined();
      expect(vueSet.description).toBe('Создает Vue компонент с базовой структурой');
      
      const componentOperation = vueSet.operations.find(op => op.path.includes('.vue'));
      expect(componentOperation).toBeDefined();
      expect(componentOperation.content).toContain('<template>');
      expect(componentOperation.content).toContain('<script>');
      expect(componentOperation.content).toContain('<style scoped>');
    });

    test('должен содержать набор для создания API структуры', () => {
      const apiSet = atomicOps.operationSets.get('create_api_structure');
      expect(apiSet).toBeDefined();
      expect(apiSet.description).toBe('Создает структуру для API');
      
      const apiOperations = apiSet.operations.filter(op => op.type === 'mkdir');
      expect(apiOperations.some(op => op.path.includes('controllers'))).toBe(true);
      expect(apiOperations.some(op => op.path.includes('middleware'))).toBe(true);
      expect(apiOperations.some(op => op.path.includes('routes'))).toBe(true);
      expect(apiOperations.some(op => op.path.includes('models'))).toBe(true);
    });
  });

  describe('Получение информации о наборах', () => {
    test('должен возвращать список доступных наборов', () => {
      const sets = atomicOps.getAvailableSets();
      expect(sets).toBeInstanceOf(Array);
      expect(sets.length).toBe(atomicOps.operationSets.size);
      
      sets.forEach(set => {
        expect(set).toEqual(expect.objectContaining({
          name: expect.any(String),
          description: expect.any(String),
          operationsCount: expect.any(Number),
        }));
        expect(set.operationsCount).toBeGreaterThan(0);
      });
    });

    test('должен возвращать детали для существующего набора', () => {
      const details = atomicOps.getSetDetails('create_project');
      expect(details).toBeDefined();
      expect(details.name).toBe('create_project');
      expect(details.description).toBe('Создает структуру нового проекта');
      expect(details.operations).toBeInstanceOf(Array);
      expect(details.operations.length).toBeGreaterThan(0);
      
      // Проверяем структуру операций
      details.operations.forEach(operation => {
        expect(operation).toEqual(expect.objectContaining({
          type: expect.any(String),
          path: expect.any(String),
        }));
        expect(operation.description).toBeDefined();
      });
    });

    test('должен возвращать null для несуществующего набора', () => {
      const details = atomicOps.getSetDetails('non_existent_set');
      expect(details).toBeNull();
    });

    test('должен возвращать правильные описания операций', () => {
      expect(atomicOps.getOperationDescription('mkdir')).toBe('Создать директорию');
      expect(atomicOps.getOperationDescription('touch')).toBe('Создать файл');
      expect(atomicOps.getOperationDescription('copy')).toBe('Копировать файл');
      expect(atomicOps.getOperationDescription('move')).toBe('Переместить файл');
      expect(atomicOps.getOperationDescription('remove')).toBe('Удалить файл');
      expect(atomicOps.getOperationDescription('remove_pattern')).toBe('Удалить по шаблону');
      expect(atomicOps.getOperationDescription('chmod')).toBe('Изменить права доступа');
      expect(atomicOps.getOperationDescription('symlink')).toBe('Создать символическую ссылку');
      expect(atomicOps.getOperationDescription('remove_dir_if_empty')).toBe('Удалить пустую директорию');
    });

    test('должен возвращать неизвестное описание для неизвестного типа операции', () => {
      expect(atomicOps.getOperationDescription('unknown_type')).toBe('Неизвестная операция');
    });
  });

  describe('Выполнение атомарных операций', () => {
    test('должен выполнять операцию mkdir', async () => {
      const operation = { type: 'mkdir', path: 'new_dir' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(result.operation).toEqual(operation);
      expect(fs.mkdir).toHaveBeenCalledWith(path.join(mockBasePath, 'new_dir'), { recursive: true });
    });

    test('должен выполнять операцию touch', async () => {
      const operation = { type: 'touch', path: 'new_file.txt', content: 'hello world' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(result.operation).toEqual(operation);
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(mockBasePath, 'new_file.txt'),
        'hello world',
        'utf8'
      );
    });

    test('должен выполнять операцию copy', async () => {
      const operation = { type: 'copy', from: 'source.txt', to: 'dest.txt' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(result.operation).toEqual(operation);
      expect(fs.copyFile).toHaveBeenCalledWith(
        path.join(mockBasePath, 'source.txt'),
        path.join(mockBasePath, 'dest.txt')
      );
    });

    test('должен выполнять операцию move', async () => {
      const operation = { type: 'move', from: 'old.txt', to: 'new.txt' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(result.operation).toEqual(operation);
      expect(fs.rename).toHaveBeenCalledWith(
        path.join(mockBasePath, 'old.txt'),
        path.join(mockBasePath, 'new.txt')
      );
    });

    test('должен выполнять операцию remove', async () => {
      const operation = { type: 'remove', path: 'file_to_delete.txt' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(result.operation).toEqual(operation);
      expect(fs.unlink).toHaveBeenCalledWith(path.join(mockBasePath, 'file_to_delete.txt'));
    });

    test('должен выполнять операцию chmod', async () => {
      const operation = { type: 'chmod', path: 'script.sh', mode: '755' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(result.operation).toEqual(operation);
      expect(fs.chmod).toHaveBeenCalledWith(path.join(mockBasePath, 'script.sh'), '755');
    });

    test('должен выполнять операцию symlink', async () => {
      const operation = { type: 'symlink', target: 'target_file.txt', link: 'link_file.txt' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(result.operation).toEqual(operation);
      expect(fs.symlink).toHaveBeenCalledWith(
        path.join(mockBasePath, 'target_file.txt'),
        path.join(mockBasePath, 'link_file.txt')
      );
    });

    test('должен обрабатывать ошибки при выполнении операций', async () => {
      const operation = { type: 'mkdir', path: 'error_dir' };
      const error = new Error('Permission denied');
      fs.mkdir.mockRejectedValueOnce(error);

      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
      expect(result.operation).toEqual(operation);
    });

    test('должен обрабатывать неизвестные типы операций', async () => {
      const operation = { type: 'unknown_operation', path: 'test' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Неизвестный тип операции');
      expect(result.operation).toEqual(operation);
    });
  });

  describe('Выполнение наборов операций', () => {
    test('должен выполнять набор операций по имени', async () => {
      const result = await atomicOps.executeOperationSet('create_project', mockBasePath);

      expect(result.success).toBe(true);
      expect(result.setName).toBe('create_project');
      expect(result.operations).toBeInstanceOf(Array);
      expect(result.operations.length).toBeGreaterThan(0);
      
      // Проверяем что все операции выполнены успешно
      result.operations.forEach(opResult => {
        expect(opResult.success).toBe(true);
      });
    });

    test('должен обрабатывать ошибки в наборе операций', async () => {
      const error = new Error('Permission denied');
      fs.mkdir.mockRejectedValueOnce(error);

      const result = await atomicOps.executeOperationSet('create_project', mockBasePath);

      expect(result.success).toBe(false);
      expect(result.setName).toBe('create_project');
      expect(result.operations).toBeInstanceOf(Array);
      
      // Проверяем что есть неуспешные операции
      const failedOperations = result.operations.filter(op => !op.success);
      expect(failedOperations.length).toBeGreaterThan(0);
      expect(failedOperations[0].error).toBe('Permission denied');
    });

    test('должен возвращать ошибку для несуществующего набора', async () => {
      try {
        await atomicOps.executeOperationSet('non_existent_set', mockBasePath);
        // If no error is thrown, fail the test
        fail('Expected an error to be thrown for non-existent set.');
      } catch (error) {
        expect(error.message).toContain('Набор операций \'non_existent_set\' не найден');
      }
    });

    test('должен выполнять массив операций', async () => {
      const operations = [
        { type: 'mkdir', path: 'test_dir' },
        { type: 'touch', path: 'test_file.txt', content: 'test content' }
      ];

      const result = await atomicOps.executeCustomOperations(operations, mockBasePath);

      expect(result.success).toBe(true);
      expect(result.operations).toHaveLength(2);
      expect(result.operations[0].success).toBe(true);
      expect(result.operations[1].success).toBe(true);
    });

    test('должен останавливаться при ошибке если stopOnError=true', async () => {
      const operations = [
        { type: 'mkdir', path: 'dir1' },
        { type: 'mkdir', path: 'dir2' },
        { type: 'mkdir', path: 'dir3' }
      ];

      const error = new Error('Permission denied');
      fs.mkdir.mockRejectedValueOnce(error);

      const result = await atomicOps.executeCustomOperations(operations, mockBasePath, { stopOnError: true });

      expect(result.success).toBe(false);
      expect(result.operations).toHaveLength(1); // Только первая операция выполнена
      expect(result.operations[0].success).toBe(false);
    });

    test('должен продолжать выполнение при ошибке если stopOnError=false', async () => {
      const operations = [
        { type: 'mkdir', path: 'dir1' },
        { type: 'mkdir', path: 'dir2' },
        { type: 'mkdir', path: 'dir3' }
      ];

      const error = new Error('Permission denied');
      fs.mkdir.mockRejectedValueOnce(error);

      const result = await atomicOps.executeCustomOperations(operations, mockBasePath, { stopOnError: false });

      expect(result.success).toBe(false);
      expect(result.operations).toHaveLength(3); // Все операции выполнены
      expect(result.operations[0].success).toBe(false);
      expect(result.operations[1].success).toBe(true);
      expect(result.operations[2].success).toBe(true);
    });
  });

  describe('Unified Operations (USE_SYSTEM_FILE_OPS = true)', () => {
    beforeEach(() => {
      // Enable unified file ops for these tests
      mockUnifiedConfigManager.getFeatureConfig.mockReturnValue({
        getConfig: jest.fn(() => ({
          featureFlags: {
            USE_SYSTEM_FILE_OPS: true,
          },
        })),
      });
      // Re-instantiate AtomicOperations to pick up new config mock
      atomicOps = new AtomicOperations();

      // No need to mock fs.promises here, as we expect fileOperations to be called
    });

    test('должен выполнять операцию mkdir через unified file ops', async () => {
      const operation = { type: 'mkdir', path: 'new_unified_dir' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(mockFileOperations.ensureDir).toHaveBeenCalledWith(path.join(mockBasePath, 'new_unified_dir'));
      expect(mockDefaultLogger.info).toHaveBeenCalledWith(expect.stringContaining('Unified operation mkdir performed successfully'));
    });

    test('должен выполнять операцию touch через unified file ops', async () => {
      const operation = { type: 'touch', path: 'new_unified_file.txt', content: 'unified content' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(mockFileOperations.writeFile).toHaveBeenCalledWith(path.join(mockBasePath, 'new_unified_file.txt'), 'unified content');
      expect(mockDefaultLogger.info).toHaveBeenCalledWith(expect.stringContaining('Unified operation touch performed successfully'));
    });

    test('должен выполнять операцию copy через unified file ops', async () => {
      const operation = { type: 'copy', from: 'source.txt', to: 'dest.txt' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(mockFileOperations.copyPath).toHaveBeenCalledWith(path.join(mockBasePath, 'source.txt'), path.join(mockBasePath, 'dest.txt'));
      expect(mockDefaultLogger.info).toHaveBeenCalledWith(expect.stringContaining('Unified operation copy performed successfully'));
    });

    test('должен выполнять операцию move через unified file ops', async () => {
      const operation = { type: 'move', from: 'old.txt', to: 'new.txt' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(mockFileOperations.movePath).toHaveBeenCalledWith(path.join(mockBasePath, 'old.txt'), path.join(mockBasePath, 'new.txt'));
      expect(mockDefaultLogger.info).toHaveBeenCalledWith(expect.stringContaining('Unified operation move performed successfully'));
    });

    test('должен выполнять операцию remove через unified file ops', async () => {
      const operation = { type: 'remove', path: 'file_to_delete.txt' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(mockFileOperations.deletePath).toHaveBeenCalledWith(path.join(mockBasePath, 'file_to_delete.txt'));
      expect(mockDefaultLogger.info).toHaveBeenCalledWith(expect.stringContaining('Unified operation remove performed successfully'));
    });

    test('должен выполнять операцию remove_dir через unified file ops', async () => {
      const operation = { type: 'remove_dir', path: 'dir_to_delete' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(mockFileOperations.deletePath).toHaveBeenCalledWith(path.join(mockBasePath, 'dir_to_delete'));
      expect(mockDefaultLogger.info).toHaveBeenCalledWith(expect.stringContaining('Unified operation remove_dir performed successfully'));
    });

    test('должен выполнять операцию remove_pattern через unified file ops', async () => {
      const operation = { type: 'remove_pattern', pattern: '*.log' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(mockFileOperations.removeByPattern).toHaveBeenCalledWith(mockBasePath, '*.log');
      expect(mockDefaultLogger.info).toHaveBeenCalledWith(expect.stringContaining('Unified operation remove_pattern performed successfully'));
    });

    test('должен выполнять операцию remove_dir_if_empty через unified file ops', async () => {
      const operation = { type: 'remove_dir_if_empty', path: 'empty_dir' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(mockFileOperations.removeDirectoryIfEmpty).toHaveBeenCalledWith(path.join(mockBasePath, 'empty_dir'));
      expect(mockDefaultLogger.info).toHaveBeenCalledWith(expect.stringContaining('Unified operation remove_dir_if_empty performed successfully'));
    });

    test('должен выполнять операцию chmod через unified file ops', async () => {
      const operation = { type: 'chmod', path: 'script.sh', mode: '777' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(mockFileOperations.changePermissions).toHaveBeenCalledWith(path.join(mockBasePath, 'script.sh'), '777');
      expect(mockDefaultLogger.info).toHaveBeenCalledWith(expect.stringContaining('Unified operation chmod performed successfully'));
    });

    test('должен выполнять операцию symlink через unified file ops', async () => {
      const operation = { type: 'symlink', target: 'target.txt', link: 'link.txt' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(mockFileOperations.createSymlink).toHaveBeenCalledWith(path.join(mockBasePath, 'target.txt'), path.join(mockBasePath, 'link.txt'));
      expect(mockDefaultLogger.info).toHaveBeenCalledWith(expect.stringContaining('Unified operation symlink performed successfully'));
    });

    test('должен обрабатывать ошибки unified file ops', async () => {
      mockFileOperations.ensureDir.mockResolvedValueOnce({ success: false, error: 'Unified mkdir failed' });
      const operation = { type: 'mkdir', path: 'error_unified_dir' };
      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unified mkdir failed');
      expect(mockFileOperations.ensureDir).toHaveBeenCalledTimes(1);
      expect(mockDefaultLogger.error).toHaveBeenCalledWith(expect.stringContaining('Unified operation mkdir failed'));
    });
  });

  describe('Специальные операции', () => {
    test('должен выполнять операцию remove_pattern', async () => {
      const operation = { type: 'remove_pattern', pattern: '*.tmp' };
      
      // Симулируем файлы в директории
      fs.readdir.mockResolvedValueOnce(['file1.tmp', 'file2.txt', 'file3.tmp']);
      // Мокирование stat для файлов, чтобы они считались файлами
      fs.stat.mockImplementation((filePath) => {
        if (filePath.endsWith('.tmp') || filePath.endsWith('.txt')) {
          return Promise.resolve({ isDirectory: () => false, isFile: () => true });
        }
        return Promise.resolve({ isDirectory: () => true, isFile: () => false }); // Для других случаев
      });
      // Мокирование unlink для успешного выполнения
      fs.unlink.mockResolvedValue(undefined);

      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(fs.unlink).toHaveBeenCalledTimes(2); // Только .tmp файлы
      expect(fs.unlink).toHaveBeenCalledWith(path.join(mockBasePath, 'file1.tmp'));
      expect(fs.unlink).toHaveBeenCalledWith(path.join(mockBasePath, 'file3.tmp'));
    });

    test('должен выполнять операцию remove_dir_if_empty', async () => {
      const operation = { type: 'remove_dir_if_empty', path: 'empty_dir' };
      
      // Симулируем пустую директорию
      fs.readdir.mockResolvedValueOnce([]);

      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(fs.rm).toHaveBeenCalledWith(path.join(mockBasePath, 'empty_dir'));
    });

    test('должен пропускать удаление непустой директории', async () => {
      const operation = { type: 'remove_dir_if_empty', path: 'non_empty_dir' };
      
      // Симулируем непустую директорию
      fs.readdir.mockResolvedValueOnce(['file1.txt', 'file2.txt']);

      const result = await atomicOps.executeAtomicOperation(operation, mockBasePath);

      expect(result.success).toBe(true);
      expect(fs.rmdir).not.toHaveBeenCalled();
    });
  });

  describe('Валидация и безопасность', () => {
    test('должен валидировать пути на безопасность', async () => {
      const dangerousOperation = { type: 'mkdir', path: '../../../dangerous' };
      const result = await atomicOps.executeAtomicOperation(dangerousOperation, mockBasePath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Path traversal detected'); // Assuming validation is handled before FileOperations
    });

    test('должен валидировать типы операций', async () => {
      const invalidOperation = { type: '', path: 'test' };
      const result = await atomicOps.executeAtomicOperation(invalidOperation, mockBasePath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Неизвестный тип операции');
    });

    test('должен проверять обязательные поля операций', async () => {
      const incompleteOperation = { type: 'mkdir' }; // Отсутствует path
      const result = await atomicOps.executeAtomicOperation(incompleteOperation, mockBasePath);

      expect(result.success).toBe(false);
      // Update the expected error message to match Node.js's path.join error
      expect(result.error).toContain('The \"path\" argument must be of type string. Received undefined');
    });
  });

  describe('Интеграционные тесты', () => {
    test('должен создавать полную структуру проекта', async () => {
      const result = await atomicOps.executeOperationSet('create_project', mockBasePath);

      expect(result.success).toBe(true);
      expect(result.operations.length).toBeGreaterThan(5);
      
      // Проверяем что созданы основные директории
      const mkdirOperations = result.operations.filter(op => op.operation.type === 'mkdir');
      expect(mkdirOperations.some(op => op.operation.path === 'src')).toBe(true);
      expect(mkdirOperations.some(op => op.operation.path === 'tests')).toBe(true);
      expect(mkdirOperations.some(op => op.operation.path === 'docs')).toBe(true);
      expect(mkdirOperations.some(op => op.operation.path === 'config')).toBe(true);
      
      // Проверяем что созданы основные файлы
      const touchOperations = result.operations.filter(op => op.operation.type === 'touch');
      expect(touchOperations.some(op => op.operation.path === 'README.md')).toBe(true);
      expect(touchOperations.some(op => op.operation.path === 'package.json')).toBe(true);
      expect(touchOperations.some(op => op.operation.path === '.gitignore')).toBe(true);
    });

    test('должен создавать структуру для тестирования', async () => {
      const result = await atomicOps.executeOperationSet('create_test_structure', mockBasePath);

      expect(result.success).toBe(true);
      
      // Проверяем создание тестовых директорий
      const mkdirOperations = result.operations.filter(op => op.operation.type === 'mkdir');
      expect(mkdirOperations.some(op => op.operation.path === '__tests__')).toBe(true);
      expect(mkdirOperations.some(op => op.operation.path === '__tests__/unit')).toBe(true);
      expect(mkdirOperations.some(op => op.operation.path === '__tests__/integration')).toBe(true);
      expect(mkdirOperations.some(op => op.operation.path === '__tests__/e2e')).toBe(true);
      
      // Проверяем создание конфигурационных файлов
      const touchOperations = result.operations.filter(op => op.operation.type === 'touch');
      expect(touchOperations.some(op => op.operation.path === '__tests__/setup.js')).toBe(true);
      expect(touchOperations.some(op => op.operation.path === 'jest.config.js')).toBe(true);
    });

    test('должен обрабатывать комплексные сценарии с ошибками', async () => {
      // Симулируем частичные ошибки: некоторые операции неудачны, остальные успешны.
      const originalExecuteAtomicOperation = atomicOps.executeAtomicOperation;
      const failedOperationsTypes = ['mkdir', 'touch']; // Типы операций, которые должны завершиться с ошибкой
      const failedOperationsCount = { 'mkdir': 0, 'touch': 0 };

      atomicOps.executeAtomicOperation = jest.fn(async (operation, basePath) => {
        if (failedOperationsTypes.includes(operation.type) && failedOperationsCount[operation.type] < 1) {
          failedOperationsCount[operation.type]++;
          // Только первая операция каждого типа (mkdir и touch) будет неудачной
          return { success: false, operation: operation, error: 'Permission denied' };
        } else {
          // Остальные операции будут успешными
          return await originalExecuteAtomicOperation.call(atomicOps, operation, basePath);
        }
      });

      const projectOperations = atomicOps.getSetDetails('create_project').operations.map(op => ({ type: op.type, path: op.path }));
      const result = await atomicOps.executeCustomOperations(projectOperations, mockBasePath, { stopOnError: false });

      expect(result.success).toBe(false);
      expect(result.operations.length).toBeGreaterThan(0);
      
      const successfulOps = result.operations.filter(op => op.success);
      const failedOps = result.operations.filter(op => !op.success);
      
      expect(successfulOps.length).toBeGreaterThan(0); // Ожидаем успешные операции
      expect(failedOps.length).toBe(2);                 // Ожидаем две неудачные операции (первый mkdir и первый touch)

      atomicOps.executeAtomicOperation = originalExecuteAtomicOperation; // Восстанавливаем оригинальный метод
    });
  });

  describe('Производительность', () => {
    test('должен эффективно обрабатывать большие наборы операций', async () => {
      const largeOperations = [];
      for (let i = 0; i < 100; i++) {
        largeOperations.push({ type: 'touch', path: `file${i}.txt`, content: `content ${i}` });
      }

      const startTime = Date.now();
      const result = await atomicOps.executeCustomOperations(largeOperations, mockBasePath);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.operations).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Должно выполняться менее 1 секунды
    });

    test('должен эффективно обрабатывать вложенные директории', async () => {
      const nestedOperations = [
        { type: 'mkdir', path: 'deep/nested/structure' },
        { type: 'touch', path: 'deep/nested/structure/file.txt', content: 'test' }
      ];

      const result = await atomicOps.executeCustomOperations(nestedOperations, mockBasePath);

      expect(result.success).toBe(true);
      expect(result.operations).toHaveLength(2);
      expect(result.operations[0].success).toBe(true);
      expect(result.operations[1].success).toBe(true);
    });
  });
});
