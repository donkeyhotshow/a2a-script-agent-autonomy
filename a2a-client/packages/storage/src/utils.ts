import fs from 'fs';
import { pathExists } from '@a2a-client/execution/fs-utils';

/**
 * Безопасно читает и парсит JSON файл синхронно
 * @param filePath Абсолютный путь к файлу
 * @param errorLabel Метка для логирования ошибок (опционально)
 * @param fallback Значение возвращаемое при ошибке или отсутствии файла (опционально)
 * @param throwOnError Бросать исключение при ошибке парсинга (по умолчанию: false)
 * @returns Распаршенный объект, fallback или null
 */
export function readJsonFileSync<T = unknown>(
   filePath: string,
   errorLabel?: string,
   fallback: T | null = null,
   throwOnError = false
): T | null {
   if (!pathExists(filePath)) {
     return fallback;
   }

   try {
     const content = fs.readFileSync(filePath, 'utf8');
     return JSON.parse(content) as T;
   } catch (err) {
     if (errorLabel) {
       console.error(`[${errorLabel}] Failed to parse JSON from ${filePath}:`, err?.message || err);
     }

     if (throwOnError) {
       throw err instanceof Error ? err : new Error(String(err));
     }

     return fallback;
   }
 }

/**
 * Безопасно записывает JSON файл синхронно
 * @param filePath Абсолютный путь к файлу
 * @param data Данные для сериализации
 * @param indent Отступ для форматирования (по умолчанию: 2)
 */
import { ensureDir } from '@a2a-client/execution/fs-utils';

export function writeJsonFileSync(
   filePath: string,
   data: unknown,
   indent = 2
): void {
   const dir = fs.dirname(filePath);
   if (!fs.existsSync(dir)) {
     ensureDir(dir);
   }

   fs.writeFileSync(filePath, JSON.stringify(data, null, indent));
 }
