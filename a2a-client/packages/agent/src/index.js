/**
 * @a2a/agent - Main agent logic for A2A system
 * 
 * НЕ делает запросы к LLM — вся работа с AI на сервере.
 * Отвечает за:
 * - Приём запросов пользователя
 * - Заполнение карточки задачи
 * - Выполнение команд от сервера
 * 
 * @module @a2a/agent
 */

const { ApiClient } = require('@a2a/api-client');
const { RAGIndexer, RAGSearcher } = require('@a2a/rag');
const { CardManager } = require('./card-manager');
const { FileSystem } = require('./fs-reader');
const { GitOps } = require('./git-ops');

/**
 * A2A Agent - Main agent class
 */
class A2AAgent {
  /**
   * Create an agent instance
   * @param {Object} config - Configuration options
   * @param {string} config.serverUrl - A2A server URL
   * @param {string} config.projectPath - Path to project directory
   * @param {string} [config.token] - Authentication token
   * @param {string} [config.userId] - User identifier
   */
  constructor(config) {
    this.config = config;
    this.apiClient = new ApiClient(config);
    this.cardManager = new CardManager();
    this.ragIndexer = new RAGIndexer(config);
    this.ragSearcher = new RAGSearcher(config);
    this.fs = new FileSystem(config);
    this.gitOps = new GitOps(config.projectPath);
    
    this.sessionId = null;
    this.currentCard = null;
  }

