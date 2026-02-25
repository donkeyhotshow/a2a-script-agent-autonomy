/**
 * @a2a/agent - Main agent logic for A2A system
 */

import { ApiClient } from '@a2a/api-client';
import { RAGIndexer, RAGSearcher } from '@a2a/rag';
import { CardManager } from './card-manager';
import type { TaskCard } from './card-manager';
import { FileSystem } from './fs-reader';
import { GitOps } from './git-ops';

export interface A2AAgentConfig {
  serverUrl?: string;
  projectPath?: string;
  token?: string;
  userId?: string;
  projectId?: string;
}

export interface ServerResponse {
  status: string;
  card?: TaskCard;
  questions?: unknown[];
  commands?: Array<{ id?: string; type: string; params: Record<string, unknown> }>;
  task?: unknown;
  result?: unknown;
  error?: unknown;
}

export interface ProcessResult {
  type: string;
  card?: TaskCard;
  questions?: unknown[];
  task?: unknown;
  result?: unknown;
  error?: unknown;
}

export class A2AAgent {
  private config: A2AAgentConfig;
  apiClient: ApiClient;
  cardManager: CardManager;
  ragIndexer: RAGIndexer;
  ragSearcher: RAGSearcher;
  fs: FileSystem;
  gitOps: GitOps;
  sessionId: string | null = null;
  currentCard: TaskCard | null = null;

  constructor(config: A2AAgentConfig) {
    this.config = config;
    this.apiClient = new ApiClient(config);
    this.cardManager = new CardManager();
    const projectPath = config.projectPath ?? process.cwd();
    this.ragIndexer = new RAGIndexer({ ...config, projectPath } as ConstructorParameters<typeof RAGIndexer>[0]);
    this.ragSearcher = new RAGSearcher({ ...config, projectPath });
    this.fs = new FileSystem(config);
    this.gitOps = new GitOps(config.projectPath ?? process.cwd());
  }

  async initSession(): Promise<string> {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    return this.sessionId;
  }

  async processRequest(userRequest: string): Promise<ProcessResult> {
    if (!this.sessionId) await this.initSession();
    const projectPath = this.config.projectPath ?? process.cwd();
    const card = this.cardManager.createCard({
      sessionId: this.sessionId!,
      user: { id: this.config.userId },
      project: { id: this.config.projectId, path: projectPath, type: await this.detectProjectType() },
      request: { raw: userRequest },
    });
    this.currentCard = card;
    const ragResults = await this.ragSearcher.search(userRequest);
    card.ragResults = ragResults;
    const response = (await this.apiClient.createCard(card as unknown as Record<string, unknown>)) as ServerResponse;
    return this.handleServerResponse(response);
  }

  private async handleServerResponse(response: ServerResponse): Promise<ProcessResult> {
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

  private async handleNeedContext(response: ServerResponse): Promise<ProcessResult> {
    const { questions, commands } = response;
    if (commands?.length) {
      const commandResults = await this.executeCommands(commands);
      const updateResponse = (await this.apiClient.reportCommands(
        this.currentCard!.cardId,
        commandResults
      )) as ServerResponse;
      return this.handleServerResponse(updateResponse);
    }
    return { type: 'questions', questions, card: this.currentCard! };
  }

  private async handleTaskCreated(response: ServerResponse): Promise<ProcessResult> {
    const { task, commands } = response;
    if (commands?.length) {
      const commandResults = await this.executeCommands(commands);
      await this.apiClient.reportCommands(this.currentCard!.cardId, commandResults);
    }
    return { type: 'task_created', task, card: this.currentCard! };
  }

  private async handleProcessing(_response: ServerResponse): Promise<ProcessResult> {
    return { type: 'processing', card: this.currentCard! };
  }

  private async handleCompleted(response: ServerResponse): Promise<ProcessResult> {
    return { type: 'completed', result: response.result, card: this.currentCard! };
  }

  private async handleError(response: ServerResponse): Promise<ProcessResult> {
    return { type: 'error', error: response.error, card: this.currentCard! };
  }

  async executeCommands(commands: Array<{ id?: string; type: string; params: Record<string, unknown> }>): Promise<Array<{ commandId: string; success: boolean; result?: unknown; error?: string }>> {
    const results: Array<{ commandId: string; success: boolean; result?: unknown; error?: string }> = [];
    for (const cmd of commands) {
      try {
        const result = await this.executeCommand(cmd);
        results.push({ commandId: cmd.id ?? `cmd-${results.length}`, success: true, result });
      } catch (err) {
        results.push({ commandId: cmd.id ?? `cmd-${results.length}`, success: false, error: (err as Error).message });
      }
    }
    return results;
  }

  private async executeCommand(cmd: { type: string; params: Record<string, unknown> }): Promise<unknown> {
    const p = cmd.params;
    switch (cmd.type) {
      case 'read_file':
        return this.fs.readFile(p.path as string);
      case 'write_file':
        return this.fs.writeFile(p.path as string, p.content as string);
      case 'apply_patch':
        return this.gitOps.applyPatch(p.patch as string, p.path as string);
      case 'git_add':
        return this.gitOps.add(p.path as string | string[]);
      case 'git_commit':
        return this.gitOps.commit(p.message as string);
      case 'git_checkout':
        return this.gitOps.checkout(p.branch as string);
      case 'run_test':
        return this.fs.runTest(p.path as string);
      case 'index_files':
        return this.ragIndexer.indexProject(p.force as boolean);
      case 'search_rag':
        return this.ragSearcher.search(p.query as string, (p.options as { limit?: number }) ?? {});
      case 'show_message':
        console.log(p.message);
        return { shown: true };
      case 'request_confirmation':
        return { needsConfirmation: true, message: p.message };
      default:
        throw new Error(`Unknown command type: ${cmd.type}`);
    }
  }

  async answerQuestions(answers: unknown): Promise<ProcessResult> {
    const response = (await this.apiClient.answerQuestions(this.currentCard!.cardId, answers)) as ServerResponse;
    return this.handleServerResponse(response);
  }

  private async detectProjectType(): Promise<string> {
    if (await this.fs.exists('artisan')) return 'laravel';
    if (await this.fs.exists('vue.config.js')) return 'vue';
    if (await this.fs.exists('src/App.jsx') || await this.fs.exists('src/App.tsx')) return 'react';
    if (await this.fs.exists('package.json')) return 'node';
    return 'unknown';
  }
}

export { CardManager, FileSystem, GitOps };
export type { TaskCard } from './card-manager';
