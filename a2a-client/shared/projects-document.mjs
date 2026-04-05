/**
 * @param {unknown} doc - Parsed JSON (e.g. `{ projects: [...] }`)
 * @returns {unknown[]}
 */
export function projectsListFromDocument(doc) {
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return [];
    const p = doc.projects;
    return Array.isArray(p) ? p : [];
}
