#!/usr/bin/env node

const WorkflowEngine = require('./workflow-engine.js');
const DocumentationManager = require('./documentation-manager.js');
const ReviewWorkflow = require('./review-workflow.js');
const fs = require('fs').promises;

class IntegratedSystemTestSuite {
    constructor() {
        this.engine = new WorkflowEngine();
        this.manager = new DocumentationManager();
        this.workflow = new ReviewWorkflow();
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 Starting Integrated System Test Suite');
        console.log('='.repeat(60));

        try {
            // Test 1: System Initialization
            await this.testSystemInitialization();

            // Test 2: QTU Integration
            await this.testQTUIntegration();

            // Test 3: Workflow with User Decisions
            await this.testWorkflowWithUserDecisions();

            // Test 4: CLI Integration
            await this.testCLIIntegration();

            // Test 5: End-to-End Workflow
            await this.testEndToEndWorkflow();

            // Generate Test Report
            this.generateTestReport();

        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.addTestResult('Test Suite', false, error.message);
        }
    }

    async testSystemInitialization() {
        console.log('\n🔧 Testing System Initialization...');

        try {
            // Test workflow engine initialization
            const engineInitialized = await this.engine.initialize();
            this.addTestResult('Workflow Engine Initialization', engineInitialized, engineInitialized ? 'Success' : 'Failed');

            // Test QTU integration availability
            const qtuAvailable = this.engine.qtuIntegration !== null;
            this.addTestResult('QTU Integration Available', qtuAvailable, qtuAvailable ? 'Success' : 'QTU not available');

            // Test documentation manager
            const managerWorking = this.manager !== null;
            this.addTestResult('Documentation Manager', managerWorking, managerWorking ? 'Success' : 'Failed');

            // Test review workflow
            const workflowWorking = this.workflow !== null;
            this.addTestResult('Review Workflow', workflowWorking, workflowWorking ? 'Success' : 'Failed');

        } catch (error) {
            this.addTestResult('System Initialization', false, error.message);
        }
    }

    async testQTUIntegration() {
        console.log('\n🎯 Testing QTU Integration...');

        try {
            if (!this.engine.qtuIntegration) {
                this.addTestResult('QTU Integration', false, 'QTU integration not available');
                return;
            }

            // Test QTU initialization
            const qtuInitialized = await this.engine.qtuIntegration.initialize();
            this.addTestResult('QTU Initialization', qtuInitialized, qtuInitialized ? 'Success' : 'Failed');

            // Test discovery decisions
            const discoveryContext = {
                documentCount: 100,
                existingReviews: 20,
                qualityScore: 80
            };

            const discoveryDecisions = await this.engine.qtuIntegration.discoveryDecisions(discoveryContext);
            const discoveryValid = discoveryDecisions && typeof discoveryDecisions === 'object';
            this.addTestResult('Discovery Decisions', discoveryValid, discoveryValid ? 'Success' : 'Failed');

            // Test processing decisions
            const processingContext = {
                processingMode: 'medium',
                documentCount: 50
            };

            const processingDecisions = await this.engine.qtuIntegration.processingDecisions(processingContext);
            const processingValid = processingDecisions && typeof processingDecisions === 'object';
            this.addTestResult('Processing Decisions', processingValid, processingValid ? 'Success' : 'Failed');

            // Test QA decisions
            const qaContext = {
                completionRate: 90,
                accuracyScore: 85,
                organizationScore: 80
            };

            const qaDecisions = await this.engine.qtuIntegration.qaDecisions(qaContext);
            const qaValid = qaDecisions && typeof qaDecisions === 'object';
            this.addTestResult('QA Decisions', qaValid, qaValid ? 'Success' : 'Failed');

        } catch (error) {
            this.addTestResult('QTU Integration', false, error.message);
        }
    }

    async testWorkflowWithUserDecisions() {
        console.log('\n⚙️  Testing Workflow with User Decisions...');

        try {
            // Start a new workflow
            const workflowStarted = await this.engine.startWorkflow('medium');
            const workflowValid = workflowStarted && workflowStarted.session_id;
            this.addTestResult('Workflow Start', workflowValid, workflowValid ? 'Success' : 'Failed');

            if (!workflowValid) {
                return;
            }

            // Test resource assessment with user decisions
            const resourceAssessment = await this.engine.performResourceAssessment();
            const resourceValid = resourceAssessment && resourceAssessment.userDecisions !== undefined;
            this.addTestResult('Resource Assessment with User Decisions', resourceValid, resourceValid ? 'Success' : 'Failed');

            // Test medium priority processing with user decisions
            const mediumProcessing = await this.engine.processMediumPriorityDocuments();
            const mediumValid = mediumProcessing && mediumProcessing.userDecisions !== undefined;
            this.addTestResult('Medium Priority Processing with User Decisions', mediumValid, mediumValid ? 'Success' : 'Failed');

            // Test QA metrics review with user decisions
            const qaReview = await this.engine.reviewQualityMetrics();
            const qaValid = qaReview && qaReview.userDecisions !== undefined;
            this.addTestResult('QA Metrics Review with User Decisions', qaValid, qaValid ? 'Success' : 'Failed');

        } catch (error) {
            this.addTestResult('Workflow with User Decisions', false, error.message);
        }
    }

