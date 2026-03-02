#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * Task Generator for Documentation Updates
 * 
 * This script generates tasks in .clinerules/tasks directory instead of creating NEW- prefixed files.
 * It uses the existing documentation management system to identify what needs to be updated.
 */

class TaskGenerator {
    constructor() {
        this.tasksDir = '.clinerules/tasks';
        this.taskCounter = 1;
    }

    async initialize() {
        try {
            // Ensure tasks directory exists
            await fs.mkdir(this.tasksDir, { recursive: true });
            console.log('✅ Task Generator initialized');
            return true;
        } catch (error) {
            console.error('❌ Task Generator initialization failed:', error.message);
            return false;
        }
    }

    /**
     * Generate task for updating a document
     */
    async generateUpdateTask(documentPath, reason, priority = 'medium') {
        try {
            const taskId = `task-${this.taskCounter++}`;
            const taskFile = path.join(this.tasksDir, `${taskId}.json`);
            
            const task = {
                id: taskId,
                type: 'document_update',
                status: 'pending',
                priority: priority,
                created_at: new Date().toISOString(),
                document_path: documentPath,
                reason: reason,
                instructions: this.generateInstructions(documentPath, reason),
                dependencies: [],
                estimated_time: this.estimateTime(documentPath, reason),
                links: this.generateLinks(documentPath)
            };

            await fs.writeFile(taskFile, JSON.stringify(task, null, 2));
            console.log(`✅ Task created: ${taskId} for ${documentPath}`);
            return task;
        } catch (error) {
            console.error(`❌ Failed to create task for ${documentPath}:`, error.message);
            return null;
        }
    }

    /**
     * Generate task for creating a new document
     */
    async generateCreateTask(documentPath, description, priority = 'medium') {
        try {
            const taskId = `task-${this.taskCounter++}`;
            const taskFile = path.join(this.tasksDir, `${taskId}.json`);
            
            const task = {
                id: taskId,
                type: 'document_create',
                status: 'pending',
                priority: priority,
                created_at: new Date().toISOString(),
                document_path: documentPath,
                description: description,
                instructions: this.generateCreateInstructions(documentPath, description),
                dependencies: [],
                estimated_time: this.estimateTime(documentPath, 'creation'),
                links: this.generateLinks(documentPath)
            };

            await fs.writeFile(taskFile, JSON.stringify(task, null, 2));
            console.log(`✅ Task created: ${taskId} for creating ${documentPath}`);
            return task;
        } catch (error) {
            console.error(`❌ Failed to create task for ${documentPath}:`, error.message);
            return null;
        }
    }

    /**
     * Generate specific instructions for document update
     */
    generateInstructions(documentPath, reason) {
        const instructions = {
            'API-REFERENCE.md': [
                'Review current API endpoints and their documentation',
                'Update endpoint descriptions with latest changes',
                'Add examples for new endpoints',
                'Verify all parameters are documented',
                'Check authentication requirements',
                'Update response format examples'
            ],
            'WORKFLOW-TYPES.md': [
                'Review existing workflow descriptions',
                'Add documentation for new workflow types',
                'Update workflow diagrams if needed',
                'Verify all workflow steps are documented',
                'Add usage examples for each workflow type',
                'Update configuration requirements'
            ],
            'README.md': [
                'Update project description with current status',
                'Review and update installation instructions',
                'Verify all dependencies are listed',
                'Update usage examples',
                'Check links and references',
                'Add recent changes or updates'
            ],
            'ARCHITECTURE.md': [
                'Review system architecture components',
                'Update component descriptions',
                'Verify data flow diagrams',
                'Add new architectural patterns',
                'Update integration points',
                'Review scalability considerations'
            ]
        };

        return instructions[path.basename(documentPath)] || [
            'Review current document content',
            'Identify outdated information',
            'Update with latest information',
            'Verify accuracy and completeness',
            'Check formatting and structure',
            'Ensure consistency with other documents'
        ];
    }

    /**
     * Generate instructions for creating new documents
     */
    generateCreateInstructions(documentPath, description) {
        return [
            'Research and gather information for the document',
            'Follow existing documentation patterns and style',
            'Create comprehensive content based on description',
            'Include examples and use cases where applicable',
            'Ensure technical accuracy',
            'Review and validate content'
        ];
    }

    /**
     * Estimate time required for the task
     */
    estimateTime(documentPath, reason) {
        const estimates = {
            'API-REFERENCE.md': '2-4 hours',
            'WORKFLOW-TYPES.md': '1-2 hours',
            'README.md': '30 minutes - 1 hour',
            'ARCHITECTURE.md': '3-6 hours'
        };

        return estimates[path.basename(documentPath)] || '1-3 hours';
    }

    /**
     * Generate relevant links for the task
     */
    generateLinks(documentPath) {
        const links = {
            'API-REFERENCE.md': [
                'docs/WORKFLOW-TYPES.md',
                'docs/INTEGRATION-GUIDE.md',
                'a2a-server/docs/action-api.md'
            ],
            'WORKFLOW-TYPES.md': [
                'docs/API-REFERENCE.md',
                'docs/ARCHITECTURE.md',
                'new-request-flow/ARCHITECTURE.md'
            ],
            'README.md': [
                'docs/QUICK-START.md',
                'docs/TROUBLESHOOTING.md',
                'docs/INTEGRATION-GUIDE.md'
            ],
            'ARCHITECTURE.md': [
                'docs/WORKFLOW-TYPES.md',
                'new-request-flow/ARCHITECTURE.md',
                'docs/DESIGN-DECISIONS.md'
            ]
        };

        return links[path.basename(documentPath)] || [];
    }

