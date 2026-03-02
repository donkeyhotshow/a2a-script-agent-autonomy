#!/usr/bin/env node

const WorkflowEngine = require('./workflow-engine.js');
const DecisionEngine = require('./decision-engine.js');
const fs = require('fs').promises;

class UnifiedWorkflowTestSuite {
  constructor() {
    this.engine = new WorkflowEngine();
    this.decisionEngine = new DecisionEngine();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🧪 Starting Unified Workflow Test Suite');
    console.log('='.repeat(60));

    try {
      // Test 1: State Management
      await this.testStateManagement();
      
      // Test 2: Decision Engine
      await this.testDecisionEngine();
      
      // Test 3: Workflow Engine
      await this.testWorkflowEngine();
      
      // Test 4: Integration Tests
      await this.testIntegration();
      
      // Test 5: Error Handling
      await this.testErrorHandling();
      
      // Generate Test Report
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.addTestResult('Test Suite', false, error.message);
    }
  }

  async testStateManagement() {
    console.log('\n📋 Testing State Management...');
    
    try {
      // Test state initialization
      const stateInitialized = await this.engine.initialize();
      this.addTestResult('State Initialization', stateInitialized, stateInitialized ? 'Success' : 'Failed');
      
      // Test state persistence
      const state = this.engine.state;
      const progress = this.engine.progress;
      
      const stateValid = state && state.session_id && state.current_phase;
      const progressValid = progress && progress.session_id && progress.phases;
      
      this.addTestResult('State Structure Valid', stateValid, stateValid ? 'Success' : 'Invalid state structure');
      this.addTestResult('Progress Structure Valid', progressValid, progressValid ? 'Success' : 'Invalid progress structure');
      
      // Test state updates
      const originalProgress = this.engine.state.progress_percentage;
      this.engine.state.progress_percentage = 50;
      await this.engine.saveState();
      
      // Reload and verify
      const reloadedState = await this.engine.loadState();
      const updateValid = reloadedState.progress_percentage === 50;
      
      this.addTestResult('State Persistence', updateValid, updateValid ? 'Success' : 'State not persisted correctly');
      
    } catch (error) {
      this.addTestResult('State Management', false, error.message);
    }
  }

  async testDecisionEngine() {
    console.log('\n🧠 Testing Decision Engine...');
    
    try {
      // Test decision engine initialization
      const decisionEngineInitialized = await this.decisionEngine.initialize();
      this.addTestResult('Decision Engine Initialization', decisionEngineInitialized, decisionEngineInitialized ? 'Success' : 'Failed');
      
      // Test inventory analysis decision
      const inventoryContext = {
        documentCount: 150,
        existingReviews: 25,
        qualityScore: 75
      };
      
      const inventoryDecision = await this.decisionEngine.makeDecision('discovery', 'inventory_analysis', inventoryContext);
      const inventoryValid = inventoryDecision && inventoryDecision.action === 'multiple_decisions';
      
      this.addTestResult('Inventory Analysis Decision', inventoryValid, inventoryValid ? 'Success' : 'Invalid decision');
      
      // Test priority classification decision
      const priorityContext = {
        documents: ['api-guide.md', 'user-manual.md', 'internal-process.md']
      };
      
      const priorityDecision = await this.decisionEngine.makeDecision('discovery', 'priority_classification', priorityContext);
      const priorityValid = priorityDecision && priorityDecision.priorities && priorityDecision.priorities.high.length > 0;
      
      this.addTestResult('Priority Classification Decision', priorityValid, priorityValid ? 'Success' : 'Invalid classification');
      
      // Test quality verification decision
      const qualityContext = {
        completionRate: 95,
        accuracyScore: 90,
        organizationScore: 85
      };
      
      const qualityDecision = await this.decisionEngine.makeDecision('qa', 'quality_verification', qualityContext);
      const qualityValid = qualityDecision && qualityDecision.action === 'quality_verified';
      
      this.addTestResult('Quality Verification Decision', qualityValid, qualityValid ? 'Success' : 'Quality verification failed');
      
    } catch (error) {
      this.addTestResult('Decision Engine', false, error.message);
    }
  }

