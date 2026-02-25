const fs = require('fs');
const path = require('path');

const searchFiles = async (options, fileUtils) => {
  const {
    query,
    include = ['*'],
    exclude = ['node_modules/**', '.git/**', '**/.*'],
    contextBefore = 2,
    contextAfter = 2,
    maxResults = 100,
    maxFileSizeKB = 1024,
    caseInsensitive = false
  } = options;

  if (!query || query.trim() === '') {
    return { results: [], count: 0, message: 'Empty query provided' };
  }

  const results = [];
  const searchRoot = fileUtils?.getCurrentDir?.() || process.cwd();

  try {
    const files = await findFilesRecursively(searchRoot, include, exclude);

    for (const file of files) {
      try {
        const stats = fs.statSync(file);
        if (stats.size > maxFileSizeKB * 1024) continue;

        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let matchFound = false;

          if (caseInsensitive) {
            matchFound = line.toLowerCase().includes(query.toLowerCase());
          } else {
            matchFound = line.includes(query);
          }

          if (matchFound) {
            const contextLines = [];
            const startLine = Math.max(0, i - contextBefore);
            const endLine = Math.min(lines.length - 1, i + contextAfter);

            for (let j = startLine; j <= endLine; j++) {
              contextLines.push({
                lineNumber: j + 1,
                content: lines[j],
                isMatch: j === i
              });
            }

            results.push({
              file: path.relative(searchRoot, file),
              line: i + 1,
              content: line.trim(),
              context: contextLines
            });

            if (results.length >= maxResults) break;
          }
        }

        if (results.length >= maxResults) break;
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return {
      results,
      count: results.length,
      message: results.length > 0 ? `Found ${results.length} matches` : 'No matches found'
    };
  } catch (error) {
    return {
      results: [],
      count: 0,
      message: `Search failed: ${error.message}`
    };
  }
};

const applyEdits = async (edits, makeBackup = true, fileUtils) => {
  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (const edit of edits) {
    try {
      const { file, before, after, mode = 'single', index } = edit;
      const fullPath = path.resolve(file);

      if (!fs.existsSync(fullPath)) {
        results.push({
          file,
          success: false,
          error: 'File not found'
        });
        errorCount++;
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf8');

      // Create backup if requested
      if (makeBackup) {
        const backupPath = `${fullPath}.backup`;
        fs.writeFileSync(backupPath, content);
      }

      let newContent;
      if (mode === 'all') {
        newContent = content.replace(new RegExp(before, 'g'), after);
      } else if (mode === 'single' && index !== undefined) {
        const lines = content.split('\n');
        if (index >= 0 && index < lines.length) {
          lines[index] = lines[index].replace(before, after);
          newContent = lines.join('\n');
        } else {
          throw new Error(`Invalid line index: ${index}`);
        }
      } else {
        // Single replacement (first occurrence)
        newContent = content.replace(before, after);
      }

      fs.writeFileSync(fullPath, newContent);

      results.push({
        file,
        success: true,
        changes: 1
      });
      successCount++;
    } catch (error) {
      results.push({
        file: edit.file,
        success: false,
        error: error.message
      });
      errorCount++;
    }
  }

  return {
    results,
    count: successCount,
    errors: errorCount,
    message: `Applied ${successCount} edits, ${errorCount} errors`
  };
};

const getFileInfo = async (file, fileUtils) => {
  try {
    if (!file) {
      throw new Error('File path is required');
    }

    const stats = fs.statSync(file);
    const ext = path.extname(file).toLowerCase();

    let type = 'unknown';
    if (['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx'].includes(ext)) {
      type = 'javascript';
    } else if (['.py', '.pyc'].includes(ext)) {
      type = 'python';
    } else if (['.java', '.class'].includes(ext)) {
      type = 'java';
    } else if (['.html', '.htm'].includes(ext)) {
      type = 'html';
    } else if (['.css', '.scss', '.sass'].includes(ext)) {
      type = 'css';
    } else if (['.json'].includes(ext)) {
      type = 'json';
    } else if (['.md', '.txt'].includes(ext)) {
      type = 'text';
    } else if (['.xml', '.yml', '.yaml'].includes(ext)) {
      type = 'config';
    }

    return {
      name: path.basename(file),
      path: file,
      size: stats.size,
      type,
      modified: stats.mtime,
      created: stats.birthtime,
      isDirectory: stats.isDirectory(),
      permissions: stats.mode
    };
  } catch (error) {
    return {
      name: path.basename(file || ''),
      path: file || '',
      size: 0,
      type: 'error',
      error: error.message
    };
  }
};

const validateRegexPattern = (pattern) => {
  if (!pattern || typeof pattern !== 'string') {
    return false;
  }

  try {
    new RegExp(pattern);
    return true;
  } catch (e) {
    return false;
  }
};

// Helper function to find files recursively
async function findFilesRecursively(dir, include, exclude) {
  const results = [];

  function shouldInclude(filePath) {
    const relativePath = path.relative(dir, filePath);

    // Check exclude patterns
    for (const excludePattern of exclude) {
      if (minimatch(relativePath, excludePattern)) {
        return false;
      }
    }

    // Check include patterns
    for (const includePattern of include) {
      if (minimatch(relativePath, includePattern)) {
        return true;
      }
    }

    return false;
  }

  function walkDir(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip hidden directories and common exclude patterns
        if (!item.startsWith('.') && !['node_modules', '.git'].includes(item)) {
          walkDir(fullPath);
        }
      } else if (stat.isFile()) {
        if (shouldInclude(fullPath)) {
          results.push(fullPath);
        }
      }
    }
  }

  walkDir(dir);
  return results;
}

// Simple minimatch implementation
function minimatch(str, pattern) {
  const regex = new RegExp(
    pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
  );
  return regex.test(str);
}

module.exports = {
  searchFiles,
  applyEdits,
  getFileInfo,
  validateRegexPattern,
};