    /**
     * Generate tasks for all outdated documents
     */
    async generateAllTasks() {
        const tasks = [];

        // Technical documentation tasks
        tasks.push(await this.generateUpdateTask(
            'docs/API-REFERENCE.md',
            'API endpoints and examples need updating',
            'high'
        ));

        tasks.push(await this.generateUpdateTask(
            'docs/WORKFLOW-TYPES.md',
            'Workflow descriptions need updating',
            'medium'
        ));

        // User documentation tasks
        tasks.push(await this.generateUpdateTask(
            'docs/README.md',
            'Main documentation needs updating',
            'high'
        ));

        // Architectural documentation tasks
        tasks.push(await this.generateCreateTask(
            'docs/ARCHITECTURE.md',
            'Create comprehensive system architecture documentation',
            'medium'
        ));

        // Additional documentation tasks
        tasks.push(await this.generateUpdateTask(
            'docs/QUICK-START.md',
            'Quick start guide needs updating',
            'medium'
        ));

        tasks.push(await this.generateUpdateTask(
            'docs/TROUBLESHOOTING.md',
            'Troubleshooting guide needs updating',
            'medium'
        ));

        tasks.push(await this.generateUpdateTask(
            'docs/INTEGRATION-GUIDE.md',
            'Integration guide needs updating',
            'medium'
        ));

        return tasks.filter(task => task !== null);
    }

    /**
     * List all pending tasks
     */
    async listTasks() {
        try {
            const files = await fs.readdir(this.tasksDir);
            const taskFiles = files.filter(file => file.endsWith('.json'));
            
            const tasks = [];
            for (const file of taskFiles) {
                const filePath = path.join(this.tasksDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                tasks.push(JSON.parse(content));
            }

            return tasks.sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });
        } catch (error) {
            console.error('❌ Error listing tasks:', error.message);
            return [];
        }
    }

    /**
     * Mark task as completed
     */
    async completeTask(taskId, results) {
        try {
            const taskFile = path.join(this.tasksDir, `${taskId}.json`);
            const content = await fs.readFile(taskFile, 'utf8');
            const task = JSON.parse(content);

            task.status = 'completed';
            task.completed_at = new Date().toISOString();
            task.results = results;

            await fs.writeFile(taskFile, JSON.stringify(task, null, 2));
            console.log(`✅ Task ${taskId} marked as completed`);
            return task;
        } catch (error) {
            console.error(`❌ Error completing task ${taskId}:`, error.message);
            return null;
        }
    }

    /**
     * Generate task summary report
     */
    async generateTaskReport() {
        const tasks = await this.listTasks();
        
        const summary = {
            total_tasks: tasks.length,
            pending_tasks: tasks.filter(t => t.status === 'pending').length,
            completed_tasks: tasks.filter(t => t.status === 'completed').length,
            high_priority_tasks: tasks.filter(t => t.priority === 'high').length,
            medium_priority_tasks: tasks.filter(t => t.priority === 'medium').length,
            low_priority_tasks: tasks.filter(t => t.priority === 'low').length,
            estimated_total_time: this.calculateTotalTime(tasks),
            tasks_by_type: this.groupTasksByType(tasks),
            created_at: new Date().toISOString()
        };

        return summary;
    }

    /**
     * Calculate total estimated time
     */
    calculateTotalTime(tasks) {
        const timeMap = {
            '30 minutes - 1 hour': 1,
            '1-2 hours': 1.5,
            '1-3 hours': 2,
            '2-4 hours': 3,
            '3-6 hours': 4.5
        };

        let totalHours = 0;
        tasks.forEach(task => {
            const hours = timeMap[task.estimated_time] || 2;
            totalHours += hours;
        });

        return `${totalHours.toFixed(1)} hours`;
    }

    /**
     * Group tasks by type
     */
    groupTasksByType(tasks) {
        const groups = {};
        tasks.forEach(task => {
            if (!groups[task.type]) {
                groups[task.type] = 0;
            }
            groups[task.type]++;
        });
        return groups;
    }
}

// CLI interface
if (require.main === module) {
    const generator = new TaskGenerator();

    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        console.log('Usage: node task-generator.js <command> [options]');
        console.log('Commands:');
        console.log('  generate-all                    Generate all documentation update tasks');
        console.log('  generate-update <path> <reason> Generate task for updating document');
        console.log('  generate-create <path> <desc>   Generate task for creating document');
        console.log('  list                           List all pending tasks');
        console.log('  complete <task-id> <results>   Mark task as completed');
        console.log('  report                         Generate task summary report');
        process.exit(1);
    }

    generator.initialize().then(async () => {
        switch (command) {
            case 'generate-all':
                await generator.generateAllTasks();
                console.log('✅ All tasks generated successfully');
                break;

            case 'generate-update':
                const updatePath = args[1];
                const updateReason = args[2] || 'Update required';
                await generator.generateUpdateTask(updatePath, updateReason);
                break;

            case 'generate-create':
                const createPath = args[1];
                const createDesc = args[2] || 'Create new document';
                await generator.generateCreateTask(createPath, createDesc);
                break;

            case 'list':
                const tasks = await generator.listTasks();
                console.log('📋 Pending Tasks:');
                tasks.forEach(task => {
                    console.log(`  ${task.id}: ${task.document_path} (${task.priority})`);
                });
                break;

            case 'complete':
                const taskId = args[1];
                const results = args[2] || 'Task completed successfully';
                await generator.completeTask(taskId, results);
                break;

            case 'report':
                const report = await generator.generateTaskReport();
                console.log('📊 Task Summary Report:');
                console.log(JSON.stringify(report, null, 2));
                break;

            default:
                console.log('Unknown command:', command);
        }
    });
}

module.exports = TaskGenerator;