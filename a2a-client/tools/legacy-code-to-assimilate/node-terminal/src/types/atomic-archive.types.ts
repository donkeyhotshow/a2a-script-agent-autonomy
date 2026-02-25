/**
 * Типы для атомарных операций с файлами
 */

;

export interface AtomicOperation {
    /** Тип операции */
    type: 'mkdir' | 'touch' | 'copy' | 'move' | 'remove_file' | 'remove_dir';
    /** Путь к файлу или директории */
    path: string;
    /** Содержимое файла (для операции touch) */
    content?: string;
    /** Исходный путь (для операций copy и move) */
    from?: string;
    /** Целевой путь (для операций copy и move) */
    to?: string;
}



export interface OperationSet {
    /** Название набора операций */
    name: string;
    /** Описание набора операций */
    description: string;
    /** Массив операций в наборе */
    operations: AtomicOperation[];
}



export interface OperationResult {
    /** Успешность выполнения */
    success: boolean;
    /** Выполненная операция */
    operation: AtomicOperation;
    /** Базовый путь выполнения */
    basePath: string;
    /** Сообщение о результате */
    message: string;
    /** Ошибка (если есть) */
    error?: string;
}



export interface SetExecutionResult {
    /** Успешность выполнения */
    success: boolean;
    /** Название выполненного набора */
    setName: string;
    /** Базовый путь выполнения */
    basePath: string;
    /** Выполненные операции */
    operations: AtomicOperation[];
    /** Сообщение о результате */
    message: string;
    /** Ошибки (если есть) */
    errors?: string[];
}



export interface CustomOperationsResult {
    /** Успешность выполнения */
    success: boolean;
    /** Базовый путь выполнения */
    basePath: string;
    /** Выполненные операции */
    operations: AtomicOperation[];
    /** Сообщение о результате */
    message: string;
    /** Результаты отдельных операций */
    results?: OperationResult[];
}



export interface ValidationResult {
    /** Валидность операции */
    valid: boolean;
    /** Сообщение об ошибке */
    error?: string;
    /** Предупреждения */
    warnings?: string[];
}



export interface Statistics {
    /** Общее количество операций */
    totalOperations: number;
    /** Количество успешных операций */
    successfulOperations: number;
    /** Количество неудачных операций */
    failedOperations: number;
    /** Время последнего выполнения */
    lastExecution: Date | null;
    /** Дополнительная статистика */
    additional?: Record<string, any>;
}


export interface ArchiveOptions {
    /** Формат архива */
    format?: 'zip' | 'tar' | 'gz' | 'rar' | '7z';
    /** Уровень сжатия (0-9) */
    compressionLevel?: number;
    /** Сохранять структуру директорий */
    preserveStructure?: boolean;
    /** Включать скрытые файлы */
    includeHidden?: boolean;
    /** Фильтр файлов */
    filter?: (filePath: string) => boolean;
}



export interface ArchiveInfo {
    /** Путь к архиву */
    path: string;
    /** Существует ли архив */
    exists: boolean;
    /** Размер архива в байтах */
    size: number;
    /** Количество файлов в архиве */
    fileCount: number;
    /** Коэффициент сжатия */
    compressionRatio: number;
    /** Дата создания */
    createdAt: Date | null;
    /** Формат архива */
    format: string;
    /** Дополнительная информация */
    metadata?: Record<string, any>;
}



export interface SearchOptions {
    /** Регистрозависимый поиск */
    caseSensitive?: boolean;
    /** Максимальное количество результатов */
    maxResults?: number;
    /** Типы файлов для поиска */
    fileTypes?: string[];
    /** Включать содержимое файлов в поиск */
    includeContent?: boolean;
    /** Регулярное выражение для поиска */
    regex?: RegExp;
}



export interface SearchResult {
    /** Путь к архиву */
    archivePath: string;
    /** Поисковый запрос */
    query: string;
    /** Найденные результаты */
    results: SearchMatch[];
    /** Общее количество найденных совпадений */
    totalFound: number;
    /** Опции поиска */
    searchOptions: SearchOptions;
}



export interface SearchMatch {
    /** Путь к файлу в архиве */
    filePath: string;
    /** Строка с совпадением */
    line?: string;
    /** Номер строки */
    lineNumber?: number;
    /** Позиция совпадения в строке */
    position?: number;
    /** Контекст вокруг совпадения */
    context?: string;
}



