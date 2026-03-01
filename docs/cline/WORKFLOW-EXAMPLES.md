# Cline Workflow Examples

## Overview

This document provides practical examples of using the Cline Documentation Review System in various scenarios, from basic operations to advanced integrations.

## Basic Workflows

### 1. Creating New Documentation

#### CLI Example
```bash
# Create new documentation with custom content
node .clinerules/scripts/cli.js create docs/user-guide.md "## User Guide\n\nThis is the user guide content."

# Create documentation with default content
node .clinerules/scripts/cli.js create docs/api-reference.md
```

#### Programmatic Example
```javascript
const DocumentationManager = require('./.clinerules/scripts/documentation-manager.js');

async function createNewDocumentation() {
  const manager = new DocumentationManager();
  
  const result = await manager.handleDocumentationUpdate(
    'docs/quick-start.md',
    'new',
    `# Quick Start Guide

## Installation
\`\`\`bash
npm install my-package
\`\`\`

## Basic Usage
\`\`\`javascript
const myPackage = require('my-package');
myPackage.init();
\`\`\`
`
  );
  
  if (result.success) {
    console.log(`✅ Documentation created: ${result.newDocumentPath}`);
    console.log(`📋 Review request: ${result.reviewRequest.id}`);
  } else {
    console.log(`❌ Error: ${result.error}`);
  }
}

createNewDocumentation();
```

### 2. Marking Documentation as Outdated

#### CLI Example
```bash
# Mark old documentation as outdated
node .clinerules/scripts/cli.js outdated docs/legacy-api.md
```

#### Programmatic Example
```javascript
const DocumentationManager = require('./.clinerules/scripts/documentation-manager.js');

async function markAsOutdated() {
  const manager = new DocumentationManager();
  
  const result = await manager.handleDocumentationUpdate(
    'docs/old-features.md',
    'outdated',
    null
  );
  
  if (result.success) {
    console.log(`✅ Document marked as outdated: ${result.outdatedDocs.path}`);
    console.log(`📋 New version: ${result.newDocumentPath}`);
    console.log(`📋 Review request: ${result.reviewRequest.id}`);
  } else {
    console.log(`❌ Error: ${result.error}`);
  }
}

markAsOutdated();
```

### 3. Managing Review Lifecycle

#### CLI Example
```bash
# Start a review
node .clinerules/scripts/cli.js start 123456

# Complete a review with results
node .clinerules/scripts/cli.js complete 123456 "Technical accuracy verified, Content clarity assessed, Format compliance checked"

# Get review status
node .clinerules/scripts/cli.js status 123456

# Generate report
node .clinerules/scripts/cli.js report
```

#### Programmatic Example
```javascript
const ReviewWorkflow = require('./.clinerules/scripts/review-workflow.js');

async function manageReviewLifecycle() {
  const workflow = new ReviewWorkflow();
  
  // Create a review request
  const reviewRequest = await workflow.createReviewRequest(
    'docs/new-feature.md',
    'technical',
    'alice.smith'
  );
  
  console.log(`📋 Review created: ${reviewRequest.id}`);
  
  // Start the review
  const review = await workflow.startReview(reviewRequest.id);
  console.log(`⏱️  Review started: ${review.id}`);
  
  // Complete the review
  const completedReview = await workflow.completeReview(review.id, [
    'Technical accuracy verified',
    'Code examples tested',
    'API references validated'
  ]);
  
  console.log(`✅ Review completed: ${completedReview.id}`);
  console.log(`📊 Results: ${completedReview.results.join(', ')}`);
  
  // Generate report
  const report = await workflow.generateReviewReport();
  console.log(`📈 Completion rate: ${report.completion_rate.toFixed(2)}%`);
}

manageReviewLifecycle();
```

## Advanced Workflows

### 1. Batch Documentation Processing

```javascript
const DocumentationManager = require('./.clinerules/scripts/documentation-manager.js');
const ReviewWorkflow = require('./.clinerules/scripts/review-workflow.js');

