#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class DecisionEngine {
    constructor() {
        this.stateFile = '.clinerules/workflow-state.json';
        this.logFile = '.clinerules/workflow-logs.json';
        this.configFile = '.clinerules/workflow-config.json';
        this.state = null;
        this.config = null;
    }

    async initialize() {
        try {
            // Load current state
            this.state = await this.loadState();

            // Load configuration
            this.config = await this.loadConfig();

            console.log('✅ Decision Engine initialized');
            return true;
        } catch (error) {
            console.error('❌ Decision Engine initialization failed:', error.message);
            return false;
        }
    }

    async loadState() {
        try {
            const data = await fs.readFile(this.stateFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading state:', error.message);
            return null;
        }
    }

    async loadConfig() {
        try {
            const data = await fs.readFile(this.configFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading config:', error.message);
            return null;
        }
    }

    async makeDecision(phase, step, context = {}) {
        try {
            const decisionRules = {
                'discovery.inventory_analysis': this.analyzeInventory.bind(this),
                'discovery.priority_classification': this.classifyPriorities.bind(this),
                'discovery.resource_assessment': this.assessResources.bind(this),
                'processing.batch_size': this.calculateBatchSize.bind(this),
                'processing.mode_selection': this.selectProcessingMode.bind(this),
                'organization.cross_references': this.createCrossReferences.bind(this),
                'qa.quality_verification': this.verifyQuality.bind(this),
                'qa.completeness_check': this.checkCompleteness.bind(this)
            };

            const decisionFunction = decisionRules[`${phase}.${step}`];
            if (decisionFunction) {
                const decision = await decisionFunction(context);
                await this.logDecision(phase, step, decision, context);
                return decision;
            }

            return {
                action: 'continue',
                reasoning: 'No specific decision rule found',
                alternatives: [],
                selected_alternative: null
            };
        } catch (error) {
            console.error('Decision making failed:', error.message);
            return {
                action: 'error',
                reasoning: error.message,
                alternatives: [],
                selected_alternative: null
            };
        }
    }

    async analyzeInventory(context) {
        const {documentCount, existingReviews, qualityScore} = context;
        const decisions = [];

        // Decision 1: Processing mode based on document count
        if (documentCount > 100) {
            decisions.push({
                action: 'enable_batch_processing',
                reasoning: 'Large inventory requires batch processing for efficiency',
                priority: 'high'
            });
        } else if (documentCount < 50) {
            decisions.push({
                action: 'enable_sequential_processing',
                reasoning: 'Small inventory suitable for sequential processing',
                priority: 'medium'
            });
        } else {
            decisions.push({
                action: 'enable_hybrid_processing',
                reasoning: 'Medium inventory benefits from hybrid approach',
                priority: 'medium'
            });
        }

        // Decision 2: Priority override based on existing reviews
        if (existingReviews > 50) {
            decisions.push({
                action: 'prioritize_cleanup',
                reasoning: 'High number of existing reviews suggests cleanup needed',
                priority: 'high'
            });
        }

        // Decision 3: Quality first approach
        if (qualityScore < 70) {
            decisions.push({
                action: 'quality_first',
                reasoning: 'Low quality score requires immediate attention',
                priority: 'high'
            });
        }

        return {
            action: 'multiple_decisions',
            reasoning: 'Multiple factors analyzed for optimal processing strategy',
            decisions: decisions,
            selected_alternative: decisions[0]?.action || 'continue'
        };
    }

    async classifyPriorities(context) {
        const {documents} = context;
        const priorities = {
            high: [],
            medium: [],
            low: []
        };

        // Classification rules
        for (const doc of documents) {
            const name = doc.toLowerCase();

            // High priority: User-facing and critical docs
            if (name.includes('api') ||
                name.includes('user') ||
                name.includes('guide') ||
                name.includes('quick') ||
                name.includes('getting-started')) {
                priorities.high.push(doc);
            }
            // Medium priority: Internal and technical docs
            else if (name.includes('internal') ||
                name.includes('technical') ||
                name.includes('process') ||
                name.includes('dev')) {
                priorities.medium.push(doc);
            }
            // Low priority: Reference and historical docs
            else {
                priorities.low.push(doc);
            }
        }

        return {
            action: 'classification_complete',
            reasoning: 'Documents classified by priority based on content analysis',
            priorities: priorities,
            selected_alternative: 'high-priority-first'
        };
    }

    async assessResources(context) {
        const {systemCapacity, availableMemory, processingTime} = context;
        const recommendations = [];

        // Memory assessment
        if (availableMemory < 1000) { // Less than 1GB
            recommendations.push({
                action: 'reduce_batch_size',
                reasoning: 'Low memory requires smaller batch sizes',
                parameter: 'batch_size',
                value: Math.floor(this.config.batch_size.high / 2)
            });
        }

        // Time assessment
        if (processingTime > 7200000) { // More than 2 hours
            recommendations.push({
                action: 'optimize_workflow',
                reasoning: 'Long processing time requires workflow optimization',
                parameter: 'optimization_level',
                value: 'high'
            });
        }

        // Capacity assessment
        if (systemCapacity < 50) {
            recommendations.push({
                action: 'enable_manual_review',
                reasoning: 'Low system capacity requires manual intervention',
                parameter: 'review_mode',
                value: 'manual'
            });
        }

        return {
            action: 'resource_assessment_complete',
            reasoning: 'System resources assessed for optimal processing configuration',
            recommendations: recommendations,
            selected_alternative: recommendations[0]?.action || 'continue'
        };
    }

    async calculateBatchSize(context) {
        const {documentCount, processingMode} = context;
        let batchSize = this.config.batch_size.medium;

        switch (processingMode) {
            case 'batch':
                batchSize = this.config.batch_size.high;
                break;
            case 'sequential':
                batchSize = 1;
                break;
            case 'hybrid':
                batchSize = this.config.batch_size.medium;
                break;
        }

        // Adjust based on document count
        if (documentCount > 200) {
            batchSize = Math.min(batchSize, this.config.batch_size.high);
        } else if (documentCount < 50) {
            batchSize = Math.max(batchSize, 1);
        }

        return {
            action: 'batch_size_calculated',
            reasoning: 'Optimal batch size calculated based on processing mode and document count',
            batch_size: batchSize,
            selected_alternative: `batch_size_${batchSize}`
        };
    }

    async selectProcessingMode(context) {
        const {documentCount, qualityScore, errorRate} = context;

        // Mode selection logic
        if (documentCount > 100 && qualityScore > 80 && errorRate < 5) {
            return {
                action: 'batch_processing',
                reasoning: 'High volume with good quality supports batch processing',
                mode: 'batch',
                selected_alternative: 'batch'
            };
        } else if (documentCount < 50 || qualityScore < 70 || errorRate > 10) {
            return {
                action: 'sequential_processing',
                reasoning: 'Low volume or quality issues require sequential processing',
                mode: 'sequential',
                selected_alternative: 'sequential'
            };
        } else {
            return {
                action: 'hybrid_processing',
                reasoning: 'Medium volume with moderate quality supports hybrid approach',
                mode: 'hybrid',
                selected_alternative: 'hybrid'
            };
        }
    }

    async createCrossReferences(context) {
        const {documentPaths, categories} = context;
        const crossReferences = [];

        // Create cross-references based on categories
        for (const category in categories) {
            const docs = categories[category];
            for (let i = 0; i < docs.length; i++) {
                for (let j = i + 1; j < docs.length; j++) {
                    crossReferences.push({
                        from: docs[i],
                        to: docs[j],
                        relationship: 'related',
                        category: category
                    });
                }
            }
        }

        return {
            action: 'cross_references_created',
            reasoning: 'Cross-references created based on document categories and relationships',
            cross_references: crossReferences,
            count: crossReferences.length,
            selected_alternative: 'category-based'
        };
    }

    async verifyQuality(context) {
        const {completionRate, accuracyScore, organizationScore} = context;
        const issues = [];

        // Quality threshold checks
        if (completionRate < this.config.quality_thresholds.completion_rate) {
            issues.push({
                type: 'completion_rate',
                current: completionRate,
                threshold: this.config.quality_thresholds.completion_rate,
                action: 'increase_completion_efforts'
            });
        }

        if (accuracyScore < this.config.quality_thresholds.accuracy_score) {
            issues.push({
                type: 'accuracy_score',
                current: accuracyScore,
                threshold: this.config.quality_thresholds.accuracy_score,
                action: 'improve_accuracy_checks'
            });
        }

        if (organizationScore < this.config.quality_thresholds.organization_score) {
            issues.push({
                type: 'organization_score',
                current: organizationScore,
                threshold: this.config.quality_thresholds.organization_score,
                action: 'enhance_organization'
            });
        }

        return {
            action: issues.length > 0 ? 'quality_issues_found' : 'quality_verified',
            reasoning: issues.length > 0 ? 'Quality issues detected requiring attention' : 'All quality thresholds met',
            issues: issues,
            selected_alternative: issues.length > 0 ? 'address_issues' : 'continue'
        };
    }

    async checkCompleteness(context) {
        const {processedCount, totalCount, pendingCount} = context;
        const completeness = (processedCount / totalCount) * 100;

        if (completeness >= 100) {
            return {
                action: 'workflow_complete',
                reasoning: '100% of documents have been processed',
                completeness: completeness,
                selected_alternative: 'complete'
            };
        } else if (pendingCount > 0) {
            return {
                action: 'continue_processing',
                reasoning: 'Incomplete processing with pending documents',
                completeness: completeness,
                pending_count: pendingCount,
                selected_alternative: 'continue'
            };
        } else {
            return {
                action: 'investigate_missing',
                reasoning: 'Processing appears incomplete, investigation needed',
                completeness: completeness,
                selected_alternative: 'investigate'
            };
        }
    }

    async logDecision(phase, step, decision, context) {
        try {
            const logs = await this.loadLogs();

            const decisionLog = {
                timestamp: new Date().toISOString(),
                phase: phase,
                step: step,
                decision: decision.action,
                reasoning: decision.reasoning,
                alternatives: decision.decisions || decision.alternatives || [],
                selected_alternative: decision.selected_alternative,
                context: context,
                state_snapshot: this.state
            };

            logs.decisions.push(decisionLog);
            await this.saveLogs(logs);

            console.log(`📋 Decision logged: ${decision.action} (${decision.reasoning})`);
        } catch (error) {
            console.error('Error logging decision:', error.message);
        }
    }

    async loadLogs() {
        try {
            const data = await fs.readFile(this.logFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {
                session_id: this.state?.session_id || 'unknown',
                decisions: [],
                errors: [],
                warnings: [],
                info: []
            };
        }
    }

    async saveLogs(logs) {
        try {
            await fs.writeFile(this.logFile, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('Error saving logs:', error.message);
        }
    }

    async updateState(updates) {
        try {
            this.state = {...this.state, ...updates, last_activity: new Date().toISOString()};
            await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
            console.log('✅ State updated successfully');
        } catch (error) {
            console.error('❌ State update failed:', error.message);
        }
    }

    async getRecommendations(phase, step, context) {
        const decision = await this.makeDecision(phase, step, context);

        return {
            phase: phase,
            step: step,
            current_state: this.state,
            decision: decision,
            recommendations: decision.decisions || [decision],
            next_steps: this.getNextSteps(phase, step, decision)
        };
    }

    getNextSteps(phase, step, decision) {
        const nextSteps = {
            'discovery.inventory_analysis': ['discovery.priority_classification'],
            'discovery.priority_classification': ['discovery.resource_assessment'],
            'discovery.resource_assessment': ['processing.mode_selection'],
            'processing.mode_selection': ['processing.batch_size'],
            'processing.batch_size': ['processing.high_priority_processing'],
            'processing.high_priority_processing': ['processing.medium_priority_processing'],
            'processing.medium_priority_processing': ['processing.low_priority_processing'],
            'processing.low_priority_processing': ['organization.cross_references'],
            'organization.cross_references': ['organization.directory_reorganization'],
            'organization.directory_reorganization': ['qa.completeness_check'],
            'qa.completeness_check': ['qa.quality_verification'],
            'qa.quality_verification': ['completed']
        };

        return nextSteps[`${phase}.${step}`] || [];
    }
}

  // CLI interface
  if (require.main === module) {
    const engine = new DecisionEngine();
    
    const args = process.argv.slice(2);
    const command = args[0];
    const phase = args[1];
    const step = args[2];
    
    if (!command) {
      console.log('Usage: node decision-engine.js <command> [phase] [step] [context]');
      console.log('Commands:');
      console.log('  status                                    Show current state');
      console.log('  decide <phase> <step> [context]          Make decision for phase/step');
      console.log('  recommend <phase> <step> [context]       Get recommendations');
      console.log('');
      console.log('Examples:');
      console.log('  node decision-engine.js status');
      console.log('  node decision-engine.js decide discovery inventory_analysis');
      console.log('  node decision-engine.js recommend processing batch_size');
      process.exit(1);
    }

    engine.initialize().then(async () => {
      switch (command) {
        case 'decide':
          if (!phase || !step) {
            console.log('❌ Error: Phase and step are required for decide command');
            console.log('Usage: node decision-engine.js decide <phase> <step> [context]');
            process.exit(1);
          }
          const context = args[3] ? JSON.parse(args[3]) : {};
          const decision = await engine.makeDecision(phase, step, context);
          console.log('Decision:', JSON.stringify(decision, null, 2));
          break;
      
        case 'recommend':
          if (!phase || !step) {
            console.log('❌ Error: Phase and step are required for recommend command');
            console.log('Usage: node decision-engine.js recommend <phase> <step> [context]');
            process.exit(1);
          }
          const recContext = args[3] ? JSON.parse(args[3]) : {};
          const recommendations = await engine.getRecommendations(phase, step, recContext);
          console.log('Recommendations:', JSON.stringify(recommendations, null, 2));
          break;
      
        case 'status':
          if (engine.state) {
            console.log('Current State:', JSON.stringify(engine.state, null, 2));
          } else {
            console.log('No active state found. Initialize the engine first.');
          }
          break;
      
        default:
          console.log('Unknown command:', command);
          console.log('Available commands: status, decide, recommend');
      }
    });
  }

module.exports = DecisionEngine;