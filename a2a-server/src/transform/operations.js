/**
 * Transform Operations Implementation
 *
 * Implements all transform operations defined in server-transform.schema.json:
 * - copy: Copy data from one JSONPath to another
 * - set: Set a value at a JSONPath
 * - append-to-array: Append a value to an array
 * - parse-json-from-md: Parse JSON from markdown file
 * - render-markdown: Render a markdown template
 * - switch: Conditional transform based on discriminator value
 */
import * as path from 'path';
import * as fs from 'fs/promises';
import { query, set as jsonPathSet, resolveTemplates } from './jsonpath.js';
/**
 * Extract JSON from markdown content
 * Looks for JSON blocks (```json ... ```) or raw JSON
 */
function extractJsonFromMarkdown(md) {
    // Try to find JSON code block
    const jsonBlockMatch = md.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
        try {
            return JSON.parse(jsonBlockMatch[1]);
        }
        catch {
            // Fall through to try raw JSON
        }
    }
    // Try to find any code block
    const codeBlockMatch = md.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
        try {
            return JSON.parse(codeBlockMatch[1]);
        }
        catch {
            // Fall through to try raw
        }
    }
    // Try parsing the entire content as JSON
    try {
        return JSON.parse(md);
    }
    catch {
        // Return the raw content if no valid JSON found
        return md;
    }
}
/**
 * Apply a single transform operation
 */
export async function applyOperation(operation, context) {
    switch (operation.op) {
        case 'copy':
            await applyCopy(operation, context);
            break;
        case 'set':
            await applySet(operation, context);
            break;
        case 'append-to-array':
            await applyAppendToArray(operation, context);
            break;
        case 'parse-json-from-md':
            await applyParseJsonFromMd(operation, context);
            break;
        case 'render-markdown':
            await applyRenderMarkdown(operation, context);
            break;
        case 'switch':
            await applySwitch(operation, context);
            break;
        default:
            throw new Error(`Unknown operation: ${operation.op}`);
    }
}
/**
 * Copy operation - copies data from one JSONPath to another
 */
async function applyCopy(operation, context) {
    const { from, to } = operation;
    // Get value from source path
    // First check input, then $out
    let value = query(context.input, from);
    if (value === undefined) {
        value = query(context.$out, from);
    }
    // Set value at destination
    if (value !== undefined) {
        // Deep clone to avoid reference issues
        const clonedValue = JSON.parse(JSON.stringify(value));
        jsonPathSet(context.$out, to, clonedValue);
    }
}
/**
 * Set operation - sets a value at a JSONPath
 */
async function applySet(operation, context) {
    const { path: pathStr, value, valueFrom } = operation;
    let resolvedValue;
    if (valueFrom) {
        // Get value from JSONPath
        resolvedValue = query(context.input, valueFrom);
        if (resolvedValue === undefined) {
            resolvedValue = query(context.$out, valueFrom);
        }
    }
    else if (value !== undefined) {
        // Use literal value with template resolution
        // Merge input and $out for template resolution
        const mergedContext = { ...context.input, ...context.$out };
        resolvedValue = resolveTemplates(value, mergedContext);
    }
    else {
        resolvedValue = undefined;
    }
    jsonPathSet(context.$out, pathStr, resolvedValue);
}
/**
 * Append to array operation - appends a value to an array
 */
async function applyAppendToArray(operation, context) {
    const { to, value } = operation;
    // Resolve templates in the value
    const resolvedValue = resolveTemplates(value, context.$out);
    // First check if the array exists in input or $out
    let arr = query(context.input, to);
    if (!arr) {
        arr = query(context.$out, to);
    }
    if (!Array.isArray(arr)) {
        // Create a new array in $out
        jsonPathSet(context.$out, to, [resolvedValue]);
    }
    else {
        // Append to existing array - need to ensure it's in $out
        const outArr = query(context.$out, to);
        if (outArr && Array.isArray(outArr)) {
            outArr.push(resolvedValue);
        }
        else {
            // Array exists in input but not in $out - copy it first
            const newArr = [...arr, resolvedValue];
            jsonPathSet(context.$out, to, newArr);
        }
    }
}
/**
 * Parse JSON from MD operation - reads markdown file and extracts JSON
 */
async function applyParseJsonFromMd(operation, context) {
    const { fromFile, jsonPath = '$', to } = operation;
    // Resolve file path
    const baseDir = context.baseDir || process.cwd();
    const filePath = path.isAbsolute(fromFile)
        ? fromFile
        : path.resolve(baseDir, fromFile);
    // Read file
    let content;
    if (context.fs) {
        content = await context.fs.readFile(filePath, 'utf-8');
    }
    else {
        content = await fs.readFile(filePath, 'utf-8');
    }
    // Extract JSON from markdown
    const jsonData = extractJsonFromMarkdown(content);
    // Apply JSONPath if specified
    let finalValue = jsonData;
    if (jsonPath && jsonPath !== '$') {
        finalValue = query(jsonData, jsonPath);
    }
    // Set in output
    jsonPathSet(context.$out, to, finalValue);
}
/**
 * Render Markdown operation - renders a markdown template with data
 */