async function processMultipleDocuments() {
  const manager = new DocumentationManager();
  const workflow = new ReviewWorkflow();
  
  const documents = [
    {
      path: 'docs/feature-a.md',
      content: '# Feature A\n\nFeature A documentation.'
    },
    {
      path: 'docs/feature-b.md', 
      content: '# Feature B\n\nFeature B documentation.'
    },
    {
      path: 'docs/feature-c.md',
      content: '# Feature C\n\nFeature C documentation.'
    }
  ];
  
  const results = [];
  
  for (const doc of documents) {
    const result = await manager.handleDocumentationUpdate(
      doc.path,
      'new',
      doc.content
    );
    
    if (result.success) {
      results.push({
        document: doc.path,
        reviewId: result.reviewRequest.id,
        status: 'created'
      });
    } else {
      results.push({
        document: doc.path,
        error: result.error,
        status: 'failed'
      });
    }
  }
  
  // Generate summary report
  const created = results.filter(r => r.status === 'created').length;
  const failed = results.filter(r => r.status === 'failed').length;
  
  console.log(`📊 Batch processing complete:`);
  console.log(`✅ Created: ${created} documents`);
  console.log(`❌ Failed: ${failed} documents`);
  
  return results;
}

processMultipleDocuments();
```

### 2. Automated Review Assignment

```javascript
const ReviewWorkflow = require('./.clinerules/scripts/review-workflow.js');

class ReviewAssignmentSystem {
  constructor() {
    this.workflow = new ReviewWorkflow();
    this.reviewers = {
      technical: ['alice.smith', 'bob.johnson', 'carol.davis'],
      content: ['dave.wilson', 'eve.brown'],
      style: ['frank.miller', 'grace.taylor']
    };
    this.assignmentIndex = {
      technical: 0,
      content: 0,
      style: 0
    };
  }
  
  async assignReview(reviewId, reviewType) {
    const review = await this.workflow.getReviewStatus(reviewId);
    if (!review) {
      throw new Error(`Review ${reviewId} not found`);
    }
    
    const reviewers = this.reviewers[reviewType];
    if (!reviewers) {
      throw new Error(`Unknown review type: ${reviewType}`);
    }
    
    // Round-robin assignment
    const reviewerIndex = this.assignmentIndex[reviewType] % reviewers.length;
    const reviewer = reviewers[reviewerIndex];
    
    review.reviewer = reviewer;
    review.review_type = reviewType;
    
    // Update the queue
    const queue = await this.workflow.loadReviewQueue();
    const allReviews = [
      ...queue.pending_requests,
      ...queue.in_progress_requests,
      ...queue.completed_requests,
      ...queue.rejected_requests
    ];
    
    const reviewIndex = allReviews.findIndex(r => r.id === reviewId);
    if (reviewIndex !== -1) {
      allReviews[reviewIndex] = review;
      await this.workflow.saveReviewQueue(queue);
    }
    
    // Increment assignment index
    this.assignmentIndex[reviewType]++;
    
    console.log(`📋 Assigned ${reviewType} review ${reviewId} to ${reviewer}`);
    return review;
  }
  
  async processPendingReviews() {
    const queue = await this.workflow.loadReviewQueue();
    const pendingReviews = queue.pending_requests;
    
    for (const review of pendingReviews) {
      try {
        await this.assignReview(review.id, review.review_type);
      } catch (error) {
        console.error(`Failed to assign review ${review.id}:`, error.message);
      }
    }
  }
}

// Usage
const assignmentSystem = new ReviewAssignmentSystem();
assignmentSystem.processPendingReviews();
```

### 3. Quality Gate Integration

```javascript
const ReviewWorkflow = require('./.clinerules/scripts/review-workflow.js');

class QualityGate {
  constructor() {
    this.workflow = new ReviewWorkflow();
    this.thresholds = {
      completionRate: 80,  // Minimum 80% completion rate
      maxPendingDays: 7,   // Maximum 7 days for pending reviews
      requiredReviewTypes: ['technical', 'content']  // Required review types
    };
  }
  
