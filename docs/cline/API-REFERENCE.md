# Cline API Reference

## Overview

This document provides comprehensive API documentation for the Cline Documentation Review System, including all available classes, methods, and their usage.

## Core Classes

### ReviewWorkflow Class

The main class for managing the review workflow lifecycle.

#### Constructor

```javascript
const ReviewWorkflow = require('./.clinerules/scripts/review-workflow.js');
const workflow = new ReviewWorkflow();
```

#### Methods

##### `loadReviewQueue()`
Loads the current review queue from the JSON file.

**Returns**: `Promise<Object|null>` - The review queue object or null if error

**Example**:
```javascript
const queue = await workflow.loadReviewQueue();
if (queue) {
  console.log('Total requests:', queue.total_requests);
}
```

##### `saveReviewQueue(queue)`
Saves the review queue to the JSON file.

**Parameters**:
- `queue` (Object): The review queue object to save

**Returns**: `Promise<boolean>` - True if successful, false otherwise

**Example**:
```javascript
const success = await workflow.saveReviewQueue(queue);
if (success) {
  console.log('Review queue saved successfully');
}
```

##### `createReviewRequest(documentPath, reviewType, reviewer)`
Creates a new review request.

**Parameters**:
- `documentPath` (string): Path to the document being reviewed
- `reviewType` (string): Type of review (e.g., 'content', 'technical', 'style')
- `reviewer` (string): Name or ID of the reviewer

**Returns**: `Promise<Object|false>` - The created review request or false if error

**Example**:
```javascript
const reviewRequest = await workflow.createReviewRequest(
  'docs/new-feature.md',
  'content',
  'john.doe'
);
console.log('Review request created:', reviewRequest.id);
```

##### `startReview(reviewId)`
Starts a review by changing its status to 'in_progress'.

**Parameters**:
- `reviewId` (number): The ID of the review to start

**Returns**: `Promise<Object|false>` - The updated review object or false if error

**Example**:
```javascript
const review = await workflow.startReview(123456);
if (review) {
  console.log('Review started:', review.id);
}
```

##### `completeReview(reviewId, results)`
Completes a review by changing its status to 'completed'.

**Parameters**:
- `reviewId` (number): The ID of the review to complete
- `results` (Array): Array of strings describing the review results

**Returns**: `Promise<Object|false>` - The completed review object or false if error

**Example**:
```javascript
const review = await workflow.completeReview(123456, [
  'Technical accuracy verified',
  'Content clarity assessed'
]);
console.log('Review completed:', review.id);
```

##### `rejectReview(reviewId, reason)`
Rejects a review by changing its status to 'rejected'.

**Parameters**:
- `reviewId` (number): The ID of the review to reject
- `reason` (string): Reason for rejection

**Returns**: `Promise<Object|false>` - The rejected review object or false if error

**Example**:
```javascript
const review = await workflow.rejectReview(123456, 'Major revisions required');
console.log('Review rejected:', review.id);
```

##### `getReviewStatus(reviewId)`
Gets the current status of a review.

**Parameters**:
- `reviewId` (number): The ID of the review to check

**Returns**: `Promise<Object|null>` - The review object or null if not found

**Example**:
```javascript
const review = await workflow.getReviewStatus(123456);
if (review) {
  console.log('Review status:', review.status);
}
```

##### `getReviewsByStatus(status)`
Gets all reviews with a specific status.

**Parameters**:
- `status` (string): The status to filter by ('pending', 'in_progress', 'completed', 'rejected')

**Returns**: `Promise<Array>` - Array of review objects

**Example**:
```javascript
const pendingReviews = await workflow.getReviewsByStatus('pending');
console.log('Pending reviews:', pendingReviews.length);
```

##### `generateReviewReport()`
Generates a comprehensive review report.

**Returns**: `Promise<Object|null>` - Report object or null if error

**Example**:
```javascript
const report = await workflow.generateReviewReport();
if (report) {
  console.log('Completion rate:', report.completion_rate + '%');
}
```

### DocumentationManager Class

Manages the document lifecycle and integrates with the review workflow.

#### Constructor

```javascript
const DocumentationManager = require('./.clinerules/scripts/documentation-manager.js');
const manager = new DocumentationManager();
```

#### Methods

##### `handleDocumentationUpdate(documentPath, updateType, content)`
Handles document updates (new or outdated).

**Parameters**:
- `documentPath` (string): Path to the document
- `updateType` (string): Type of update ('new' or 'outdated')
- `content` (string): Content for new documents (optional for outdated)

