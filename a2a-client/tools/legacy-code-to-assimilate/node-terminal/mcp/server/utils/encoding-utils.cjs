/**
 * Утилита для обработки различных кодировок
 * Поддерживает cp1251, utf8, utf16 и другие кодировки
 */

const iconv = require('iconv-lite');

class EncodingUtils {
    constructor() {
        this.supportedEncodings = ['utf8', 'cp1251', 'ascii', 'utf16', 'utf16le', 'utf16be', 'latin1'];
    }

    /**
     * Проверяет поддерживается ли кодировка
     */
    isSupported(encoding) {
        return this.supportedEncodings.includes(encoding.toLowerCase());
    }

    /**
     * Читает файл с указанной кодировкой
     */
    async readFileWithEncoding(filePath, encoding = 'utf8') {
        const fs = require('fs').promises;

        try {
            if (encoding.toLowerCase() === 'utf8' || encoding.toLowerCase() === 'ascii') {
                // Используем стандартные методы Node.js для utf8 и ascii
                return await fs.readFile(filePath, encoding);
            } else {
                // Используем iconv-lite для других кодировок
                const buffer = await fs.readFile(filePath);
                return iconv.decode(buffer, encoding);
            }
        } catch (error) {
            throw new Error(`Failed to read file with encoding ${encoding}: ${error.message}`);
        }
    }

    /**
     * Записывает файл с указанной кодировкой
     */
    async writeFileWithEncoding(filePath, content, encoding = 'utf8') {
        const fs = require('fs').promises;

        try {
            if (encoding.toLowerCase() === 'utf8' || encoding.toLowerCase() === 'ascii') {
                // Используем стандартные методы Node.js для utf8 и ascii
                return await fs.writeFile(filePath, content, encoding);
            } else {
                // Используем iconv-lite для других кодировок
                const buffer = iconv.encode(content, encoding);
                return await fs.writeFile(filePath, buffer);
            }
        } catch (error) {
            throw new Error(`Failed to write file with encoding ${encoding}: ${error.message}`);
        }
    }

    /**
     * Определяет кодировку файла
     */
    async detectEncoding(filePath) {
        const fs = require('fs').promises;

        try {
            const buffer = await fs.readFile(filePath);

            // Простая эвристика для определения кодировки
            // В реальном проекте можно использовать более сложные алгоритмы

            // Проверяем BOM для UTF-16
            if (buffer.length >= 2) {
                if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
                    return 'utf16le';
                }
                if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
                    return 'utf16be';
                }
            }

            // Проверяем BOM для UTF-8
            if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
                return 'utf8';
            }

            // Пытаемся декодировать как UTF-8
            try {
                const utf8Content = buffer.toString('utf8');
                // Проверяем на валидные UTF-8 символы
                if (Buffer.from(utf8Content, 'utf8').equals(buffer)) {
                    return 'utf8';
                }
            } catch (e) {
                // UTF-8 декодирование не удалось
            }

            // Пытаемся декодировать как cp1251
            try {
                const cp1251Content = iconv.decode(buffer, 'cp1251');
                // Проверяем на валидные cp1251 символы
                if (iconv.encode(cp1251Content, 'cp1251').equals(buffer)) {
                    return 'cp1251';
                }
            } catch (e) {
                // cp1251 декодирование не удалось
            }

            // По умолчанию возвращаем utf8
            return 'utf8';
        } catch (error) {
            throw new Error(`Failed to detect encoding: ${error.message}`);
        }
    }

    /**
     * Конвертирует контент из одной кодировки в другую
     */
    convertEncoding(content, fromEncoding, toEncoding) {
        try {
            if (fromEncoding.toLowerCase() === toEncoding.toLowerCase()) {
                return content;
            }

            // Сначала декодируем из исходной кодировки
            let buffer;
            if (fromEncoding.toLowerCase() === 'utf8' || fromEncoding.toLowerCase() === 'ascii') {
                buffer = Buffer.from(content, fromEncoding);
            } else {
                buffer = iconv.encode(content, fromEncoding);
            }

            // Затем кодируем в целевую кодировку
            if (toEncoding.toLowerCase() === 'utf8' || toEncoding.toLowerCase() === 'ascii') {
                return buffer.toString(toEncoding);
            } else {
                return iconv.decode(buffer, toEncoding);
            }
        } catch (error) {
            throw new Error(`Failed to convert encoding from ${fromEncoding} to ${toEncoding}: ${error.message}`);
        }
    }

    /**
     * Получает список поддерживаемых кодировок
     */
    getSupportedEncodings() {
        return [...this.supportedEncodings];
    }
}

module.exports = {EncodingUtils};
