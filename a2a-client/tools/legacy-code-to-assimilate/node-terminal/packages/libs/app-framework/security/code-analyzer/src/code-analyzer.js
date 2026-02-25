import path from 'node:path';

/**
 * Определение языка программирования по расширению файла
 */
export function detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap = {
        '.js': 'javascript',
        '.ts': 'typescript',
        '.jsx': 'react',
        '.tsx': 'react-typescript',
        '.vue': 'vue',
        '.py': 'python',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.php': 'php',
        '.rb': 'ruby',
        '.go': 'go',
        '.rs': 'rust',
        '.swift': 'swift',
        '.kt': 'kotlin',
        '.scala': 'scala',
        '.cs': 'csharp',
        '.html': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.less': 'less',
        '.json': 'json',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.md': 'markdown',
        '.sql': 'sql'
    };
    return languageMap[ext] || 'unknown';
}

/**
 * Проверка наличия тестов в файле
 */
export function hasTests(content, filePath) {
    const testPatterns = [
        /describe\(/i,
        /test\(/i,
        /it\(/i,
        /assert\(/i,
        /expect\(/i,
        /should\(/i,
        /@Test/i,
        /def test_/i,
        /function test/i
    ];
    
    const fileName = path.basename(filePath).toLowerCase();
    const isTestFile = fileName.includes('test') || fileName.includes('spec');
    
    return isTestFile || testPatterns.some(pattern => pattern.test(content));
}

/**
 * Проверка наличия документации
 */
export function hasDocumentation(content) {
    const docPatterns = [
        /\/\*\*/,
        /\/\/\/\s*</,
        /#\s*[A-Z]/,
        /"""\s*[A-Z]/,
        /'''\s*[A-Z]/,
        /<!--\s*[A-Z]/
    ];
    
    return docPatterns.some(pattern => pattern.test(content));
}

/**
 * Оценка сложности кода
 */
export function assessComplexity(content) {
    const lines = content.split('\n').length;
    const functions = (content.match(/function\s+\w+|def\s+\w+|public\s+\w+|private\s+\w+/g) || []).length;
    const classes = (content.match(/class\s+\w+/g) || []).length;
    
    if (lines > 500 || functions > 20 || classes > 5) return 'high';
    if (lines > 200 || functions > 10 || classes > 2) return 'medium';
    return 'low';
}
