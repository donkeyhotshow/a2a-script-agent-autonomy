import { readFileSync } from 'fs';
import { join, dirname } from 'path';



const __dirname = dirname(__filename);

const configPath = join(__dirname, 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));

module.exports = config;