**Returns**: `Promise<Object>` - Result object with success status and details

**Example**:
```javascript
const result = await manager.handleDocumentationUpdate(
  'docs/new-feature.md',
  'new',
  '# New Feature\n\nFeature documentation.'
);
if (result.success) {
  console.log('Document created:', result.newDocumentPath);
}
```

##### `getReviewStatus(reviewId)`
Gets the status of a specific review.

**Parameters**:
- `reviewId` (number): The ID of the review

**Returns**: `Promise<Object|null>` - Review object or null if not found

**Example**:
```javascript
const status = await manager.getReviewStatus(123456);
console.log('Review status:', status);
```

##### `completeReview(reviewId, results)`
Completes a review.

**Parameters**:
- `reviewId` (number): The ID of the review
- `results` (Array): Array of review results

**Returns**: `Promise<Object|false>` - Completed review or false if error

**Example**:
```javascript
const review = await manager.completeReview(123456, ['Review completed']);
console.log('Review completed:', review);
```

##### `generateReviewReport()`
Generates a review report.

**Returns**: `Promise<Object|null>` - Report object or null if error

**Example**:
```javascript
const report = await manager.generateReviewReport();
console.log('Report:', report);
```

##### `getReviewsByStatus(status)`
Gets reviews by status.

**Parameters**:
- `status` (string): Status to filter by

**Returns**: `Promise<Array>` - Array of review objects

**Example**:
```javascript
const reviews = await manager.getReviewsByStatus('completed');
console.log('Completed reviews:', reviews.length);
```

##### `startReview(reviewId)`
Starts a review.

**Parameters**:
- `reviewId` (number): The ID of the review

**Returns**: `Promise<Object|false>` - Started review or false if error

**Example**:
```javascript
const review = await manager.startReview(123456);
console.log('Review started:', review);
```

### DocumentationReviewCLI Class

Command-line interface for easy system management.

#### Constructor

```javascript
const DocumentationReviewCLI = require('./.clinerules/scripts/cli.js');
const cli = new DocumentationReviewCLI();
```

#### Methods

##### `run()`
Runs the CLI interface.

**Example**:
```javascript
cli.run();
```

##### `showHelp()`
Displays help information.

**Example**:
```javascript
cli.showHelp();
```

##### `createDocumentation(args)`
Creates new documentation via CLI.

**Parameters**:
- `args` (Array): Command arguments

**Example**:
```javascript
await cli.createDocumentation(['docs/new.md', 'Content here']);
```

##### `markOutdated(args)`
Marks documentation as outdated via CLI.

**Parameters**:
- `args` (Array): Command arguments

**Example**:
```javascript
await cli.markOutdated(['docs/old.md']);
```

##### `startReview(args)`
Starts a review via CLI.

**Parameters**:
- `args` (Array): Command arguments

**Example**:
```javascript
await cli.startReview(['123456']);
```

##### `completeReview(args)`
Completes a review via CLI.

**Parameters**:
- `args` (Array): Command arguments

**Example**:
```javascript
await cli.completeReview(['123456', 'Review completed']);
```

##### `rejectReview(args)`
Rejects a review via CLI.

**Parameters**:
- `args` (Array): Command arguments

**Example**:
```javascript
await cli.rejectReview(['123456', 'Major revisions needed']);
```

##### `getReviewStatus(args)`
Gets review status via CLI.

**Parameters**:
- `args` (Array): Command arguments

**Example**:
```javascript
await cli.getReviewStatus(['123456']);
```

##### `generateReport()`
Generates a review report via CLI.

**Example**:
```javascript
await cli.generateReport();
```

##### `listReviews(args)`
Lists reviews by status via CLI.

**Parameters**:
- `args` (Array): Command arguments

**Example**:
```javascript
await cli.listReviews(['pending']);
```

##### `runTests()`
Runs the test suite via CLI.

**Example**:
```javascript
await cli.runTests();
```

## CLI Commands

### Basic Commands

```bash
# Create new documentation
node .clinerules/scripts/cli.js create <path> [content]

# Mark document as outdated
node .clinerules/scripts/cli.js outdated <path>

# Start a review
node .clinerules/scripts/cli.js start <review-id>

# Complete a review
node .clinerules/scripts/cli.js complete <review-id> [results]

# Reject a review
node .clinerules/scripts/cli.js reject <review-id> [reason]

# Get review status
node .clinerules/scripts/cli.js status <review-id>

# Generate report
node .clinerules/scripts/cli.js report

# List reviews
node .clinerules/scripts/cli.js list [status]

# Run tests
node .clinerules/scripts/cli.js test
```

