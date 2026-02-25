const fs = require('fs');
const path = require('path');

function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (error) {
    return { error: error.message };
  }
}

function normalizeToolDescriptor(tool) {
  if (!tool || typeof tool !== 'object') return null;
  const name = String(tool.name || '').trim();
  if (!name) return null;
  return {
    name,
    description: String(tool.description || '').trim() || name,
    inputSchema: tool.inputSchema && typeof tool.inputSchema === 'object' ? tool.inputSchema : { type: 'object', properties: {}, additionalProperties: true }
  };
}

class PluginRegistry {
  constructor(rootDir, options = {}) {
    this.rootDir = rootDir || process.cwd();
    this.pluginsDir = path.join(this.rootDir, 'plugins');
    this.tools = [];
    this.handlers = new Map();
    this.errors = [];
    const disabled = Array.isArray(options.disabled) ? options.disabled : [];
    this.disabledTools = new Set(disabled.map((s) => String(s || '').trim()).filter(Boolean));
  }

  setDisabledTools(names) {
    const list = Array.isArray(names) ? names : [];
    this.disabledTools = new Set(list.map((s) => String(s || '').trim()).filter(Boolean));
  }

  isDisabled(name) {
    return this.disabledTools.has(String(name || '').trim());
  }

  registerPlugin(moduleObj, pluginId = 'programmatic') {
    if (!moduleObj || typeof moduleObj !== 'object') return;
    const toolList = Array.isArray(moduleObj.tools) ? moduleObj.tools : [];
    for (const t of toolList) {
      const norm = normalizeToolDescriptor(t);
      if (!norm) continue;
      if (this.isDisabled(norm.name)) continue;
      if (!this.tools.find((x) => x.name === norm.name)) {
        this.tools.push(norm);
      }
    }
    if (typeof moduleObj.handleToolCall === 'function') {
      const handler = moduleObj.handleToolCall.bind(moduleObj);
      // По умолчанию регистрируем под pluginId как fallback
      if (!this.handlers.has(pluginId)) this.handlers.set(pluginId, handler);
      for (const t of toolList) {
        const norm = normalizeToolDescriptor(t);
        if (norm && !this.handlers.has(norm.name) && !this.isDisabled(norm.name)) {
          this.handlers.set(norm.name, handler);
        }
      }
    }
  }

  load() {
    this.tools = [];
    this.handlers.clear();
    this.errors = [];

    let entries = [];
    try {
      entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
    } catch (error) {
      return; // нет каталога plugins — это нормально
    }

    for (const entry of entries) {
      try {
        if (!entry.isFile()) continue;
        if (!/\.js$/i.test(entry.name)) continue;
        const fullPath = path.join(this.pluginsDir, entry.name);
        const mod = safeRequire(fullPath);
        if (!mod || mod.error) {
          this.errors.push({ plugin: entry.name, error: mod && mod.error || 'Unknown error' });
          continue;
        }
        const toolList = Array.isArray(mod.tools) ? mod.tools : [];
        for (const t of toolList) {
          const norm = normalizeToolDescriptor(t);
          if (!norm) continue;
          if (this.isDisabled(norm.name)) continue;
          // не перекрывать уже зарегистрированный tool
          if (!this.tools.find((x) => x.name === norm.name)) {
            this.tools.push(norm);
          }
        }
        if (typeof mod.handleToolCall === 'function') {
          // регистрируем обработчик под именем файла и под каждым tool.name, если ещё нет
          const fallbackName = path.basename(entry.name, path.extname(entry.name));
          if (!this.handlers.has(fallbackName)) this.handlers.set(fallbackName, mod.handleToolCall.bind(mod));
          for (const t of toolList) {
            const norm = normalizeToolDescriptor(t);
            if (norm && !this.handlers.has(norm.name) && !this.isDisabled(norm.name)) {
              this.handlers.set(norm.name, mod.handleToolCall.bind(mod));
            }
          }
        }
      } catch (error) {
        this.errors.push({ plugin: entry.name, error: error.message });
      }
    }
  }

  listTools() {
    return this.tools.slice();
  }

  getAllTools() {
    return this.tools.slice();
  }

  hasHandler(name) {
    if (this.isDisabled(name)) return false;
    return this.handlers.has(name);
  }

  async callTool(name, args) {
    if (this.isDisabled(name)) {
      throw new Error(`Tool '${name}' is disabled`);
    }
    const handler = this.handlers.get(name) || this.handlers.get(String(name || '').trim());
    if (!handler) {
      throw new Error(`No plugin handler for tool '${name}'`);
    }
    try {
      const res = await handler(name, args || {}, {});
      return res;
    } catch (error) {
      throw new Error(`Error calling tool '${name}': ${error.message}`);
    }
  }

  async dispatch(name, args, context) {
    if (this.isDisabled(name)) return { ok: false, message: `Tool '${name}' is disabled` };
    const handler = this.handlers.get(name) || this.handlers.get(String(name || '').trim());
    if (!handler) return { ok: false, message: `No plugin handler for tool '${name}'` };
    try {
      const res = await handler(name, args || {}, context || {});
      return res;
    } catch (error) {
      return { ok: false, message: `Error calling tool '${name}': ${error.message}` };
    }
  }
}

module.exports = { PluginRegistry };
