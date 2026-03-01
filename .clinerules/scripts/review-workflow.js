const fs = require('fs').promises;

// Review workflow implementation
class ReviewWorkflow {
  constructor() {
    this.reviewQueuePath = '.clinerules/tracking/review-queue.json';
    this.outdatedDocsPath = '.clinerules/tracking/outdated-documents.json';
  }

  async loadReviewQueue() {
    try {
      const data = await fs.readFile(this.reviewQueuePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading review queue:', error);
      return null;
    }
  }

  async saveReviewQueue(queue) {
    try {
      await fs.writeFile(this.reviewQueuePath, JSON.stringify(queue, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving review queue:', error);
      return false;
    }
  }

  async loadOutdatedDocs() {
    try {
      const data = await fs.readFile(this.outdatedDocsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading outdated documents:', error);
      return null;
    }
  }

  async saveOutdatedDocs(docs) {
    try {
      await fs.writeFile(this.outdatedDocsPath, JSON.stringify(docs, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving outdated documents:', error);
      return false;
    }
  }

  // Create a new review request
  async createReviewRequest(documentPath, reviewType, reviewer) {
    const queue = await this.loadReviewQueue();
    if (!queue) return false;

    const reviewRequest = {
      id: Date.now(),
      document_path: documentPath,
      review_type: reviewType,
      reviewer: reviewer,
      status: 'pending',
      created_at: new Date().toISOString(),
      checklist: this.getChecklistForReviewType(reviewType)
    };

    queue.pending_reviews.push(reviewRequest);
    queue.total_reviews++;

    await this.saveReviewQueue(queue);
    return reviewRequest;
  }

  // Get checklist for specific review type
  getChecklistForReviewType(reviewType) {
    const templates = this.getReviewTemplates();
    const template = templates.find(t => t.name === reviewType);
    return template ? template.checklist : [];
  }

  // Get all review templates
  getReviewTemplates() {
    const queue = this.loadReviewQueue();
    if (!queue) return [];
    return queue.review_templates || [];
  }

  // Start a review
  async startReview(reviewId) {
    const queue = await this.loadReviewQueue();
    if (!queue) return false;

    const review = queue.pending_reviews.find(r => r.id === reviewId);
    if (!review) return false;

    review.status = 'active';
    review.started_at = new Date().toISOString();

    // Move from pending to active
    queue.pending_reviews = queue.pending_reviews.filter(r => r.id !== reviewId);
    queue.active_reviews.push(review);

    await this.saveReviewQueue(queue);
    return review;
  }

  // Complete a review
  async completeReview(reviewId, results) {
    const queue = await this.loadReviewQueue();
    if (!queue) return false;

    const review = queue.active_reviews.find(r => r.id === reviewId);
    if (!review) return false;

    review.status = 'completed';
    review.completed_at = new Date().toISOString();
    review.results = results;

    // Move from active to completed
    queue.active_reviews = queue.active_reviews.filter(r => r.id !== reviewId);
    queue.completed_reviews.push(review);

    await this.saveReviewQueue(queue);
    return review;
  }

  // Reject a review
  async rejectReview(reviewId, reason) {
    const queue = await this.loadReviewQueue();
    if (!queue) return false;

    const review = queue.active_reviews.find(r => r.id === reviewId);
    if (!review) return false;

    review.status = 'rejected';
    review.rejected_at = new Date().toISOString();
    review.rejection_reason = reason;

    // Move from active to rejected
    queue.active_reviews = queue.active_reviews.filter(r => r.id !== reviewId);
    queue.rejected_reviews.push(review);

    await this.saveReviewQueue(queue);
    return review;
  }

  // Get review status
  async getReviewStatus(reviewId) {
    const queue = await this.loadReviewQueue();
    if (!queue) return null;

    return queue.pending_reviews.find(r => r.id === reviewId) ||
           queue.active_reviews.find(r => r.id === reviewId) ||
           queue.completed_reviews.find(r => r.id === reviewId) ||
           queue.rejected_reviews.find(r => r.id === reviewId);
  }

  // Get all reviews by status
  async getReviewsByStatus(status) {
    const queue = await this.loadReviewQueue();
    if (!queue) return [];

    switch (status) {
      case 'pending':
        return queue.pending_reviews;
      case 'active':
        return queue.active_reviews;
      case 'completed':
        return queue.completed_reviews;
      case 'rejected':
        return queue.rejected_reviews;
      default:
        return [];
    }
  }

  // Generate review report
  async generateReviewReport() {
    const queue = await this.loadReviewQueue();
    if (!queue) return null;

    return {
      total_reviews: queue.total_reviews,
      pending: queue.pending_reviews.length,
      active: queue.active_reviews.length,
      completed: queue.completed_reviews.length,
      rejected: queue.rejected_reviews.length,
      completion_rate: queue.total_reviews > 0 ? 
        (queue.completed_reviews.length / queue.total_reviews) * 100 : 0
    };
  }
}

// Export the workflow class
module.exports = ReviewWorkflow;