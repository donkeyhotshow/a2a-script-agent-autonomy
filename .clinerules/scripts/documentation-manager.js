const ReviewWorkflow = require('./review-workflow.js');
const fs = require('fs').promises;

class DocumentationManager {
  constructor() {
    this.reviewWorkflow = new ReviewWorkflow();
  }

  // Main method to handle documentation updates
  async handleDocumentationUpdate(documentPath, updateType, content) {
    try {
      // Check if document exists
      let exists = false;
      try {
        await fs.access(documentPath);
        exists = true;
      } catch (e) {
        exists = false;
      }

      if (updateType === 'outdated') {
        return await this.handleOutdatedDocument(documentPath, exists);
      } else if (updateType === 'new') {
        return await this.handleNewDocument(documentPath, content, exists);
      } else {
        throw new Error('Unknown update type. Use "outdated" or "new".');
      }
    } catch (error) {
      console.error('Error handling documentation update:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle outdated document
  async handleOutdatedDocument(documentPath, exists) {
    if (!exists) {
      return {
        success: false,
        error: `Document ${documentPath} does not exist to be marked as outdated`
      };
    }

    // Mark document as outdated
    const outdatedDocs = await this.markAsOutdated(documentPath);

    // Create new document with NEW prefix
    const newDocumentPath = this.getNewDocumentPath(documentPath);
    const newContent = `# OUTDATED: ${documentPath}\n\nThis document has been replaced. See the new version.`;

    await fs.writeFile(newDocumentPath, newContent);

    // Create review request for new document
    const reviewRequest = await this.reviewWorkflow.createReviewRequest(
      newDocumentPath,
      'content',
      'auto-reviewer'
    );

    return {
      success: true,
      outdatedDocs,
      newDocumentPath,
      reviewRequest
    };
  }

  // Handle new document
  async handleNewDocument(documentPath, content, exists) {
    if (exists) {
      return {
        success: false,
        error: `Document ${documentPath} already exists. Use "outdated" to update it.`
      };
    }

    // Create new document with NEW prefix
    const newDocumentPath = this.getNewDocumentPath(documentPath);
    await fs.writeFile(newDocumentPath, content);

    // Create review request for new document
    const reviewRequest = await this.reviewWorkflow.createReviewRequest(
      newDocumentPath,
      'content',
      'auto-reviewer'
    );

    return {
      success: true,
      newDocumentPath,
      reviewRequest
    };
  }

  // Mark document as outdated in tracking system
  async markAsOutdated(documentPath) {
    const outdatedDocs = await this.reviewWorkflow.loadOutdatedDocs();
    if (!outdatedDocs) return null;

    outdatedDocs.outdated_documents.push({
      path: documentPath,
      marked_at: new Date().toISOString(),
      status: 'pending_update'
    });
    outdatedDocs.total_documents++;

    await this.reviewWorkflow.saveOutdatedDocs(outdatedDocs);
    return outdatedDocs;
  }

  // Get new document path with NEW prefix
  getNewDocumentPath(originalPath) {
    const path = require('path');
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const name = path.basename(originalPath, ext);
    return path.join(dir, `NEW-${name}${ext}`);
  }

  // Get review status
  async getReviewStatus(reviewId) {
    return await this.reviewWorkflow.getReviewStatus(reviewId);
  }

  // Complete review
  async completeReview(reviewId, results) {
    return await this.reviewWorkflow.completeReview(reviewId, results);
  }

  // Generate review report
  async generateReviewReport() {
    return await this.reviewWorkflow.generateReviewReport();
  }

  // Get all reviews by status
  async getReviewsByStatus(status) {
    return await this.reviewWorkflow.getReviewsByStatus(status);
  }

  // Start a review
  async startReview(reviewId) {
    return await this.reviewWorkflow.startReview(reviewId);
  }
}

// Export the manager class
module.exports = DocumentationManager;