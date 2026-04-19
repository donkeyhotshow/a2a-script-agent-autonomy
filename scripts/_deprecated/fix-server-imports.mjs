import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixImports(content, filePath) {
    // Fix server-utils imports to point to utils directory
    content = content.replace(
        /from '\.\.\/\.\.\/server-utils\/([^']+)\.js'/g,
        "from '../utils/$1.js'"
    );

    // Fix server-config imports
    content = content.replace(
        /from '\.\.\/\.\.\/server-config\/([^']+)\.js'/g,
        "from '../server-config/$1.js'"
    );

    // Fix utils imports
    content = content.replace(
        /from '\.\.\/\.\.\/utils\/([^']+)\.js'/g,
        "from '../utils/$1.js'"
    );

    // Fix request imports
    content = content.replace(
        /from '\.\.\/\.\.\/request\/([^']+)\.js'/g,
        "from '../request/$1.js'"
    );

    // Fix actions imports
    content = content.replace(
        /from '\.\.\/\.\.\/actions\/([^']+)\.js'/g,
        "from '../actions/$1.js'"
    );

    // Fix daemon imports
    content = content.replace(
        /from '\.\.\/\.\.\/daemon\/([^']+)\.js'/g,
        "from '../daemon/$1.js'"
    );

    return content;
}

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        content = fixImports(content, filePath);

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✓ Fixed imports in: ${path.relative(process.cwd(), filePath)}`);
        }
    } catch (error) {
        console.error(`✗ Error processing ${filePath}:`, error.message);
    }
}

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);

        if (fs.statSync(fullPath).isDirectory()) {
            // Skip node_modules and dist directories
            if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
                scanDirectory(fullPath);
            }
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
            processFile(fullPath);
        }
    }
}

console.log('🔧 Starting comprehensive import fix for server package...');
const serverSrcDir = path.join(__dirname, '..', 'a2a-server', 'packages', 'server', 'src');
console.log(`📁 Processing directory: ${serverSrcDir}`);

scanDirectory(serverSrcDir);

console.log('✅ Import fixing completed!');
console.log('🚀 Testing server startup...');

// Test server startup
import { spawn } from 'child_process';
const serverProcess = spawn('cross-env', ['SKIP_AUTH=1', 'tsx', 'packages/server/src/index.ts'], {
    cwd: path.join(__dirname, '..', 'a2a-server'),
    stdio: 'inherit'
});

serverProcess.on('exit', (code) => {
    if (code === 0) {
        console.log('✅ Server started successfully!');
    } else {
        console.log(`❌ Server failed with exit code: ${code}`);
    }
});

serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error.message);
});