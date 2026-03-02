# Task System Guide

## Overview

The Task System provides a structured approach to managing documentation updates using the existing `.clinerules/` infrastructure. Instead of creating files with NEW- prefixes, the system generates tasks in `.clinerules/tasks/` directory with detailed instructions and dependencies.

## System Components

### Task Generator (`.clinerules/scripts/task-generator.js`)

Generates tasks for documentation updates and creation.

**Key Features:**
- Creates structured task files in JSON format
- Assigns priorities (high, medium, low)
- Provides detailed instructions for each task
- Estimates time requirements
- Links related documents

**Usage:**
```bash
# Generate all tasks
node .clinerules/scripts/task-generator.js generate-all

# Generate specific update task
node .clinerules/scripts/task-generator.js generate-update docs/API-REFERENCE.md "API endpoints need updating"

# Generate specific create task
node .clinerules/scripts/task-generator.js generate-create docs/ARCHITECTURE.md "Create system architecture documentation"

# List all tasks
node .clinerules/scripts/task-generator.js list

# Complete a task
node .clinerules/scripts/task-generator.js complete task-1 "Task completed successfully"

# Generate task report
node .clinerules/scripts/task-generator.js report
```

### Task Manager (`.clinerules/scripts/task-manager.js`)

Executes and manages the lifecycle of tasks.

**Key Features:**
- Executes tasks using existing documentation management system
- Tracks task status (pending, in_progress, completed, failed)
- Integrates with review workflow system
- Provides execution statistics and reports

**Usage:**
```bash
# List all tasks
node .clinerules/scripts/task-manager.js list

# Execute specific task
node .clinerules/scripts/task-manager.js execute task-1

# Execute all pending tasks
node .clinerules/scripts/task-manager.js execute-all

# Show task statistics
node .clinerules/scripts/task-manager.js stats

# Generate execution report
node .clinerules/scripts/task-manager.js report
```

## Task Structure

Each task is stored as a JSON file in `.clinerules/tasks/` with the following structure:

```json
{
  "id": "task-1",
  "type": "document_update",
  "status": "pending",
  "priority": "high",
  "created_at": "2026-03-02T08:22:08.145Z",
  "document_path": "docs/API-REFERENCE.md",
  "reason": "API endpoints and examples need updating",
  "instructions": [
    "Review current API endpoints and their documentation",
    "Update endpoint descriptions with latest changes",
    "Add examples for new endpoints",
    "Verify all parameters are documented",
    "Check authentication requirements",
    "Update response format examples"
  ],
  "dependencies": [],
  "estimated_time": "2-4 hours",
  "links": [
    "docs/WORKFLOW-TYPES.md",
    "docs/INTEGRATION-GUIDE.md",
    "a2a-server/docs/action-api.md"
  ]
}
```

## Task Types

### Document Update (`document_update`)

Used for updating existing documentation.

**Process:**
1. Mark document as outdated using documentation manager
2. Create new version with updated content
3. Generate review request
4. Complete review process

**Example:**
```bash
# Update API documentation
node .clinerules/scripts/task-manager.js execute task-1
```

### Document Creation (`document_create`)

Used for creating new documentation.

**Process:**
1. Generate content based on task description
2. Create new document using documentation manager
3. Generate review request
4. Complete review process

**Example:**
```bash
# Create architecture documentation
node .clinerules/scripts/task-manager.js execute task-4
```

## Task Priorities

### High Priority
- Critical documentation that affects system functionality
- API references and core technical documentation
- Main README files

### Medium Priority
- User guides and workflow documentation
- Integration guides and troubleshooting
- Secondary technical documentation

### Low Priority
- Reference documentation
- Historical documentation
- Optional guides

## Integration with Existing System

The task system integrates seamlessly with the existing documentation management infrastructure:

### Documentation Manager Integration
- Uses `DocumentationManager.handleDocumentationUpdate()` for all operations
- Maintains consistency with existing review workflows
- Preserves audit trails and tracking

### Review Workflow Integration
- Automatically creates review requests for each task
- Integrates with existing review system
- Maintains quality standards

### State Management Integration
- Uses existing state management system
- Preserves workflow session context
- Maintains progress tracking

## Workflow Integration

### 1. Task Generation
```bash
# Start workflow
node .clinerules/scripts/workflow-engine.js --start --priority high

# Generate tasks based on analysis
node .clinerules/scripts/task-generator.js generate-all
```

### 2. Task Execution
```bash
# Execute tasks using task manager
node .clinerules/scripts/task-manager.js execute-all

# Or execute individual tasks
node .clinerules/scripts/task-manager.js execute task-1
```

