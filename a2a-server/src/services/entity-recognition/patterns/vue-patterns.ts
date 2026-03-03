/**
 * Vue Regex Patterns
 *
 * Regular expressions for parsing Vue SFC files and extracting component info.
 * Supports Vue 3 Composition API with <script setup> syntax.
 */

// ============================================
// Script Section Patterns
// ============================================

/**
 * Script setup section pattern
 * Matches: <script setup lang="ts"> ... </script>
 * Captures: script content
 */
export const SCRIPT_SETUP = /<script\s+setup[^>]*>([\s\S]*?)<\/script>/;

/**
 * Standard script section pattern (for options API)
 * Matches: <script lang="ts"> ... </script>
 * Captures: script content
 */
export const SCRIPT_SECTION = /<script[^>]*>([\s\S]*?)<\/script>/;

// ============================================
// Props Patterns
// ============================================

/**
 * TypeScript defineProps with generic type
 * Matches: defineProps<{ prop1: type, prop2?: type }>()
 * Captures: type definition content
 */
export const DEFINE_PROPS_TS = /defineProps<([^>]+)>/;

/**
 * TypeScript defineProps with interface
 * Matches: defineProps<InterfaceName>()
 * Captures: interface name
 */
export const DEFINE_PROPS_INTERFACE = /defineProps<([A-Z]\w+)>/;

/**
 * Object-based defineProps
 * Matches: defineProps({ prop1: { type: String, required: true } })
 * Captures: object content
 */
export const DEFINE_PROPS_OBJ = /defineProps\s*\(\s*\{([\s\S]*?)\}\s*\)/;

/**
 * withDefaults helper pattern
 * Matches: withDefaults(defineProps<...>(), { defaults })
 * Captures: props type, defaults object
 */
export const WITH_DEFAULTS = /withDefaults\s*\(\s*defineProps<([^>]+)>/;

// ============================================
// Emits Patterns
// ============================================

/**
 * TypeScript defineEmits with generic type
 * Matches: defineEmits<{ (e: 'eventName', payload: type): void }>()
 * Captures: type definition content
 */
export const DEFINE_EMITS_TS = /defineEmits<([^>]+)>/;

/**
 * Array-based defineEmits
 * Matches: defineEmits(['event1', 'event2'])
 * Captures: array content
 */
export const DEFINE_EMITS_ARR = /defineEmits\s*\(\s*\[([\s\S]*?)\]\s*\)/;

// ============================================
// Import Patterns
// ============================================

/**
 * Import statement pattern
 * Matches: import { named1, named2 } from 'module' or import default from 'module'
 * Captures: named imports OR default import, module path
 */
export const IMPORT_STATEMENT = /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;

/**
 * Composable import pattern (Vue convention)
 * Matches imports from composables directory
 */
export const COMPOSABLE_IMPORT = /from\s+['"][^'"]*\/(?:composables|use)[^'"]*['"]/;

// ============================================
// Inertia.js Patterns
// ============================================

/**
 * Check for InertiaLink component usage
 */
export const INERTIA_LINK = /<InertiaLink|<Link\b/;

/**
 * usePage composable pattern
 * Matches: usePage() or usePage<PageProps>()
 */
export const INERTIA_USE_PAGE = /usePage\s*\(\s*\)/;

/**
 * useForm composable pattern
 * Matches: useForm(...) or useForm<FormData>(...)
 */
export const INERTIA_USE_FORM = /useForm\s*\(/;

/**
 * Inertia router usage pattern
 * Matches: router.visit(), router.get(), router.post(), etc.
 */
export const INERTIA_ROUTER = /router\.(?:visit|get|post|put|patch|delete)/;

/**
 * Combined Inertia detection
 */
export const USES_INERTIA = new RegExp(
    [INERTIA_LINK.source, INERTIA_USE_PAGE.source, INERTIA_USE_FORM.source, INERTIA_ROUTER.source].join('|')
);

// ============================================
// Component Definition Patterns
// ============================================

/**
 * Options API export default pattern
 * Matches: export default { name: 'ComponentName', ... }
 * Captures: component name (optional)
 */
export const COMPONENT_OPTIONS = /export\s+default\s*\{[\s\S]*?(?:name:\s*['"](\w+)['"])?/;

/**
 * defineComponent pattern
 * Matches: defineComponent({ name: 'ComponentName', ... })
 * Captures: component name
 */
export const DEFINE_COMPONENT = /defineComponent\s*\(\s*\{[\s\S]*?name:\s*['"](\w+)['"]/;

// ============================================
// Lifecycle & Composables Patterns
// ============================================

/**
 * Lifecycle hook pattern
 * Matches: onMounted, onUnmounted, onUpdated, etc.
 */
export const LIFECYCLE_HOOK = /on(?:Mounted|Unmounted|Updated|BeforeMount|BeforeUnmount|BeforeUpdate|Activated|Deactivated|ErrorCaptured)/;

/**
 * VueUse composable pattern
 * Matches common VueUse composables
 */
export const VUE_USE_COMPOSABLE = /use[A-Z]\w+(?:\s*\(|\s+from)/;

// ============================================
// Template Patterns
// ============================================

/**
 * Template section pattern
 * Matches: <template> ... </template>
 * Captures: template content
 */
export const TEMPLATE_SECTION = /<template[^>]*>([\s\S]*?)<\/template>/;

/**
 * Slot usage pattern
 * Matches: <slot name="slotName"> or <slot>
 * Captures: slot name (optional)
 */
export const SLOT_USAGE = /<slot\s*(?:name=['"](\w+)['"])?/;

/**
 * Component usage pattern
 * Matches PascalCase component tags in template
 * Captures: component name
 */
export const COMPONENT_USAGE = /<([A-Z][A-Za-z0-9]*)/g;

// ============================================
// Pattern Collections
// ============================================

/**
 * All Vue patterns grouped by category
 */
export const VUE_PATTERNS = {
    // Script setup
    scriptSetup: SCRIPT_SETUP,

    // Props
    defineProps: DEFINE_PROPS_TS,
    withDefaults: WITH_DEFAULTS,

    // Emits
    defineEmits: DEFINE_EMITS_TS,

    // Imports
    importStatement: IMPORT_STATEMENT,

    // Inertia
    inertiaLink: INERTIA_LINK,
    inertiaUsePage: INERTIA_USE_PAGE,
    inertiaUseForm: INERTIA_USE_FORM,
    inertiaRouter: INERTIA_ROUTER,

    // Component detection
    componentOptions: COMPONENT_OPTIONS,
    defineComponent: DEFINE_COMPONENT,
} as const;

/**
 * Patterns for Inertia page detection
 */
export const INERTIA_PATTERNS = [
    INERTIA_LINK,
    INERTIA_USE_PAGE,
    INERTIA_USE_FORM,
    INERTIA_ROUTER,
];