  /**
   * Initialize agent session
   * @returns {string} Session ID
   */
  async initSession() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.sessionId;
  }

  /**
   * Process user request - Main entry point
   * @param {string} userRequest - User's request text
   * @returns {Promise<Object>} Processing result
   */
  async processRequest(userRequest) {
    // 1. Initialize session if needed
    if (!this.sessionId) {
      await this.initSession();
    }

    // 2. Create initial card
    const card = this.cardManager.createCard({
      sessionId: this.sessionId,
      user: { id: this.config.userId },
      project: {
        path: this.config.projectPath,
        type: await this.detectProjectType(),
      },
      request: { raw: userRequest },
    });

    this.currentCard = card;

    // 3. Do RAG search for relevant files
    const ragResults = await this.ragSearcher.search(userRequest);
    card.context.ragResults = ragResults;

    // 4. Send card to server
    const response = await this.apiClient.createCard(card);

    // 5. Handle server response
    return this.handleServerResponse(response);
  }

  /**
   * Handle server response - May involve multiple iterations
   * @private
   * @param {Object} response - Server response
   * @returns {Promise<Object>} Final result
   */
  async handleServerResponse(response) {
    this.currentCard = response.card || this.currentCard;

    switch (response.status) {
      case 'need_context':
        return this.handleNeedContext(response);

      case 'task_created':
        return this.handleTaskCreated(response);

      case 'processing':
        return this.handleProcessing(response);

      case 'completed':
        return this.handleCompleted(response);

      case 'error':
        return this.handleError(response);

      default:
        throw new Error(`Unknown response status: ${response.status}`);
    }
  }

  /**
   * Handle need_context response - Server needs more information
   * @private
   * @param {Object} response - Server response with questions/commands
   * @returns {Promise<Object>} Result with questions or command results
   */
  async handleNeedContext(response) {
    const { questions, commands } = response;

    // Execute commands first
    if (commands && commands.length > 0) {
      const commandResults = await this.executeCommands(commands);
      
      // Report results to server
      const updateResponse = await this.apiClient.reportCommands(
        this.currentCard.cardId,
        commandResults
      );
      
      return this.handleServerResponse(updateResponse);
    }

    // Return questions to UI
    return {
      type: 'questions',
      questions,
      card: this.currentCard,
    };
  }

  /**
   * Handle task_created response - Server created task file
   * @private
   * @param {Object} response - Server response with task and commands
   * @returns {Promise<Object>} Task creation result
   */
  async handleTaskCreated(response) {
    const { task, commands } = response;

    // Execute commands
    if (commands && commands.length > 0) {
      const commandResults = await this.executeCommands(commands);
      
      // Report results
      await this.apiClient.reportCommands(
        this.currentCard.cardId,
        commandResults
      );
    }

    return {
      type: 'task_created',
      task,
      card: this.currentCard,
    };
  }

  /**
   * Handle processing response - Task is being processed
   * @private
   * @param {Object} response - Server response
   * @returns {Object} Processing status
   */
  async handleProcessing(response) {
    return {
      type: 'processing',
      card: this.currentCard,
    };
  }

  /**
   * Handle completed response - Task is done
   * @private
   * @param {Object} response - Server response with result
   * @returns {Object} Completion result
   */
  async handleCompleted(response) {
    const { result } = response;

    return {
      type: 'completed',
      result,
      card: this.currentCard,
    };
  }

  /**
   * Handle error response
   * @private
   * @param {Object} response - Server error response
   * @returns {Object} Error details
   */
  async handleError(response) {
    return {
      type: 'error',
      error: response.error,
      card: this.currentCard,
    };
  }

  /**
   * Execute commands from server
   * @param {Array} commands - Array of commands to execute
   * @returns {Promise<Array>} Command execution results
   */
  async executeCommands(commands) {
    const results = [];

    for (const cmd of commands) {
      try {
        const result = await this.executeCommand(cmd);
        results.push({
          commandId: cmd.id || `cmd-${results.length}`,
          success: true,
          result,
        });
      } catch (err) {
        results.push({
          commandId: cmd.id || `cmd-${results.length}`,
          success: false,
          error: err.message,
        });
      }
    }

    return results;
  }

  /**
   * Execute single command
   * @private
   * @param {Object} cmd - Command object
   * @param {string} cmd.type - Command type
   * @param {Object} cmd.params - Command parameters
   * @returns {Promise<any>} Command result
   */
  async executeCommand(cmd) {
    switch (cmd.type) {
      case 'read_file':
        return this.fs.readFile(cmd.params.path);

      case 'write_file':
        return this.fs.writeFile(cmd.params.path, cmd.params.content);

      case 'apply_patch':
        return this.gitOps.applyPatch(cmd.params.patch, cmd.params.path);

      case 'git_add':
        return this.gitOps.add(cmd.params.path);

      case 'git_commit':
        return this.gitOps.commit(cmd.params.message);

      case 'git_checkout':
        return this.gitOps.checkout(cmd.params.branch);

      case 'run_test':
        return this.fs.runTest(cmd.params.path);

      case 'index_files':
        return this.ragIndexer.indexProject(cmd.params.force);

      case 'search_rag':
        return this.ragSearcher.search(
          cmd.params.query, 
          cmd.params.options || {}
        );

      case 'show_message':
        console.log(cmd.params.message);
        return { shown: true };

      case 'request_confirmation':
        // This should be handled by UI
        return { needsConfirmation: true, message: cmd.params.message };

      default:
        throw new Error(`Unknown command type: ${cmd.type}`);
    }
  }

  /**
   * Answer questions from server
   * @param {Object} answers - Answers to questions
   * @returns {Promise<Object>} Server response
   */
  async answerQuestions(answers) {
    const response = await this.apiClient.answerQuestions(
      this.currentCard.cardId,
      answers
    );
    return this.handleServerResponse(response);
  }

  /**
   * Detect project type
   * @private
   * @returns {Promise<string>} Project type
   */
  async detectProjectType() {
    // Check for Laravel
    if (await this.fs.exists('artisan')) {
      return 'laravel';
    }
    // Check for Vue
    if (await this.fs.exists('vue.config.js')) {
      return 'vue';
    }
    // Check for React
    if (await this.fs.exists('src/App.jsx') || await this.fs.exists('src/App.tsx')) {
      return 'react';
    }
    // Check for Node
    if (await this.fs.exists('package.json')) {
      return 'node';
    }
    return 'unknown';
  }
}

module.exports = {
  A2AAgent,
};