### 3. Review and Completion
```bash
# Check review status
node .clinerules/scripts/cli.js list completed

# Complete reviews
node .clinerules/scripts/cli.js complete [review-id] "Review completed"
```

### 4. Reporting
```bash
# Generate task report
node .clinerules/scripts/task-manager.js report

# Generate workflow report
node .clinerules/scripts/workflow-engine.js --report
```

## Best Practices

### Task Creation
1. **Be Specific**: Provide clear reasons and detailed instructions
2. **Set Appropriate Priority**: Use high for critical docs, medium for standard, low for optional
3. **Estimate Time**: Provide realistic time estimates
4. **Link Related Docs**: Include relevant document links

### Task Execution
1. **Follow Priority Order**: Execute high priority tasks first
2. **Check Dependencies**: Review task dependencies before execution
3. **Monitor Progress**: Use task manager to track status
4. **Complete Reviews**: Ensure all reviews are completed

### Task Management
1. **Regular Updates**: Update task status regularly
2. **Handle Failures**: Mark failed tasks and investigate issues
3. **Generate Reports**: Use reports for tracking and planning
4. **Clean Up**: Remove completed task files periodically

## Example Workflow

### Complete Documentation Update Cycle

```bash
# 1. Start workflow and analyze documentation
node .clinerules/scripts/workflow-engine.js --start --priority high
node .clinerules/scripts/workflow-engine.js --execute

# 2. Generate tasks based on analysis
node .clinerules/scripts/task-generator.js generate-all

# 3. Review generated tasks
node .clinerules/scripts/task-generator.js list

# 4. Execute high priority tasks
node .clinerules/scripts/task-manager.js execute task-1
node .clinerules/scripts/task-manager.js execute task-3

# 5. Execute medium priority tasks
node .clinerules/scripts/task-manager.js execute-all

# 6. Check review status and complete reviews
node .clinerules/scripts/cli.js list completed

# 7. Generate final reports
node .clinerules/scripts/task-manager.js report
node .clinerules/scripts/workflow-engine.js --report
```

### Individual Task Example

```bash
# Generate specific task
node .clinerules/scripts/task-generator.js generate-update docs/API-REFERENCE.md "Update API endpoints"

# Execute the task
node .clinerules/scripts/task-manager.js execute task-1

# Check task status
node .clinerules/scripts/task-manager.js list

# Complete associated review
node .clinerules/scripts/cli.js complete 123456 "API documentation updated successfully"
```

## Troubleshooting

### Common Issues

1. **Task Execution Fails**
   - Check documentation manager is working
   - Verify document paths are correct
   - Check review system is accessible

2. **Review Requests Not Created**
   - Ensure documentation manager is properly initialized
   - Check CLI integration is working
   - Verify review workflow system is active

3. **Task Status Not Updating**
   - Check file permissions in `.clinerules/tasks/`
   - Verify JSON file format is correct
   - Ensure task manager has write access

### Debug Commands

```bash
# Check task manager initialization
node .clinerules/scripts/task-manager.js list

# Check documentation manager
node .clinerules/scripts/cli.js report

# Check workflow status
node .clinerules/scripts/workflow-engine.js --status

# Check task file format
cat .clinerules/tasks/task-1.json | jq .
```

## Maintenance

### Regular Tasks

1. **Clean Up Completed Tasks**
   ```bash
   # Remove completed task files
   find .clinerules/tasks -name "*.json" -exec grep -l '"status": "completed"' {} \; | xargs rm
   ```

2. **Update Task Templates**
   - Review and update instruction templates
   - Update time estimates based on experience
   - Add new document types as needed

3. **Monitor System Performance**
   - Check task execution times
   - Monitor review completion rates
   - Track documentation quality metrics

### System Updates

1. **Task Generator Updates**
   - Add new document types
   - Update instruction templates
   - Improve time estimation algorithms

2. **Task Manager Updates**
   - Enhance error handling
   - Improve integration with documentation system
   - Add new execution modes

3. **Integration Updates**
   - Update with new documentation management features
   - Enhance review workflow integration
   - Improve state management integration

## Conclusion

The Task System provides a robust, scalable approach to managing documentation updates using the existing `.clinerules/` infrastructure. By generating structured tasks instead of NEW- prefixed files, the system provides better organization, tracking, and integration with existing workflows.

Key benefits:
- **Structured Approach**: Clear task definitions with priorities and instructions
- **Integration**: Seamless integration with existing documentation management
- **Tracking**: Comprehensive task status and progress tracking
- **Quality**: Maintains existing review and quality standards
- **Scalability**: Easily extensible for new document types and workflows