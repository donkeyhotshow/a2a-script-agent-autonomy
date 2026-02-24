# PowerShell ESLint Rules

This document describes the new ESLint rules created for PowerShell script analysis and validation. These rules help maintain code quality, security, and consistency in PowerShell scripts within the project.

## Overview

Since ESLint is primarily designed for JavaScript/TypeScript code, these custom rules analyze PowerShell files (`.ps1`) as text files using regex patterns and string analysis to validate PowerShell code quality.

## Implemented Rules

### 1. `powershell-script-standards` - Core PowerShell Standards

**File:** `powershell-script-standards.mjs`

Comprehensive rule that validates:
- Proper script headers (`#Requires -Version 7.0`)
- SYNOPSIS comments
- Error handling setup (`$ErrorActionPreference`)
- State management usage (`Save-TestState`, `Load-TestState`)
- Parameter validation and typing
- Logging consistency (Write-Log vs Write-Host)
- Path handling security

### 2. `powershell-syntax-validation` - Syntax and Best Practices

**File:** `powershell-syntax-validation.mjs`

Validates PowerShell syntax and best practices:
- Approved PowerShell verbs usage
- Consistent quoting (single quotes for literals)
- Proper cmdlet naming conventions
- Parameter splatting for complex commands
- Backtick avoidance for line continuation
- Alias usage restrictions in scripts
- Join-Path usage for path concatenation

### 3. `powershell-error-handling` - Error Handling Patterns

**File:** `powershell-error-handling.mjs`

Ensures proper error handling:
- Try/catch blocks for critical operations
- `$ErrorActionPreference` configuration
- Proper error logging before throw
- Exit code checking for external commands
- Trap usage for global error handling
- Error variable usage instead of global `$Error`

### 4. `powershell-logging-standards` - Logging Consistency

**File:** `powershell-logging-standards.mjs`

Standardizes logging practices:
- Function entry/exit logging
- Success operation logging
- Error logging with proper context
- Consistent timestamp formatting
- Progress indication for long operations
- Structured logging patterns
- Verbose logging with proper conditions

### 5. `powershell-security-standards` - Security Best Practices

**File:** `powershell-security-standards.mjs`

Security-focused validations:
- Execution policy restrictions
- Secure string handling for passwords
- Input validation for parameters
- Safe web request practices (HTTPS, no insecure redirects)
- Registry access security
- File operation safety checks
- Random number generation security
- Environment variable handling for secrets

### 6. `powershell-naming-conventions` - Naming Standards

**File:** `powershell-naming-conventions.mjs`

Enforces naming conventions:
- Function names: Verb-Noun format with approved verbs
- Variable names: PascalCase, camelCase, or UPPER_CASE
- Parameter names: PascalCase
- Script file names: PascalCase or kebab-case
- Avoidance of Hungarian notation
- Reserved word checking
- Abbreviation guidelines

### 7. `powershell-structure-validation` - Script Organization

**File:** `powershell-structure-validation.mjs`

Validates script structure and organization:
- Proper script sections and comments
- Parameter block organization
- Function ordering by purpose
- Region usage for code grouping
- Script metadata (author, version, date)
- Dependency checking
- Consistent indentation (4 spaces)
- Cleanup section presence

## Usage

These rules are automatically included in the project's ESLint configuration. To run linting on PowerShell scripts:

```bash
# Lint all files (including PowerShell)
npm run lint

# Lint specific PowerShell script
npx eslint scripts/test/01b-linting-analysis.ps1
```

## Configuration

The rules are configured in `eslint-rules/index.mjs` and can be customized by:

1. Modifying rule severity in `.eslintrc.js`
2. Adjusting rule parameters in individual rule files
3. Adding rule exceptions for specific cases

## Benefits

- **Consistency**: Ensures all PowerShell scripts follow the same standards
- **Security**: Validates security best practices and prevents common vulnerabilities
- **Maintainability**: Improves code readability and maintainability
- **Quality**: Catches potential issues before they become problems
- **Standards Compliance**: Enforces project-specific conventions

## Rule Categories

- **Error (🔴)**: Critical issues that must be fixed
- **Warning (🟡)**: Recommended improvements
- **Suggestion (🔵)**: Optional enhancements

## Integration with Development Workflow

These rules integrate with:
- Pre-commit hooks for automatic validation
- CI/CD pipelines for quality gates
- IDE integration for real-time feedback
- Test generation scripts for consistent patterns

## Future Enhancements

Potential improvements:
- PowerShell AST-based parsing for more accurate analysis
- Integration with PSScriptAnalyzer
- Custom formatters for PowerShell-specific output
- Rule auto-fixing capabilities
- Performance optimizations for large script bases