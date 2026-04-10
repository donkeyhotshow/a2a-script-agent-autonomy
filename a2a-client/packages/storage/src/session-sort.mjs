export function compareSessionCreatedAtDesc(a, b) {
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
}
