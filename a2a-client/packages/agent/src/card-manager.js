/**
 * Card Manager - Manages task card lifecycle
 * 
 * Handles creation and updates of task cards.
 */

/**
 * CardManager class for managing task cards
 */
class CardManager {
  /**
   * Create a new card manager instance
   */
  constructor() {
    this.cards = new Map();
  }

  /**
   * Create a new task card
   * @param {Object} data - Card data
   * @param {string} data.sessionId - Session identifier
   * @param {Object} data.user - User information
   * @param {Object} data.project - Project information
   * @param {Object} data.request - Request details
   * @returns {Object} Created card
   */
  createCard(data) {
    const cardId = `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const card = {
      cardId,
      sessionId: data.sessionId,
      projectId: data.project?.id || null,
      version: 1,
      status: 'template',
      iteration: 0,
      
      userRequest: {
        original: data.request?.raw || '',
        timestamp: new Date().toISOString(),
      },
      
      user: data.user || { id: 'anonymous' },
      
      project: {
        path: data.project?.path || process.cwd(),
        type: data.project?.type || 'unknown',
      },
      
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
          value: {
            uses: [],
            usedBy: [],
            extends: [],
            implements: [],
          },
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

  /**
   * Get card by ID
   * @param {string} cardId - Card identifier
   * @returns {Object|null} Card or null if not found
   */
  getCard(cardId) {
    return this.cards.get(cardId) || null;
  }

  /**
   * Update card sections
   * @param {string} cardId - Card identifier
   * @param {Object} updates - Section updates
   * @returns {Object} Updated card
   */
  updateCard(cardId, updates) {
    const card = this.cards.get(cardId);
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }

    // Update sections
    if (updates.sections) {
      for (const [sectionName, sectionData] of Object.entries(updates.sections)) {
        if (card.sections[sectionName]) {
          Object.assign(card.sections[sectionName], sectionData);
        }
      }
    }

    // Update other fields
    if (updates.status) {
      card.status = updates.status;
    }
    if (updates.questionsForUser) {
      card.questionsForUser = updates.questionsForUser;
    }
    if (updates.taskFilePath) {
      card.taskFilePath = updates.taskFilePath;
    }
    if (updates.changes) {
      card.changes = updates.changes;
    }

    card.iteration++;
    card.updatedAt = new Date().toISOString();

    return card;
  }

  /**
   * Add answer to card
   * @param {string} cardId - Card identifier
   * @param {string} questionId - Question identifier
   * @param {any} answer - Answer value
   * @returns {Object} Updated card
   */
  addAnswer(cardId, questionId, answer) {
    const card = this.cards.get(cardId);
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }

    // Find which section this question belongs to
    for (const [sectionName, section] of Object.entries(card.sections)) {
      const questionIndex = section.questions?.indexOf(questionId);
      if (questionIndex !== -1) {
        // Update section value based on answer
        if (section.type === 'text') {
          section.value = answer;
          section.confidence = 1.0;
        } else if (section.type === 'file_references') {
          if (!Array.isArray(section.value)) {
            section.value = [];
          }
          section.value.push(answer);
          section.confidence = Math.min(section.value.length * 0.3, 1.0);
        }
        break;
      }
    }

    // Remove answered question
    card.questionsForUser = card.questionsForUser.filter(q => q.id !== questionId);
    card.updatedAt = new Date().toISOString();

    return card;
  }

  /**
   * Get all cards
   * @returns {Array} All cards
   */
  getAllCards() {
    return Array.from(this.cards.values());
  }

  /**
   * Delete card
   * @param {string} cardId - Card identifier
   * @returns {boolean} True if deleted
   */
  deleteCard(cardId) {
    return this.cards.delete(cardId);
  }
}

module.exports = {
  CardManager,
};
