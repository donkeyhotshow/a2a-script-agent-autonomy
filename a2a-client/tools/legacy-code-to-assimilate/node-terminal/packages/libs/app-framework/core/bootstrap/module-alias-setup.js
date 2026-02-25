import moduleAlias from 'module-alias';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к корневому package.json (C:\apps\package.json)
const packageJsonPath = path.join(__dirname, '../../../package.json');

if (fs.existsSync(packageJsonPath)) {
    moduleAlias.addAlias('@root', path.join(__dirname, '../../..')); // Алиас для корневой директории проекта
    moduleAlias.addAlias('@libs', path.join(__dirname, '..', '..')); // Алиас для libs
    moduleAlias.addAlias('@apps', path.join(__dirname, '..', '..', '..', 'apps')); // Алиас для apps
    console.log('[INFO] Module aliases configured successfully');
} else {
    console.error('[ERROR] package.json not found at:', packageJsonPath);
    console.error('[ERROR] Current directory:', __dirname);
    console.error('[ERROR] Attempted path:', packageJsonPath);
    process.exit(1);
}
