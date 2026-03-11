(function(global) {
  "use strict";
  const MAX_MESSAGES = 200;
  function normalizeMessage(value, defaultRole = "system") {
    if (!value) return null;
    const role = value.role || defaultRole;
    const content = typeof value === "string" ? value : value.content || value.message || value.text || "";
    if (!content) return null;
    return {
      id: value.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      role,
      content: String(content),
      timestamp: value.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
      metadata: value.metadata ? { ...value.metadata } : {}
    };
  }
  const STORAGE_KEY = "a2a_session_store";
  function SessionStore() {
    this._state = {
      sessionId: null,
      projectId: null,
      messages: [],
      execute: null,
      context: null,
      status: "idle",
      pendingForm: null,
      lastError: null,
      promisePending: false,
      // Block input while waiting for server response
      _waitIndicatorActive: false,
      // Track if wait indicator is showing
      // Session logs (two types)
      responsesLog: [],
      // Raw server responses
      messagesLog: [],
      // Human-readable messages for frontend display
      // New: numbered steps tracking
      currentStep: 0,
      steps: []
    };
    this._listeners = /* @__PURE__ */ new Map();
    this._apiBase = "/api";
    this._persistTimer = null;
    this._storageMode = "storage";
    this._storageBase = "/api/a2a/sessions";
  }
  SessionStore.prototype.init = function(options = {}) {
    this._apiBase = options.apiBase || this._apiBase;
    console.log("[SessionStore] Initialized", this._state.sessionId ? `(session ${this._state.sessionId})` : "(no session)");
    return this;
  };
  SessionStore.prototype.setStorageMode = function(mode) {
    if (mode !== "memory" && mode !== "storage") {
      console.warn("[SessionStore] Invalid storage mode:", mode, "- using memory");
      mode = "memory";
    }
    this._storageMode = mode;
    console.log("[SessionStore] Storage mode:", mode);
    this._emit("storageMode", mode);
    return this;
  };
  SessionStore.prototype.getStorageMode = function() {
    return this._storageMode;
  };
  SessionStore.prototype.isPersistentStorage = function() {
    return this._storageMode === "storage";
  };
  SessionStore.prototype.clearStorage = async function() {
    console.log("[SessionStore] No local storage to clear");
  };
  SessionStore.prototype.getState = function() {
    return { ...this._state };
  };
  Object.defineProperties(SessionStore.prototype, {
    sessionId: { get: function() {
      return this._state.sessionId;
    }, configurable: true },
    projectId: { get: function() {
      return this._state.projectId;
    }, configurable: true },
    messages: { get: function() {
      return [...this._state.messages];
    }, configurable: true },
    execute: { get: function() {
      return this._state.execute;
    }, configurable: true },
    context: { get: function() {
      return this._state.context;
    }, configurable: true },
    status: { get: function() {
      return this._state.status;
    }, configurable: true }
  });
  SessionStore.prototype.isWaitingForInput = function() {
    return this._state.status === "waiting" || this._state.pendingForm !== null || this._state.execute?.form?.choices?.length > 0;
  };
  SessionStore.prototype.isActive = function() {
    return this._state.status === "active" || this._state.status === "waiting";
  };
  SessionStore.prototype.isInputBlocked = function() {
    return this._state.promisePending || this._state.status === "loading";
  };
  SessionStore.prototype.setPromisePending = function(pending) {
    this._state.promisePending = pending;
    this._emit("promisePending", pending);
    return this;
  };
  SessionStore.prototype.isCompleted = function() {
    return this._state.status === "completed";
  };
  SessionStore.prototype.getExecution = function() {
    return this._state.context?.execution || this._state.execute?.execution || null;
  };
  SessionStore.prototype.getExecute = function() {
    return this._state.execute;
  };
  SessionStore.prototype.getCurrentStep = function() {
    const exec = this.getExecution();
    return exec?.step || null;
  };
  SessionStore.prototype.getProgress = function() {
    const exec = this.getExecution();
    return exec?.progress ?? null;
  }, // === Actions: State Modifiers ===
  SessionStore.prototype.reset = function(sessionId = null, projectId = null) {
    this._state = {
      sessionId,
      projectId,
      messages: [],
      execute: null,
      context: null,
      status: sessionId ? "created" : "idle",
      pendingForm: null,
      lastError: null,
      promisePending: false
    };
    if (!sessionId) {
      this.clearStorage();
    }
    this._emit("reset", this.getState());
    return this;
  };
  SessionStore.prototype.setSession = function(sessionId, projectId = null) {
    this._state.sessionId = sessionId;
    if (projectId) this._state.projectId = projectId;
    this._emit("session", sessionId);
    return this;
  };
  SessionStore.prototype.createSession = function(session) {
    const { id, sessionId, projectId, project_id, task, title, messages = [] } = session || {};
    const sid = id || sessionId;
    const pid = projectId || project_id || this._state.projectId;
    if (!sid) {
      console.error("[SessionStore] createSession: No session ID provided");
      return this;
    }
    this.reset(sid, pid);
    this._state.status = "created";
    this._emit("sessionCreated", { id: sid, projectId: pid, task, title });
    console.log("[SessionStore] Session created:", sid);
    return this;
  };
  SessionStore.prototype.setProject = function(projectId) {
    this._state.projectId = projectId;
    this._emit("project", projectId);
    return this;
  };
  SessionStore.prototype.setStatus = function(status) {
    this._state.status = status;
    this._emit("status", status);
    return this;
  };
  SessionStore.prototype.setExecute = function(execute) {
    this._state.execute = execute || null;
    this._emit("execute", this._state.execute);
    const hadWaitIndicator = this._state._waitIndicatorActive;
    if (hadWaitIndicator && execute && !execute.wait) {
      this._state._waitIndicatorActive = false;
    }
    this._state.promisePending = false;
    this._emit("promisePending", false);
    if (execute?.form?.choices) {
      this._state.pendingForm = execute.form;
      this._state.status = "waiting";
      this._emit("pendingForm", execute.form);
    } else {
      this._state.pendingForm = null;
      this._emit("pendingForm", null);
    }
    if (execute?.message) {
      const msg = typeof execute.message === "string" ? { content: execute.message } : execute.message;
      this.pushMessage(msg, "assistant");
    }
    if (execute && !execute.form?.input && !execute.form?.choices) {
      if (execute.message) {
      } else if (execute.action) {
        this.pushMessage({
          content: `Executing: ${execute.action}`,
          metadata: { type: "auto-action", action: execute.action }
        }, "system");
      } else if (execute.script) {
        this.pushMessage({
          content: `Running script...`,
          metadata: { type: "auto-script" }
        }, "system");
      } else if (execute.result) {
        const resultMsg = typeof execute.result === "string" ? execute.result : execute.result.summary || execute.result.action || "Task completed";
        this.pushMessage({
          content: resultMsg,
          metadata: { type: "auto-result", result: execute.result }
        }, "system");
      }
      if (!execute.form) {
        this._emit("autoContinue", execute);
      }
    }
    if (execute?.finalResult) {
      this._state.status = "completed";
      this._emit("completed", execute.finalResult);
      this.pushMessage({
        content: `Task completed: ${execute.finalResult.action || "unknown"}`,
        metadata: { type: "completion", summary: execute.finalResult.summary }
      }, "system");
    }
    if (execute?.wait) {
      const waitData = execute.wait;
      this._state.status = "waiting";
      this._state._waitIndicatorActive = true;
      this._emit("wait", waitData);
      if (waitData.message) {
        this.logMessage("system", waitData.message, { type: "wait", showFormAfter: waitData.showFormAfter });
      }
    }
    return this;
  };
  SessionStore.prototype.setContext = function(context) {
    this._state.context = context || null;
    this._emit("context", this._state.context);
    if (context?.execution) {
      this._emit("execution", context.execution);
      if (context.execution.status === "completed") {
        this.setStatus("completed");
        this._emit("completed", context.execution);
      }
    }
    return this;
  };
  SessionStore.prototype.setMessages = function(messages) {
    if (!Array.isArray(messages)) return this;
    this._state.messages = messages.map((m) => normalizeMessage(m, "assistant")).filter(Boolean).slice(-MAX_MESSAGES);
    this._emit("messages", [...this._state.messages]);
    return this;
  };
  SessionStore.prototype.appendMessages = function(messages) {
    if (!Array.isArray(messages)) return this;
    const normalizedMessages = messages.map((m) => normalizeMessage(m, "assistant")).filter(Boolean);
    this._state.messages = [...this._state.messages || [], ...normalizedMessages].slice(-MAX_MESSAGES);
    this._emit("messages", [...this._state.messages]);
    return this;
  };
  SessionStore.prototype.pushMessage = function(message, role = "assistant") {
    const normalized = normalizeMessage(message, role);
    if (!normalized) return this;
    this._state.messages = [...this._state.messages, normalized].slice(-MAX_MESSAGES);
    this._emit("message", normalized);
    this._emit("messages", [...this._state.messages]);
    return this;
  };
  SessionStore.prototype.clearPendingForm = function() {
    this._state.pendingForm = null;
    if (this._state.status === "waiting") {
      this._state.status = "active";
    }
    this._emit("pendingForm", null);
    return this;
  };
  SessionStore.prototype.setError = function(error) {
    this._state.lastError = error;
    this._state.status = "error";
    this._emit("error", error);
    this.pushMessage({ content: error?.message || String(error), metadata: { type: "error" } }, "system");
    return this;
  };
  SessionStore.prototype.applyServerResponse = function(data) {
    const { sessionId, projectId, status, context, execute, messages, finalResult } = data;
    if (projectId) this.setProject(projectId);
    if (sessionId) this.setSession(sessionId, projectId);
    if (status) this.setStatus(status);
    if (context) this.setContext(context);
    if (execute) {
      this.setExecute(execute);
    } else if (finalResult) {
      this.setExecute({ finalResult });
    }
    if (messages?.length) this.appendMessages(messages);
    if (execute?.form) {
      this._state.pendingForm = execute.form;
      this._state.status = "waiting";
      this._emit("pendingForm", execute.form);
    }
    const completionResult = execute?.finalResult ?? finalResult;
    if (completionResult && this._state.status !== "completed") {
      this.setStatus("completed");
      this._emit("completed", completionResult);
    }
    this._emit("serverResponse", data);
    return this;
  };
  SessionStore.prototype.on = function(event, callback) {
    if (typeof callback !== "function") return () => {
    };
    if (!this._listeners.has(event)) {
      this._listeners.set(event, /* @__PURE__ */ new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  };
  SessionStore.prototype.off = function(event, callback) {
    this._listeners.get(event)?.delete(callback);
  };
  SessionStore.prototype.once = function(event, callback) {
    const wrapped = (data) => {
      this.off(event, wrapped);
      callback(data);
    };
    return this.on(event, wrapped);
  };
  SessionStore.prototype._emit = function(event, payload) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.error("[SessionStore] Handler failed for", event, err);
      }
    });
  };
  SessionStore.prototype.restoreAndReconnect = async function(sessionId) {
    if (!sessionId) {
      return false;
    }
    console.log("[SessionStore] Restoring session:", sessionId);
    this._state.sessionId = sessionId;
    this._state.status = "active";
    this._emit("restore", this.getState());
    return true;
  };
  SessionStore.prototype.hasSavedSession = async function() {
    return !!this._state.sessionId;
  };
  SessionStore.prototype.toJSON = function() {
    return {
      sessionId: this._state.sessionId,
      projectId: this._state.projectId,
      status: this._state.status,
      messageCount: this._state.messages.length,
      hasExecute: !!this._state.execute,
      hasContext: !!this._state.context,
      isWaiting: this.isWaitingForInput()
    };
  };
  SessionStore.prototype.debug = function() {
    console.log("[SessionStore] Current state:", this.toJSON());
    console.log("[SessionStore] Full state:", this.getState());
  };
  SessionStore.prototype.logResponse = function(response) {
    const logEntry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: response
    };
    this._state.responsesLog.push(logEntry);
    if (this._state.responsesLog.length > 100) {
      this._state.responsesLog.shift();
    }
    console.log("[SessionStore] Response logged:", logEntry.timestamp);
    this._emit("responseLogged", logEntry);
  };
  SessionStore.prototype.logMessage = function(role, content, metadata = {}) {
    const logEntry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      role,
      content,
      metadata
    };
    this._state.messagesLog.push(logEntry);
    if (this._state.messagesLog.length > 100) {
      this._state.messagesLog.shift();
    }
    console.log("[SessionStore] Message logged:", role, content.slice(0, 50));
    this._emit("messageLogged", logEntry);
  };
  SessionStore.prototype.getResponsesLog = function() {
    return [...this._state.responsesLog];
  };
  SessionStore.prototype.getMessagesLog = function() {
    return [...this._state.messagesLog];
  };
  SessionStore.prototype.clearLogs = function() {
    this._state.responsesLog = [];
    this._state.messagesLog = [];
    this._emit("logsCleared");
    console.log("[SessionStore] Logs cleared");
  };
  SessionStore.prototype.createSessionWithForm = async function(title = "New Session") {
    try {
      const response = await fetch(`${this._storageBase}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Server returned unsuccessful response");
      }
      if (!data.session) {
        throw new Error("Session data missing in response");
      }
    } catch (error) {
      console.error("[SessionStore] createSessionWithForm error:", error);
      this.setError(error);
      throw error;
    }
  };
  SessionStore.prototype.saveStep = async function(stepData) {
    if (!this._state.sessionId) {
      console.warn("[SessionStore] No session to save step to");
      return null;
    }
    if (this._storageMode !== "storage") {
      this._state.currentStep++;
      this._state.steps.push(this._state.currentStep);
      return this._state.currentStep;
    }
    try {
      const response = await fetch(`${this._storageBase}/${this._state.sessionId}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stepData)
      });
      if (!response.ok) {
        throw new Error(`Failed to save step: ${response.status}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to save step: server returned unsuccessful response");
      }
      this._state.currentStep = data.step;
      this._state.steps.push(data.step);
      console.log("[SessionStore] Step saved:", data.step);
      return data.step;
    } catch (error) {
      console.error("[SessionStore] saveStep error:", error);
      throw error;
    }
  };
  SessionStore.prototype.loadSession = async function(sessionId) {
    try {
      const response = await fetch(`${this._storageBase}/${sessionId}`);
      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.status}`);
      }
      const session = await response.json();
      if (!session || !session.id) {
        throw new Error("Invalid session data: missing session ID");
      }
      this._state.sessionId = session.id;
      this._state.projectId = session.projectId;
      this._state.status = session.status || "active";
      this._state.currentStep = session.currentStep || 1;
      this._state.execute = session.execute;
      this._state.context = session.context;
      if (session.currentStep > 0) {
        const historyResponse = await fetch(`${this._storageBase}/${sessionId}/history/1`);
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          this._state.steps = historyData.history?.map((h) => h.step) || [];
        }
      }
      this._emit("sessionLoaded", session);
      console.log("[SessionStore] Session loaded:", sessionId);
      return session;
    } catch (error) {
      console.error("[SessionStore] loadSession error:", error);
      throw error;
    }
  };
  SessionStore.prototype.checkLatestStep = async function() {
    if (!this._state.sessionId) {
      return null;
    }
    if (this._storageMode !== "storage") {
      return {
        hasResponse: !!this._state.execute,
        stepData: { execute: this._state.execute }
      };
    }
    try {
      const response = await fetch(`${this._storageBase}/${this._state.sessionId}/latest`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      if (!data) {
        return null;
      }
      return data;
    } catch (error) {
      console.error("[SessionStore] checkLatestStep error:", error);
      return null;
    }
  };
  SessionStore.prototype.getHistory = async function(fromStep = 1) {
    if (!this._state.sessionId) {
      return [];
    }
    if (this._storageMode !== "storage") {
      return this._state.messages.slice(fromStep - 1);
    }
    try {
      const response = await fetch(`${this._storageBase}/${this._state.sessionId}/history/${fromStep}`);
      if (!response.ok) {
        throw new Error(`Failed to get history: ${response.status}`);
      }
      const data = await response.json();
      if (!data || !Array.isArray(data.history)) {
        console.warn("[SessionStore] Invalid history response");
        return [];
      }
      return data.history || [];
    } catch (error) {
      console.error("[SessionStore] getHistory error:", error);
      return [];
    }
  };
  SessionStore.prototype.listSessions = async function() {
    if (this._storageMode !== "storage") {
      return [];
    }
    try {
      const response = await fetch(`${this._storageBase}`);
      if (!response.ok) {
        throw new Error(`Failed to list sessions: ${response.status}`);
      }
      const data = await response.json();
      if (!data || !Array.isArray(data.sessions)) {
        console.warn("[SessionStore] Invalid sessions list response");
        return [];
      }
      return data.sessions || [];
    } catch (error) {
      console.error("[SessionStore] listSessions error:", error);
      return [];
    }
  };
  SessionStore.prototype.getCurrentStep = function() {
    return this._state.currentStep || 0;
  };
  global.SessionStore = new SessionStore();
})(typeof window !== "undefined" ? window : globalThis);
