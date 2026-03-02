const fs = require('fs');
const path = require('path');

// Пути к собранным файлам
const BUILD_DIR = path.join(__dirname, '../../public/build/assets');
const OUTPUT_FILE = path.join(__dirname, 'extracted-classes.json');

function extractFromCSS(cssContent) {
    const classes = new Set();
    const cssVars = new Set();

    // Извлекаем CSS классы
    const classRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
    let match;
    while ((match = classRegex.exec(cssContent)) !== null) {
        classes.add(match[1]);
    }

    // Извлекаем CSS переменные
    const varRegex = /--([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
    while ((match = varRegex.exec(cssContent)) !== null) {
        cssVars.add(match[1]);
    }

    return {classes, cssVars};
}

function extractFromJS(jsContent) {
    const classes = new Set();

    // Извлекаем классы из строк в JS (class="...", className="...")
    const classAttrRegex = /(?:class|className)=["']([^"']+)["']/g;
    let match;
    while ((match = classAttrRegex.exec(jsContent)) !== null) {
        const classStr = match[1];
        classStr.split(/\s+/).forEach(cls => {
            if (cls && cls.length > 1 && /^[a-z-]/.test(cls)) {
                classes.add(cls);
            }
        });
    }

    return {classes};
}

function scanBuildDirectory() {
    const allClasses = new Set();
    const allCssVars = new Set();
    const tailwindClasses = new Set();

    console.log('Сканирование директории:', BUILD_DIR);

    if (!fs.existsSync(BUILD_DIR)) {
        console.error('Директория build не найдена!');
        return;
    }

    const files = fs.readdirSync(BUILD_DIR);
    let cssCount = 0;
    let jsCount = 0;

    files.forEach(file => {
        const filePath = path.join(BUILD_DIR, file);

        if (file.endsWith('.css')) {
            cssCount++;
            const content = fs.readFileSync(filePath, 'utf-8');
            const {classes, cssVars} = extractFromCSS(content);

            classes.forEach(cls => {
                allClasses.add(cls);
                // Определяем Tailwind классы по паттернам
                if (isTailwindClass(cls)) {
                    tailwindClasses.add(cls);
                }
            });

            cssVars.forEach(v => allCssVars.add(v));
        } else if (file.endsWith('.js')) {
            jsCount++;
            const content = fs.readFileSync(filePath, 'utf-8');
            const {classes} = extractFromJS(content);

            classes.forEach(cls => {
                allClasses.add(cls);
                if (isTailwindClass(cls)) {
                    tailwindClasses.add(cls);
                }
            });
        }
    });

    console.log(`Обработано CSS файлов: ${cssCount}`);
    console.log(`Обработано JS файлов: ${jsCount}`);
    console.log(`Найдено уникальных классов: ${allClasses.size}`);
    console.log(`Найдено Tailwind классов: ${tailwindClasses.size}`);
    console.log(`Найдено CSS переменных: ${allCssVars.size}`);

    // Сохраняем результат
    const result = {
        meta: {
            extractedAt: new Date().toISOString(),
            totalClasses: allClasses.size,
            tailwindClasses: tailwindClasses.size,
            cssVariables: allCssVars.size,
            cssFiles: cssCount,
            jsFiles: jsCount
        },
        classes: Array.from(allClasses).sort(),
        tailwindClasses: Array.from(tailwindClasses).sort(),
        cssVariables: Array.from(allCssVars).sort()
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`\nРезультат сохранен в: ${OUTPUT_FILE}`);

    // Выводим примеры
    console.log('\nПримеры найденных CSS переменных:');
    Array.from(allCssVars).slice(0, 10).forEach(v => console.log(`  --${v}`));

    console.log('\nПримеры найденных Tailwind классов:');
    Array.from(tailwindClasses).slice(0, 10).forEach(c => console.log(`  ${c}`));
}

function isTailwindClass(className) {
    // Базовые Tailwind паттерны
    const patterns = [
        /^(m|p)[xytblr]?-\d+$/,
        /^(w|h)-\d+$/,
        /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
        /^(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|transparent|current)/,
        /^rounded/,
        /^border/,
        /^shadow/,
        /^flex/,
        /^grid/,
        /^gap-/,
        /^space-/,
        /^(sm|md|lg|xl|2xl):/,
        /^(hover|focus|active|dark):/,
        /^transition/,
        /^duration-/,
        /^opacity-/,
        /^z-/,
        /^(top|right|bottom|left|inset)-/,
        /^translate-/,
        /^scale-/,
        /^rotate-/
    ];

    return patterns.some(pattern => pattern.test(className));
}

// Запуск
scanBuildDirectory();
