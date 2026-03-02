#!/usr/bin/env node

const DocumentationManager = require('./documentation-manager.js');
const ReviewWorkflow = require('./review-workflow.js');
const fs = require('fs').promises;
const path = require('path');

class DocumentationReviewCLI {
    constructor() {
        this.manager = new DocumentationManager();
        this.workflow = new ReviewWorkflow();
    }

    async run() {
        const args = process.argv.slice(2);
        const command = args[0];

        if (!command) {
            this.showHelp();
            return;
        }

        try {
            switch (command) {
                case 'create':
                    await this.createDocumentation(args.slice(1));
                    break;
                case 'outdated':
                    await this.markOutdated(args.slice(1));
                    break;
                case 'start':
                    await this.startReview(args.slice(1));
                    break;
                case 'complete':
                    await this.completeReview(args.slice(1));
                    break;
                case 'reject':
                    await this.rejectReview(args.slice(1));
                    break;
                case 'status':
                    await this.getReviewStatus(args.slice(1));
                    break;
                case 'report':
                    await this.generateReport();
                    break;
                case 'list':
                    await this.listReviews(args.slice(1));
                    break;
                case 'test':
                    await this.runTests();
                    break;
                default:
                    console.log(`Unknown command: ${command}`);
                    this.showHelp();
            }
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
    }

    showHelp() {
        console.log(`
Documentation Review CLI

Usage: node cli.js <command> [options]

Commands:
  create <path> [content]     Create new documentation
  outdated <path>             Mark existing document as outdated
  start <review-id>           Start a review
  complete <review-id>        Complete a review
  reject <review-id> [reason] Reject a review
  status <review-id>          Get review status
  report                      Generate review report
  list [status]               List reviews by status
  test                        Run test suite

Examples:
  node cli.js create docs/new-feature.md "New feature documentation"
  node cli.js outdated docs/old-feature.md
  node cli.js start 123456
  node cli.js complete 123456 "All checks passed"
  node cli.js report
  node cli.js list pending
    `);
    }

    async createDocumentation(args) {
        const documentPath = args[0];
        const content = args.slice(1).join(' ') || `# ${path.basename(documentPath, '.md')}\n\nDocumentation content here.`;

        if (!documentPath) {
            console.log('Usage: node cli.js create <path> [content]');
            return;
        }

        const result = await this.manager.handleDocumentationUpdate(
            documentPath,
            'new',
            content
        );

        if (result.success) {
            console.log(`✅ New document created: ${result.newDocumentPath}`);
            console.log(`📋 Review request created: ${result.reviewRequest.id}`);
        } else {
            console.log(`❌ Error: ${result.error}`);
        }
    }

    async markOutdated(args) {
        const documentPath = args[0];

        if (!documentPath) {
            console.log('Usage: node cli.js outdated <path>');
            return;
        }

        const result = await this.manager.handleDocumentationUpdate(
            documentPath,
            'outdated',
            null
        );

        if (result.success) {
            console.log(`✅ Document marked as outdated: ${documentPath}`);
            console.log(`📋 New version created: ${result.newDocumentPath}`);
            console.log(`📋 Review request created: ${result.reviewRequest.id}`);
        } else {
            console.log(`❌ Error: ${result.error}`);
        }
    }

    async startReview(args) {
        const reviewId = parseInt(args[0]);

        if (!reviewId) {
            console.log('Usage: node cli.js start <review-id>');
            return;
        }

        const review = await this.workflow.startReview(reviewId);

        if (review) {
            console.log(`✅ Review started: ${review.id}`);
            console.log(`📄 Document: ${review.document_path}`);
            console.log(`👥 Reviewer: ${review.reviewer}`);
        } else {
            console.log(`❌ Review not found: ${reviewId}`);
        }
    }

    async completeReview(args) {
        const reviewId = parseInt(args[0]);
        const results = args.slice(1).join(' ') || 'Review completed successfully';

        if (!reviewId) {
            console.log('Usage: node cli.js complete <review-id> [results]');
            return;
        }

        const review = await this.workflow.completeReview(reviewId, [results]);

        if (review) {
            console.log(`✅ Review completed: ${review.id}`);
            console.log(`📄 Document: ${review.document_path}`);
            console.log(`📊 Results: ${review.results.join(', ')}`);
        } else {
            console.log(`❌ Review not found: ${reviewId}`);
        }
    }

    async rejectReview(args) {
        const reviewId = parseInt(args[0]);
        const reason = args.slice(1).join(' ') || 'Review rejected';

        if (!reviewId) {
            console.log('Usage: node cli.js reject <review-id> [reason]');
            return;
        }

        const review = await this.workflow.rejectReview(reviewId, reason);

        if (review) {
            console.log(`❌ Review rejected: ${review.id}`);
            console.log(`📄 Document: ${review.document_path}`);
            console.log(`📝 Reason: ${review.rejection_reason}`);
        } else {
            console.log(`❌ Review not found: ${reviewId}`);
        }
    }

    async getReviewStatus(args) {
        const reviewId = parseInt(args[0]);

        if (!reviewId) {
            console.log('Usage: node cli.js status <review-id>');
            return;
        }

        const review = await this.workflow.getReviewStatus(reviewId);

        if (review) {
            console.log(`📋 Review: ${review.id}`);
            console.log(`📄 Document: ${review.document_path}`);
            console.log(`👥 Reviewer: ${review.reviewer}`);
            console.log(`📊 Status: ${review.status}`);
            console.log(`📅 Created: ${review.created_at}`);

            if (review.started_at) {
                console.log(`⏱️  Started: ${review.started_at}`);
            }

            if (review.completed_at) {
                console.log(`✅ Completed: ${review.completed_at}`);
                console.log(`📊 Results: ${review.results?.join(', ') || 'N/A'}`);
            }

            if (review.rejected_at) {
                console.log(`❌ Rejected: ${review.rejected_at}`);
                console.log(`📝 Reason: ${review.rejection_reason}`);
            }
        } else {
            console.log(`❌ Review not found: ${reviewId}`);
        }
    }

    async generateReport() {
        const report = await this.workflow.generateReviewReport();

        if (report) {
            console.log('📊 Review Report');
            console.log('='.repeat(50));
            console.log(`Total Requests: ${report.total_requests}`);
            console.log(`Pending: ${report.pending}`);
            console.log(`In Progress: ${report.in_progress}`);
            console.log(`Completed: ${report.completed}`);
            console.log(`Rejected: ${report.rejected}`);
            console.log(`Completion Rate: ${report.completion_rate.toFixed(2)}%`);
        } else {
            console.log('❌ Could not generate report');
        }
    }

    async listReviews(args) {
        const status = args[0] || 'all';
        let reviews = [];

        if (status === 'all') {
            const queue = await this.workflow.loadReviewQueue();
            if (queue) {
                reviews = [
                    ...queue.pending_requests,
                    ...queue.in_progress_requests,
                    ...queue.completed_requests,
                    ...queue.rejected_requests
                ];
            }
        } else {
            reviews = await this.workflow.getReviewsByStatus(status);
        }

        if (reviews.length === 0) {
            console.log(`No reviews found for status: ${status}`);
            return;
        }

        console.log(`📋 Reviews (${status}):`);
        console.log('='.repeat(50));

        reviews.forEach(review => {
            console.log(`ID: ${review.id}`);
            console.log(`📄 Document: ${review.document_path}`);
            console.log(`👥 Reviewer: ${review.reviewer}`);
            console.log(`📊 Status: ${review.status}`);
            console.log(`📅 Created: ${review.created_at}`);
            console.log('-'.repeat(30));
        });
    }

    async runTests() {
        console.log('🧪 Running test suite...');
        try {
            const testResult = await this.manager.handleDocumentationUpdate(
                'docs/TEST-cli-documentation.md',
                'new',
                '# CLI Test Documentation\n\nThis is a test for the CLI interface.'
            );

            if (testResult.success) {
                console.log('✅ CLI test passed');
                console.log(`📄 Created: ${testResult.newDocumentPath}`);
                console.log(`📋 Review: ${testResult.reviewRequest.id}`);
            } else {
                console.log('❌ CLI test failed');
            }
        } catch (error) {
            console.log('❌ CLI test error:', error.message);
        }
    }
}

// Run CLI if called directly
if (require.main === module) {
    const cli = new DocumentationReviewCLI();
    cli.run();
}

module.exports = DocumentationReviewCLI;