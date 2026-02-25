/**
 * Card Manager - Manages task card lifecycle
 */
export interface CardSection {
    type: string;
    required: boolean;
    label: string;
    value: unknown;
    confidence: number;
    questions?: string[];
}
export interface TaskCard {
    cardId: string;
    sessionId: string;
    projectId: string | null;
    version: number;
    status: string;
    iteration: number;
    userRequest: {
        original: string;
        timestamp: string;
    };
    user: {
        id?: string;
    };
    project: {
        path: string;
        type: string;
    };
    architecturalFeatures: unknown[];
    sections: Record<string, CardSection>;
    questionsForUser: unknown[];
    taskFilePath: string | null;
    changes: unknown[];
    ragResults: unknown[];
    createdAt: string;
    updatedAt: string;
}
export interface CreateCardData {
    sessionId: string;
    user?: {
        id?: string;
    };
    project?: {
        id?: string;
        path?: string;
        type?: string;
    };
    request?: {
        raw?: string;
    };
    architecturalFeatures?: unknown[];
}
export interface CardUpdates {
    sections?: Record<string, Partial<CardSection>>;
    status?: string;
    questionsForUser?: unknown[];
    taskFilePath?: string | null;
    changes?: unknown[];
}
export declare class CardManager {
    private cards;
    createCard(data: CreateCardData): TaskCard;
    getCard(cardId: string): TaskCard | null;
    updateCard(cardId: string, updates: CardUpdates): TaskCard;
    addAnswer(cardId: string, questionId: string, answer: unknown): TaskCard;
    getAllCards(): TaskCard[];
    deleteCard(cardId: string): boolean;
}
