import fs from 'node:fs';
import path from 'node:path';

function fixImportsInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix all common broken imports
    content = content.replace(/from '..\/..\/server-utils\/logger.js'/g, "from '../utils/logger.js'");
    content = content.replace(/from '..\/..\/server-utils\/metrics.js'/g, "from '../utils/metrics.js'");
    content = content.replace(/from '..\/..\/utils\/ai-hub-url.js'/g, "from '../utils/ai-hub-url.js'");
    content = content.replace(/from '..\/..\/utils\/errors.js'/g, "from '../utils/errors.js'");
    content = content.replace(/from '..\/..\/server-config\//g, "from '../server-config/");
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports in: ${filePath}`);
}

// Fix all files in server src
function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDirectory(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
            fixImportsInFile(fullPath);
        }
    }
}

console.log('Fixing imports in server package...');
scanDirectory(path.join(__dirname, '../a2a-server/packages/server/src'));
console.log('Import fixing completed.');
