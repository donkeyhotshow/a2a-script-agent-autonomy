/**
 * Test file for Actions system verification
 * Run with: npx tsx src/actions/test-actions.ts
 */

import {
    actionService,
    parseActionFromMarkdown
} from './index.js';

/**
 * Basic test - verify actions are loaded and retrievable
 */
function runBasicTest(): void {
    console.log('--- Basic Test ---');

    try {
        // Get action by ID
        const action = actionService.getAction('fix-vue-imports');

        if (action) {
            console.log('✓ Action found:');
            console.log(`  ID: ${action.id}`);
            console.log(`  Title: ${action.title}`);
            console.log(`  Description: ${action.description}`);
            console.log(`  Priority: ${action.priority}`);
            console.log(`  Context:`, action.context);
            console.log(`  SubActions count: ${action.subActions.length}`);

            // Print sub-actions
            action.subActions.forEach((subAction, index) => {
                console.log(`  SubAction ${index + 1}:`);
                console.log(`    ID: ${subAction.id}`);
                console.log(`    Title: ${subAction.title}`);
                console.log(`    Description: ${subAction.description}`);
                console.log(`    Priority: ${subAction.priority}`);
                console.log(`    Input: ${subAction.input}`);
                console.log(`    Output: ${subAction.output}`);
                console.log(`    DSL:`, subAction.dsl);
            });
        } else {
            console.log('✗ Action not found: fix-vue-imports');
        }
    } catch (error) {
        console.error('✗ Basic test error:', error);
    }

    console.log('');
}

/**
 * Search test - verify action search functionality
 */
function runSearchTest(): void {
    console.log('--- Search Test ---');

    try {
        // Search for actions
        const query = 'исправить импорты в vue';
        const results = actionService.findActions(query);

        console.log(`Search query: "${query}"`);
        console.log(`Results found: ${results.length}`);

        if (results.length > 0) {
            results.forEach((match, index) => {
                console.log(`\n--- Match ${index + 1} ---`);
                console.log(`  matchScore: ${(match.matchScore * 100).toFixed(1)}%`);
                console.log(`  Action ID: ${match.action.id}`);
                console.log(`  Title: ${match.action.title}`);
                console.log(`  Description: ${match.action.description}`);
            });
        } else {
            console.log('✗ No matches found');
        }
    } catch (error) {
        console.error('✗ Search test error:', error);
    }

    console.log('');
}

/**
 * Execution test - verify action execution flow
 */
async function runExecutionTest(): Promise<void> {
    console.log('--- Execution Test ---');

    const sessionId = 'test-session-1';

    try {
        // Step 1: Start execution
        console.log('\n[1] Starting execution...');
        const startResponse = actionService.startExecution(sessionId, 'fix-vue-imports');

        console.log('Response:');
        console.log(`  outcome: ${startResponse.outcome}`);
        console.log(`  message: ${startResponse.message}`);

        if (startResponse.executingAction) {
            console.log(`  executingAction: ${startResponse.executingAction.title}`);
        }

        if (startResponse.nextSteps) {
            console.log(`  nextSteps count: ${startResponse.nextSteps.length}`);
        }

        if (startResponse.error) {
            console.log(`  error: ${startResponse.error}`);
        }

        // Check if we should continue
        if (startResponse.outcome === 'failed') {
            console.log('✗ Execution failed to start');
            return;
        }

        // Step 2: Execute current step
        console.log('\n[2] Executing current step...');
        const stepResponse = await actionService.executeCurrentStep(sessionId);

        console.log('Response:');
        console.log(`  outcome: ${stepResponse.outcome}`);
        console.log(`  message: ${stepResponse.message}`);

        if (stepResponse.executionState) {
            console.log(`  currentStepIndex: ${stepResponse.executionState.currentStepIndex}`);
            console.log(`  history length: ${stepResponse.executionState.history.length}`);
        }

        if (stepResponse.error) {
            console.log(`  error: ${stepResponse.error}`);
        }

        // Step 3: Complete execution
        console.log('\n[3] Completing execution...');
        const completeResponse = actionService.completeExecution(sessionId);

        console.log('Response:');
        console.log(`  outcome: ${completeResponse.outcome}`);
        console.log(`  message: ${completeResponse.message}`);

        if (completeResponse.metadata) {
            console.log(`  metadata:`, completeResponse.metadata);
        }

        if (completeResponse.error) {
            console.log(`  error: ${completeResponse.error}`);
        }

        console.log('✓ Execution test completed');
    } catch (error) {
        console.error('✗ Execution test error:', error);
    }

    console.log('');
}

/**
 * Parser test - verify markdown parsing functionality
 */
function runParserTest(): void {
    console.log('--- Parser Test ---');

    // Example MD content for testing
    const mdContent = `# Test Action

## Description
This is a test action for verifying the parser.

## Context
- framework: vue
- buildTool: vite
- aliases:
  - fix: исправить

## SubActions

### Step 1: Analyze imports

**Input:**
files: string[] - Array of file paths

**Output:**
analysis: ImportAnalysis - Analysis result

**DSL:**
\`\`\`json
{
  "script": "analyze-imports.js",
  "input": {
    "files": "{{files}}"
  }
}
\`\`\`

### Step 2: Fix imports

**Input:**
analysis: ImportAnalysis

**Output:**
fixed: number - Number of fixed imports

**DSL:**
\`\`\`json
{
  "script": "fix-imports.js",
  "input": {
    "analysis": "{{analysis}}"
  }
}
\`\`\`
`;

    try {
        console.log('Parsing test action from markdown...');

        const parsedAction = parseActionFromMarkdown(mdContent, 'test-action');

        if (parsedAction) {
            console.log('✓ Parsing successful!');
            console.log('\nParsed action:');
            console.log(`  ID: ${parsedAction.id}`);
            console.log(`  Title: ${parsedAction.title}`);
            console.log(`  Description: ${parsedAction.description}`);
            console.log(`  Priority: ${parsedAction.priority}`);
            console.log(`  Context:`, JSON.stringify(parsedAction.context, null, 2));
            console.log(`  SubActions count: ${parsedAction.subActions.length}`);

            parsedAction.subActions.forEach((subAction, index) => {
                console.log(`\n  SubAction ${index + 1}:`);
                console.log(`    ID: ${subAction.id}`);
                console.log(`    Title: ${subAction.title}`);
                console.log(`    Description: ${subAction.description}`);
                console.log(`    Priority: ${subAction.priority}`);
                console.log(`    Input: ${subAction.input}`);
                console.log(`    Output: ${subAction.output}`);
                console.log(`    DSL:`, JSON.stringify(subAction.dsl, null, 2));
            });
        } else {
            console.log('✗ Parsing returned null');
        }
    } catch (error) {
        console.error('✗ Parser test error:', error);
    }

    console.log('');
}

/**
 * Main function to run all tests
 */
async function main(): Promise<void> {
    console.log('=== Action System Tests ===\n');
    console.log('Starting tests...\n');

    // Wait a bit for service to initialize
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n--- Basic Test ---');
    runBasicTest();

    console.log('\n--- Search Test ---');
    runSearchTest();

    console.log('\n--- Parser Test ---');
    runParserTest();

    console.log('\n--- Execution Test ---');
    await runExecutionTest();

    console.log('\n=== All Tests Complete ===');
}

main().catch(console.error);
