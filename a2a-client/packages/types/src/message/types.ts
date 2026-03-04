/**
 * Message Types
 * 
 * Types related to client and server messages
 */

import type { ContextBlock } from '../state/types.js';
import type { FileBlock } from '../file/types.js';

export interface ClientMessage {
    context: ContextBlock;
    files?: FileBlock[];
}

export interface CurrentStep {
    id: string;
    title: string;
    code?: string;
}

export interface NextStep {
    id: string;
    title: string;
}

export interface ActionData {
    id?: string;
    title?: string;
    matchScore?: number;
    currentStep?: CurrentStep;
    nextSteps?: NextStep[];
}

export interface ServerMessage {
    context: ContextBlock;
    files?: FileBlock[];
    message?: string;
    action?: ActionData;
}
