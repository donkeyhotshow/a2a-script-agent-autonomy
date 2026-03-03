/**
 * PHP Regex Patterns
 *
 * Regular expressions for parsing PHP code and extracting entities.
 * All patterns are designed to handle common Laravel patterns.
 */

/**
 * Class declaration pattern
 * Matches: class ClassName extends ParentClass implements Interface1, Interface2
 * Captures: class name, optional parent class, optional interfaces
 */
export const CLASS_DECLARATION = /class\s+(\w+)\s*(?:extends\s+(\w+))?\s*(?:implements\s+([\w,\s]+))?/g;

/**
 * Namespace pattern
 * Matches: namespace Namespace\SubNamespace;
 * Captures: full namespace
 */
export const NAMESPACE = /namespace\s+([\w\\]+);/g;

// ============================================
// Model Patterns
// ============================================

/**
 * Check if class extends Model
 * Used to identify Eloquent models
 */
export const MODEL_EXTENDS = /extends\s+Model\b/;

/**
 * Table name definition
 * Matches: protected $table = 'table_name';
 * Captures: table name
 */
export const MODEL_TABLE = /protected\s+\$table\s*=\s*['"](\w+)['"];/;

/**
 * Fillable fields definition
 * Matches: protected $fillable = ['field1', 'field2'];
 * Captures: content inside brackets
 */
export const MODEL_FILLABLE = /protected\s+\$fillable\s*=\s*\[([\s\S]*?)\];/;

/**
 * Casts definition
 * Matches: protected $casts = ['field' => 'type'];
 * Captures: content inside brackets
 */
export const MODEL_CASTS = /protected\s+\$casts\s*=\s*\[([\s\S]*?)\];/;

// ============================================
// Eloquent Relations
// ============================================

/**
 * BelongsTo relation pattern
 * Matches: public function relationName() { ... return $this->belongsTo(...); }
 * Captures: method name, related model
 */
export const BELONGS_TO = /(?:public|protected)\s+function\s+(\w+)\s*\(\)\s*\{[\s\S]*?return\s+\$this->belongsTo\(([^)]+)\)/g;

/**
 * HasMany relation pattern
 * Matches: public function relationName() { ... return $this->hasMany(...); }
 * Captures: method name, related model
 */
export const HAS_MANY = /(?:public|protected)\s+function\s+(\w+)\s*\(\)\s*\{[\s\S]*?return\s+\$this->hasMany\(([^)]+)\)/g;

/**
 * HasOne relation pattern
 * Matches: public function relationName() { ... return $this->hasOne(...); }
 * Captures: method name, related model
 */
export const HAS_ONE = /(?:public|protected)\s+function\s+(\w+)\s*\(\)\s*\{[\s\S]*?return\s+\$this->hasOne\(([^)]+)\)/g;

/**
 * BelongsToMany relation pattern
 * Matches: public function relationName() { ... return $this->belongsToMany(...); }
 * Captures: method name, related model
 */
export const BELONGS_TO_MANY = /(?:public|protected)\s+function\s+(\w+)\s*\(\)\s*\{[\s\S]*?return\s+\$this->belongsToMany\(([^)]+)\)/g;

/**
 * MorphTo relation pattern (polymorphic)
 * Matches: public function relationName() { ... return $this->morphTo(); }
 * Captures: method name
 */
export const MORPH_TO = /(?:public|protected)\s+function\s+(\w+)\s*\(\)\s*\{[\s\S]*?return\s+\$this->morphTo\(\)/g;

/**
 * MorphMany relation pattern (polymorphic)
 * Matches: public function relationName() { ... return $this->morphMany(...); }
 * Captures: method name, related model
 */
export const MORPH_MANY = /(?:public|protected)\s+function\s+(\w+)\s*\(\)\s*\{[\s\S]*?return\s+\$this->morphMany\(([^)]+)\)/g;

// ============================================
// Controller Patterns
// ============================================

/**
 * Check if class extends Controller
 */
export const CONTROLLER_EXTENDS = /extends\s+Controller\b/;

/**
 * Controller method pattern
 * Matches: public/protected/private function methodName(params)
 * Captures: method name, parameters
 */
export const CONTROLLER_METHOD = /(?:public|protected|private)\s+function\s+(\w+)\s*\(([^)]*)\)/g;

/**
 * Middleware assignment pattern
 * Matches: $this->middleware('middlewareName');
 * Captures: middleware name
 */
export const MIDDLEWARE = /\$this->middleware\(['"](\w+)['"]\)/g;

// ============================================
// Request Patterns
// ============================================

/**
 * Check if class extends FormRequest
 */
export const FORM_REQUEST_EXTENDS = /extends\s+FormRequest\b/;

/**
 * Rules method pattern
 * Matches: public function rules() { ... }
 * Captures: method body
 */
export const RULES_METHOD = /public\s+function\s+rules\s*\(\)[\s\S]*?\{([\s\S]*?)\n\s*\}/;

// ============================================
// Service Patterns
// ============================================

/**
 * Service class naming pattern
 * Matches: class SomethingService
 * Captures: class name
 */
export const SERVICE_CLASS = /class\s+(\w+)Service\b/;

// ============================================
// Pattern Collections
// ============================================

/**
 * All PHP patterns grouped by category
 */
export const PHP_PATTERNS = {
    // Class detection
    classDeclaration: CLASS_DECLARATION,
    namespace: NAMESPACE,

    // Model patterns
    modelExtends: MODEL_EXTENDS,
    modelTable: MODEL_TABLE,
    modelFillable: MODEL_FILLABLE,
    modelCasts: MODEL_CASTS,

    // Eloquent relations
    belongsTo: BELONGS_TO,
    hasMany: HAS_MANY,
    hasOne: HAS_ONE,
    belongsToMany: BELONGS_TO_MANY,
    morphTo: MORPH_TO,
    morphMany: MORPH_MANY,

    // Controller patterns
    controllerExtends: CONTROLLER_EXTENDS,
    controllerMethod: CONTROLLER_METHOD,
    middleware: MIDDLEWARE,

    // Request patterns
    formRequestExtends: FORM_REQUEST_EXTENDS,
    rulesMethod: RULES_METHOD,

    // Service patterns
    serviceClass: SERVICE_CLASS,
} as const;

/**
 * Relation patterns for iteration
 * Used when extracting all model relations
 */
export const RELATION_PATTERNS = [
    { pattern: BELONGS_TO, type: 'belongsTo' as const },
    { pattern: HAS_MANY, type: 'hasMany' as const },
    { pattern: HAS_ONE, type: 'hasOne' as const },
    { pattern: BELONGS_TO_MANY, type: 'belongsToMany' as const },
    { pattern: MORPH_TO, type: 'morphTo' as const },
    { pattern: MORPH_MANY, type: 'morphMany' as const },
];
