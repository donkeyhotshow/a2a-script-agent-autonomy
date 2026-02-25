import { createRequire } from 'module';

// ESM wrapper around CommonJS exports
const require = createRequire(import.meta.url);
const cjs = require('./console-utils.cjs');

export const ConsoleUtils = cjs.ConsoleUtils;
export const consoleUtils = cjs.consoleUtils;
export const log = cjs.log;
export const error = cjs.error;
export const warn = cjs.warn;
export const info = cjs.info;
export const debug = cjs.debug;
export const group = cjs.group;
export const groupEnd = cjs.groupEnd;
export const table = cjs.table;
export const time = cjs.time;
export const timeEnd = cjs.timeEnd;
export const timeLog = cjs.timeLog;
export const trace = cjs.trace;
export const logWithLevel = cjs.logWithLevel;
export const logObject = cjs.logObject;
export const logArray = cjs.logArray;
export const logFunction = cjs.logFunction;
export const logWithContext = cjs.logWithContext;
export const logPerformance = cjs.logPerformance;
export const logMemory = cjs.logMemory;
