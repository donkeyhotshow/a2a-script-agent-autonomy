#!/usr/bin/env node

// Переносит содержимое всех .md из tasks/ в docs/TASKS-COMPLETED.md
// и удаляет исходные файлы.

import fs from 'fs';
import path from 'path';

const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const tasksPath = path.join(root, 'tasks');
const output = path.join(root, 'docs', 'TASKS-COMPLETED.md');

if (!fs.existsSync(output)) {
  throw new Error('Не найден файл docs/TASKS-COMPLETED.md');
}
if (!fs.existsSync(tasksPath)) {
  throw new Error('Не найдена папка tasks/');
}

const taskFiles = fs.readdirSync(tasksPath).filter((f) => f.endsWith('.md')).sort();
if (taskFiles.length === 0) {
  console.log('Нет файлов tasks для переноса.');
  process.exit(0);
}

for (const file of taskFiles) {
  const taskFile = path.join(tasksPath, file);
  const content = fs.readFileSync(taskFile, 'utf8');
  fs.appendFileSync(output, `\n---\n\n# Перенесено из tasks/${file}\n\n${content}\n`);
  fs.unlinkSync(taskFile);
  console.log('Мигрировано и удалено:', file);
}

console.log(`Готово: перенесено ${taskFiles.length} файлов.`);
