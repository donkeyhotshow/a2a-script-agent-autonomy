/**
 * Тесты для MarkdownUtils
 * Утилиты для работы с Markdown документами
 */

const { formatWithFrontMatter, parseWithFrontMatter } = require('../src/front-matter-parser');

describe('MarkdownUtils', () => {
  describe('parseWithFrontMatter', () => {
    test('должен парсить Markdown с YAML front matter', () => {
      const content = `---
title: Test Document
author: John Doe
tags:
  - test
  - markdown
---

# Заголовок документа

Содержимое документа.`;

      const result = parseWithFrontMatter(content);

      expect(result.metadata).toEqual({
        title: 'Test Document',
        author: 'John Doe',
        tags: ['test', 'markdown']
      });
      expect(result.content).toBe('# Заголовок документа\n\nСодержимое документа.');
    });

    test('должен обрабатывать документы без front matter', () => {
      const content = `# Простой документ

Содержимое без метаданных.`;

      const result = parseWithFrontMatter(content);

      expect(result.metadata).toBeNull();
      expect(result.content).toBe('# Простой документ\n\nСодержимое без метаданных.');
    });

    test('должен обрабатывать пустые метаданные', () => {
      const content = `---
---

# Документ с пустыми метаданными`;

      const result = parseWithFrontMatter(content);

      expect(result.metadata).toBeNull();
      expect(result.content).toBe('# Документ с пустыми метаданными');
    });
  });

  describe('formatWithFrontMatter', () => {
    test('должен формировать содержимое с метаданными', () => {
      const content = '# Test Document\n\nContent here.';
      const metadata = {
        title: 'Test',
        date: '2024-01-01'
      };

      const result = formatWithFrontMatter(content, metadata);

      expect(result).toContain('---\n');
      expect(result).toContain('title: Test\n');
      expect(result).toContain('date: \'2024-01-01\'\n');
      expect(result).toContain('---\n\n');
      expect(result).toContain('# Test Document');
    });

    test('должен обрабатывать отсутствие метаданных', () => {
      const content = '# Simple Document';

      const result = formatWithFrontMatter(content);

      expect(result).toBe('# Simple Document');
    });
  });
});
