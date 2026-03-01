const fs = require('fs').promises;

// Review workflow implementation
class ReviewWorkflow {
  constructor() {
    this.reviewQueuePath = '.clinerules/reviews/review-requests.json';
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

    queue.pending_requests.push(reviewRequest);
    queue.total_requests++;

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

    const review = queue.pending_requests.find(r => r.id === reviewId);
    if (!review) return false;

    review.status = 'in_progress';
    review.started_at = new Date().toISOString();

    // Move from pending to in_progress
    queue.pending_requests = queue.pending_requests.filter(r => r.id !== reviewId);
    queue.in_progress_requests.push(review);

    await this.saveReviewQueue(queue);
    return review;
  }

  // Complete a review
  async completeReview(reviewId, results) {
    const queue = await this.loadReviewQueue();
    if (!queue) return false;

    const review = queue.in_progress_requests.find(r => r.id === reviewId);
    if (!review) return false;

    review.status = 'completed';
    review.completed_at = new Date().toISOString();
    review.results = results;

    // Move from in_progress to completed
    queue.in_progress_requests = queue.in_progress_requests.filter(r => r.id !== reviewId);
    queue.completed_requests.push(review);

    await this.saveReviewQueue(queue);
    return review;
  }

  // Reject a review
  async rejectReview(reviewId, reason) {
    const queue = await this.loadReviewQueue();
    if (!queue) return false;

    const review = queue.in_progress_requests.find(r => r.id === reviewId);
    if (!review) return false;

    review.status = 'rejected';
    review.rejected_at = new Date().toISOString();
    review.rejection_reason = reason;

    // Move from in_progress to rejected
    queue.in_progress_requests = queue.in_progress_requests.filter(r => r.id !== reviewId);
    queue.rejected_requests.push(review);

    await this.saveReviewQueue(queue);
    return review;
  }

  // Get review status
  async getReviewStatus(reviewId) {
    const queue = await this.loadReviewQueue();
    if (!queue) return null;

    return queue.pending_requests.find(r => r.id === reviewId) ||
           queue.in_progress_requests.find(r => r.id === reviewId) ||
           queue.completed_requests.find(r => r.id === reviewId) ||
           queue.rejected_requests.find(r => r.id === reviewId);
  }

  // Get all reviews by status
  async getReviewsByStatus(status) {
    const queue = await this.loadReviewQueue();
    if (!queue) return [];

    switch (status) {
      case 'pending':
        return queue.pending_requests;
      case 'in_progress':
        return queue.in_progress_requests;
      case 'completed':
        return queue.completed_requests;
      case 'rejected':
        return queue.rejected_requests;
      default:
        return [];
    }
  }

  // Generate review report
  async generateReviewReport() {
    const queue = await this.loadReviewQueue();
    if (!queue) return null;

    return {
      total_requests: queue.total_requests,
      pending: queue.pending_requests.length,
      in_progress: queue.in_progress_requests.length,
      completed: queue.completed_requests.length,
      rejected: queue.rejected_requests.length,
      completion_rate: queue.total_requests > 0 ? 
        (queue.completed_requests.length / queue.total_requests) * 100 : 0
    };
  }
}

// Export the workflow class
module.exports = ReviewWorkflow;