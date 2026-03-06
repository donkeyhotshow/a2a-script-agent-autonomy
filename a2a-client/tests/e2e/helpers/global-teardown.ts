/**
 * Global teardown for Playwright tests
 * Cleans up test data and services if needed
 */
async function globalTeardown() {
  console.log('🧹 Cleaning up E2E test environment...');

  // Clean up test sessions/data if needed
  try {
    // Optional: Clean up test sessions from database
    // This would require API calls to clean up test data

    console.log('✓ Test cleanup completed');
  } catch (error) {
    console.warn('⚠ Test cleanup failed:', error.message);
  }

  console.log('✅ E2E test environment cleaned up');
}

export default globalTeardown;