async function applyRenderMarkdown(operation, context) {
    const { templateRef, data, outputFile } = operation;
    // Get template data
    let templateData;
    const outStr = [String.fromCharCode(36), 'out'].join('');
    const dollar = String.fromCharCode(36);
    if (data === outStr) {
        templateData = context.$out;
    }
    else if (data === dollar || data === [dollar, 'input'].join('')) {
        templateData = context.input;
    }
    else if (data === [dollar, '.'].join('') || data === dollar) {
        // Handle root path - use input
        templateData = context.input;
    }
    else {
        // Try JSONPath
        templateData = query(context.$out, data)
            || query(context.input, data)
            || {};
    }
    // Create a clean context for template resolution (without internal properties)
    const cleanContext = {};
    for (const [key, value] of Object.entries(context.$out)) {
        if (!key.startsWith('_')) {
            cleanContext[key] = value;
        }
    }
    // Resolve templates in the context for template rendering
    const resolvedData = resolveTemplates(templateData, cleanContext);
    // Get template content
    let template;
    const baseDir = context.baseDir || process.cwd();
    // Check if templateRef is a file path or a special reference
    if (templateRef.includes('#')) {
        // Handle template references like "simulations/coder/3/request.md"
        const templatePath = templateRef.startsWith('/')
            ? templateRef
            : path.resolve(baseDir, templateRef);
        if (context.fs) {
            template = await context.fs.readFile(templatePath, 'utf-8');
        }
        else {
            template = await fs.readFile(templatePath, 'utf-8');
        }
    }
    else {
        // Try as file path
        const templatePath = path.resolve(baseDir, templateRef);
        if (context.fs) {
            template = await context.fs.readFile(templatePath, 'utf-8');
        }
        else {
            template = await fs.readFile(templatePath, 'utf-8');
        }
    }
    // Simple template rendering - replace placeholders
    const rendered = renderTemplateSimple(template, resolvedData);
    // Write output file
    const outputPath = path.resolve(baseDir, outputFile);
    if (context.fs) {
        await context.fs.writeFile(outputPath, rendered);
    }
    else {
        await fs.writeFile(outputPath, rendered, 'utf-8');
    }
    // Track written files in context
    if (!context.$out._files) {
        context.$out._files = {};
    }
    context.$out._files[outputFile] = rendered;
}
/**
 * Simple template rendering - replaces {{path}} placeholders with values
 */
function renderTemplateSimple(template, data) {
    const dollar = String.fromCharCode(36);
    const pattern = [dollar, '{', '([^}]+)', '}'].join('');
    const regex = new RegExp(pattern, 'g');
    return template.replace(regex, (_, key) => {
        const trimmedKey = key.trim();
        const value = query(data, trimmedKey);
        return stringifyForTemplate(value);
    });
}
function stringifyForTemplate(value) {
    if (value === undefined) {
        return 'null';
    }
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return JSON.stringify(sortKeys(value), null, 2);
}
function sortKeys(value) {
    if (Array.isArray(value)) {
        return value.map(sortKeys);
    }
    if (typeof value === 'object' && value !== null) {
        const sorted = {};
        for (const key of Object.keys(value).sort()) {
            sorted[key] = sortKeys(value[key]);
        }
        return sorted;
    }
    return value;
}
/**
 * Switch operation - conditional transform based on discriminator value
 */
async function applySwitch(operation, context) {
    const { discriminator, cases, default: defaultCase } = operation;
    // Get discriminator value
    let discValue = query(context.input, discriminator);
    if (discValue === undefined) {
        discValue = query(context.$out, discriminator);
    }
    // Find matching case
    const discString = String(discValue);
    let matchedCase = cases[discString];
    // If no exact match, try to find a case key that matches as a pattern
    if (!matchedCase) {
        const caseKeys = Object.keys(cases);
        for (const key of caseKeys) {
            if (discString.includes(key) || key === '*') {
                matchedCase = cases[key];
                break;
            }
        }
    }
    // Apply matched case or default
    if (matchedCase) {
        // The case value is an operation object (without the 'op' field in shorthand form)
        // We need to reconstruct it
        const opValue = matchedCase.op;
        if (opValue) {
            const nestedOperation = matchedCase;
            await applyOperation(nestedOperation, context);
        }
    }
    else if (defaultCase) {
        const defaultOp = defaultCase.op;
        if (defaultOp) {
            const defaultOperation = defaultCase;
            await applyOperation(defaultOperation, context);
        }
    }
}
/**
 * Create a default file system implementation
 */
export function createDefaultFileSystem() {
    return {
        async readFile(filePath, encoding = 'utf-8') {
            return fs.readFile(filePath, encoding);
        },
        async writeFile(filePath, content) {
            // Ensure directory exists
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(filePath, content, 'utf-8');
        },
        async exists(filePath) {
            try {
                await fs.access(filePath);
                return true;
            }
            catch {
                return false;
            }
        }
    };
}
