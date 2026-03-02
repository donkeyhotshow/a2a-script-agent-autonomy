/**
 * Custom ESLint formatter for generating task files
 *
 * This formatter outputs detailed JSON information about ESLint errors
 * that can be used to generate individual task files for each problematic file.
 */

module.exports = function format(results, data) {
    const output = {
        timestamp: new Date().toISOString(),
        summary: {
            totalFiles: 0,
            totalErrors: 0,
            totalWarnings: 0,
            filesWithErrors: 0,
            filesWithWarnings: 0
        },
        files: []
    };

    // Process each file result
    results.forEach(result => {
        if (result.messages.length === 0) {
            return; // Skip files with no messages
        }

        const fileInfo = {
            filePath: result.filePath,
            relativePath: result.filePath.replace(process.cwd() + '/', ''),
            errorCount: 0,
            warningCount: 0,
            messages: []
        };

        // Process messages
        result.messages.forEach(message => {
            const messageInfo = {
                ruleId: message.ruleId,
                severity: message.severity === 2 ? 'error' : 'warning',
                message: message.message,
                line: message.line,
                column: message.column,
                source: message.source,
                suggestions: message.suggestions || []
            };

            fileInfo.messages.push(messageInfo);

            if (message.severity === 2) {
                fileInfo.errorCount++;
                output.summary.totalErrors++;
            } else {
                fileInfo.warningCount++;
                output.summary.totalWarnings++;
            }
        });

        output.files.push(fileInfo);
        output.summary.totalFiles++;

        if (fileInfo.errorCount > 0) {
            output.summary.filesWithErrors++;
        }
        if (fileInfo.warningCount > 0) {
            output.summary.filesWithWarnings++;
        }
    });

    return JSON.stringify(output, null, 2);
}
