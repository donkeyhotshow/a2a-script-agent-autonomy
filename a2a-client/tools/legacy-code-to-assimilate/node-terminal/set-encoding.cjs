// Установка кодировки для Node.js
// Используем правильный способ установки кодировки
try {
    // Для Node.js process.stdout не имеет метода setEncoding
    // Вместо этого устанавливаем переменные окружения и используем write с кодировкой
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --enable-source-maps';

    // Установка кодировки через переменные окружения
    if (process.platform === 'win32') {
        process.env.PSModulePath = [process.env.PSModulePath, 'C:\\Program Files\\PowerShell\\7'].filter(Boolean).join(';');
    }
} catch (error) {
    // Тихая обработка ошибки установки кодировки
    console.error(`[SET-ENCODING] Error setting encoding: ${error.message}`);
}

// Установка переменных окружения для корректной работы с UTF-8
process.env.LANG = 'en_US.UTF-8';
process.env.LC_ALL = 'en_US.UTF-8';

// Установка кодировки для консоли Windows
if (process.platform === 'win32') {
    process.env.CODEPAGE = '65001'; // UTF-8
}

module.exports = {};