### Command Examples

```bash
# Create documentation with content
node .clinerules/scripts/cli.js create docs/new-feature.md "New feature documentation"

# Create documentation with default content
node .clinerules/scripts/cli.js create docs/new-feature.md

# Mark document as outdated
node .clinerules/scripts/cli.js outdated docs/old-feature.md

# Start review with ID 123456
node .clinerules/scripts/cli.js start 123456

# Complete review with results
node .clinerules/scripts/cli.js complete 123456 "All checks passed"

# Complete review with default message
node .clinerules/scripts/cli.js complete 123456

# Reject review with reason
node .clinerules/scripts/cli.js reject 123456 "Major revisions required"

# Get status of specific review
node .clinerules/scripts/cli.js status 123456

# Generate overall report
node .clinerules/scripts/cli.js report

# List all pending reviews
node .clinerules/scripts/cli.js list pending

# List all reviews
node .clinerules/scripts/cli.js list all

# Run test suite
node .clinerules/scripts/cli.js test
```

## Error Handling

All methods return appropriate error indicators:

- **File operations**: Return `null` or `false` on error
- **Async operations**: Use try-catch for error handling
- **CLI operations**: Display error messages and exit codes

### Error Handling Examples

```javascript
// ReviewWorkflow error handling
try {
  const queue = await workflow.loadReviewQueue();
  if (!queue) {
    console.error('Failed to load review queue');
    return;
  }
  // Process queue
} catch (error) {
  console.error('Error loading review queue:', error.message);
}

// DocumentationManager error handling
const result = await manager.handleDocumentationUpdate(
  'docs/new.md',
  'new',
  'Content'
);
if (!result.success) {
  console.error('Failed to create documentation:', result.error);
  return;
}

// CLI error handling
try {
  await cli.createDocumentation(['docs/new.md']);
} catch (error) {
  console.error('CLI error:', error.message);
}
```

## Integration Examples

### Basic Integration

```javascript
const DocumentationManager = require('./.clinerules/scripts/documentation-manager.js');
const ReviewWorkflow = require('./.clinerules/scripts/review-workflow.js');

async function createDocumentationWithReview(path, content) {
  const manager = new DocumentationManager();
  const workflow = new ReviewWorkflow();
  
  // Create documentation
  const result = await manager.handleDocumentationUpdate(
    path,
    'new',
    content
  );
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  // Get review status
  const review = await workflow.getReviewStatus(result.reviewRequest.id);
  
  return {
    documentPath: result.newDocumentPath,
    reviewId: result.reviewRequest.id,
    reviewStatus: review.status
  };
}
```

### Advanced Integration

```javascript
class CustomDocumentationSystem {
  constructor() {
    this.manager = new DocumentationManager();
    this.workflow = new ReviewWorkflow();
  }
  
  async createAndReviewDocumentation(path, content, reviewer) {
    // Create documentation
    const result = await this.manager.handleDocumentationUpdate(
      path,
      'new',
      content
    );
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    // Start review
    const review = await this.workflow.startReview(result.reviewRequest.id);
    
    // Assign reviewer
    review.reviewer = reviewer;
    await this.workflow.saveReviewQueue(await this.workflow.loadReviewQueue());
    
    return {
      success: true,
      documentPath: result.newDocumentPath,
      reviewId: result.reviewRequest.id,
      reviewer: reviewer
    };
  }
  
  async completeReview(reviewId, results, autoApprove = false) {
    const review = await this.workflow.completeReview(reviewId, results);
    
    if (autoApprove) {
      // Additional approval logic here
      console.log('Auto-approving review:', review.id);
    }
    
    return review;
  }
}
```

## Best Practices

1. **Error Handling**: Always check return values and handle errors appropriately
2. **Async/Await**: Use async/await for better error handling and readability
3. **Validation**: Validate inputs before passing to API methods
4. **Logging**: Implement proper logging for debugging and monitoring
5. **Testing**: Test all integration points thoroughly
6. **Documentation**: Keep API documentation up to date with changes

## Version Compatibility

- **Node.js**: Requires v18+
- **File System**: Requires read/write access to `.clinerules/` directory
- **JSON**: Uses standard JSON parsing and stringification

## Support

For API-related questions or issues:

1. Check the error messages and logs
2. Review the examples in this documentation
3. Run the test suite to verify functionality
4. Check the system documentation in `docs/`