    async testCLIIntegration() {
        console.log('\n💻 Testing CLI Integration...');

        try {
            // Test CLI module loading
            const { execSync } = require('child_process');

            // Test help command
            try {
                const helpOutput = execSync('node .clinerules/scripts/cli.js --help', {encoding: 'utf8'});
                const helpValid = helpOutput.includes('Documentation Review CLI');
                this.addTestResult('CLI Help Command', helpValid, helpValid ? 'Success' : 'Failed');
            } catch (helpError) {
                this.addTestResult('CLI Help Command', false, helpError.message);
            }

            // Test QTU test command
            try {
                const qtuTestOutput = execSync('node .clinerules/scripts/cli.js qtu-test', {encoding: 'utf8', timeout: 10000});
                const qtuTestValid = qtuTestOutput.includes('QTU integration test complete') || qtuTestOutput.includes('QTU integration not available');
                this.addTestResult('CLI QTU Test Command', qtuTestValid, qtuTestValid ? 'Success' : 'Failed');
            } catch (qtuTestError) {
                this.addTestResult('CLI QTU Test Command', false, qtuTestError.message);
            }

            // Test workflow engine CLI
            try {
                const workflowStatus = execSync('node .clinerules/scripts/workflow-engine.js --status', {encoding: 'utf8'});
                const workflowValid = workflowStatus.includes('WORKFLOW STATUS') || workflowStatus.includes('No active workflow found');
                this.addTestResult('Workflow Engine CLI', workflowValid, workflowValid ? 'Success' : 'Failed');
            } catch (workflowError) {
                this.addTestResult('Workflow Engine CLI', false, workflowError.message);
            }

        } catch (error) {
            this.addTestResult('CLI Integration', false, error.message);
        }
    }

    async testEndToEndWorkflow() {
        console.log('\n🔄 Testing End-to-End Workflow...');

        try {
            // Create test documentation
            const testDocPath = 'docs/TEST-integrated-system.md';
            const testContent = `# Integrated System Test\n\nThis is a test document for the integrated system.\n\nGenerated at: ${new Date().toISOString()}`;

            const createResult = await this.manager.handleDocumentationUpdate(
                testDocPath,
                'new',
                testContent
            );

            const createValid = createResult.success;
            this.addTestResult('Create Test Documentation', createValid, createValid ? 'Success' : createResult.error);

            if (!createValid) {
                return;
            }

            // Start workflow
            const workflowStarted = await this.engine.startWorkflow('medium');
            const workflowValid = workflowStarted && workflowStarted.session_id;
            this.addTestResult('Start Workflow', workflowValid, workflowValid ? 'Success' : 'Failed');

            if (!workflowValid) {
                return;
            }

            // Execute a few steps
            const status = await this.engine.getStatus();
            const statusValid = status && status.session_id === workflowStarted.session_id;
            this.addTestResult('Get Workflow Status', statusValid, statusValid ? 'Success' : 'Failed');

            // Generate report
            const report = await this.engine.generateReport('json');
            const reportValid = report && report.session_id === workflowStarted.session_id;
            this.addTestResult('Generate Workflow Report', reportValid, reportValid ? 'Success' : 'Failed');

            // Clean up test file
            try {
                await fs.unlink(testDocPath);
                await fs.unlink(`${testDocPath.replace('.md', '')}.md`);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }

        } catch (error) {
            this.addTestResult('End-to-End Workflow', false, error.message);
        }
    }

    addTestResult(testName, success, message) {
        this.testResults.push({
            name: testName,
            success: success,
            message: message,
            timestamp: new Date().toISOString()
        });

        const status = success ? '✅' : '❌';
        console.log(`  ${status} ${testName}: ${message}`);
    }

    generateTestReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 INTEGRATED SYSTEM TEST REPORT');
        console.log('='.repeat(60));

        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;

        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        if (failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.filter(r => !r.success).forEach(result => {
                console.log(`  - ${result.name}: ${result.message}`);
            });
        }

        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            total_tests: totalTests,
            passed_tests: passedTests,
            failed_tests: failedTests,
            success_rate: ((passedTests / totalTests) * 100).toFixed(1),
            test_results: this.testResults
        };

        try {
            fs.writeFile('.clinerules/integrated-test-report.json', JSON.stringify(report, null, 2), (err) => {
                if (err) {
                    console.error('❌ Failed to save test report:', err.message);
                } else {
                    console.log('\n📄 Detailed report saved to: .clinerules/integrated-test-report.json');
                }
            });
        } catch (error) {
            console.error('❌ Failed to save test report:', error.message);
        }

        // Final status
        if (failedTests === 0) {
            console.log('\n🎉 All tests passed! Integrated system is ready.');
        } else {
            console.log(`\n⚠️  ${failedTests} test(s) failed. Please review and fix issues.`);
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const testSuite = new IntegratedSystemTestSuite();
    testSuite.runAllTests();
}

module.exports = IntegratedSystemTestSuite;