# analyze-security

Security-focused analysis: dependencies, patterns, risks. **План:
** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:
** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority

85

## Triggers

- security analysis
- analyze security
- security audit

## Sub-actions

### 1. analyze-security-scan

Scan for common security issues (e.g. hardcoded secrets, unsafe patterns).

**Input:** rootDir  
**Output:** findings[]

```typescript
interface SecurityFinding {
  file: string;
  line: number;
  type: 'hardcoded-secret' | 'sql-injection' | 'xss' | 'csrf' | 'weak-crypto' | 'insecure-random' | 'command-injection' | 'path-traversal' | 'unsafe-deserialization';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

export default async function run(input: { rootDir: string }): Promise<{ findings: SecurityFinding[] }> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const findings: SecurityFinding[] = [];
  
  async function scanDir(dir: string, depth: number = 0): Promise<void> {
    if (depth > 8) return;
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const skipDirs = ['node_modules', '.git', 'vendor', 'dist', 'build', 'storage', 'logs'];
          if (!skipDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            await scanDir(fullPath, depth + 1);
          }
        } else if (entry.isFile() && /\\.(ts|js|php|vue|jsx|tsx|py|java)$/.test(entry.name)) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const relativePath = path.relative(input.rootDir, fullPath);
            const lines = content.split('\n');
            
            // Hardcoded secrets patterns
            const secretPatterns = [
              { regex: /password\s*=\s*['"][^'"]{4,}['"]/gi, type: 'hardcoded-secret' as const, severity: 'critical' as const, msg: 'Hardcoded password found', suggest: 'Use environment variables' },
              { regex: /secret\s*=\s*['"][^'"]{8,}['"]/gi, type: 'hardcoded-secret' as const, severity: 'critical' as const, msg: 'Hardcoded secret found', suggest: 'Use environment variables' },
              { regex: /api[_-]?key\s*=\s*['"][A-Za-z0-9_-]{16,}['"]/gi, type: 'hardcoded-secret' as const, severity: 'critical' as const, msg: 'Hardcoded API key found', suggest: 'Use environment variables' },
              { regex: /token\s*=\s*['"][A-Za-z0-9_-]{20,}['"]/gi, type: 'hardcoded-secret' as const, severity: 'high' as const, msg: 'Hardcoded token found', suggest: 'Use environment variables or secure storage' },
              { regex: /private[_-]?key\s*=\s*['"]/gi, type: 'hardcoded-secret' as const, severity: 'critical' as const, msg: 'Hardcoded private key found', suggest: 'Use secure key management' },
              { regex: /aws[_-]?access[_-]?key/gi, type: 'hardcoded-secret' as const, severity: 'critical' as const, msg: 'AWS access key found', suggest: 'Use IAM roles or environment variables' },
            ];
            
            for (const pattern of secretPatterns) {
              let match;
              const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
              while ((match = regex.exec(content)) !== null) {
                const lineNum = content.slice(0, match.index).split('\n').length;
                findings.push({
                  file: relativePath,
                  line: lineNum,
                  type: pattern.type,
                  severity: pattern.severity,
                  message: pattern.msg,
                  suggestion: pattern.suggest
                });
              }
            }
            
            // SQL Injection patterns
            const sqlPatterns = [
              { regex: /query\s*\(\s*['"].*?\+/g, type: 'sql-injection' as const, severity: 'critical' as const, msg: 'Potential SQL injection - string concatenation', suggest: 'Use parameter binding' },
              { regex: /execute\s*\(\s*['"].*?%/g, type: 'sql-injection' as const, severity: 'critical' as const, msg: 'Potential SQL injection - string interpolation', suggest: 'Use parameter binding' },
              { regex: /whereRaw\s*\(\s*['"].*?\+/g, type: 'sql-injection' as const, severity: 'high' as const, msg: 'Potential SQL injection - raw query with concatenation', suggest: 'Use query builder bindings' },
            ];
            
            for (const pattern of sqlPatterns) {
              let match;
              const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
              while ((match = regex.exec(content)) !== null) {
                const lineNum = content.slice(0, match.index).split('\n').length;
                findings.push({
                  file: relativePath,
                  line: lineNum,
                  type: pattern.type,
                  severity: pattern.severity,
                  message: pattern.msg,
                  suggestion: pattern.suggest
                });
              }
            }
            
            // XSS patterns
            if (content.includes('innerHTML') || content.includes('dangerouslySetInnerHTML')) {
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('innerHTML') || lines[i].includes('dangerouslySetInnerHTML')) {
                  findings.push({
                    file: relativePath,
                    line: i + 1,
                    type: 'xss',
                    severity: 'high',
                    message: 'Potential XSS - direct HTML insertion',
                    suggestion: 'Sanitize input or use textContent instead'
                  });
                }
              }
            }
            
            // Weak crypto
            const cryptoPatterns = [
              { regex: /md5\s*\(/g, type: 'weak-crypto' as const, severity: 'medium' as const, msg: 'Weak hashing algorithm (MD5)', suggest: 'Use bcrypt, scrypt, or argon2' },
              { regex: /sha1\s*\(/g, type: 'weak-crypto' as const, severity: 'medium' as const, msg: 'Weak hashing algorithm (SHA1)', suggest: 'Use bcrypt, scrypt, or argon2' },
              { regex: /Crypto\.createHash\s*\(\s*['"]md5/gi, type: 'weak-crypto' as const, severity: 'medium' as const, msg: 'Node.js: Weak hash (MD5)', suggest: 'Use crypto.createHash("sha256") or stronger' },
            ];
            
            for (const pattern of cryptoPatterns) {
              let match;
              const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
              while ((match = regex.exec(content)) !== null) {
                const lineNum = content.slice(0, match.index).split('\n').length;
                findings.push({
                  file: relativePath,
                  line: lineNum,
                  type: pattern.type,
                  severity: pattern.severity,
                  message: pattern.msg,
                  suggestion: pattern.suggest
                });
              }
            }
            
            // Command injection
            if (content.includes('exec(') || content.includes('system(') || content.includes('shell_exec') || content.includes('popen')) {
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if ((line.includes('exec(') || line.includes('system(') || line.includes('shell_exec')) && line.includes('$_')) {
                  findings.push({
                    file: relativePath,
                    line: i + 1,
                    type: 'command-injection',
                    severity: 'critical',
                    message: 'Potential command injection with user input',
                    suggestion: 'Sanitize and validate all user input, use escapeshellarg'
                  });
                }
              }
            }
            
          } catch {
            // Skip files that can't be read
          }
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }
  
  await scanDir(input.rootDir);
  
  return { findings };
}
```

