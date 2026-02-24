import type { Neuron } from '../types/knowledge.types.js';
import { aiAgentBestPracticesNeuron } from './ai-agent-best-practices.neuron.js';
import { analyzeControllerSizeNeuron } from './analyze-controller-size.neuron.js';
import { applyEagerLoadingNeuron } from './apply-eager-loading.neuron.js';
import { applyFormRequestNeuron } from './apply-form-request.neuron.js';
import { architectModeNeuron } from './architect-mode.neuron.js';
import { detectA11yKeyboardIssuesNeuron } from './detect-a11y-keyboard-issues.neuron.js';
import { detectA11yMissingAltNeuron } from './detect-a11y-missing-alt.neuron.js';
import { detectA11yMissingAriaNeuron } from './detect-a11y-missing-aria.neuron.js';
import { detectAnyTypesNeuron } from './detect-any-types.neuron.js';
import { detectApiResourcesNeuron } from './detect-api-resources.neuron.js';
import { detectAuthIssuesNeuron } from './detect-auth-issues.neuron.js';
import { detectBladeComponentsNeuron } from './detect-blade-components.neuron.js';
import { detectBladeIncludeIssuesNeuron } from './detect-blade-include-issues.neuron.js';
import { detectBladeXssNeuron } from './detect-blade-xss.neuron.js';
import { detectCsrfIssuesNeuron } from './detect-csrf-issues.neuron.js';
import { detectDockerIssuesNeuron } from './detect-docker-issues.neuron.js';
import { detectDuplicatedCodeNeuron } from './detect-duplicated-code.neuron.js';
import { detectEloquentScopesNeuron } from './detect-eloquent-scopes.neuron.js';
import { detectEloquentSelectAllNeuron } from './detect-eloquent-select-all.neuron.js';
import { detectFormRequestDedupNeuron } from './detect-form-request-dedup.neuron.js';
import { detectGodObjectsNeuron } from './detect-god-objects.neuron.js';
import { detectInertiaPropsValidationNeuron } from './detect-inertia-props-validation.neuron.js';
import { detectInertiaUseformIssuesNeuron } from './detect-inertia-useform-issues.neuron.js';
import { detectInputValidationIssuesNeuron } from './detect-input-validation-issues.neuron.js';
import { detectLaravelRoutesJsMismatchNeuron } from './detect-laravel-routes-js-mismatch.neuron.js';
import { detectMassAssignmentRiskNeuron } from './detect-mass-assignment-risk.neuron.js';
import { detectMemoryLeakPatternsNeuron } from './detect-memory-leak-patterns.neuron.js';
import { detectMissingCsrfTokenNeuron } from './detect-missing-csrf-token.neuron.js';
import { detectMissingFeatureTestsNeuron } from './detect-missing-feature-tests.neuron.js';
import { detectMissingIndexesNeuron } from './detect-missing-indexes.neuron.js';
import { detectMissingLazyLoadingNeuron } from './detect-missing-lazy-loading.neuron.js';
import { detectMissingMiddlewareNeuron } from './detect-missing-middleware.neuron.js';
import { detectMissingTestsNeuron } from './detect-missing-tests.neuron.js';
import { detectMissingValidationNeuron } from './detect-missing-validation.neuron.js';
import { detectN1QueriesNeuron } from './detect-n1-queries.neuron.js';
import { detectOptionsApiNeuron } from './detect-options-api.neuron.js';
import { detectPropDrillingNeuron } from './detect-prop-drilling.neuron.js';
import { detectSecretsInCodeNeuron } from './detect-secrets-in-code.neuron.js';
import { detectSecurityVHtmlNeuron } from './detect-security-v-html.neuron.js';
import { detectSqlInjectionNeuron } from './detect-sql-injection.neuron.js';
import { detectSyncShouldBeQueueNeuron } from './detect-sync-should-be-queue.neuron.js';
import { detectTailwindInlineStylesNeuron } from './detect-tailwind-inline-styles.neuron.js';
import { detectTailwindInvalidClassesNeuron } from './detect-tailwind-invalid-classes.neuron.js';
import { detectTailwindResponsiveMissingNeuron } from './detect-tailwind-responsive-missing.neuron.js';
import { detectTypescriptAnyNeuron } from './detect-typescript-any.neuron.js';
import { detectTypescriptInertiaSharedTypesNeuron } from './detect-typescript-inertia-shared-types.neuron.js';
import { detectTypescriptMissingPropsTypesNeuron } from './detect-typescript-missing-props-types.neuron.js';
import { detectUnusedRoutesNeuron } from './detect-unused-routes.neuron.js';
import { detectValidationErrorsHandlingNeuron } from './detect-validation-errors-handling.neuron.js';
import { detectVifVshowMisuseNeuron } from './detect-vif-vshow-misuse.neuron.js';
import { detectVueLifecycleIssuesNeuron } from './detect-vue-lifecycle-issues.neuron.js';
import { detectVuePropsEmitsIssuesNeuron } from './detect-vue-props-emits-issues.neuron.js';
import { detectVueRefReactiveIssuesNeuron } from './detect-vue-ref-reactive-issues.neuron.js';
import { detectWeakValidationNeuron } from './detect-weak-validation.neuron.js';
import { detectXssVulnerabilitiesNeuron } from './detect-xss-vulnerabilities.neuron.js';
import { detectZiggyUsageIssuesNeuron } from './detect-ziggy-usage-issues.neuron.js';
import { engineerModeNeuron } from './engineer-mode.neuron.js';
import { generateApiEndpointNeuron } from './generate-api-endpoint.neuron.js';
import { generateControllerNeuron } from './generate-controller.neuron.js';
import { generateCrudModuleNeuron } from './generate-crud-module.neuron.js';
import { generateE2eTestsNeuron } from './generate-e2e-tests.neuron.js';
import { generateFormNeuron } from './generate-form.neuron.js';
import { generateMigrationNeuron } from './generate-migration.neuron.js';
import { generateModelNeuron } from './generate-model.neuron.js';
import { generateTsTypesNeuron } from './generate-ts-types.neuron.js';
import { generateUnitTestsNeuron } from './generate-unit-tests.neuron.js';
import { generateVueComponentNeuron } from './generate-vue-component.neuron.js';
import { reviewerModeNeuron } from './reviewer-mode.neuron.js';
import { suggestA11yAltNeuron } from './suggest-a11y-alt.neuron.js';
import { suggestA11yAriaLabelsNeuron } from './suggest-a11y-aria-labels.neuron.js';
import { suggestA11yKeyboardFixNeuron } from './suggest-a11y-keyboard-fix.neuron.js';
import { suggestBladeSafeOutputNeuron } from './suggest-blade-safe-output.neuron.js';
import { suggestCompositionApiNeuron } from './suggest-composition-api.neuron.js';
import { suggestCsrfFixNeuron } from './suggest-csrf-fix.neuron.js';
import { suggestDockerOptimizationNeuron } from './suggest-docker-optimization.neuron.js';
import { suggestEagerLoadingNeuron } from './suggest-eager-loading.neuron.js';
import { suggestExtractMethodNeuron } from './suggest-extract-method.neuron.js';
import { suggestFormRequestNeuron } from './suggest-form-request.neuron.js';
import { suggestInertiaPagePropsTypesNeuron } from './suggest-inertia-page-props-types.neuron.js';
import { suggestInertiaPropsTypesNeuron } from './suggest-inertia-props-types.neuron.js';
import { suggestInertiaUseformFixNeuron } from './suggest-inertia-useform-fix.neuron.js';
import { suggestLazyLoadingNeuron } from './suggest-lazy-loading.neuron.js';
import { suggestMigrationIndexesNeuron } from './suggest-migration-indexes.neuron.js';
import { suggestPasswordHashingNeuron } from './suggest-password-hashing.neuron.js';
import { suggestPhpunitNeuron } from './suggest-phpunit.neuron.js';
import { suggestPlaywrightNeuron } from './suggest-playwright.neuron.js';
import { suggestProvideInjectNeuron } from './suggest-provide-inject.neuron.js';
import { suggestQueueJobNeuron } from './suggest-queue-job.neuron.js';
import { suggestRouteMiddlewareNeuron } from './suggest-route-middleware.neuron.js';
import { suggestSanitizeHtmlNeuron } from './suggest-sanitize-html.neuron.js';
import { suggestSelectColumnsNeuron } from './suggest-select-columns.neuron.js';
import { suggestServiceLayerNeuron } from './suggest-service-layer.neuron.js';
import { suggestTailwindAlternativesNeuron } from './suggest-tailwind-alternatives.neuron.js';
import { suggestTailwindResponsiveNeuron } from './suggest-tailwind-responsive.neuron.js';
import { suggestTailwindValidClassesNeuron } from './suggest-tailwind-valid-classes.neuron.js';
import { suggestTestGenerationNeuron } from './suggest-test-generation.neuron.js';
import { suggestTypescriptPropsTypesNeuron } from './suggest-typescript-props-types.neuron.js';
import { suggestTypescriptTypesNeuron } from './suggest-typescript-types.neuron.js';
import { suggestValidationErrorsFixNeuron } from './suggest-validation-errors-fix.neuron.js';
import { suggestValidationRulesNeuron } from './suggest-validation-rules.neuron.js';
import { suggestVifVshowFixNeuron } from './suggest-vif-vshow-fix.neuron.js';
import { suggestVitestNeuron } from './suggest-vitest.neuron.js';
import { suggestVueCompositionPatternsNeuron } from './suggest-vue-composition-patterns.neuron.js';
import { suggestVueLifecycleFixNeuron } from './suggest-vue-lifecycle-fix.neuron.js';
import { suggestVuePropsEmitsNeuron } from './suggest-vue-props-emits.neuron.js';
import { suggestXssFixNeuron } from './suggest-xss-fix.neuron.js';

