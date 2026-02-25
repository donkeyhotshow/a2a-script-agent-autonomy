/**
 * Заглушки для браузерной среды
 * Модуль содержит заглушки для fs модулей в браузере
 */

/**
 * Создание заглушек для fs.promises в браузере
 */
export function createFsPromisesStub() {
  return {
    access: async () => { console.warn('[FS-PROMISES-BROWSER-STUB] fs.promises.access is a no-op in browser environment.'); },
    mkdir: async () => { console.warn('[FS-PROMISES-BROWSER-STUB] fs.promises.mkdir is a no-op in browser environment.'); },
    writeFile: async () => { console.warn('[FS-PROMISES-BROWSER-STUB] fs.promises.writeFile is a no-op in browser environment.'); },
    appendFile: async () => { console.warn('[FS-PROMISES-BROWSER-STUB] fs.promises.appendFile is a no-op in browser environment.'); },
    readdir: async () => { console.warn('[FS-PROMISES-BROWSER-STUB] fs.promises.readdir is a no-op in browser environment.'); return []; },
    readFile: async () => { console.warn('[FS-PROMISES-BROWSER-STUB] fs.promises.readFile is a no-op in browser environment.'); return ''; },
    stat: async () => { console.warn('[FS-PROMISES-BROWSER-STUB] fs.promises.stat is a no-op in browser environment.'); return {}; },
    rmdir: async () => { console.warn('[FS-PROMISES-BROWSER-STUB] fs.promises.rmdir is a no-op in browser environment.'); },
    unlink: async () => { console.warn('[FS-PROMISES-BROWSER-STUB] fs.promises.unlink is a no-op in browser environment.'); },
    copyFile: async () => { console.warn('[FS-PROMISES-BROWSER-STUB] fs.promises.copyFile is a no-op in browser environment.'); },
    rename: async () => { console.warn('[FS-PROMISES-BROWSER-STUB] fs.promises.rename is a no-op in browser environment.'); }
  };
}

/**
 * Создание заглушек для fs в браузере
 */
export function createFsSyncStub() {
  return {
    existsSync: () => { console.warn('[FS-BROWSER-STUB] fs.existsSync is a no-op in browser environment.'); return false; },
    mkdirSync: () => { console.warn('[FS-BROWSER-STUB] fs.mkdirSync is a no-op in browser environment.'); },
    writeFileSync: () => { console.warn('[FS-BROWSER-STUB] fs.writeFileSync is a no-op in browser environment.'); },
    appendFileSync: () => { console.warn('[FS-BROWSER-STUB] fs.appendFileSync is a no-op in browser environment.'); },
    readdirSync: () => { console.warn('[FS-BROWSER-STUB] fs.readdirSync is a no-op in browser environment.'); return []; },
    readFileSync: () => { console.warn('[FS-BROWSER-STUB] fs.readFileSync is a no-op in browser environment.'); return ''; },
    statSync: () => { console.warn('[FS-BROWSER-STUB] fs.statSync is a no-op in browser environment.'); return {}; }
  };
}

/**
 * Создание заглушек для fs.promises в fallback режиме
 */
export function createFsPromisesFallbackStub() {
  return {
    access: async () => { console.warn('[FS-PROMISES-FALLBACK] fs.promises.access is a no-op in fallback mode.'); },
    mkdir: async () => { console.warn('[FS-PROMISES-FALLBACK] fs.promises.mkdir is a no-op in fallback mode.'); },
    writeFile: async () => { console.warn('[FS-PROMISES-FALLBACK] fs.promises.writeFile is a no-op in fallback mode.'); },
    appendFile: async () => { console.warn('[FS-PROMISES-FALLBACK] fs.promises.appendFile is a no-op in fallback mode.'); },
    readdir: async () => { console.warn('[FS-PROMISES-FALLBACK] fs.promises.readdir is a no-op in fallback mode.'); return []; },
    readFile: async () => { console.warn('[FS-PROMISES-FALLBACK] fs.promises.readFile is a no-op in fallback mode.'); return ''; },
    stat: async () => { console.warn('[FS-PROMISES-FALLBACK] fs.promises.stat is a no-op in fallback mode.'); return {}; },
    rmdir: async () => { console.warn('[FS-PROMISES-FALLBACK] fs.promises.rmdir is a no-op in fallback mode.'); },
    unlink: async () => { console.warn('[FS-PROMISES-FALLBACK] fs.promises.unlink is a no-op in fallback mode.'); },
    copyFile: async () => { console.warn('[FS-PROMISES-FALLBACK] fs.promises.copyFile is a no-op in fallback mode.'); },
    rename: async () => { console.warn('[FS-PROMISES-FALLBACK] fs.promises.rename is a no-op in fallback mode.'); }
  };
}

/**
 * Создание заглушек для fs в fallback режиме
 */
export function createFsSyncFallbackStub() {
  return {
    existsSync: () => { console.warn('[FS-FALLBACK] fs.existsSync is a no-op in fallback mode.'); return false; },
    mkdirSync: () => { console.warn('[FS-FALLBACK] fs.mkdirSync is a no-op in fallback mode.'); },
    writeFileSync: () => { console.warn('[FS-FALLBACK] fs.writeFileSync is a no-op in fallback mode.'); },
    appendFileSync: () => { console.warn('[FS-FALLBACK] fs.appendFileSync is a no-op in fallback mode.'); },
    readdirSync: () => { console.warn('[FS-FALLBACK] fs.readdirSync is a no-op in fallback mode.'); return []; },
    readFileSync: () => { console.warn('[FS-FALLBACK] fs.readFileSync is a no-op in fallback mode.'); return ''; },
    statSync: () => { console.warn('[FS-FALLBACK] fs.statSync is a no-op in fallback mode.'); return {}; }
  };
}

/**
 * Инициализация fs модулей в зависимости от среды
 */
export async function initializeFsModules() {
  const isBrowser = typeof window !== 'undefined';
  
  let fsPromises, fsSync;
  
  if (isBrowser) {
    // В браузере используем заглушки
    fsPromises = createFsPromisesStub();
    fsSync = createFsSyncStub();
  } else {
    // В Node.js используем реальные модули
    // Динамически импортируем 'fs' только в Node.js среде
    try {
      const fs = await import('fs');
      fsPromises = fs.promises;
      fsSync = fs;
    } catch (error) {
      // Fallback для случаев, когда динамический импорт не работает
      console.warn('[PATH-UTILS] Fallback to browser mode due to error during dynamic import of \'fs\':', error.message);
      fsPromises = createFsPromisesFallbackStub();
      fsSync = createFsSyncFallbackStub();
    }
  }
  
  return { fsPromises, fsSync };
}