  async checkQualityGate() {
    const report = await this.workflow.generateReviewReport();
    const queue = await this.workflow.loadReviewQueue();
    
    const issues = [];
    
    // Check completion rate
    if (report.completion_rate < this.thresholds.completionRate) {
      issues.push(`Completion rate too low: ${report.completion_rate}% (minimum: ${this.thresholds.completionRate}%)`);
    }
    
    // Check pending review age
    const now = new Date();
    const pendingReviews = queue.pending_requests;
    
    for (const review of pendingReviews) {
      const createdDate = new Date(review.created_at);
      const daysOld = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
      
      if (daysOld > this.thresholds.maxPendingDays) {
        issues.push(`Review ${review.id} is ${daysOld} days old (maximum: ${this.thresholds.maxPendingDays} days)`);
      }
    }
    
    // Check required review types
    const pendingTypes = pendingReviews.map(r => r.review_type);
    const missingTypes = this.thresholds.requiredReviewTypes.filter(type => !pendingTypes.includes(type));
    
    if (missingTypes.length > 0) {
      issues.push(`Missing required review types: ${missingTypes.join(', ')}`);
    }
    
    return {
      passed: issues.length === 0,
      issues,
      report
    };
  }
  
  async enforceQualityGate() {
    const result = await this.checkQualityGate();
    
    if (!result.passed) {
      console.error('❌ Quality gate failed:');
      result.issues.forEach(issue => console.error(`  - ${issue}`));
      process.exit(1);
    } else {
      console.log('✅ Quality gate passed');
      console.log(`📊 Completion rate: ${result.report.completion_rate}%`);
      console.log(`📋 Pending reviews: ${result.report.pending}`);
    }
  }
}

// Usage in CI/CD pipeline
const qualityGate = new QualityGate();
qualityGate.enforceQualityGate();
```

### 4. Custom Review Templates

```javascript
const ReviewWorkflow = require('./.clinerules/scripts/review-workflow.js');

async function setupCustomReviewTemplates() {
  const workflow = new ReviewWorkflow();
  const queue = await workflow.loadReviewQueue();
  
  // Add custom review templates
  queue.review_templates = [
    {
      name: "API Documentation Review",
      description: "Review template for API documentation",
      checklist: [
        "API endpoints documented",
        "Request/response examples provided",
        "Error codes documented",
        "Authentication requirements specified",
        "Rate limiting documented"
      ]
    },
    {
      name: "User Guide Review", 
      description: "Review template for user guides",
      checklist: [
        "Step-by-step instructions clear",
        "Prerequisites documented",
        "Troubleshooting section included",
        "Screenshots up to date",
        "Glossary of terms provided"
      ]
    },
    {
      name: "Code Example Review",
      description: "Review template for code examples",
      checklist: [
        "Code compiles successfully",
        "Examples are complete",
        "Error handling demonstrated",
        "Best practices followed",
        "Dependencies documented"
      ]
    }
  ];
  
  await workflow.saveReviewQueue(queue);
  console.log('✅ Custom review templates configured');
}

setupCustomReviewTemplates();
```

### 5. Integration with Git Workflow

```javascript
const { execSync } = require('child_process');
const ReviewWorkflow = require('./.clinerules/scripts/review-workflow.js');

class GitIntegration {
  constructor() {
    this.workflow = new ReviewWorkflow();
  }
  