### 2. analyze-security-report

Aggregate findings and produce security report (SQL injection, XSS, CSRF, secrets).

**Input:** findings[]  
**Output:** report

```typescript
export default async function run(input: { findings: Array<{ file: string; line: number; type: string; severity: string; message: string; suggestion: string }> }): Promise<{ report: string }> {
  const byType: Record<string, typeof input.findings> = {};
  const bySeverity: Record<string, typeof input.findings> = {};
  
  for (const f of input.findings) {
    if (!byType[f.type]) byType[f.type] = [];
    byType[f.type].push(f);
    
    if (!bySeverity[f.severity]) bySeverity[f.severity] = [];
    bySeverity[f.severity].push(f);
  }
  
  const severityEmoji: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵'
  };
  
  let report = `# 🔒 Security Analysis Report

## Summary
- **Total Issues:** ${input.findings.length}
${Object.entries(bySeverity).map(([sev, items]) => `- **${severityEmoji[sev] || ''} ${sev.charAt(0).toUpperCase() + sev.slice(1)}:** ${items.length}`).join('\n')}

## By Category

`;
  
  for (const [type, items] of Object.entries(byType)) {
    report += `### ${type.replace(/-/g, ' ').toUpperCase()} (${items.length})\n`;
    report += items.slice(0, 10).map(f => 
      `- \`${f.file}:${f.line}\` ${severityEmoji[f.severity]} ${f.message}`
    ).join('\n');
    if (items.length > 10) report += `\n  ... and ${items.length - 10} more`;
    report += '\n\n';
  }
  
  report += `## Recommendations\n`;
  
  if (byType['hardcoded-secret']?.length) {
    report += `- ⚠️ **CRITICAL**: Move all secrets to environment variables or secure key management\n`;
  }
  if (byType['sql-injection']?.length) {
    report += `- Fix SQL injection vulnerabilities by using parameter bindings\n`;
  }
  if (byType['xss']?.length) {
    report += `- Sanitize user input before rendering HTML\n`;
  }
  if (byType['command-injection']?.length) {
    report += `- Never pass unsanitized user input to shell commands\n`;
  }
  
  if (input.findings.length === 0) {
    report += '✅ No security issues found!\n';
  }
  
  return { report };
}
```
