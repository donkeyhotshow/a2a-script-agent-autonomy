/**
 * Debug Save Page State
 * 
 * Скрипт для сохранения состояния страницы в файл.
 * Выполняется в browser console на http://localhost:5173
 * 
 * Использование:
 * 1. Откройте http://localhost:5173 в браузере
 * 2. Откройте DevTools (F12) → Console
 * 3. Вставьте этот код и нажмите Enter
 * 4. Данные сохранятся в localStorage
 * 5. Экспортируйте через API
 */

// Сохранить состояние страницы
(function savePageState() {
  console.log('[Debug] Starting page state save...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const state = {
    _meta: {
      timestamp: timestamp,
      url: window.location.href,
      title: document.title
    },
    project: {
      selected: document.getElementById('projectSelect')?.value,
      options: Array.from(document.querySelectorAll('#projectSelect option')).map(o => o.value)
    },
    session: {
      active: null,
      count: document.querySelectorAll('.session-window').length,
      list: Array.from(document.querySelectorAll('.session-window')).map(w => ({
        id: w.dataset?.sessionId,
        visible: w.style.display !== 'none'
      }))
    },
    panels: {
      taskFlow: document.getElementById('task-flow-panel'),
      taskbar: document.getElementById('taskbar'),
      consoleErrors: []
    },
    network: [],
    storage: {}
  };
  
  // Перехватить ошибки console
  const originalError = console.error;
  console.error = (...args) => {
    state.panels.consoleErrors.push({
      time: new Date().toISOString(),
      args: args.map(a => String(a))
    });
    originalError.apply(console, args);
  };
  
  // Перехватить fetch
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const req = {
      url: String(args[0]),
      method: args[1]?.method,
      timestamp: new Date().toISOString()
    };
    try {
      const result = await originalFetch.apply(window, args);
      req.status = result.status;
      req.ok = result.ok;
      state.network.push(req);
      return result;
    } catch (e) {
      req.error = e.message;
      state.network.push(req);
      throw e;
    }
  };
  
  // Перехватить XHR
  const originalXHR = window.XMLHttpRequest;
  if (originalXHR) {
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      xhr.open = function(...args) {
        state.network.push({
          type: 'xhr',
          method: args[0],
          url: args[1],
          timestamp: new Date().toISOString()
        });
        return originalOpen.apply(this, args);
      };
      return xhr;
    };
  }
  
  // Сохранить ключевые localStorage
  const keys = ['a2a_selected_project', 'a2a_clientApiUrl', 'a2a_active_session'];
  keys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) state.storage[key] = value;
    } catch (e) {
      // ignore
    }
  });
  
  // Сохранить в localStorage с ключом для экспорта
  const storageKey = `a2a_debug_state_${timestamp}`;
  localStorage.setItem(storageKey, JSON.stringify(state, null, 2));
  localStorage.setItem('a2a_debug_latest', timestamp);
  
  console.log('[Debug] State saved:', storageKey);
  console.log('[Debug] Use this API call to export:');
  console.log(`  curl -X POST http://localhost:5173/api/a2a/sessions -d '{"projectId":"system","task":"Прочитай localStorage ключ ${storageKey}"}'`);
  
  return state;
})();