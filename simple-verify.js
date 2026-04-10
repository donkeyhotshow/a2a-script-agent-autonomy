// Simple verification of cosine similarity logic without requiring package build

// Original implementation from metrics.test.ts
function originalCosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// New implementation from math-utils.ts
function newCosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

// Original implementation from code-similarity.ts
function originalSetCosineSimilarity(a, b) {
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const magA = Math.sqrt(a.size);
  const magB = Math.sqrt(b.size);
  if (magA === 0 || magB === 0) return 0;
  return intersection.size / (magA * magB);
}

// New implementation from math-utils.ts
function newSetCosineSimilarity(a, b) {
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const magA = Math.sqrt(a.size);
  const magB = Math.sqrt(b.size);
  
  if (magA === 0 || magB === 0) {
    return 0;
  }
  
  return intersection.size / (magA * magB);
}

console.log('Verifying cosine similarity implementations...');

// Test vector cosine similarity
const testCases = [
  { vecA: [1, 0, 0], vecB: [1, 0, 0], desc: 'Identical vectors' },
  { vecA: [1, 0, 0], vecB: [0, 1, 0], desc: 'Orthogonal vectors' },
  { vecA: [1, 0, 0], vecB: [-1, 0, 0], desc: 'Opposite vectors' },
  { vecA: [1, 1, 0], vecB: [1, 0, 0], desc: '45 degree vectors' },
  { vecA: [0, 0, 0], vecB: [1, 0, 0], desc: 'Zero vector' },
  { vecA: [3, 4, 0], vecB: [0, 0, 5], desc: '3-4-5 triangle' }
];

console.log('\n=== Vector Cosine Similarity Tests ===');
let allPassed = true;
for (const testCase of testCases) {
  const orig = originalCosineSimilarity(testCase.vecA, testCase.vecB);
  const newImpl = newCosineSimilarity(testCase.vecA, testCase.vecB);
  const passed = Math.abs(orig - newImpl) < 0.000001;
  allPassed = allPassed && passed;
  console.log(`${testCase.desc}: Original=${orig.toFixed(6)}, New=${newImpl.toFixed(6)}, Passed=${passed}`);
}

// Test set cosine similarity
const setTestCases = [
  { setA: new Set(['a', 'b', 'c']), setB: new Set(['a', 'b', 'd']), desc: 'Partial overlap' },
  { setA: new Set(['a', 'b', 'c']), setB: new Set(['a', 'b', 'c']), desc: 'Identical sets' },
  { setA: new Set(['a', 'b', 'c']), setB: new Set(['d', 'e', 'f']), desc: 'No overlap' },
  { setA: new Set([]), setB: new Set(['a', 'b']), desc: 'Empty set' },
  { setA: new Set(['a']), setB: new Set(['a']), desc: 'Single element' }
];

console.log('\n=== Set Cosine Similarity Tests ===');
for (const testCase of setTestCases) {
  const orig = originalSetCosineSimilarity(testCase.setA, testCase.setB);
  const newImpl = newSetCosineSimilarity(testCase.setA, testCase.setB);
  const passed = Math.abs(orig - newImpl) < 0.000001;
  allPassed = allPassed && passed;
  console.log(`${testCase.desc}: Original=${orig.toFixed(6)}, New=${newImpl.toFixed(6)}, Passed=${passed}`);
}

console.log(`\nAll tests ${allPassed ? 'PASSED' : 'FAILED'}`);

// Test that we can import the math-utils module (if it were built)
// We'll just check that the file exists and has the right content
const fs = require('fs');
const path = require('path');

const mathUtilsPath = path.join(__dirname, 'a2a-client', 'packages', 'rag', 'src', 'math-utils.ts');
if (fs.existsSync(mathUtilsPath)) {
  const content = fs.readFileSync(mathUtilsPath, 'utf8');
  console.log(`\nMathUtils file exists: ${mathUtilsPath}`);
  console.log(`File size: ${content.length} characters`);
  
  // Check that it contains our expected functions
  const hasCosineSimilarity = content.includes('static cosineSimilarity');
  const hasSetCosineSimilarity = content.includes('static setCosineSimilarity');
  console.log(`Contains cosineSimilarity method: ${hasCosineSimilarity}`);
  console.log(`Contains setCosineSimilarity method: ${hasSetCosineSimilarity}`);
} else {
  console.log(`\nMathUtils file NOT found: ${mathUtilsPath}`);
  allPassed = false;
}

console.log(`\nVerification ${allPassed ? 'SUCCESSFUL' : 'FAILED'}`);
process.exit(allPassed ? 0 : 1);