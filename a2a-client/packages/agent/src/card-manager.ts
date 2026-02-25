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
  userRequest: { original: string; timestamp: string };
  user: { id?: string };
  project: { path: string; type: string };
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
  user?: { id?: string };
  project?: { id?: string; path?: string; type?: string };
  request?: { raw?: string };
  architecturalFeatures?: unknown[];
}

export interface CardUpdates {
  sections?: Record<string, Partial<CardSection>>;
  status?: string;
  questionsForUser?: unknown[];
  taskFilePath?: string | null;
  changes?: unknown[];
}

export class CardManager {
  private cards = new Map<string, TaskCard>();

  createCard(data: CreateCardData): TaskCard {
    const cardId = `card-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const card: TaskCard = {
      cardId,
      sessionId: data.sessionId,
      projectId: data.project?.id ?? null,
      version: 1,
      status: 'template',
      iteration: 0,
      userRequest: {
        original: data.request?.raw ?? '',
        timestamp: new Date().toISOString(),
      },
      user: data.user ?? { id: 'anonymous' },
      project: {
        path: data.project?.path ?? process.cwd(),
        type: data.project?.type ?? 'unknown',
      },
      architecturalFeatures: data.architecturalFeatures ?? [],
      sections: {
        description: {
          type: 'text',
          required: true,
          label: 'Task Description',
          value: null,
          confidence: 0,
          questions: ['What needs to be done?'],
        },
        context: {
          type: 'file_references',
          required: true,
          label: 'Context Files',
          value: [],
          confidence: 0,
          questions: ['Which files contain relevant code?'],
        },
        dependencies: {
          type: 'graph_references',
          required: false,
          label: 'Dependencies',
          value: { uses: [], usedBy: [], extends: [], implements: [] },
          confidence: 0,
          questions: ['What does this file use?'],
        },
      },
      questionsForUser: [],
      taskFilePath: null,
      changes: [],
      ragResults: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.cards.set(cardId, card);
    return card;
  }

  getCard(cardId: string): TaskCard | null {
    return this.cards.get(cardId) ?? null;
  }

  updateCard(cardId: string, updates: CardUpdates): TaskCard {
    const card = this.cards.get(cardId);
    if (!card) throw new Error(`Card not found: ${cardId}`);
    if (updates.sections) {
      for (const [sectionName, sectionData] of Object.entries(updates.sections)) {
        const section = card.sections[sectionName];
        if (section) Object.assign(section, sectionData);
      }
    }
    if (updates.status) card.status = updates.status;
    if (updates.questionsForUser !== undefined) card.questionsForUser = updates.questionsForUser;
    if (updates.taskFilePath !== undefined) card.taskFilePath = updates.taskFilePath;
    if (updates.changes !== undefined) card.changes = updates.changes;
    card.iteration++;
    card.updatedAt = new Date().toISOString();
    return card;
  }

  addAnswer(cardId: string, questionId: string, answer: unknown): TaskCard {
    const card = this.cards.get(cardId);
    if (!card) throw new Error(`Card not found: ${cardId}`);
    for (const [sectionName, section] of Object.entries(card.sections)) {
      const questionIndex = section.questions?.indexOf(questionId);
      if (questionIndex !== undefined && questionIndex !== -1) {
        if (section.type === 'text') {
          section.value = answer;
          section.confidence = 1.0;
        } else if (section.type === 'file_references') {
          const arr = Array.isArray(section.value) ? section.value : [];
          arr.push(answer);
          section.value = arr;
          section.confidence = Math.min(arr.length * 0.3, 1.0);
        }
        break;
      }
    }
    card.questionsForUser = (card.questionsForUser as Array<{ id?: string }>).filter((q) => q.id !== questionId);
    card.updatedAt = new Date().toISOString();
    return card;
  }

  getAllCards(): TaskCard[] {
    return Array.from(this.cards.values());
  }

  deleteCard(cardId: string): boolean {
    return this.cards.delete(cardId);
  }
}
