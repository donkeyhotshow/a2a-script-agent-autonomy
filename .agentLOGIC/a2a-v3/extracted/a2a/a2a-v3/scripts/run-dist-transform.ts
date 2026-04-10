import fs from 'fs';
import path from 'path';
import {runTransformPipelineFromFile} from '../a2a-server/dist/transform/pipeline.js';

const simDir = path.join('simulations', 'dialog', '3');
const input = JSON.parse(fs.readFileSync(path.join(simDir, 'request.json'), 'utf-8'));

const result = await runTransformPipelineFromFile(path.join(simDir, 'server-transforms-request.json'), input, {
  baseDir: process.cwd(),
});

console.log(result.files?.['request.md']);
