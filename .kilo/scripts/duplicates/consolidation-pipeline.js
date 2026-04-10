#!/usr/bin/env node
/**
 * Duplicate Code Consolidation Pipeline
 * Runs the complete duplicate detection and consolidation process
 */

const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SCRIPTS_DIR = __dirname; // We're already in the duplicates directory

// Script paths
const SCRIPTS = {
  detectDuplicates: path.join(SCRIPTS_DIR, 'detect-full-duplicates.js'),
  analyzeSimilarity: path.join(SCRIPTS_DIR, 'analyze-similarity.js'),
  analyzeImports: path.join(SCRIPTS_DIR, 'import-migration.js'),
  consolidate: path.join(SCRIPTS_DIR, 'consolidation-helper.js'),
  verify: path.join(SCRIPTS_DIR, 'verify-consolidation.js')
};

/**
 * Run a script and capture output
 */
function runScript(scriptPath, args = []) {
  const command = `node ${scriptPath} ${args.join(' ')}`;
  console.log(`\n🔄 Running: ${command}`);

  try {
    const output = execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
      timeout: 300000 // 5 minutes timeout
    });
    return { success: true, output: output?.toString() };
  } catch (error) {
    console.error(`❌ Script failed: ${scriptPath}`);
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Phase 1: Detection - Find all duplicates
 */
function runDetectionPhase() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 PHASE 1: DUPLICATE DETECTION');
  console.log('='.repeat(60));

  console.log('Step 1.1: Finding identical files...');
  const result1 = runScript(SCRIPTS.detectDuplicates);
  if (!result1.success) return false;

  console.log('Step 1.2: Finding similar code patterns...');
  const result2 = runScript(SCRIPTS.analyzeSimilarity);
  if (!result2.success) return false;

  return true;
}

/**
 * Phase 2: Analysis - Analyze import patterns
 */
function runAnalysisPhase() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 PHASE 2: IMPORT ANALYSIS');
  console.log('='.repeat(60));

  console.log('Step 2.1: Analyzing import migration patterns...');
  const result = runScript(SCRIPTS.analyzeImports);
  if (!result.success) return false;

  return true;
}

/**
 * Phase 3: Consolidation - Apply changes
 */
function runConsolidationPhase(dryRun = true) {
  const mode = dryRun ? 'DRY RUN' : 'LIVE';
  console.log('\n' + '='.repeat(60));
  console.log(`🔧 PHASE 3: CONSOLIDATION (${mode})`);
  console.log('='.repeat(60));

  const args = dryRun ? [] : ['--apply'];

  console.log(`Step 3.1: Applying import migrations (${mode.toLowerCase()})...`);
  const result = runScript(SCRIPTS.consolidate, args);
  if (!result.success) return false;

  return true;
}

/**
 * Phase 4: Verification - Ensure everything works
 */
function runVerificationPhase() {
  console.log('\n' + '='.repeat(60));
  console.log('✅ PHASE 4: VERIFICATION');
  console.log('='.repeat(60));

  console.log('Step 4.1: Verifying consolidation results...');
  const result = runScript(SCRIPTS.verify);
  return result.success;
}

/**
 * Main pipeline function
 */
async function runConsolidationPipeline(options = {}) {
  const { dryRun = true, skipDetection = false, skipAnalysis = false } = options;

  console.log('🚀 Starting Duplicate Code Consolidation Pipeline');
  console.log(`Mode: ${dryRun ? 'DRY RUN (safe)' : 'LIVE (will modify files)'}`);
  console.log(`Date: ${new Date().toLocaleString()}`);
  console.log('');

  if (!dryRun) {
    console.log('⚠️  WARNING: Live mode will modify files and create backups!');
    console.log('   Make sure you have committed your changes first.');
    console.log('');
  }

  let success = true;

  // Phase 1: Detection
  if (!skipDetection) {
    success = runDetectionPhase();
    if (!success) {
      console.error('❌ Detection phase failed');
      return false;
    }
  }

  // Phase 2: Analysis
  if (!skipAnalysis) {
    success = runAnalysisPhase();
    if (!success) {
      console.error('❌ Analysis phase failed');
      return false;
    }
  }

  // Phase 3: Consolidation
  success = runConsolidationPhase(dryRun);
  if (!success) {
    console.error('❌ Consolidation phase failed');
    return false;
  }

  // Phase 4: Verification
  if (!dryRun) {
    success = runVerificationPhase();
    if (!success) {
      console.error('❌ Verification phase failed');
      console.log('\n🔄 You may want to restore from backups:');
      console.log('   - Check .kilo/scripts/duplicates/backups/');
      console.log('   - Or run: git checkout . && git clean -fd');
      return false;
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 PIPELINE COMPLETED');
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('✅ Dry run completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Review the generated reports in .kilo/scripts/duplicates/reports/');
    console.log('   2. Run live consolidation: node consolidation-pipeline.js --apply');
    console.log('   3. Verify results: node verify-consolidation.js');
  } else {
    console.log('✅ Live consolidation completed successfully!');
    console.log('');
    console.log('📋 What was done:');
    console.log('   - Import paths updated to reference primary locations');
    console.log('   - Duplicate files removed (backups created)');
    console.log('   - All changes verified to work correctly');
    console.log('');
    console.log('🔍 Check reports in: .kilo/scripts/duplicates/reports/');
    console.log('💾 Backups available in: .kilo/scripts/duplicates/backups/');
  }

  return true;
}

// Command line interface
const args = process.argv.slice(2);
const applyMode = args.includes('--apply') || args.includes('-a');
const skipDetection = args.includes('--skip-detection');
const skipAnalysis = args.includes('--skip-analysis');

runConsolidationPipeline({
  dryRun: !applyMode,
  skipDetection,
  skipAnalysis
})
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Pipeline failed:', error);
    process.exit(1);
  });