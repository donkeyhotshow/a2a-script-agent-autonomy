// Auto-generated from JSON Schema - DO NOT EDIT MANUALLY
// Generated: 2026-03-03T20:10:27.767Z

export interface ExecutionContext {
  action: string;
  step?: string;
  progress?: Record<string, any>;
}

export interface FormChoice {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

export interface FormInput {
  name: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Record<string, any>[];
}

export interface Request {
  requestId: string;
  sessionId: string;
  action: string;
  context?: Record<string, any>;
  result?: ActionKeyShape;
}

export interface HistoryEntry {
  step: string;
  action: string;
  timestamp: string;
  result?: Record<string, any>;
}

export interface Response {
  requestId: string;
  sessionId: string;
  status: 'processing' | 'completed' | 'error' | 'waiting';
  execute?: ActionKeyShape;
  context?: Record<string, any>;
  message?: string;
}

export interface ExecuteScript {
  script: Record<string, any>;
}

export interface ExecuteReadFile {
  read-file: Record<string, any>;
}

export interface ExecuteWriteFile {
  write-file: Record<string, any>;
}

export interface ExecuteRagSearch {
  rag-search: Record<string, any>;
}

export interface ExecuteCommand {
  execute-command: Record<string, any>;
}

export interface ExecuteForm {
  form: Record<string, any>;
}

export interface ExecuteMessage {
  message: string;
}

export interface ResultScript {
  script: Record<string, any>;
}

export interface ResultReadFile {
  read-file: Record<string, any>;
}

export interface ResultWriteFile {
  write-file: Record<string, any>;
}

export interface ResultRagSearch {
  rag-search: Record<string, any>;
}

export interface ResultExecuteCommand {
  execute-command: Record<string, any>;
}

export interface ResultChoice {
  choice: string;
}

export interface ResultMessage {
  message: string;
}


// Main Protocol Types
export type ProtocolRequest = Request;
export type ProtocolResponse = Response;
export type ProtocolMessage = Request | Response;

// Execute types
export type ExecuteAction = 
  | ExecuteScript
  | ExecuteReadFile
  | ExecuteWriteFile
  | ExecuteRagSearch
  | ExecuteCommand
  | ExecuteForm
  | ExecuteMessage;

// Result types
export type ResultAction =
  | ResultScript
  | ResultReadFile
  | ResultWriteFile
  | ResultRagSearch
  | ResultExecuteCommand
  | ResultChoice
  | ResultMessage;