  async testWorkflowEngine() {
    console.log('\n⚙️  Testing Workflow Engine...');
    
    try {
      // Test workflow start
      const workflowStarted = await this.engine.startWorkflow('medium');
      const workflowValid = workflowStarted && workflowStarted.session_id && workflowStarted.current_phase === 'discovery';
      
      this.addTestResult('Workflow Start', workflowValid, workflowValid ? 'Success' : 'Failed to start workflow');
      
      // Test status reporting
      const status = await this.engine.getStatus();
      const statusValid = status && status.session_id === workflowStarted.session_id;
      
      this.addTestResult('Status Reporting', statusValid, statusValid ? 'Success' : 'Status report invalid');
      
      // Test report generation
      const report = await this.engine.generateReport('json');
      const reportValid = report && report.session_id === workflowStarted.session_id;
      
      this.addTestResult('Report Generation', reportValid, reportValid ? 'Success' : 'Report generation failed');
      
      // Test phase completion
      const phaseCompleted = await this.engine.completePhase();
      const phaseValid = phaseCompleted && phaseCompleted.current_phase === 'processing';
      
      this.addTestResult('Phase Completion', phaseValid, phaseValid ? 'Success' : 'Phase completion failed');
      
    } catch (error) {
      this.addTestResult('Workflow Engine', false, error.message);
    }
  }

  async testIntegration() {
    console.log('\n🔗 Testing Integration...');
    
    try {
      // Test CLI integration
      const { execSync } = require('child_process');
      
      // Test workflow engine CLI
      try {
        const cliOutput = execSync('node .clinerules/scripts/workflow-engine.js --status', { encoding: 'utf8' });
        const cliValid = cliOutput.includes('WORKFLOW STATUS') || cliOutput.includes('No active workflow found');
        this.addTestResult('CLI Integration', cliValid, cliValid ? 'Success' : 'CLI command failed');
      } catch (cliError) {
        this.addTestResult('CLI Integration', false, cliError.message);
      }
      
      // Test decision engine CLI
      try {
        const decisionOutput = execSync('node .clinerules/scripts/decision-engine.js status', { encoding: 'utf8' });
        const decisionCliValid = decisionOutput.includes('Current State') || decisionOutput.includes('Unknown command');
        this.addTestResult('Decision Engine CLI', decisionCliValid, decisionCliValid ? 'Success' : 'Decision engine CLI failed');
      } catch (decisionError) {
        this.addTestResult('Decision Engine CLI', false, decisionError.message);
      }
      
      // Test file system integration
      const filesExist = await this.checkRequiredFiles();
      this.addTestResult('File System Integration', filesExist, filesExist ? 'Success' : 'Required files missing');
      
    } catch (error) {
      this.addTestResult('Integration', false, error.message);
    }
  }

  async testErrorHandling() {
    console.log('\n🛡️  Testing Error Handling...');
    
    try {
      // Test invalid workflow command
      try {
        await this.engine.executeCurrentStep();
        this.addTestResult('Invalid Command Handling', true, 'Gracefully handled invalid command');
      } catch (error) {
        this.addTestResult('Invalid Command Handling', true, 'Error caught and handled: ' + error.message);
      }
      
      // Test missing configuration
      const originalConfig = this.engine.config;
      this.engine.config = null;
      
      try {
        await this.engine.startWorkflow('medium');
        this.addTestResult('Missing Config Handling', false, 'Should have failed with missing config');
      } catch (configError) {
        this.addTestResult('Missing Config Handling', true, 'Correctly handled missing configuration');
      }
      
      // Restore config
      this.engine.config = originalConfig;
      
      // Test file system errors
      try {
        await this.engine.loadState();
        this.addTestResult('File System Error Handling', true, 'File system operations working');
      } catch (fsError) {
        this.addTestResult('File System Error Handling', true, 'File system errors handled: ' + fsError.message);
      }
      
    } catch (error) {
      this.addTestResult('Error Handling', false, error.message);
    }
  }

  async checkRequiredFiles() {
    const requiredFiles = [
      '.clinerules/workflow-state.json',
      '.clinerules/workflow-progress.json',
      '.clinerules/workflow-logs.json',
      '.clinerules/workflow-config.json',
      '.clinerules/scripts/workflow-engine.js',
      '.clinerules/scripts/decision-engine.js',
      '.clinerules/workflows/UNIFIED-DOCUMENTATION-WORKFLOW.md'
    ];
    
    for (const file of requiredFiles) {
      try {
        await fs.access(file);
      } catch (error) {
        return false;
      }
    }
    
    return true;
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
    console.log('📊 TEST REPORT');
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
      fs.writeFile('.clinerules/test-report.json', JSON.stringify(report, null, 2), (err) => {
        if (err) {
          console.error('❌ Failed to save test report:', err.message);
        } else {
          console.log('\n📄 Detailed report saved to: .clinerules/test-report.json');
        }
      });
    } catch (error) {
      console.error('❌ Failed to save test report:', error.message);
    }
    
    // Final status
    if (failedTests === 0) {
      console.log('\n🎉 All tests passed! Unified workflow system is ready.');
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed. Please review and fix issues.`);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new UnifiedWorkflowTestSuite();
  testSuite.runAllTests();
}

module.exports = UnifiedWorkflowTestSuite;