  async createDocumentationBranch(branchName, documentPath, content) {
    try {
      // Create new branch
      execSync(`git checkout -b ${branchName}`);
      
      // Create documentation
      const manager = require('./.clinerules/scripts/documentation-manager.js');
      const docManager = new manager();
      
      const result = await docManager.handleDocumentationUpdate(
        documentPath,
        'new',
        content
      );
      
      if (result.success) {
        // Add and commit
        execSync(`git add ${result.newDocumentPath}`);
        execSync(`git commit -m "Add documentation: ${documentPath}"`);
        
        // Create pull request (assuming GitHub CLI is available)
        execSync(`gh pr create --title "Add ${documentPath}" --body "Documentation review required"`);
        
        console.log(`✅ Documentation branch created: ${branchName}`);
        console.log(`📋 Review request: ${result.reviewRequest.id}`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Git integration failed:', error.message);
      throw error;
    }
  }
  
  async checkDocumentationStatus() {
    const report = await this.workflow.generateReviewReport();
    const queue = await this.workflow.loadReviewQueue();
    
    console.log('📊 Documentation Status:');
    console.log(`  Total requests: ${report.total_requests}`);
    console.log(`  Pending: ${report.pending}`);
    console.log(`  In progress: ${report.in_progress}`);
    console.log(`  Completed: ${report.completed}`);
    console.log(`  Completion rate: ${report.completion_rate}%`);
    
    // Check for stale reviews
    const now = new Date();
    const pendingReviews = queue.pending_requests;
    const staleReviews = pendingReviews.filter(review => {
      const createdDate = new Date(review.created_at);
      const daysOld = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
      return daysOld > 3; // More than 3 days old
    });
    
    if (staleReviews.length > 0) {
      console.log(`⚠️  ${staleReviews.length} stale reviews found`);
      staleReviews.forEach(review => {
        const createdDate = new Date(review.created_at);
        const daysOld = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
        console.log(`  - ${review.document_path} (${daysOld} days old)`);
      });
    }
  }
}

// Usage
const gitIntegration = new GitIntegration();

// Create documentation branch
gitIntegration.createDocumentationBranch(
  'feature/add-user-guide',
  'docs/user-guide.md',
  '# User Guide\n\nUser guide content here.'
);

// Check status
gitIntegration.checkDocumentationStatus();
```

## CI/CD Integration Examples

### GitHub Actions Workflow

```yaml
name: Documentation Review
on:
  pull_request:
    paths:
      - 'docs/**'
      - '.clinerules/**'

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Check documentation quality
        run: |
          node .clinerules/scripts/cli.js report
          node .clinerules/scripts/cli.js list pending
          node .clinerules/scripts/test-review-workflow.js
      
      - name: Enforce quality gate
        run: node .clinerules/scripts/quality-gate.js
      
      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('review-report.txt', 'utf8');
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Documentation Review Report\n\n\`\`\`\n${report}\n\`\`\``
            });
```

### Package.json Scripts

```json
{
  "scripts": {
    "docs:check": "node .clinerules/scripts/cli.js report",
    "docs:review": "node .clinerules/scripts/cli.js list pending",
    "docs:quality-gate": "node .clinerules/scripts/quality-gate.js",
    "docs:pre-commit": "npm run docs:check && npm run docs:quality-gate",
    "docs:post-merge": "node .clinerules/scripts/cli.js report > docs-review-report.txt"
  }
}
```

## Best Practices

### 1. Error Handling
```javascript
async function safeReviewOperation() {
  try {
    const workflow = new ReviewWorkflow();
    const review = await workflow.getReviewStatus(123456);
    
    if (!review) {
      console.log('Review not found');
      return;
    }
    
    // Process review
    console.log(`Review status: ${review.status}`);
    
  } catch (error) {
    console.error('Operation failed:', error.message);
    // Handle specific error types
    if (error.code === 'ENOENT') {
      console.log('Review queue file not found');
    }
  }
}
```

### 2. Logging and Monitoring
```javascript
const fs = require('fs');

class ReviewLogger {
  constructor() {
    this.logFile = '.clinerules/logs/review-operations.log';
  }
  
  log(operation, details) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${operation}: ${JSON.stringify(details)}\n`;
    
    fs.appendFileSync(this.logFile, logEntry);
  }
  
  async logReviewCreation(reviewId, documentPath) {
    this.log('REVIEW_CREATED', { reviewId, documentPath });
  }
  
  async logReviewCompletion(reviewId, results) {
    this.log('REVIEW_COMPLETED', { reviewId, results });
  }
}
```

### 3. Performance Optimization
```javascript
class OptimizedReviewWorkflow extends ReviewWorkflow {
  constructor() {
    super();
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }
  
  async loadReviewQueue() {
    const cached = this.cache.get('reviewQueue');
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    const queue = await super.loadReviewQueue();
    this.cache.set('reviewQueue', {
      data: queue,
      timestamp: Date.now()
    });
    
    return queue;
  }
}
```

These examples demonstrate the flexibility and power of the Cline Documentation Review System, from simple CLI operations to complex integrations with development workflows.