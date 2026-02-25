/**
 * Управление безопасностью конфигураций (шифрование/дешифрование).
 */

import * as crypto from 'crypto';

export class ConfigurationSecurityManager {
    constructor(encryptionAlgorithm, encryptionKey, sensitiveFields, logger) {
        this.encryptionAlgorithm = encryptionAlgorithm;
        this.encryptionKey = encryptionKey;
        this.sensitiveFields = sensitiveFields;
        this.logger = logger;

        if (!this.encryptionKey) {
            this.logger.warn('ENCRYPTION_KEY не установлен. Используйте случайный ключ для продакшена.');
            this.encryptionKey = crypto.randomBytes(32).toString('hex');
        }
        if (this.encryptionKey.length !== 64) {
            this.encryptionKey = crypto.createHash('sha256').update(this.encryptionKey).digest('hex');
        }
    }

    /**
     * Генерирует ключ шифрования
     */
    generateKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Шифрует данные
     */
    encrypt(text) {
        const encryptionKey = Buffer.from(this.encryptionKey, 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.encryptionAlgorithm, encryptionKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();
        return {
            iv: iv.toString('hex'),
            encryptedData: encrypted,
            authTag: tag.toString('hex'),
            algorithm: this.encryptionAlgorithm,
            version: '1.0'
        };
    }

    /**
     * Расшифровывает данные
     */
    decrypt(encryptedData) {
        const encryptionKey = Buffer.from(this.encryptionKey, 'hex');
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag || '', 'hex');
        const decipher = crypto.createDecipheriv(encryptedData.algorithm || this.encryptionAlgorithm, encryptionKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    /**
     * Шифрует только чувствительные поля конфигурации
     */
    encryptSensitiveFields(config, sensitiveFields) {
        if (!config || typeof config !== 'object') {
            return config;
        }

        try {
            const encryptedConfig = JSON.parse(JSON.stringify(config)); // Deep clone
            const encryptField = (obj, path = '') => {
                if (!obj || typeof obj !== 'object') return;

                for (const [key, value] of Object.entries(obj)) {
                    const currentPath = path ? `${path}.${key}` : key;
                    
                    if (sensitiveFields.includes(currentPath) || sensitiveFields.includes(key)) {
                        if (value !== undefined && value !== null && typeof value === 'string') {
                            obj[key] = this.encrypt(value);
                        }
                    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        encryptField(value, currentPath);
                    }
                }
            };

            encryptField(encryptedConfig);
            return encryptedConfig;
        } catch (error) {
            // Handle circular references
            this.logger.warn('Обнаружены циклические ссылки в конфигурации, шифрование пропущено');
            return config;
        }
    }

    /**
     * Расшифровывает чувствительные поля конфигурации
     */
    decryptSensitiveFields(config, sensitiveFields) {
        const decryptedConfig = JSON.parse(JSON.stringify(config)); // Deep clone
        
        const decryptRecursively = (obj, path = '') => {
            if (!obj || typeof obj !== 'object') return;
            
            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;
                
                if (value && typeof value === 'object' && value.encryptedData && value.iv && value.authTag) {
                    // Это зашифрованное поле
                    try {
                        const decrypted = this.decrypt(value);
                        obj[key] = decrypted;
                    } catch (e) {
                        this.logger.error(`Ошибка расшифровки поля ${currentPath}: ${e.message}`);
                        obj[key] = `[Decryption Error]`;
                    }
                } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    // Рекурсивно обрабатываем nested объекты
                    decryptRecursively(value, currentPath);
                }
            }
        };
        
        decryptRecursively(decryptedConfig);
        return decryptedConfig;
    }

    /**
     * Проверяет, зашифрованы ли данные
     */
    hasEncryptedFields(data) {
        if (typeof data !== 'object' || data === null) return false;
        return this.sensitiveFields.some(field => {
            const value = this.getNestedValue(data, field);
            return value && typeof value === 'object' && value.encryptedData && value.iv && value.authTag;
        });
    }

    // Вспомогательные методы для работы с вложенными значениями (повторяются из ConfigurationUtils)
    getNestedValue(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let value = obj;
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        return value;
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        current[keys[keys.length - 1]] = value;
    }
}
