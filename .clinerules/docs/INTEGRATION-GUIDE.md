# Documentation Review System - Integration Guide

## Overview

This guide provides comprehensive instructions for integrating the documentation review workflow system into your
development environment and CI/CD pipeline.

## Quick Start

### 1. System Requirements

- Node.js v18+
- File system access to `.clinerules/` directory
- Read/write permissions for documentation files

### 2. Basic Setup

The system is already configured and ready to use. No additional setup is required.

### 3. First Use

```bash
# Test the system
node .clinerules/scripts/test-review-workflow.js

# Use the CLI interface
node .clinerules/scripts/cli.js help
```

## Integration Methods

### Method 1: Direct API Usage

#### Creating Documentation

```javascript
const DocumentationManager = require('./.clinerules/scripts/documentation-manager.js');
const manager = new DocumentationManager();

// Create new documentation
const result = await manager.handleDocumentationUpdate(
  'docs/new-feature.md',
  'new',
  '# New Feature\n\nFeature documentation content.'
);

// Mark document as outdated
const outdatedResult = await manager.handleDocumentationUpdate(
  'docs/old-feature.md',
  'outdated',
  null
);
```

#### Managing Reviews

```javascript
const ReviewWorkflow = require('./.clinerules/scripts/review-workflow.js');
const workflow = new ReviewWorkflow();

// Start a review
const review = await workflow.startReview(123456);

// Complete a review
const completed = await workflow.completeReview(123456, [
  'Technical accuracy verified',
  'Content clarity assessed'
]);

// Generate reports
const report = await workflow.generateReviewReport();
```

### Method 2: CLI Interface

#### Basic Commands

```bash
# Create new documentation
node .clinerules/scripts/cli.js create docs/new-feature.md "New feature documentation"

# Mark document as outdated
node .clinerules/scripts/cli.js outdated docs/old-feature.md

# Start a review
node .clinerules/scripts/cli.js start 123456

# Complete a review
node .clinerules/scripts/cli.js complete 123456 "All checks passed"

# Generate report
node .clinerules/scripts/cli.js report

# List reviews
node .clinerules/scripts/cli.js list pending
```

### Method 3: Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "docs:create": "node .clinerules/scripts/cli.js create",
    "docs:outdated": "node .clinerules/scripts/cli.js outdated",
    "docs:review": "node .clinerules/scripts/cli.js start",
    "docs:complete": "node .clinerules/scripts/cli.js complete",
    "docs:report": "node .clinerules/scripts/cli.js report",
    "docs:test": "node .clinerules/scripts/test-review-workflow.js"
  }
}
```

Then use:

```bash
npm run docs:create docs/new-feature.md "Content"
npm run docs:outdated docs/old-feature.md
npm run docs:report
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/documentation-review.yml`:

```yaml
name: Documentation Review
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

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
      
      - name: Run documentation review
        run: |
          node .clinerules/scripts/cli.js report
          node .clinerules/scripts/test-review-workflow.js
      
      - name: Check for pending reviews
        run: |
          PENDING=$(node .clinerules/scripts/cli.js list pending | grep -c "ID:" || echo "0")
          if [ "$PENDING" -gt "0" ]; then
            echo "⚠️ Found $PENDING pending reviews"
            exit 1
          fi
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
documentation_review:
  stage: test
  image: node:18
  script:
    - npm ci
    - node .clinerules/scripts/cli.js report
    - node .clinerules/scripts/test-review-workflow.js
  only:
    - main
    - develop
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Documentation Review') {
            steps {
                sh 'npm ci'
                sh 'node .clinerules/scripts/cli.js report'
                sh 'node .clinerules/scripts/test-review-workflow.js'
            }
        }
    }
}
```

## IDE Integration

### VS Code Tasks

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Documentation: Create",
      "type": "shell",
      "command": "node",
      "args": [".clinerules/scripts/cli.js", "create", "${input:documentPath}", "${input:content}"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Documentation: Review Report",
      "type": "shell",
      "command": "node",
      "args": [".clinerules/scripts/cli.js", "report"],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ],
  "inputs": [
    {
      "id": "documentPath",
      "description": "Path to documentation file",
      "default": "docs/new-document.md"
    },
    {
      "id": "content",
      "description": "Documentation content",
      "default": "# New Document\n\nContent here."
    }
  ]
}
```

### VS Code Commands

