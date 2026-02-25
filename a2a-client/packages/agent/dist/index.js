"use strict";
/**
 * @a2a/agent - Main agent logic for A2A system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitOps = exports.FileSystem = exports.CardManager = exports.A2AAgent = void 0;
const api_client_1 = require("@a2a/api-client");
const rag_1 = require("@a2a/rag");
const card_manager_1 = require("./card-manager");
Object.defineProperty(exports, "CardManager", { enumerable: true, get: function () { return card_manager_1.CardManager; } });
const fs_reader_1 = require("./fs-reader");
Object.defineProperty(exports, "FileSystem", { enumerable: true, get: function () { return fs_reader_1.FileSystem; } });
const git_ops_1 = require("./git-ops");
Object.defineProperty(exports, "GitOps", { enumerable: true, get: function () { return git_ops_1.GitOps; } });
class A2AAgent {
    constructor(config) {
        this.sessionId = null;
        this.currentCard = null;
        this.config = config;
        this.apiClient = new api_client_1.ApiClient(config);
        this.cardManager = new card_manager_1.CardManager();
        const projectPath = config.projectPath ?? process.cwd();
        this.ragIndexer = new rag_1.RAGIndexer({ ...config, projectPath });
        this.ragSearcher = new rag_1.RAGSearcher({ ...config, projectPath });
        this.fs = new fs_reader_1.FileSystem(config);
        this.gitOps = new git_ops_1.GitOps(config.projectPath ?? process.cwd());
    }
    async initSession() {
        this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        return this.sessionId;
    }
    async processRequest(userRequest) {
        if (!this.sessionId)
            await this.initSession();
        const projectPath = this.config.projectPath ?? process.cwd();
        const card = this.cardManager.createCard({
            sessionId: this.sessionId,
            user: { id: this.config.userId },
            project: { id: this.config.projectId, path: projectPath, type: await this.detectProjectType() },
            request: { raw: userRequest },
        });
        this.currentCard = card;
        const ragResults = await this.ragSearcher.search(userRequest);
        card.ragResults = ragResults;
        const response = (await this.apiClient.createCard(card));
        return this.handleServerResponse(response);
    }
    async handleServerResponse(response) {
        this.currentCard = response.card ?? this.currentCard ?? null;
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
    async handleNeedContext(response) {
        const { questions, commands } = response;
        if (commands?.length) {
            const commandResults = await this.executeCommands(commands);
            const updateResponse = (await this.apiClient.reportCommands(this.currentCard.cardId, commandResults));
            return this.handleServerResponse(updateResponse);
        }
        return { type: 'questions', questions, card: this.currentCard };
    }
    async handleTaskCreated(response) {
        const { task, commands } = response;
        if (commands?.length) {
            const commandResults = await this.executeCommands(commands);
            await this.apiClient.reportCommands(this.currentCard.cardId, commandResults);
        }
        return { type: 'task_created', task, card: this.currentCard };
    }
    async handleProcessing(_response) {
        return { type: 'processing', card: this.currentCard };
    }
    async handleCompleted(response) {
        return { type: 'completed', result: response.result, card: this.currentCard };
    }
    async handleError(response) {
        return { type: 'error', error: response.error, card: this.currentCard };
    }
    async executeCommands(commands) {
        const results = [];
        for (const cmd of commands) {
            try {
                const result = await this.executeCommand(cmd);
                results.push({ commandId: cmd.id ?? `cmd-${results.length}`, success: true, result });
            }
            catch (err) {
                results.push({ commandId: cmd.id ?? `cmd-${results.length}`, success: false, error: err.message });
            }
        }
        return results;
    }
    async executeCommand(cmd) {
        const p = cmd.params;
        switch (cmd.type) {
            case 'read_file':
                return this.fs.readFile(p.path);
            case 'write_file':
                return this.fs.writeFile(p.path, p.content);
            case 'apply_patch':
                return this.gitOps.applyPatch(p.patch, p.path);
            case 'git_add':
                return this.gitOps.add(p.path);
            case 'git_commit':
                return this.gitOps.commit(p.message);
            case 'git_checkout':
                return this.gitOps.checkout(p.branch);
            case 'run_test':
                return this.fs.runTest(p.path);
            case 'index_files':
                return this.ragIndexer.indexProject(p.force);
            case 'search_rag':
                return this.ragSearcher.search(p.query, p.options ?? {});
            case 'show_message':
                console.log(p.message);
                return { shown: true };
            case 'request_confirmation':
                return { needsConfirmation: true, message: p.message };
            default:
                throw new Error(`Unknown command type: ${cmd.type}`);
        }
    }
    async answerQuestions(answers) {
        const response = (await this.apiClient.answerQuestions(this.currentCard.cardId, answers));
        return this.handleServerResponse(response);
    }
    async detectProjectType() {
        if (await this.fs.exists('artisan'))
            return 'laravel';
        if (await this.fs.exists('vue.config.js'))
            return 'vue';
        if (await this.fs.exists('src/App.jsx') || await this.fs.exists('src/App.tsx'))
            return 'react';
        if (await this.fs.exists('package.json'))
            return 'node';
        return 'unknown';
    }
}
exports.A2AAgent = A2AAgent;
