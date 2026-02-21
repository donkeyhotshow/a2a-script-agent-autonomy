import type { Neuron } from '../types/knowledge.types.js';
import { detectN1QueriesNeuron } from './detect-n1-queries.neuron.js';
import { suggestEagerLoadingNeuron } from './suggest-eager-loading.neuron.js';
import { applyEagerLoadingNeuron } from './apply-eager-loading.neuron.js';
import { detectMissingValidationNeuron } from './detect-missing-validation.neuron.js';
import { suggestValidationRulesNeuron } from './suggest-validation-rules.neuron.js';
import { suggestFormRequestNeuron } from './suggest-form-request.neuron.js';
import { applyFormRequestNeuron } from './apply-form-request.neuron.js';
import { detectMassAssignmentRiskNeuron } from './detect-mass-assignment-risk.neuron.js';
import { detectMissingMiddlewareNeuron } from './detect-missing-middleware.neuron.js';
import { suggestRouteMiddlewareNeuron } from './suggest-route-middleware.neuron.js';
import { detectEloquentSelectAllNeuron } from './detect-eloquent-select-all.neuron.js';
import { suggestSelectColumnsNeuron } from './suggest-select-columns.neuron.js';
import { detectMissingIndexesNeuron } from './detect-missing-indexes.neuron.js';
import { suggestMigrationIndexesNeuron } from './suggest-migration-indexes.neuron.js';
import { detectBladeXssNeuron } from './detect-blade-xss.neuron.js';
import { suggestBladeSafeOutputNeuron } from './suggest-blade-safe-output.neuron.js';
import { detectCsrfIssuesNeuron } from './detect-csrf-issues.neuron.js';
import { suggestCsrfFixNeuron } from './suggest-csrf-fix.neuron.js';
import { detectValidationErrorsHandlingNeuron } from './detect-validation-errors-handling.neuron.js';
import { suggestValidationErrorsFixNeuron } from './suggest-validation-errors-fix.neuron.js';
import { detectUnusedRoutesNeuron } from './detect-unused-routes.neuron.js';
import { detectSyncShouldBeQueueNeuron } from './detect-sync-should-be-queue.neuron.js';
import { suggestQueueJobNeuron } from './suggest-queue-job.neuron.js';
import { detectWeakValidationNeuron } from './detect-weak-validation.neuron.js';
import { detectBladeIncludeIssuesNeuron } from './detect-blade-include-issues.neuron.js';
import { detectInertiaUseformIssuesNeuron } from './detect-inertia-useform-issues.neuron.js';
import { suggestInertiaUseformFixNeuron } from './suggest-inertia-useform-fix.neuron.js';
import { detectInertiaPropsValidationNeuron } from './detect-inertia-props-validation.neuron.js';
import { suggestInertiaPropsTypesNeuron } from './suggest-inertia-props-types.neuron.js';
import { detectVueRefReactiveIssuesNeuron } from './detect-vue-ref-reactive-issues.neuron.js';
import { suggestVueCompositionPatternsNeuron } from './suggest-vue-composition-patterns.neuron.js';
import { detectVuePropsEmitsIssuesNeuron } from './detect-vue-props-emits-issues.neuron.js';
import { suggestVuePropsEmitsNeuron } from './suggest-vue-props-emits.neuron.js';
import { detectVueLifecycleIssuesNeuron } from './detect-vue-lifecycle-issues.neuron.js';
import { suggestVueLifecycleFixNeuron } from './suggest-vue-lifecycle-fix.neuron.js';
import { detectVifVshowMisuseNeuron } from './detect-vif-vshow-misuse.neuron.js';
import { suggestVifVshowFixNeuron } from './suggest-vif-vshow-fix.neuron.js';
import { detectMissingLazyLoadingNeuron } from './detect-missing-lazy-loading.neuron.js';
import { suggestLazyLoadingNeuron } from './suggest-lazy-loading.neuron.js';
import { detectMemoryLeakPatternsNeuron } from './detect-memory-leak-patterns.neuron.js';
import { detectOptionsApiNeuron } from './detect-options-api.neuron.js';
import { suggestCompositionApiNeuron } from './suggest-composition-api.neuron.js';
import { detectPropDrillingNeuron } from './detect-prop-drilling.neuron.js';
import { suggestProvideInjectNeuron } from './suggest-provide-inject.neuron.js';
import { detectLaravelRoutesJsMismatchNeuron } from './detect-laravel-routes-js-mismatch.neuron.js';
import { detectZiggyUsageIssuesNeuron } from './detect-ziggy-usage-issues.neuron.js';
import { detectTypescriptMissingPropsTypesNeuron } from './detect-typescript-missing-props-types.neuron.js';
import { suggestTypescriptPropsTypesNeuron } from './suggest-typescript-props-types.neuron.js';
import { detectTypescriptAnyNeuron } from './detect-typescript-any.neuron.js';
import { suggestTypescriptTypesNeuron } from './suggest-typescript-types.neuron.js';
import { detectTypescriptInertiaSharedTypesNeuron } from './detect-typescript-inertia-shared-types.neuron.js';
import { suggestInertiaPagePropsTypesNeuron } from './suggest-inertia-page-props-types.neuron.js';
import { detectAnyTypesNeuron } from './detect-any-types.neuron.js';
import { generateTsTypesNeuron } from './generate-ts-types.neuron.js';
import { detectSecurityVHtmlNeuron } from './detect-security-v-html.neuron.js';
import { suggestSanitizeHtmlNeuron } from './suggest-sanitize-html.neuron.js';
import { detectXssVulnerabilitiesNeuron } from './detect-xss-vulnerabilities.neuron.js';
import { suggestXssFixNeuron } from './suggest-xss-fix.neuron.js';
import { detectMissingCsrfTokenNeuron } from './detect-missing-csrf-token.neuron.js';
import { detectInputValidationIssuesNeuron } from './detect-input-validation-issues.neuron.js';
import { detectSqlInjectionNeuron } from './detect-sql-injection.neuron.js';
import { detectSecretsInCodeNeuron } from './detect-secrets-in-code.neuron.js';
import { detectAuthIssuesNeuron } from './detect-auth-issues.neuron.js';
import { suggestPasswordHashingNeuron } from './suggest-password-hashing.neuron.js';
import { detectTailwindInlineStylesNeuron } from './detect-tailwind-inline-styles.neuron.js';
import { suggestTailwindAlternativesNeuron } from './suggest-tailwind-alternatives.neuron.js';
import { detectTailwindInvalidClassesNeuron } from './detect-tailwind-invalid-classes.neuron.js';
import { suggestTailwindValidClassesNeuron } from './suggest-tailwind-valid-classes.neuron.js';
import { detectTailwindResponsiveMissingNeuron } from './detect-tailwind-responsive-missing.neuron.js';
import { suggestTailwindResponsiveNeuron } from './suggest-tailwind-responsive.neuron.js';
import { detectA11yMissingAltNeuron } from './detect-a11y-missing-alt.neuron.js';
import { suggestA11yAltNeuron } from './suggest-a11y-alt.neuron.js';
import { detectA11yMissingAriaNeuron } from './detect-a11y-missing-aria.neuron.js';
import { suggestA11yAriaLabelsNeuron } from './suggest-a11y-aria-labels.neuron.js';
import { detectA11yKeyboardIssuesNeuron } from './detect-a11y-keyboard-issues.neuron.js';
import { suggestA11yKeyboardFixNeuron } from './suggest-a11y-keyboard-fix.neuron.js';
import { detectMissingTestsNeuron } from './detect-missing-tests.neuron.js';
import { suggestTestGenerationNeuron } from './suggest-test-generation.neuron.js';
import { detectMissingFeatureTestsNeuron } from './detect-missing-feature-tests.neuron.js';
import { generateUnitTestsNeuron } from './generate-unit-tests.neuron.js';
import { generateE2eTestsNeuron } from './generate-e2e-tests.neuron.js';
import { suggestPhpunitNeuron } from './suggest-phpunit.neuron.js';
import { suggestVitestNeuron } from './suggest-vitest.neuron.js';
import { suggestPlaywrightNeuron } from './suggest-playwright.neuron.js';
import { generateCrudModuleNeuron } from './generate-crud-module.neuron.js';
import { generateFormNeuron } from './generate-form.neuron.js';
import { generateMigrationNeuron } from './generate-migration.neuron.js';
import { generateModelNeuron } from './generate-model.neuron.js';
import { generateControllerNeuron } from './generate-controller.neuron.js';
import { generateVueComponentNeuron } from './generate-vue-component.neuron.js';
import { generateApiEndpointNeuron } from './generate-api-endpoint.neuron.js';
import { analyzeControllerSizeNeuron } from './analyze-controller-size.neuron.js';
import { suggestServiceLayerNeuron } from './suggest-service-layer.neuron.js';
import { detectGodObjectsNeuron } from './detect-god-objects.neuron.js';
import { detectDuplicatedCodeNeuron } from './detect-duplicated-code.neuron.js';
import { suggestExtractMethodNeuron } from './suggest-extract-method.neuron.js';
import { detectEloquentScopesNeuron } from './detect-eloquent-scopes.neuron.js';
import { detectApiResourcesNeuron } from './detect-api-resources.neuron.js';
import { detectFormRequestDedupNeuron } from './detect-form-request-dedup.neuron.js';
import { detectBladeComponentsNeuron } from './detect-blade-components.neuron.js';