Add to `.vscode/commands.json`:

```json
{
  "version": "0.2.0",
  "commands": [
    {
      "command": "extension.documentation.create",
      "title": "Create Documentation",
      "category": "Documentation"
    },
    {
      "command": "extension.documentation.review",
      "title": "Review Documentation",
      "category": "Documentation"
    },
    {
      "command": "extension.documentation.report",
      "title": "Generate Report",
      "category": "Documentation"
    }
  ]
}
```

## Customization

### Review Templates

Modify review templates in the review queue:

```javascript
// Add custom review templates
const queue = await workflow.loadReviewQueue();
queue.review_templates.push({
  name: "Custom Review",
  description: "Custom review for specific needs",
  checklist: [
    "Custom check 1",
    "Custom check 2",
    "Custom check 3"
  ]
});
await workflow.saveReviewQueue(queue);
```

### Quality Metrics

Customize quality metrics by modifying the review workflow:

```javascript
// Add custom metrics
class CustomReviewWorkflow extends ReviewWorkflow {
  async generateCustomReport() {
    const baseReport = await this.generateReviewReport();
    return {
      ...baseReport,
      customMetric: this.calculateCustomMetric()
    };
  }
}
```

### Notification System

Add notifications for review status changes:

```javascript
// Extend the workflow to send notifications
class NotifyingReviewWorkflow extends ReviewWorkflow {
  async completeReview(reviewId, results) {
    const review = await super.completeReview(reviewId, results);
    
    // Send notification
    await this.sendNotification(review);
    
    return review;
  }
  
  async sendNotification(review) {
    // Implementation for sending notifications
    console.log(`Notification: Review ${review.id} completed`);
  }
}
```

## Best Practices

### 1. Review Process

- **Always create review requests** for new documentation
- **Mark outdated documents** when making significant changes
- **Use appropriate review types** based on content
- **Set realistic deadlines** for reviews

### 2. Quality Standards

- **Verify technical accuracy** before marking as complete
- **Test all code examples** in technical documentation
- **Check for consistency** with existing documentation
- **Ensure clarity** for target audience

### 3. Automation

- **Integrate with CI/CD** to catch issues early
- **Use automated checks** for common issues
- **Schedule regular reviews** for critical documentation
- **Monitor metrics** to improve quality

### 4. Team Collaboration

- **Assign appropriate reviewers** based on expertise
- **Use collaborative reviews** for complex documentation
- **Document review decisions** for future reference
- **Provide constructive feedback** to authors

## Troubleshooting

### Common Issues

#### File Corruption

```bash
# Restore review queue
rm .clinerules/reviews/review-requests.json
node .clinerules/scripts/cli.js test
```

#### Permission Issues

```bash
# Check permissions
ls -la .clinerules/
# Fix permissions if needed
chmod -R 755 .clinerules/
```

#### Missing Dependencies

```bash
# Reinstall dependencies
npm install
# Verify Node.js version
node --version
```

#### Network Issues

```bash
# Check connectivity
ping google.com
# Verify file access
ls .clinerules/scripts/
```

### Debug Mode

Enable debug logging:

```javascript
// Add to review workflow
class DebugReviewWorkflow extends ReviewWorkflow {
  async loadReviewQueue() {
    console.log('Loading review queue...');
    const result = await super.loadReviewQueue();
    console.log('Review queue loaded:', result);
    return result;
  }
}
```

## Support and Maintenance

### Regular Maintenance

1. **Weekly**: Review pending reviews and follow up
2. **Monthly**: Analyze quality metrics and trends
3. **Quarterly**: Update review templates and checklists
4. **Annually**: Review and update the entire system

### Monitoring

Monitor these key indicators:

- **Review completion rate**: Should be >80%
- **Average review time**: Should be <48 hours
- **Revision rate**: Should be <20%
- **User satisfaction**: Should be >4/5

### Updates

To update the system:

1. **Backup existing files**
2. **Test updates in development**
3. **Deploy to production**
4. **Monitor for issues**

## Conclusion

The documentation review system provides a comprehensive framework for maintaining high-quality documentation. By
following this integration guide, you can:

- **Automate review processes** to save time
- **Ensure quality standards** are consistently met
- **Track progress** and identify areas for improvement
- **Integrate seamlessly** with your existing development workflow

For additional support, refer to the system documentation in the `.clinerules/` directory or run the test suite to
verify functionality.