export interface ExtractOptions {
    /** Перезаписывать существующие файлы */
    overwrite?: boolean;
    /** Сохранять структуру директорий */
    preserveStructure?: boolean;
    /** Фильтр файлов для извлечения */
    filter?: (filePath: string) => boolean;
    /** Путь для извлечения */
    extractPath?: string;
}



export interface ExtractResult {
    /** Успешность извлечения */
    success: boolean;
    /** Путь к архиву */
    archivePath: string;
    /** Путь извлечения */
    extractPath: string;
    /** Извлеченные файлы */
    extractedFiles: string[];
    /** Опции извлечения */
    options: ExtractOptions;
    /** Сообщение о результате */
    message: string;
    /** Ошибки при извлечении */
    errors?: string[];
}



export interface ArchiveValidationResult {
    /** Путь к архиву */
    path: string;
    /** Валидность архива */
    isValid: boolean;
    /** Ошибки валидации */
    errors: string[];
    /** Предупреждения */
    warnings: string[];
    /** Сообщение о результате */
    message: string;
    /** Детали проверки */
    details?: Record<string, any>;
}



export interface ArchiveStatistics {
    /** Общее количество архивов */
    totalArchives: number;
    /** Общий размер всех архивов */
    totalSize: number;
    /** Самый большой архив */
    largestArchive: ArchiveInfo | null;
    /** Недавние архивы */
    recentArchives: ArchiveInfo[];
    /** Статистика по форматам */
    formats: Record<string, number>;
    /** Средний размер архива */
    averageSize: number;
    /** Дата последнего архивирования */
    lastArchiveDate: Date | null;
}



export interface CleanupOptions {
    /** Максимальный возраст архивов в днях */
    maxAge?: number;
    /** Максимальный общий размер архивов */
    maxSize?: number;
    /** Режим предварительного просмотра */
    dryRun?: boolean;
    /** Форматы архивов для очистки */
    formats?: string[];
    /** Исключить архивы по паттерну */
    excludePattern?: string;
}



export interface CleanupResult {
    /** Успешность очистки */
    success: boolean;
    /** Удаленные архивы */
    removedArchives: string[];
    /** Освобожденное место */
    freedSpace: number;
    /** Опции очистки */
    options: CleanupOptions;
    /** Сообщение о результате */
    message: string;
    /** Детали очистки */
    details?: Record<string, any>;
}



export interface CreateArchiveResult {
    /** Успешность создания */
    success: boolean;
    /** Путь к созданному архиву */
    archivePath: string;
    /** Архивированные файлы */
    files: string[];
    /** Опции архивирования */
    options: ArchiveOptions;
    /** Сообщение о результате */
    message: string;
    /** Размер архива */
    size?: number;
    /** Время создания */
    createdAt?: Date;
}


export interface BaseResult {
    /** Успешность операции */
    success: boolean;
    /** Сообщение о результате */
    message: string;
    /** Ошибка (если есть) */
    error?: string;
    /** Время выполнения */
    timestamp?: Date;
}



export interface FileInfo {
    /** Путь к файлу */
    path: string;
    /** Размер файла */
    size: number;
    /** Дата создания */
    createdAt: Date;
    /** Дата изменения */
    modifiedAt: Date;
    /** Тип файла */
    type: 'file' | 'directory';
    /** Расширение файла */
    extension?: string;
    /** Права доступа */
    permissions?: string;
}



export interface ProgressCallback {
    /** Текущий прогресс (0-100) */
    progress: number;
    /** Текущий файл */
    currentFile?: string;
    /** Общее количество файлов */
    totalFiles?: number;
    /** Обработанные байты */
    processedBytes?: number;
    /** Общий размер */
    totalBytes?: number;
}


export type ProgressHandler = (progress: ProgressCallback) => void;


export interface AtomicOperationsConfig {
    /** Максимальное количество одновременных операций */
    maxConcurrentOperations?: number;
    /** Таймаут для операций (мс) */
    operationTimeout?: number;
    /** Включить логирование */
    enableLogging?: boolean;
    /** Путь для логов */
    logPath?: string;
    /** Уровень логирования */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
}



export interface ArchiveOperationsConfig {
    /** Путь к директории архивов */
    archivePath?: string;
    /** Максимальный размер архива */
    maxArchiveSize?: number;
    /** Формат архива по умолчанию */
    defaultFormat?: string;
    /** Уровень сжатия по умолчанию */
    defaultCompressionLevel?: number;
    /** Включить автоматическую очистку */
    enableAutoCleanup?: boolean;
    /** Интервал автоматической очистки (мс) */
    cleanupInterval?: number;
}