export const neurons: Neuron[] = [
  detectN1QueriesNeuron,
  suggestEagerLoadingNeuron,
  applyEagerLoadingNeuron,
  detectMissingValidationNeuron,
  suggestValidationRulesNeuron,
  suggestFormRequestNeuron,
  applyFormRequestNeuron,
  detectMassAssignmentRiskNeuron,
  detectMissingMiddlewareNeuron,
  suggestRouteMiddlewareNeuron,
  detectEloquentSelectAllNeuron,
  suggestSelectColumnsNeuron,
  detectMissingIndexesNeuron,
  suggestMigrationIndexesNeuron,
  detectBladeXssNeuron,
  suggestBladeSafeOutputNeuron,
  detectCsrfIssuesNeuron,
  suggestCsrfFixNeuron,
  detectValidationErrorsHandlingNeuron,
  suggestValidationErrorsFixNeuron,
  detectUnusedRoutesNeuron,
  detectSyncShouldBeQueueNeuron,
  suggestQueueJobNeuron,
  detectWeakValidationNeuron,
  detectBladeIncludeIssuesNeuron,
  detectInertiaUseformIssuesNeuron,
  suggestInertiaUseformFixNeuron,
  detectInertiaPropsValidationNeuron,
  suggestInertiaPropsTypesNeuron,
  detectVueRefReactiveIssuesNeuron,
  suggestVueCompositionPatternsNeuron,
  detectVuePropsEmitsIssuesNeuron,
  suggestVuePropsEmitsNeuron,
  detectVueLifecycleIssuesNeuron,
  suggestVueLifecycleFixNeuron,
  detectVifVshowMisuseNeuron,
  suggestVifVshowFixNeuron,
  detectMissingLazyLoadingNeuron,
  suggestLazyLoadingNeuron,
  detectMemoryLeakPatternsNeuron,
  detectOptionsApiNeuron,
  suggestCompositionApiNeuron,
  detectPropDrillingNeuron,
  suggestProvideInjectNeuron,
  detectLaravelRoutesJsMismatchNeuron,
  detectZiggyUsageIssuesNeuron,
  detectTypescriptMissingPropsTypesNeuron,
  suggestTypescriptPropsTypesNeuron,
  detectTypescriptAnyNeuron,
  suggestTypescriptTypesNeuron,
  detectTypescriptInertiaSharedTypesNeuron,
  suggestInertiaPagePropsTypesNeuron,
  detectAnyTypesNeuron,
  generateTsTypesNeuron,
  detectSecurityVHtmlNeuron,
  suggestSanitizeHtmlNeuron,
  detectXssVulnerabilitiesNeuron,
  suggestXssFixNeuron,
  detectMissingCsrfTokenNeuron,
  detectInputValidationIssuesNeuron,
  detectSqlInjectionNeuron,
  detectSecretsInCodeNeuron,
  detectAuthIssuesNeuron,
  suggestPasswordHashingNeuron,
  detectTailwindInlineStylesNeuron,
  suggestTailwindAlternativesNeuron,
  detectTailwindInvalidClassesNeuron,
  suggestTailwindValidClassesNeuron,
  detectTailwindResponsiveMissingNeuron,
  suggestTailwindResponsiveNeuron,
  detectA11yMissingAltNeuron,
  suggestA11yAltNeuron,
  detectA11yMissingAriaNeuron,
  suggestA11yAriaLabelsNeuron,
  detectA11yKeyboardIssuesNeuron,
  suggestA11yKeyboardFixNeuron,
  detectMissingTestsNeuron,
  suggestTestGenerationNeuron,
  detectMissingFeatureTestsNeuron,
  generateUnitTestsNeuron,
  generateE2eTestsNeuron,
  suggestPhpunitNeuron,
  suggestVitestNeuron,
  suggestPlaywrightNeuron,
  generateCrudModuleNeuron,
  generateFormNeuron,
  generateMigrationNeuron,
  generateModelNeuron,
  generateControllerNeuron,
  generateVueComponentNeuron,
  generateApiEndpointNeuron,
  analyzeControllerSizeNeuron,
  suggestServiceLayerNeuron,
  detectGodObjectsNeuron,
  detectDuplicatedCodeNeuron,
  suggestExtractMethodNeuron,
  detectEloquentScopesNeuron,
  detectApiResourcesNeuron,
  detectFormRequestDedupNeuron,
  detectBladeComponentsNeuron,
];
