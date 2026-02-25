import { CommandState } from './CommandEnums.js';

/**
 * Контекст выполнения команды
 */
class ExecutionContext {
  constructor(id, request) {
    this.id = id;
    this.request = request;
    this.startTime = new Date();
    this.state = CommandState.PENDING;
    this.abortController = new AbortController();
    this.subprocess = null;
    this.stdout = '';
    this.stderr = '';
  }

  updateState(newState) {
    this.state = newState;
  }

  setSubprocess(subprocess) {
    this.subprocess = subprocess;
  }

  appendStdout(data) {
    this.stdout += data;
  }

  appendStderr(data) {
    this.stderr += data;
  }

  getDuration() {
    return Date.now() - this.startTime.getTime();
  }
}

export { ExecutionContext };
