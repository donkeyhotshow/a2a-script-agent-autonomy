module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Detect invalid use statements in PHP files',
            category: 'PHP Code Quality',
            recommended: true,
        },
        fixable: null,
        schema: [],
    },

    create(context) {
        const sourceCode = context.sourceCode || context.getSourceCode();
        const filename = context.filename;

        if (!filename.endsWith('.php')) {
            return {};
        }

        const content = sourceCode.getText();
        const lines = content.split('\n');

        const phpTypes = new Set([
            'string', 'int', 'integer', 'float', 'bool', 'boolean',
            'array', 'object', 'callable', 'iterable', 'void', 'mixed',
            'null', 'false', 'true', 'self', 'parent', 'static', 'never'
        ]);

        const knownBuiltIn = new Set([
            'Illuminate\\Support\\Facades\\Route',
            'Illuminate\\Support\\Facades\\Config',
            'Illuminate\\Support\\Facades\\Auth',
            'Illuminate\\Support\\Facades\\Hash',
            'Illuminate\\Support\\Facades\\DB',
            'Illuminate\\Support\\Facades\\Cache',
            'Illuminate\\Support\\Facades\\Validator',
            'Illuminate\\Http\\Request',
            'Illuminate\\Http\\JsonResponse',
            'Illuminate\\Http\\Response',
            'Illuminate\\Database\\Eloquent\\Model',
            'Illuminate\\Database\\Eloquent\\Collection',
            'Illuminate\\Database\\Eloquent\\SoftDeletes',
            'Illuminate\\Database\\Eloquent\\Factories\\HasFactory',
            'Illuminate\\Validation\\ValidationException',
            'Illuminate\\Auth\\Access\\AuthorizationException',
            'Exception', 'Error', 'Throwable', 'DateTime', 'DateTimeZone',
            'ArrayObject', 'ArrayIterator', 'Closure', 'stdClass',
            'SoftDeletes', 'HasFactory',
        ]);

        // Find namespace end (where class/interface/trait definitions start)
        const namespaceEndMatch = content.match(/^(.*?)(?=^(?:class|interface|trait|abstract|final)\s+)/ms);
        const namespaceSection = namespaceEndMatch ? namespaceEndMatch[1] : content;

        // Extract use statements only from namespace section
        const useStatements = [];
        const usePattern = /^\s*(?:use|use function|use const)\s+(.+?);/gm;
        let match;

        while ((match = usePattern.exec(namespaceSection)) !== null) {
            let statement = match[1];
            const lineNum = namespaceSection.substring(0, match.index).split('\n').length;

            if (statement.includes('{')) {
                statement = statement.replace(/\s*\{|\}\s*/g, '');
                statement.split(',').forEach(part => {
                    const trimmed = part.trim();
                    if (trimmed) useStatements.push({stmt: normalizeClassName(trimmed), line: lineNum});
                });
            } else {
                useStatements.push({stmt: normalizeClassName(statement), line: lineNum});
            }
        }

        // Extract defined classes
        const definedClasses = [];
        const classPattern = /^\s*(?:class|interface|trait)\s+(\w+)/gm;
        while ((match = classPattern.exec(content)) !== null) {
            definedClasses.push(match[1]);
        }

        // Extract used classes
        const usedClasses = extractUsedClasses(content, definedClasses);

        // Check for duplicate use statements
        checkDuplicateUseStatements(useStatements, context);

        // Check for unused use statements
        checkUnusedUseStatements(useStatements, usedClasses, context);

        // Check for use statements inside functions
        checkUseInsideFunctions(content, lines, context);

        // Check for missing use statements
        checkMissingUseStatements(usedClasses, useStatements, lines, context);

        return {};

        function normalizeClassName(name) {
            return name.replace(/\s+as\s+\w+$/, '').replace(/^\\\+/, '').trim();
        }

        function extractUsedClasses(content, definedClasses) {
            const used = new Set();

            // new ClassName()
            const newPattern = /\bnew\s+([A-Z][a-zA-Z0-9_]*(?:\\[a-zA-Z0-9_]+)*)/g;
            while ((match = newPattern.exec(content)) !== null) {
                if (isValidClassName(match[1])) used.add(match[1]);
            }

            // ClassName::class
            const classRefPattern = /\b([A-Z][a-zA-Z0-9_]*(?:\\[a-zA-Z0-9_]+)*)::class\b/g;
            while ((match = classRefPattern.exec(content)) !== null) {
                if (isValidClassName(match[1])) used.add(match[1]);
            }

            // Static calls
            const staticPattern = /\b([A-Z][a-zA-Z0-9_]*(?:\\[a-zA-Z0-9_]+)*)(?::\:\$?|::\w+\()/g;
            while ((match = staticPattern.exec(content)) !== null) {
                if (!['self', 'parent', 'static'].includes(match[1]) && isValidClassName(match[1])) {
                    used.add(match[1]);
                }
            }

            // Type hints
            const typePattern = /\b([A-Z][a-zA-Z0-9_]*(?:\\[a-zA-Z0-9_]+)*)\s+\$/g;
            while ((match = typePattern.exec(content)) !== null) {
                if (!phpTypes.has(match[1]) && isValidClassName(match[1])) {
                    used.add(match[1]);
                }
            }

            // Catch blocks
            const catchPattern = /catch\s*\(\s*([A-Z][a-zA-Z0-9_]*(?:\\[a-zA-Z0-9_]+)*)/g;
            while ((match = catchPattern.exec(content)) !== null) {
                if (isValidClassName(match[1])) used.add(match[1]);
            }

            // instanceof
            const instanceofPattern = /instanceof\s+([A-Z][a-zA-Z0-9_]*(?:\\[a-zA-Z0-9_]+)*)/g;
            while ((match = instanceofPattern.exec(content)) !== null) {
                if (isValidClassName(match[1])) used.add(match[1]);
            }

            // extends/implements
            const extendsPattern = /\b(?:extends|implements)\s+([A-Z][a-zA-Z0-9_]*(?:\\[a-zA-Z0-9_]*(?:,\s*[A-Z][a-zA-Z0-9_]*)*)*)/g;
            while ((match = extendsPattern.exec(content)) !== null) {
                match[1].split(',').forEach(cls => {
                    const trimmed = cls.trim();
                    if (!['self', 'parent'].includes(trimmed) && isValidClassName(trimmed)) {
                        used.add(trimmed);
                    }
                });
            }

            // Attributes
            const attrPattern = /#\[([A-Z][a-zA-Z0-9_]*)/g;
            while ((match = attrPattern.exec(content)) !== null) {
                if (isValidClassName(match[1])) used.add(match[1]);
            }

            // Return types
            const returnPattern = /\):\s*([A-Z][a-zA-Z0-9_]*(?:\\[a-zA-Z0-9_]+)*)/g;
            while ((match = returnPattern.exec(content)) !== null) {
                if (!phpTypes.has(match[1]) && isValidClassName(match[1])) {
                    used.add(match[1]);
                }
            }

            return Array.from(used);
        }

        function isValidClassName(name) {
            return name && /^[A-Z]/.test(name);
        }

        function checkDuplicateUseStatements(useStatements, context) {
            const counts = {};
            const firstOccurrence = {};

            useStatements.forEach(({stmt, line}) => {
                if (!counts[stmt]) {
                    counts[stmt] = 0;
                    firstOccurrence[stmt] = line;
                }
                counts[stmt]++;
            });

            Object.entries(counts).forEach(([className, count]) => {
                if (count > 1) {
                    context.report({
                        line: firstOccurrence[className],
                        column: 1,
                        message: `Duplicate use statement for: ${className} (found ${count} times)`,
                        severity: 'error',
                    });
                }
            });
        }

        function checkUnusedUseStatements(useStatements, usedClasses, context) {
            const reported = new Set();

            useStatements.forEach(({stmt, line}) => {
                if (reported.has(stmt)) return;

                const parts = stmt.split('\\');
                const shortName = parts[parts.length - 1];

                const isUsed = usedClasses.some(used =>
                    stmt === used || shortName === used
                );

                if (!isUsed && !stmt.includes('\\function') && !stmt.includes('\\const')) {
                    reported.add(stmt);
                    context.report({
                        line,
                        column: 1,
                        message: `Unused use statement: ${stmt}`,
                        severity: 'warning',
                    });
                }
            });
        }

        function checkUseInsideFunctions(content, lines, context) {
            const functionPattern = /function\s+\w+\s*\([^)]*\)\s*(?::\s*[A-Za-z_]+)?\s*\{/g;
            let match;

            while ((match = functionPattern.exec(content)) !== null) {
                const functionStart = match.index;
                let braceCount = 0;
                let foundStart = false;
                let functionContent = '';

                for (let i = functionStart; i < content.length; i++) {
                    if (content[i] === '{') {
                        braceCount++;
                        foundStart = true;
                    } else if (content[i] === '}') {
                        braceCount--;
                    }

                    if (foundStart) {
                        functionContent += content[i];
                    }

                    if (foundStart && braceCount === 0) {
                        break;
                    }
                }

                if (/^\s*use\s+[A-Za-z_]+\s*;/m.test(functionContent) && !/\)\s*use\s*\(/.test(functionContent)) {
                    const lineNum = content.substring(0, functionStart).split('\n').length;
                    context.report({
                        line: lineNum,
                        column: 1,
                        message: 'Use statement found inside function (should be at top of file)',
                        severity: 'error',
                    });
                }
            }
        }

        function checkMissingUseStatements(usedClasses, useStatements, lines, context) {
            const reported = new Set();

            usedClasses.forEach(usedClass => {
                if (reported.has(usedClass)) return;

                const found = useStatements.some(({stmt}) =>
                    stmt === usedClass ||
                    stmt.endsWith('\\' + usedClass) ||
                    stmt.split('\\').pop() === usedClass
                );

                if (!found && !knownBuiltIn.has(usedClass) && !usedClass.includes('\\')) {
                    reported.add(usedClass);

                    for (let idx = 0; idx < lines.length; idx++) {
                        if (lines[idx].match(new RegExp(`\\b${usedClass}\\b`))) {
                            context.report({
                                line: idx + 1,
                                column: lines[idx].indexOf(usedClass) + 1,
                                message: `Potential missing use statement for: ${usedClass}`,
                                severity: 'warning',
                            });
                            break;
                        }
                    }
                }
            });
        }
    },
};
