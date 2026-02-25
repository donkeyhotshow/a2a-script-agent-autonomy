/**
 * Message Handler
 * Extracted from mcp applications
 */

class MessageHandler {
  constructor() {
    this.handlers = new Map();
  }

  /**
   * Register handler
   */
  registerHandler(type, handler) {
    this.handlers.set(type, handler);
  }

  /**
   * Handle message
   */
  async handleMessage(message) {
    const handler = this.handlers.get(message.type);
    if (handler) {
      return await handler(message);
    }
    return { error: 'No handler for message type' };
  }
}

export default MessageHandler;
