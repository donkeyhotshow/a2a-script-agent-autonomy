const DocumentationManager = require('./documentation-manager.js');

async function testReviewWorkflow() {
  const manager = new DocumentationManager();

  // Test 1: Create new documentation
  console.log('=== Test 1: Create New Documentation ===');
  const newDocContent = `# New Documentation\n\nThis is a test document for the review workflow.`;
  const newResult = await manager.handleDocumentationUpdate(
    'docs/TEST-new-documentation.md',
    'new',
    newDocContent
  );
  console.log('New document created:', newResult.newDocumentPath);
  console.log('Review request:', newResult.reviewRequest);

  // Test 2: Mark existing document as outdated
  console.log('\n=== Test 2: Mark Document as Outdated ===');
  const outdatedResult = await manager.handleDocumentationUpdate(
    'docs/TEST-new-documentation.md',
    'outdated',
    null
  );
  console.log('Outdated document marked:', outdatedResult.outdatedDocs);
  console.log('New document created:', outdatedResult.newDocumentPath);
  console.log('Review request:', outdatedResult.reviewRequest);

  // Test 3: Get review status
  console.log('\n=== Test 3: Get Review Status ===');
  if (outdatedResult.reviewRequest) {
    const reviewStatus = await manager.getReviewStatus(outdatedResult.reviewRequest.id);
    console.log('Review status:', reviewStatus);
  } else {
    console.log('No review request to check status');
  }

  // Test 4: Generate review report
  console.log('\n=== Test 4: Generate Review Report ===');
  const reviewReport = await manager.generateReviewReport();
  console.log('Review report:', reviewReport);

  console.log('\n=== Workflow Test Complete ===');
}

testReviewWorkflow().catch(console.error);