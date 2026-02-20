/**
 * Graph Log — stores questions and answers for knowledge graph
 * In-memory; questions/answers flow into logs for traceability
 */

import type { GeneratedQuestion } from './question-generator.js';

export type GraphLogEntryType = 'question' | 'answer';

export interface GraphLogEntry {
  projectPath: string;
  type: GraphLogEntryType;
  timestamp: Date;
  questionType?: string;
  questionText?: string;
  questions?: GeneratedQuestion[];
  answerPaths?: string[];
  promiseId?: string;
}

const logs = new Map<string, GraphLogEntry[]>();

export function logQuestion(
  projectPath: string,
  questions: GeneratedQuestion[],
  promiseId?: string
): void {
  const entry: GraphLogEntry = {
    projectPath,
    type: 'question',
    timestamp: new Date(),
    questionType: questions[0]?.type,
    questionText: questions.map((q) => q.text).join(' '),
    questions,
    promiseId,
  };
  const list = logs.get(projectPath) ?? [];
  list.push(entry);
  logs.set(projectPath, list);
}

export function logAnswer(
  projectPath: string,
  answerPaths: string[],
  promiseId?: string
): void {
  const entry: GraphLogEntry = {
    projectPath,
    type: 'answer',
    timestamp: new Date(),
    answerPaths,
    promiseId,
  };
  const list = logs.get(projectPath) ?? [];
  list.push(entry);
  logs.set(projectPath, list);
}

export function getGraphLogs(projectPath: string): GraphLogEntry[] {
  return logs.get(projectPath) ?? [];
}

export function clearGraphLogs(projectPath?: string): void {
  if (projectPath) logs.delete(projectPath);
  else logs.clear();
}
