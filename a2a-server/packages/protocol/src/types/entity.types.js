/**
 * Entity Types for Knowledge Graph
 *
 * Реализация на основе плана: plans/types-improvements.md
 *
 * Recognized entities from code analysis
 */
// ============================================
// Type Guards (plans/types-improvements.md)
// ============================================
/**
 * Check if value is a valid EntityTypeName
 */
export function isEntityTypeName(value) {
    if (typeof value !== 'string')
        return false;
    const validTypes = [
        'MODEL', 'CONTROLLER', 'SERVICE', 'REPOSITORY', 'MIDDLEWARE',
        'VUE_COMPONENT', 'COMPOSABLE', 'PHP', 'JS', 'CONFIG', 'REQUEST', 'VUE_PAGE', 'OTHER'
    ];
    return validTypes.includes(value);
}
/**
 * Check if value is a valid RelationTypeName
 */
export function isRelationTypeName(value) {
    if (typeof value !== 'string')
        return false;
    const validTypes = [
        'USES', 'CREATES', 'VALIDATES', 'HANDLES', 'CALLS', 'EXTENDS',
        'IMPLEMENTS', 'IMPORTS', 'RENDERS', 'BELONGS_TO', 'HAS_MANY', 'HAS_ONE'
    ];
    return validTypes.includes(value);
}
/**
 * Check if value is a RecognizedEntity
 */
export function isRecognizedEntity(value) {
    if (!value || typeof value !== 'object')
        return false;
    const obj = value;
    return (typeof obj.id === 'string' &&
        isEntityTypeName(obj.type) &&
        typeof obj.name === 'string' &&
        typeof obj.path === 'string');
}
/**
 * Check if value is a RecognizedRelation
 */
export function isRecognizedRelation(value) {
    if (!value || typeof value !== 'object')
        return false;
    const obj = value;
    return (typeof obj.id === 'string' &&
        typeof obj.fromPath === 'string' &&
        isRelationTypeName(obj.type));
}
/**
 * Check if value is a RecognitionResult
 */
export function isRecognitionResult(value) {
    if (!value || typeof value !== 'object')
        return false;
    const obj = value;
    return (Array.isArray(obj.entities) &&
        Array.isArray(obj.relations) &&
        obj.entities.every(isRecognizedEntity) &&
        obj.relations.every(isRecognizedRelation));
}
//# sourceMappingURL=entity.types.js.map