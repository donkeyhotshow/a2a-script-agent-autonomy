/**
 * ESLint плагин для Inertia.js, PowerShell, PHP и Testing правил (ES Module)
 *
 * Правила согласно ADR:
 * - ADR 508: Стратегия навигации в Inertia.js приложении
 * - ADR 522: Архитектурные нарушения в использовании Inertia.js
 * - ADR 1025: Архитектура использования Head компонента в Inertia.js
 * - ADR 1023: Component Accessibility Compliance Framework
 * - ADR 1027: Unified Icon Usage Framework
 * - ADR 2004: Testing-First Standards
 * - ADR 403: Security Standards
 * - ADR 1001: PHP Code Standards
 * - ADR 1101: Laravel Architecture Standards
 * - ADR 1201: Database Layer Standards
 * - ADR 1301: Configuration Files Standards
 *
 * PowerShell правила:
 * - powershell-script-standards: Комплексные стандарты PowerShell скриптов
 * - powershell-syntax-validation: Проверка синтаксиса и лучших практик
 * - powershell-error-handling: Стандарты обработки ошибок
 * - powershell-logging-standards: Стандарты логирования
 * - powershell-security-standards: Правила безопасности
 * - powershell-naming-conventions: Соглашения об именовании
 * - powershell-structure-validation: Валидация структуры скриптов
 *
 * PHP правила:
 * - php-code-standards: Стандарты PHP кода (PSR, Laravel conventions)
 * - php-security-standards: Правила безопасности PHP (OWASP, Laravel security)
 * - php-testing-standards: Стандарты PHP тестирования (PHPUnit, Laravel testing)
 * - database-layer-standards: Стандарты работы с БД (миграции, модели, сиды)
 *
 * Testing правила:
 * - typescript-testing-standards: Стандарты TypeScript тестирования (Vitest, Playwright, E2E)
 * - javascript-testing-standards: Стандарты JavaScript тестирования (Jest, Performance, API)
 *
 * Configuration правила:
 * - configuration-files-standards: Стандарты конфигурационных файлов (Vite, Vitest, Playwright)
 */

const noAnchorNavigation = require('./inertia-no-anchor-navigation.cjs')
const noWindowLocation = require('./inertia-no-window-location.cjs')
const noUnlocalizedNavigation = require('./inertia-no-unlocalized-navigation.cjs')
const noMetaTagsInVueTemplates = require('./no-meta-tags-in-vue-templates.cjs')
const noFetch = require('./inertia-no-fetch.cjs')
const routerVisitOptions = require('./inertia-router-visit-options.cjs')
const useFormRequired = require('./inertia-use-form-required.cjs')
const inertiaStandardComposables = require('./inertia-standard-composables.cjs')
const accessibilityRules = require('./accessibility-rules.cjs')
const iconUsageFramework = require('./icon-usage-framework.cjs')
const componentRefactoringStandards = require('./component-refactoring-standards.cjs')
const i18nStandards = require('./i18n-standards.cjs')
const dataFlowDomainAlignment = require('./data-flow-domain-alignment.cjs')
const componentStylingStandards = require('./component-styling-standards.cjs')
const baseComponentsUsage = require('./base-components-usage.cjs')
const testingFirstStandards = require('./testing-first-standards.cjs')
const securityStandards = require('./security-standards.cjs')

// PowerShell-specific rules
const powershellScriptStandards = require('./powershell-script-standards.cjs')
const powershellSyntaxValidation = require('./powershell-syntax-validation.cjs')
const powershellErrorHandling = require('./powershell-error-handling.cjs')
const powershellLoggingStandards = require('./powershell-logging-standards.cjs')
const powershellSecurityStandards = require('./powershell-security-standards.cjs')
const powershellNamingConventions = require('./powershell-naming-conventions.cjs')
const powershellStructureValidation = require('./powershell-structure-validation.cjs')

// PHP-specific rules
const phpCodeStandards = require('./php-code-standards.cjs')
const phpSecurityStandards = require('./php-security-standards.cjs')
const phpTestingStandards = require('./php-testing-standards.cjs')
const phpInvalidUseStatements = require('./php-invalid-use-statements.cjs')

// Testing-specific rules
const typescriptTestingStandards = require('./typescript-testing-standards.cjs')
const javascriptTestingStandards = require('./javascript-testing-standards.cjs')

// Configuration and Database rules
const configurationFilesStandards = require('./configuration-files-standards.cjs')
const databaseLayerStandards = require('./database-layer-standards.cjs')

// Styling validation rules
const noInvalidClasses = require('./no-invalid-classes.cjs')
const requireResponsiveClasses = require('./require-responsive-classes.cjs')
const suggestStylingImprovements = require('./suggest-styling-improvements.cjs')

module.exports = {
    meta: {
        name: 'inertia',
        version: '1.0.0'
    },
    rules: {
        // ADR 508: Навигация
        'no-anchor-navigation': noAnchorNavigation,
        'no-window-location': noWindowLocation,
        'no-unlocalized-navigation': noUnlocalizedNavigation,
        'router-visit-options': routerVisitOptions,

        // ADR 522: Архитектурные нарушения
        'no-fetch': noFetch,
        'use-form-required': useFormRequired,
        'standard-composables': inertiaStandardComposables,

        // ADR 1025: Head компонент
        'no-meta-tags-in-vue-templates': noMetaTagsInVueTemplates,

        // ADR 1023: Доступность компонентов
        'accessibility-rules': accessibilityRules,

        // ADR 1027: Unified Icon Usage Framework
        'icon-usage-framework': iconUsageFramework,

        // ADR 1036: Component Refactoring Standards
        'component-refactoring-standards': componentRefactoringStandards,
        'i18n-standards': i18nStandards,

        // ADR 1103: Data Flow Domain Alignment Framework
        'data-flow-domain-alignment': dataFlowDomainAlignment,

        // Component Styling Standards
        'component-styling-standards': componentStylingStandards,
        'base-components-usage': baseComponentsUsage,

        // ADR 2004: Testing-First Standards
        'testing-first-standards': testingFirstStandards,

        // ADR 403: Security Standards
        'security-standards': securityStandards,

        // PowerShell Script Standards
        'powershell-script-standards': powershellScriptStandards,
        'powershell-syntax-validation': powershellSyntaxValidation,
        'powershell-error-handling': powershellErrorHandling,
        'powershell-logging-standards': powershellLoggingStandards,
        'powershell-security-standards': powershellSecurityStandards,
        'powershell-naming-conventions': powershellNamingConventions,
        'powershell-structure-validation': powershellStructureValidation,

        // PHP Code Standards
        'php-code-standards': phpCodeStandards,
        'php-security-standards': phpSecurityStandards,
        'php-testing-standards': phpTestingStandards,
        'php-invalid-use-statements': phpInvalidUseStatements,

        // Testing Standards
        'typescript-testing-standards': typescriptTestingStandards,
        'javascript-testing-standards': javascriptTestingStandards,

        // Configuration and Database Standards
        'configuration-files-standards': configurationFilesStandards,
        'database-layer-standards': databaseLayerStandards,

        // Styling Validation Rules
        'no-invalid-classes': noInvalidClasses,
        'require-responsive-classes': requireResponsiveClasses,
        'suggest-styling-improvements': suggestStylingImprovements
    }
}