export const neurons: Neuron[] = [
  aiAgentBestPracticesNeuron,
  analyzeControllerSizeNeuron,
  applyEagerLoadingNeuron,
  applyFormRequestNeuron,
  architectModeNeuron,
  detectA11yKeyboardIssuesNeuron,
  detectA11yMissingAltNeuron,
  detectA11yMissingAriaNeuron,
  detectAnyTypesNeuron,
  detectApiResourcesNeuron,
  detectAuthIssuesNeuron,
  detectBladeComponentsNeuron,
  detectBladeIncludeIssuesNeuron,
  detectBladeXssNeuron,
  detectCsrfIssuesNeuron,
  detectDockerIssuesNeuron,
  detectDuplicatedCodeNeuron,
  detectEloquentScopesNeuron,
  detectEloquentSelectAllNeuron,
  detectFormRequestDedupNeuron,
  detectGodObjectsNeuron,
  detectInertiaPropsValidationNeuron,
  detectInertiaUseformIssuesNeuron,
  detectInputValidationIssuesNeuron,
  detectLaravelRoutesJsMismatchNeuron,
  detectMassAssignmentRiskNeuron,
  detectMemoryLeakPatternsNeuron,
  detectMissingCsrfTokenNeuron,
  detectMissingFeatureTestsNeuron,
  detectMissingIndexesNeuron,
  detectMissingLazyLoadingNeuron,
  detectMissingMiddlewareNeuron,
  detectMissingTestsNeuron,
  detectMissingValidationNeuron,
  detectN1QueriesNeuron,
  detectOptionsApiNeuron,
  detectPropDrillingNeuron,
  detectSecretsInCodeNeuron,
  detectSecurityVHtmlNeuron,
  detectSqlInjectionNeuron,
  detectSyncShouldBeQueueNeuron,
  detectTailwindInlineStylesNeuron,
  detectTailwindInvalidClassesNeuron,
  detectTailwindResponsiveMissingNeuron,
  detectTypescriptAnyNeuron,
  detectTypescriptInertiaSharedTypesNeuron,
  detectTypescriptMissingPropsTypesNeuron,
  detectUnusedRoutesNeuron,
  detectValidationErrorsHandlingNeuron,
  detectVifVshowMisuseNeuron,
  detectVueLifecycleIssuesNeuron,
  detectVuePropsEmitsIssuesNeuron,
  detectVueRefReactiveIssuesNeuron,
  detectWeakValidationNeuron,
  detectXssVulnerabilitiesNeuron,
  detectZiggyUsageIssuesNeuron,
  engineerModeNeuron,
  generateApiEndpointNeuron,
  generateControllerNeuron,
  generateCrudModuleNeuron,
  generateE2eTestsNeuron,
  generateFormNeuron,
  generateMigrationNeuron,
  generateModelNeuron,
  generateTsTypesNeuron,
  generateUnitTestsNeuron,
  generateVueComponentNeuron,
  reviewerModeNeuron,
  suggestA11yAltNeuron,
  suggestA11yAriaLabelsNeuron,
  suggestA11yKeyboardFixNeuron,
  suggestBladeSafeOutputNeuron,
  suggestCompositionApiNeuron,
  suggestCsrfFixNeuron,
  suggestDockerOptimizationNeuron,
  suggestEagerLoadingNeuron,
  suggestExtractMethodNeuron,
  suggestFormRequestNeuron,
  suggestInertiaPagePropsTypesNeuron,
  suggestInertiaPropsTypesNeuron,
  suggestInertiaUseformFixNeuron,
  suggestLazyLoadingNeuron,
  suggestMigrationIndexesNeuron,
  suggestPasswordHashingNeuron,
  suggestPhpunitNeuron,
  suggestPlaywrightNeuron,
  suggestProvideInjectNeuron,
  suggestQueueJobNeuron,
  suggestRouteMiddlewareNeuron,
  suggestSanitizeHtmlNeuron,
  suggestSelectColumnsNeuron,
  suggestServiceLayerNeuron,
  suggestTailwindAlternativesNeuron,
  suggestTailwindResponsiveNeuron,
  suggestTailwindValidClassesNeuron,
  suggestTestGenerationNeuron,
  suggestTypescriptPropsTypesNeuron,
  suggestTypescriptTypesNeuron,
  suggestValidationErrorsFixNeuron,
  suggestValidationRulesNeuron,
  suggestVifVshowFixNeuron,
  suggestVitestNeuron,
  suggestVueCompositionPatternsNeuron,
  suggestVueLifecycleFixNeuron,
  suggestVuePropsEmitsNeuron,
  suggestXssFixNeuron
];
