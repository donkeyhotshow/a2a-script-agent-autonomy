const yaml = require('js-yaml');

/**
 * Формирование содержимого файла с YAML front matter
 */
function formatWithFrontMatter(content, metadata) {
    let formattedContent = '';
    if (metadata) {
        formattedContent += '---\n';
        formattedContent += yaml.dump(metadata);
        formattedContent += '---\n\n';
    }
    formattedContent += content;
    return formattedContent;
}

/**
 * Парсинг содержимого файла с YAML front matter
 */
function parseWithFrontMatter(fileContent) {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)/;
    const match = fileContent.match(frontMatterRegex);
    if (match) {
        const yamlContent = match[1].trim();
        const content = match[2].trim();
        
        // Если YAML содержимое пустое или содержит только пробелы/переносы строк
        if (!yamlContent || yamlContent.replace(/\s/g, '') === '') {
            return { metadata: null, content: content.trim() };
        }
        
        const metadata = yaml.load(yamlContent);
        // Если метаданные пустые или undefined, возвращаем null
        if (!metadata || (typeof metadata === 'object' && Object.keys(metadata).length === 0)) {
            return { metadata: null, content: content.trim() };
        }
        return { metadata, content: content.trim() };
    }
    return { metadata: null, content: fileContent.trim() };
}

export { formatWithFrontMatter,
    parseWithFrontMatter };
