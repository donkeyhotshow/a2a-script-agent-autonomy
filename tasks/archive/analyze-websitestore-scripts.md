# Analyze websitestore.com.ua scripts

**Priority**: high  
**Source**: `C:/workspace/domain-platform/websitestore.com.ua/scripts`  
**Task**: Categorize scripts into operational patterns

## Root Scripts Found
- Migration scripts: `migrate-*.ps1` (design-system, form-components, icons, buttons)
- Fix scripts: `fix-*.php`, `fix-*.js`, `fix-*.ps1` (namespace fixes)
- Cleanup: `cleanup-imports.ps1`, `split-i18n-to-features.cjs`
- Check utilities: `find_invalid_use_statements.php`
- Subdirs: `api-route-health-checker/`, `check/`, `detect/`, `dev/`, `frontend-route-health-checker/`, `laravel-route-health-checker/`, `test/`

## Project Context
Laravel + Vue/TypeScript application with PHP backend and TypeScript frontend. Legacy design system migration in progress.

## Patterns
1. **Migration scripts** - PowerShell scripts for component renaming (Foundation → Base)
2. **Namespace fixers** - PHP scripts for fixing use statements after refactoring
3. **Route health checkers** - Node.js tools for API/frontend route validation
4. **Cleanup tools** - Import statement cleanup, i18n splitting

## Output
Document script categories and dependencies