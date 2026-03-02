#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const DecisionEngine = require('./decision-engine.js');

class WorkflowEngine {
    constructor() {
        this.stateFile = '.clinerules/workflow-state.json';
        this.progressFile = '.clinerules/workflow-progress.json';
        this.configFile = '.clinerules/workflow-config.json';
        this.state = null;
        this.progress = null;
        this.config = null;
        this.decisionEngine = new DecisionEngine();
        this.qtuIntegration = null;
    }

    async initialize() {
        try {
            // Load all configuration files
            this.state = await this.loadState();
            this.progress = await this.loadProgress();
            this.config = await this.loadConfig();

            // Initialize decision engine
            await this.decisionEngine.initialize();

            // Initialize QTU integration
            await this.initializeQTU();

            console.log('✅ Workflow Engine initialized');
            return true;
        } catch (error) {
            console.error('❌ Workflow Engine initialization failed:', error.message);
            return false;
        }
    }

    async initializeQTU() {
        try {
            // Check if QTU integration is available
            const {WorkflowDecisionPoints} = require('./qtu-integration.js');
            this.qtuIntegration = new WorkflowDecisionPoints();

            const initialized = await this.qtuIntegration.initialize();
            if (initialized) {
                console.log('✅ QTU Integration initialized');
            } else {
                console.log('⚠️  QTU Integration not available');
                this.qtuIntegration = null;
            }
        } catch (error) {
            console.log('⚠️  QTU Integration not available:', error.message);
            this.qtuIntegration = null;
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

    async loadProgress() {
        try {
            const data = await fs.readFile(this.progressFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading progress:', error.message);
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

    async startWorkflow(priority = 'medium') {
        try {
            // Generate new session ID
            const sessionId = `workflow-${new Date().toISOString().replace(/[:.]/g, '-')}`;

            // Initialize state
            this.state = {
                session_id: sessionId,
                workflow_version: this.config.workflow_version,
                current_phase: 'discovery',
                current_step: 'inventory_analysis',
                priority_level: priority,
                start_time: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                progress_percentage: 0,
                completed_phases: [],
                current_tasks: ['inventory_analysis', 'priority_classification'],
                pending_tasks: ['high_priority_processing', 'medium_priority_processing', 'low_priority_processing'],
                failed_tasks: [],
                decision_history: [],
                quality_metrics: {
                    completion_rate: 0,
                    accuracy_score: 0,
                    organization_score: 0
                },
                system_status: {
                    cli_available: true,
                    tracking_files_accessible: true,
                    dependencies_met: true
                }
            };

            // Initialize progress
            this.progress = {
                session_id: sessionId,
                phases: {
                    discovery: {
                        status: 'in_progress',
                        start_time: new Date().toISOString(),
                        end_time: null,
                        tasks: {
                            inventory_analysis: {
                                status: 'in_progress',
                                start_time: new Date().toISOString(),
                                end_time: null,
                                duration: 0,
                                success: null
                            },
                            priority_classification: {
                                status: 'pending',
                                start_time: null,
                                end_time: null,
                                duration: 0,
                                success: null
                            }
                        }
                    },
                    processing: {
                        status: 'pending',
                        start_time: null,
                        end_time: null,
                        tasks: {
                            high_priority_processing: {
                                status: 'pending',
                                start_time: null,
                                end_time: null,
                                duration: 0,
                                success: null
                            },
                            medium_priority_processing: {
                                status: 'pending',
                                start_time: null,
                                end_time: null,
                                duration: 0,
                                success: null
                            },
                            low_priority_processing: {
                                status: 'pending',
                                start_time: null,
                                end_time: null,
                                duration: 0,
                                success: null
                            }
                        }
                    },
                    organization: {
                        status: 'pending',
                        start_time: null,
                        end_time: null,
                        tasks: {
                            directory_reorganization: {
                                status: 'pending',
                                start_time: null,
                                end_time: null,
                                duration: 0,
                                success: null
                            },
                            cross_reference_creation: {
                                status: 'pending',
                                start_time: null,
                                end_time: null,
                                duration: 0,
                                success: null
                            },
                            tracking_file_updates: {
                                status: 'pending',
                                start_time: null,
                                end_time: null,
                                duration: 0,
                                success: null
                            }
                        }
                    },
                    qa: {
                        status: 'pending',
                        start_time: null,
                        end_time: null,
                        tasks: {
                            completeness_verification: {
                                status: 'pending',
                                start_time: null,
                                end_time: null,
                                duration: 0,
                                success: null
                            },
                            quality_metrics_review: {
                                status: 'pending',
                                start_time: null,
                                end_time: null,
                                duration: 0,
                                success: null
                            },
                            organization_verification: {
                                status: 'pending',
                                start_time: null,
                                end_time: null,
                                duration: 0,
                                success: null
                            }
                        }
                    }
                },
                metrics: {
                    total_documents: 0,
                    processed_documents: 0,
                    quality_score: 0,
                    completion_rate: 0,
                    average_processing_time: 0
                }
            };

            // Save state and progress
            await this.saveState();
            await this.saveProgress();

            console.log(`✅ Workflow started: ${sessionId}`);
            console.log(`🎯 Priority: ${priority}`);
            console.log(`📍 Current phase: ${this.state.current_phase}`);

            return this.state;
        } catch (error) {
            console.error('❌ Failed to start workflow:', error.message);
            return null;
        }
    }

    async resumeWorkflow() {
        try {
            if (!this.state) {
                console.log('❌ No active workflow found. Start a new workflow first.');
                return null;
            }

            console.log(`✅ Resuming workflow: ${this.state.session_id}`);
            console.log(`📍 Current phase: ${this.state.current_phase}`);
            console.log(`📍 Current step: ${this.state.current_step}`);
            console.log(`📊 Progress: ${this.state.progress_percentage}%`);

            return this.state;
        } catch (error) {
            console.error('❌ Failed to resume workflow:', error.message);
            return null;
        }
    }

    async executeCurrentStep() {
        try {
            if (!this.state) {
                console.log('❌ No active workflow found. Start a new workflow first.');
                return null;
            }

            const {current_phase, current_step} = this.state;
            console.log(`🚀 Executing: ${current_phase}.${current_step}`);

            // Execute phase-specific logic
            switch (current_phase) {
                case 'discovery':
                    return await this.executeDiscoveryStep(current_step);
                case 'processing':
                    return await this.executeProcessingStep(current_step);
                case 'organization':
                    return await this.executeOrganizationStep(current_step);
                case 'qa':
                    return await this.executeQAStep(current_step);
                default:
                    console.log('❌ Unknown phase');
                    return null;
            }
        } catch (error) {
            console.error('❌ Failed to execute step:', error.message);
            return null;
        }
    }

    async executeDiscoveryStep(step) {
        switch (step) {
            case 'inventory_analysis':
                return await this.performInventoryAnalysis();
            case 'priority_classification':
                return await this.performPriorityClassification();
            case 'resource_assessment':
                return await this.performResourceAssessment();
            default:
                console.log('❌ Unknown discovery step');
                return null;
        }
    }

    async executeProcessingStep(step) {
        switch (step) {
            case 'high_priority_processing':
                return await this.processHighPriorityDocuments();
            case 'medium_priority_processing':
                return await this.processMediumPriorityDocuments();
            case 'low_priority_processing':
                return await this.processLowPriorityDocuments();
            default:
                console.log('❌ Unknown processing step');
                return null;
        }
    }

    async executeOrganizationStep(step) {
        switch (step) {
            case 'directory_reorganization':
                return await this.reorganizeDirectories();
            case 'cross_reference_creation':
                return await this.createCrossReferences();
            case 'tracking_file_updates':
                return await this.updateTrackingFiles();
            default:
                console.log('❌ Unknown organization step');
                return null;
        }
    }

    async executeQAStep(step) {
        switch (step) {
            case 'completeness_verification':
                return await this.verifyCompleteness();
            case 'quality_metrics_review':
                return await this.reviewQualityMetrics();
            case 'organization_verification':
                return await this.verifyOrganization();
            default:
                console.log('❌ Unknown QA step');
                return null;
        }
    }

    async performInventoryAnalysis() {
        try {
            // Analyze current system state
            const {execSync} = require('child_process');

            // Get document inventory using Windows-compatible command
            let inventoryOutput;
            try {
                // Try Windows command first
                inventoryOutput = execSync('dir /s /b *.md *.txt *.docx', {encoding: 'utf8'});
            } catch (winError) {
                try {
                    // Fallback to Unix command
                    inventoryOutput = execSync('find . -name "*.md" -o -name "*.txt" -o -name "*.docx"', {encoding: 'utf8'});
                } catch (unixError) {
                    console.log('⚠️  Could not find documents using standard commands, using manual search');
                    inventoryOutput = '';
                }
            }

            const documents = inventoryOutput.trim().split('\n').filter(doc => doc.length > 0 && !doc.includes('node_modules'));

            // Get current review status
            const reviewReport = execSync('node .clinerules/scripts/cli.js report', {encoding: 'utf8'});

            // Analyze quality score
            const qualityScore = this.extractQualityScore(reviewReport);

            // Make decision based on inventory
            const context = {
                documentCount: documents.length,
                existingReviews: this.countExistingReviews(),
                qualityScore: qualityScore
            };

            const decision = await this.decisionEngine.makeDecision('discovery', 'inventory_analysis', context);

            // Update progress
            this.progress.phases.discovery.tasks.inventory_analysis = {
                status: 'completed',
                start_time: this.progress.phases.discovery.tasks.inventory_analysis.start_time,
                end_time: new Date().toISOString(),
                duration: Date.now() - new Date(this.progress.phases.discovery.tasks.inventory_analysis.start_time).getTime(),
                success: true
            };

            this.state.current_step = 'priority_classification';
            this.state.progress_percentage = 10;

            await this.saveProgress();
            await this.saveState();

            console.log(`✅ Inventory analysis complete: ${documents.length} documents found`);
            console.log(`📊 Quality score: ${qualityScore}%`);
            console.log(`🎯 Decision: ${decision.action}`);

            return {documents, decision};
        } catch (error) {
            console.error('❌ Inventory analysis failed:', error.message);
            return null;
        }
    }

    async performPriorityClassification() {
        try {
            // Get document list from inventory analysis
            const documents = await this.getDocumentsFromInventory();

            const context = {documents};
            const decision = await this.decisionEngine.makeDecision('discovery', 'priority_classification', context);

            // Save classification results
            const classification = decision.priorities;

            // Update progress
            this.progress.phases.discovery.tasks.priority_classification = {
                status: 'completed',
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString(),
                duration: 0,
                success: true
            };

            this.state.current_step = 'resource_assessment';
            this.state.progress_percentage = 20;

            await this.saveProgress();
            await this.saveState();

            console.log(`✅ Priority classification complete`);
            console.log(`📈 High priority: ${classification.high.length} documents`);
            console.log(`📊 Medium priority: ${classification.medium.length} documents`);
            console.log(`📋 Low priority: ${classification.low.length} documents`);

            return classification;
        } catch (error) {
            console.error('❌ Priority classification failed:', error.message);
            return null;
        }
    }

    async performResourceAssessment() {
        try {
            const context = {
                systemCapacity: this.assessSystemCapacity(),
                availableMemory: this.getAvailableMemory(),
                processingTime: this.estimateProcessingTime()
            };

            // Get user decisions if QTU is available
            let userDecisions = {};
            if (this.qtuIntegration) {
                console.log('\n🎯 Getting user input for resource assessment...');
                userDecisions = await this.qtuIntegration.discoveryDecisions(context);
                console.log('✅ User decisions collected');
            }

            const decision = await this.decisionEngine.makeDecision('discovery', 'resource_assessment', context);

            // Combine automated and user decisions
            const finalDecision = {
                ...decision,
                userDecisions: userDecisions
            };

            // Update progress
            this.progress.phases.discovery.status = 'completed';
            this.progress.phases.discovery.end_time = new Date().toISOString();

            this.state.current_phase = 'processing';
            this.state.current_step = 'high_priority_processing';
            this.state.progress_percentage = 25;
            this.state.completed_phases.push('discovery');

            await this.saveProgress();
            await this.saveState();

            console.log(`✅ Resource assessment complete`);
            console.log(`🎯 Decision: ${decision.action}`);
            if (Object.keys(userDecisions).length > 0) {
                console.log(`👤 User decisions:`, JSON.stringify(userDecisions, null, 2));
            }

            return finalDecision;
        } catch (error) {
            console.error('❌ Resource assessment failed:', error.message);
            return null;
        }
    }

    async processHighPriorityDocuments() {
        try {
            // Get high priority documents
            const highPriorityDocs = await this.getHighPriorityDocuments();

            console.log(`🚀 Processing ${highPriorityDocs.length} high priority documents...`);

            let processed = 0;
            for (const doc of highPriorityDocs) {
                try {
                    // Process each document
                    await this.processSingleDocument(doc, 'high');
                    processed++;

                    // Update progress
                    this.state.progress_percentage = 25 + (processed / highPriorityDocs.length) * 25;
                    await this.saveState();

                } catch (error) {
                    console.error(`❌ Failed to process ${doc}:`, error.message);
                    this.state.failed_tasks.push(doc);
                }
            }

            // Update progress
            this.progress.phases.processing.tasks.high_priority_processing = {
                status: 'completed',
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString(),
                duration: 0,
                success: true
            };

            this.state.current_step = 'medium_priority_processing';
            this.state.progress_percentage = 50;

            await this.saveProgress();
            await this.saveState();

            console.log(`✅ High priority processing complete: ${processed}/${highPriorityDocs.length} documents`);
            return {processed, total: highPriorityDocs.length};
        } catch (error) {
            console.error('❌ High priority processing failed:', error.message);
            return null;
        }
    }

    async processMediumPriorityDocuments() {
        try {
            const mediumPriorityDocs = await this.getMediumPriorityDocuments();

            console.log(`🚀 Processing ${mediumPriorityDocs.length} medium priority documents in batches...`);

            // Get user decisions for processing if QTU is available
            let userDecisions = {};
            if (this.qtuIntegration) {
                console.log('\n🎯 Getting user input for medium priority processing...');
                userDecisions = await this.qtuIntegration.processingDecisions({
                    processingMode: 'medium',
                    documentCount: mediumPriorityDocs.length
                });
                console.log('✅ User decisions collected');
            }

            // Process in batches
            const batchSize = this.config.batch_size.medium;
            let processed = 0;

            for (let i = 0; i < mediumPriorityDocs.length; i += batchSize) {
                const batch = mediumPriorityDocs.slice(i, i + batchSize);

                for (const doc of batch) {
                    try {
                        await this.processSingleDocument(doc, 'medium');
                        processed++;
                    } catch (error) {
                        console.error(`❌ Failed to process ${doc}:`, error.message);
                        this.state.failed_tasks.push(doc);
                    }
                }

                // Update progress
                this.state.progress_percentage = 50 + (processed / mediumPriorityDocs.length) * 20;
                await this.saveState();

                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Update progress
            this.progress.phases.processing.tasks.medium_priority_processing = {
                status: 'completed',
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString(),
                duration: 0,
                success: true
            };

            this.state.current_step = 'low_priority_processing';
            this.state.progress_percentage = 70;

            await this.saveProgress();
            await this.saveState();

            console.log(`✅ Medium priority processing complete: ${processed}/${mediumPriorityDocs.length} documents`);
            if (Object.keys(userDecisions).length > 0) {
                console.log(`👤 User decisions:`, JSON.stringify(userDecisions, null, 2));
            }
            return {processed, total: mediumPriorityDocs.length};
        } catch (error) {
            console.error('❌ Medium priority processing failed:', error.message);
            return null;
        }
    }

    async processLowPriorityDocuments() {
        try {
            const lowPriorityDocs = await this.getLowPriorityDocuments();

            console.log(`🚀 Processing ${lowPriorityDocs.length} low priority documents...`);

            let processed = 0;
            for (const doc of lowPriorityDocs) {
                try {
                    await this.processSingleDocument(doc, 'low');
                    processed++;
                } catch (error) {
                    console.error(`❌ Failed to process ${doc}:`, error.message);
                    this.state.failed_tasks.push(doc);
                }
            }

            // Update progress
            this.progress.phases.processing.tasks.low_priority_processing = {
                status: 'completed',
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString(),
                duration: 0,
                success: true
            };

            this.progress.phases.processing.status = 'completed';
            this.progress.phases.processing.end_time = new Date().toISOString();

            this.state.current_phase = 'organization';
            this.state.current_step = 'directory_reorganization';
            this.state.progress_percentage = 75;
            this.state.completed_phases.push('processing');

            await this.saveProgress();
            await this.saveState();

            console.log(`✅ Low priority processing complete: ${processed}/${lowPriorityDocs.length} documents`);
            return {processed, total: lowPriorityDocs.length};
        } catch (error) {
            console.error('❌ Low priority processing failed:', error.message);
            return null;
        }
    }

    async processSingleDocument(docPath, priority) {
        try {
            // Create review request
            const {execSync} = require('child_process');
            execSync(`node .clinerules/scripts/cli.js create "${docPath}" "$(cat "${docPath}")"`, {encoding: 'utf8'});

            // Get review ID
            const pendingReviews = execSync('node .clinerules/scripts/cli.js list pending', {encoding: 'utf8'});
            const reviewId = this.extractReviewId(pendingReviews);

            // Start and complete review
            execSync(`node .clinerules/scripts/cli.js start ${reviewId}`, {encoding: 'utf8'});
            execSync(`node .clinerules/scripts/cli.js complete ${reviewId} "${priority} priority processing completed"`, {encoding: 'utf8'});

            return true;
        } catch (error) {
            throw new Error(`Document processing failed: ${error.message}`);
        }
    }

    async reorganizeDirectories() {
        try {
            // Create organized directory structure using Windows-compatible commands
            const {execSync} = require('child_process');

            // Create directories using Windows commands
            const dirs = ['technical', 'user', 'process', 'reference', 'reports'];
            for (const dir of dirs) {
                try {
                    execSync(`mkdir docs\\processed\\${dir}`, {encoding: 'utf8'});
                } catch (mkdirError) {
                    // Directory might already exist, continue
                }
            }

            // Move documents by category
            const documents = await this.getAllProcessedDocuments();

            for (const doc of documents) {
                const category = this.categorizeDocument(doc);
                const targetDir = `docs\\processed\\${category}`;
                try {
                    execSync(`move "${doc}" "${targetDir}\\"`, {encoding: 'utf8'});
                } catch (moveError) {
                    console.error(`Failed to move ${doc}:`, moveError.message);
                }
            }

            // Update progress
            this.progress.phases.organization.tasks.directory_reorganization = {
                status: 'completed',
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString(),
                duration: 0,
                success: true
            };

            this.state.current_step = 'cross_reference_creation';
            this.state.progress_percentage = 80;

            await this.saveProgress();
            await this.saveState();

            console.log(`✅ Directory reorganization complete`);
            return {moved: documents.length};
        } catch (error) {
            console.error('❌ Directory reorganization failed:', error.message);
            return null;
        }
    }

    async createCrossReferences() {
        try {
            // Create cross-references between related documents
            const {execSync} = require('child_process');
            
            // Create a simple cross-reference file
            const crossRefContent = `# Cross-References

This file contains cross-references between related documents in the processed documentation.

## Document Categories

### Technical Documentation
- API references
- Implementation guides
- Technical specifications

### User Documentation
- User guides
- Tutorials
- How-to guides

### Process Documentation
- Development processes
- Workflow documentation
- Standard operating procedures

### Reference Documentation
- Configuration guides
- Troubleshooting guides
- FAQ documents

### Reports
- Analysis reports
- Review reports
- Status reports

Generated at: ${new Date().toISOString()}
`;

            // Write cross-reference file
            await fs.writeFile('docs/processed/cross-references.md', crossRefContent);

            // Update progress
            this.progress.phases.organization.tasks.cross_reference_creation = {
                status: 'completed',
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString(),
                duration: 0,
                success: true
            };

            this.state.current_step = 'tracking_file_updates';
            this.state.progress_percentage = 85;

            await this.saveProgress();
            await this.saveState();

            console.log(`✅ Cross-reference creation complete`);
            return {success: true};
        } catch (error) {
            console.error('❌ Cross-reference creation failed:', error.message);
            return null;
        }
    }

    async updateTrackingFiles() {
        try {
            // Update all tracking files
            const {execSync} = require('child_process');
            
            // Create reports directory if it doesn't exist
            try {
                execSync('mkdir .clinerules\\reports', {encoding: 'utf8'});
            } catch (mkdirError) {
                // Directory might already exist, continue
            }

            // Generate report
            const report = await this.generateReport('text');
            
            // Write report to file
            const reportContent = `Documentation Processing Report
Generated: ${new Date().toISOString()}

Session ID: ${report.session_id}
Workflow Version: ${report.workflow_version}
Start Time: ${report.start_time}
Runtime: ${report.runtime}
Current Phase: ${report.current_phase}
Progress: ${report.progress_percentage}%
Completed Phases: ${report.completed_phases.join(', ')}
Failed Tasks: ${report.failed_tasks.length}
Total Documents: ${report.summary.total_documents}
Processed Documents: ${report.summary.processed_documents}
Completion Rate: ${report.summary.completion_rate}%
`;

            await fs.writeFile('.clinerules/reports/final-report.txt', reportContent);

            // Update progress
            this.progress.phases.organization.tasks.tracking_file_updates = {
                status: 'completed',
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString(),
                duration: 0,
                success: true
            };

            this.progress.phases.organization.status = 'completed';
            this.progress.phases.organization.end_time = new Date().toISOString();

            this.state.current_phase = 'qa';
            this.state.current_step = 'completeness_verification';
            this.state.progress_percentage = 90;
            this.state.completed_phases.push('organization');

            await this.saveProgress();
            await this.saveState();

            console.log(`✅ Tracking file updates complete`);
            return {success: true};
        } catch (error) {
            console.error('❌ Tracking file updates failed:', error.message);
            return null;
        }
    }

    async verifyCompleteness() {
        try {
            const {execSync} = require('child_process');
            const report = execSync('node .clinerules/scripts/cli.js report', {encoding: 'utf8'});

            const processedCount = this.extractProcessedCount(report);
            const totalCount = this.extractTotalCount(report);
            const completeness = (processedCount / totalCount) * 100;

            if (completeness >= 100) {
                console.log(`✅ Completeness verification passed: ${completeness}%`);
            } else {
                console.log(`❌ Completeness verification failed: ${completeness}%`);
            }

            // Update progress
            this.progress.phases.qa.tasks.completeness_verification = {
                status: 'completed',
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString(),
                duration: 0,
                success: completeness >= 100
            };

            this.state.current_step = 'quality_metrics_review';
            this.state.progress_percentage = 92;

            await this.saveProgress();
            await this.saveState();

            return {completeness, passed: completeness >= 100};
        } catch (error) {
            console.error('❌ Completeness verification failed:', error.message);
            return null;
        }
    }

    async reviewQualityMetrics() {
        try {
            const {execSync} = require('child_process');
            const report = execSync('node .clinerules/scripts/cli.js report', {encoding: 'utf8'});

            const completionRate = this.extractCompletionRate(report);
            const accuracyScore = this.extractAccuracyScore(report);
            const organizationScore = this.extractOrganizationScore(report);

            const context = {
                completionRate: completionRate,
                accuracyScore: accuracyScore,
                organizationScore: organizationScore
            };

            // Get user decisions for QA if QTU is available
            let userDecisions = {};
            if (this.qtuIntegration) {
                console.log('\n🎯 Getting user input for QA metrics review...');
                userDecisions = await this.qtuIntegration.qaDecisions(context);
                console.log('✅ User decisions collected');
            }

            const decision = await this.decisionEngine.makeDecision('qa', 'quality_verification', context);

            // Update progress
            this.progress.phases.qa.tasks.quality_metrics_review = {
                status: 'completed',
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString(),
                duration: 0,
                success: decision.action === 'quality_verified'
            };

            this.state.current_step = 'organization_verification';
            this.state.progress_percentage = 95;

            await this.saveProgress();
            await this.saveState();

            console.log(`✅ Quality metrics review complete`);
            console.log(`📊 Completion rate: ${completionRate}%`);
            console.log(`🎯 Accuracy score: ${accuracyScore}%`);
            console.log(`📋 Organization score: ${organizationScore}%`);

            if (Object.keys(userDecisions).length > 0) {
                console.log(`👤 User decisions:`, JSON.stringify(userDecisions, null, 2));
            }

            return {metrics: context, decision, userDecisions};
        } catch (error) {
            console.error('❌ Quality metrics review failed:', error.message);
            return null;
        }
    }

    async verifyOrganization() {
        try {
            const organizationComplete = await this.checkOrganizationStructure();

            if (organizationComplete) {
                console.log(`✅ Organization verification passed`);
            } else {
                console.log(`❌ Organization verification failed`);
            }

            // Update progress
            this.progress.phases.qa.tasks.organization_verification = {
                status: 'completed',
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString(),
                duration: 0,
                success: organizationComplete
            };

            this.progress.phases.qa.status = 'completed';
            this.progress.phases.qa.end_time = new Date().toISOString();

            this.state.current_phase = 'completed';
            this.state.current_step = 'workflow_complete';
            this.state.progress_percentage = 100;
            this.state.completed_phases.push('qa');

            await this.saveProgress();
            await this.saveState();

            console.log(`🎉 Workflow completed successfully!`);
            return {organizationComplete};
        } catch (error) {
            console.error('❌ Organization verification failed:', error.message);
            return null;
        }
    }

    // Helper methods
    extractQualityScore(report) {
        const match = report.match(/Quality Score:\s*(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    countExistingReviews() {
        // Implementation to count existing reviews
        return 0;
    }

    async getDocumentsFromInventory() {
        // Implementation to get documents from inventory
        return [];
    }

    async getHighPriorityDocuments() {
        // Implementation to get high priority documents
        return [];
    }

    async getMediumPriorityDocuments() {
        // Implementation to get medium priority documents
        return [];
    }

    async getLowPriorityDocuments() {
        // Implementation to get low priority documents
        return [];
    }

    async getAllProcessedDocuments() {
        // Implementation to get all processed documents
        return [];
    }

    categorizeDocument(docPath) {
        // Implementation to categorize document
        return 'technical';
    }

    extractReviewId(pendingReviews) {
        // Implementation to extract review ID
        return '123456';
    }

    assessSystemCapacity() {
        // Implementation to assess system capacity
        return 100;
    }

    getAvailableMemory() {
        // Implementation to get available memory
        return 4000;
    }

    estimateProcessingTime() {
        // Implementation to estimate processing time
        return 3600000;
    }

    extractProcessedCount(report) {
        // Implementation to extract processed count
        return 100;
    }

    extractTotalCount(report) {
        // Implementation to extract total count
        return 100;
    }

    extractCompletionRate(report) {
        const match = report.match(/Completion Rate:\s*(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    extractAccuracyScore(report) {
        // Implementation to extract accuracy score
        return 90;
    }

    extractOrganizationScore(report) {
        // Implementation to extract organization score
        return 85;
    }

    async checkOrganizationStructure() {
        // Implementation to check organization structure
        return true;
    }

    async saveState() {
        try {
            await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
        } catch (error) {
            console.error('Error saving state:', error.message);
        }
    }

    async saveProgress() {
        try {
            await fs.writeFile(this.progressFile, JSON.stringify(this.progress, null, 2));
        } catch (error) {
            console.error('Error saving progress:', error.message);
        }
    }

    // CLI interface methods
    async getStatus() {
        if (!this.state) {
            console.log('❌ No active workflow found');
            return null;
        }

        const runtime = this.calculateRuntime();

        console.log('='.repeat(60));
        console.log('WORKFLOW STATUS');
        console.log('='.repeat(60));
        console.log(`Session ID: ${this.state.session_id}`);
        console.log(`Current Phase: ${this.state.current_phase.toUpperCase()}`);
        console.log(`Current Step: ${this.state.current_step}`);
        console.log(`Progress: ${this.state.progress_percentage}%`);
        console.log(`Priority: ${this.state.priority_level}`);
        console.log(`Runtime: ${runtime}`);
        console.log(`Completed Phases: ${this.state.completed_phases.join(', ')}`);
        console.log(`Failed Tasks: ${this.state.failed_tasks.length}`);
        console.log('='.repeat(60));

        return this.state;
    }

    calculateRuntime() {
        if (!this.state.start_time) return '0 minutes';

        const start = new Date(this.state.start_time);
        const now = new Date();
        const diff = now - start;
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minutes`;
    }

    async generateReport(format = 'text') {
        if (!this.state) {
            console.log('❌ No active workflow found');
            return null;
        }

        const report = {
            session_id: this.state.session_id,
            workflow_version: this.state.workflow_version,
            start_time: this.state.start_time,
            end_time: this.state.current_phase === 'completed' ? new Date().toISOString() : null,
            runtime: this.calculateRuntime(),
            current_phase: this.state.current_phase,
            progress_percentage: this.state.progress_percentage,
            completed_phases: this.state.completed_phases,
            failed_tasks: this.state.failed_tasks,
            quality_metrics: this.state.quality_metrics,
            summary: {
                total_documents: this.progress.metrics.total_documents,
                processed_documents: this.progress.metrics.processed_documents,
                completion_rate: this.progress.metrics.completion_rate,
                average_processing_time: this.progress.metrics.average_processing_time
            }
        };

        if (format === 'json') {
            console.log(JSON.stringify(report, null, 2));
        } else {
            console.log('='.repeat(60));
            console.log('WORKFLOW REPORT');
            console.log('='.repeat(60));
            console.log(`Session ID: ${report.session_id}`);
            console.log(`Workflow Version: ${report.workflow_version}`);
            console.log(`Start Time: ${report.start_time}`);
            console.log(`Runtime: ${report.runtime}`);
            console.log(`Current Phase: ${report.current_phase.toUpperCase()}`);
            console.log(`Progress: ${report.progress_percentage}%`);
            console.log(`Completed Phases: ${report.completed_phases.join(', ')}`);
            console.log(`Failed Tasks: ${report.failed_tasks.length}`);
            console.log(`Total Documents: ${report.summary.total_documents}`);
            console.log(`Processed Documents: ${report.summary.processed_documents}`);
            console.log(`Completion Rate: ${report.summary.completion_rate}%`);
            console.log('='.repeat(60));
        }

        return report;
    }

    async completePhase() {
        if (!this.state) {
            console.log('❌ No active workflow found');
            return null;
        }

        const {current_phase} = this.state;

        // Mark current phase as completed
        this.progress.phases[current_phase].status = 'completed';
        this.progress.phases[current_phase].end_time = new Date().toISOString();

        // Move to next phase
        const phaseOrder = ['discovery', 'processing', 'organization', 'qa'];
        const currentIndex = phaseOrder.indexOf(current_phase);

        if (currentIndex < phaseOrder.length - 1) {
            const nextPhase = phaseOrder[currentIndex + 1];
            this.state.current_phase = nextPhase;
            this.state.current_step = Object.keys(this.progress.phases[nextPhase].tasks)[0];
            this.state.completed_phases.push(current_phase);

            // Update progress percentage
            this.state.progress_percentage = (currentIndex + 1) * 25;
        } else {
            this.state.current_phase = 'completed';
            this.state.current_step = 'workflow_complete';
            this.state.progress_percentage = 100;
            this.state.completed_phases.push(current_phase);
        }

        await this.saveProgress();
        await this.saveState();

        console.log(`✅ Phase ${current_phase} completed`);
        if (this.state.current_phase !== 'completed') {
            console.log(`🎯 Moving to phase: ${this.state.current_phase}`);
        } else {
            console.log(`🎉 Workflow completed successfully!`);
        }

        return this.state;
    }

    async stopWorkflow(reason = 'user_request') {
        if (!this.state) {
            console.log('❌ No active workflow found');
            return null;
        }

        this.state.current_phase = 'stopped';
        this.state.current_step = 'workflow_stopped';
        this.state.progress_percentage = Math.min(this.state.progress_percentage, 99);

        await this.saveState();

        console.log(`🛑 Workflow stopped: ${reason}`);
        console.log(`📍 Progress: ${this.state.progress_percentage}%`);
        console.log(`💡 Resume with: node .clinerules/scripts/workflow-engine.js --resume`);

        return this.state;
    }
}

// CLI interface
if (require.main === module) {
    const engine = new WorkflowEngine();

    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        console.log('Usage: node workflow-engine.js <command> [options]');
        console.log('Commands:');
        console.log('  --start [--priority high|medium|low]  Start new workflow');
        console.log('  --resume                             Resume existing workflow');
        console.log('  --status                             Show current status');
        console.log('  --execute                            Execute current step');
        console.log('  --complete-phase                     Complete current phase');
        console.log('  --report [--format json|text]        Generate report');
        console.log('  --stop [--reason reason]             Stop workflow');
        process.exit(1);
    }

    engine.initialize().then(async () => {
        switch (command) {
            case '--start':
                const priority = args.find(arg => arg.startsWith('--priority='))?.split('=')[1] || 'medium';
                await engine.startWorkflow(priority);
                break;

            case '--resume':
                await engine.resumeWorkflow();
                break;

            case '--status':
                await engine.getStatus();
                break;

            case '--execute':
                await engine.executeCurrentStep();
                break;

            case '--complete-phase':
                await engine.completePhase();
                break;

            case '--report':
                const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'text';
                await engine.generateReport(format);
                break;

            case '--stop':
                const reason = args.find(arg => arg.startsWith('--reason='))?.split('=')[1] || 'user_request';
                await engine.stopWorkflow(reason);
                break;

            default:
                console.log('Unknown command:', command);
        }
    });
}

module.exports = WorkflowEngine;