export function generateTempId() {
    return Math.random().toString(36).substring(2, 20)
}

export function generateId() {
    return crypto.randomUUID()
}

export function onlyUnique(value, index, self) {
    return self.indexOf(value) === index
}

export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

export function getIcon(item) {
    switch (item.itemType) {
    case 'directory':
        if (item.path === 'directory!') return '🏠'
        return '📁'
    case 'file':
        return '📄'
    case 'variable':
        return '🔑'
    case 'arrayvariable':
        return '🔢'
    default:
        return '📄'
    }
}
