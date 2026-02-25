/**
 * Lint Neurons: PowerShell
 *
 * Реализация на основе плана: plans/custom-lint-neurons.md
 *
 * Нейроны для обнаружения проблем в PowerShell скриптах:
 * - syntax errors
 * - error handling issues
 * - security issues
 * - naming convention violations
 */

import type { Neuron } from '../types/knowledge.types.js';

// PowerShell syntax errors detector
export const detectPowershellSyntaxErrors: Neuron = {
  id: 'lint-detect-powershell-syntax-errors',
  name: 'Detect PowerShell Syntax Errors',
  category: 'custom_lint',
  triggers: ['powershell', 'script', '.ps1'],
  knowledge: {
    description: 'Обнаруживает синтаксические ошибки в PowerShell',
    rule: {
      name: 'powershell/syntax-validation',
      severity: 'error',
      message: 'Обнаружена синтаксическая ошибка в PowerShell',
      patterns: [
        /\$\w+\s+=\s+/g, // неправильное присваивание без $
      ],
    },
    language: 'powershell',
    framework: 'scripts',
    fix: 'Проверьте синтаксис PowerShell: присваивание через $=, используйте Write-Host, etc.',
    examples: {
      bad: 'variable = "value"',
      good: '$variable = "value"',
    },
  },
  actions: [
    { type: 'analyze', target: 'code-blocks' },
    { type: 'inject', target: 'lint-results' },
  ],
  triggersMode: 'any',
  priority: 9, // высокий приоритет
};

// PowerShell error handling detector
export const detectPowershellErrorHandling: Neuron = {
  id: 'lint-detect-powershell-error-handling',
  name: 'Detect PowerShell Error Handling',
  category: 'custom_lint',
  triggers: ['try', 'catch', 'error', 'exception'],
  knowledge: {
    description: 'Обнаруживает отсутствие обработки ошибок в PowerShell',
    rule: {
      name: 'powershell/error-handling',
      severity: 'warning',
      message: 'PowerShell скрипты должны иметь обработку ошибок',
      patterns: [
        /\w+-Object\s*\|/g, // конвейер без error handling
      ],
    },
    language: 'powershell',
    framework: 'scripts',
    fix: 'Используйте try-catch блоки и $ErrorActionPreference',
    examples: {
      bad: 'Get-Process | Where-Object { $_.CPU -gt 100 }',
      good: 'try { Get-Process -ErrorAction Stop | ... } catch { ... }',
    },
  },
  actions: [
    { type: 'analyze', target: 'code-blocks' },
    { type: 'inject', target: 'lint-results' },
  ],
  triggersMode: 'any',
  priority: 7,
};

// PowerShell security issues detector
export const detectPowershellSecurityIssues: Neuron = {
  id: 'lint-detect-powershell-security-issues',
  name: 'Detect PowerShell Security Issues',
  category: 'custom_lint',
  triggers: ['credential', 'password', 'secret', 'encryption'],
  knowledge: {
    description: 'Обнаруживает проблемы безопасности в PowerShell',
    rule: {
      name: 'powershell/security-standards',
      severity: 'error',
      message: 'Обнаружена проблема безопасности в PowerShell',
      patterns: [
        /-Password\s+["'][^"']+["']/gi,
        /-Credential\s+["'][^"']+["']/gi,
        /ConvertTo-SecureString\s+["'][^"']+["']/gi,
      ],
    },
    language: 'powershell',
    framework: 'scripts',
    fix: 'Используйте Get-Credential или SecureString для хранения учётных данных',
    examples: {
      bad: '-Password "MySecretPassword"',
      good: '-Credential (Get-Credential) или $securePassword | ConvertTo-SecureString',
    },
  },
  actions: [
    { type: 'analyze', target: 'code-blocks' },
    { type: 'inject', target: 'lint-results' },
  ],
  triggersMode: 'any',
  priority: 9,
};

// PowerShell naming conventions detector
export const detectPowershellNamingConventions: Neuron = {
  id: 'lint-detect-powershell-naming-conventions',
  name: 'Detect PowerShell Naming Conventions',
  category: 'custom_lint',
  triggers: ['function', 'variable', 'param', 'naming'],
  knowledge: {
    description: 'Обнаруживает нарушения соглашений об именовании PowerShell',
    rule: {
      name: 'powershell/naming-conventions',
      severity: 'warning',
      message: 'PowerShell использует Verb-Noun соглашение для имён',
      patterns: [
        /function\s+[a-z]+[A-Z]\w+/g, // не Verb-Noun
        /\$\w+[A-Z]\w+/g, // не camelCase для переменных
      ],
    },
    language: 'powershell',
    framework: 'scripts',
    fix: 'Используйте Verb-Noun: Get-User, Set-Config. Переменные: $userName',
    examples: {
      bad: 'function myFunction() { $UserName = ... }',
      good: 'function Get-User() { $userName = ... }',
    },
  },
  actions: [
    { type: 'analyze', target: 'code-blocks' },
    { type: 'inject', target: 'lint-results' },
  ],
  triggersMode: 'any',
  priority: 5,
};

// Export all PowerShell lint neurons
export const lintPowershellNeurons: Neuron[] = [
  detectPowershellSyntaxErrors,
  detectPowershellErrorHandling,
  detectPowershellSecurityIssues,
  detectPowershellNamingConventions,
];
