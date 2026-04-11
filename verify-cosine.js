const { MathUtils } = require('./a2a-client/packages/rag/dist/math-utils.js');

console.log('Verifying cosine similarity calculations...');

// Test cases from the original test
const vec1 = [1, 0, 0];
const vec2 = [1, 0, 0]; 
const vec3 = [0, 1, 0];

// Original implementation
function originalCosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

console.log('\\nTest 1: [1,0,0] vs [1,0,0]');
console.log('Original:', originalCosineSimilarity(vec1, vec2));
console.log('New:     ', MathUtils.cosineSimilarity(vec1, vec2));
console.log('Match:   ', Math.abs(originalCosineSimilarity(vec1, vec2) - MathUtils.cosineSimilarity(vec1, vec2)) < 0.000001);

console.log('\\nTest 2: [1,0,0] vs [0,1,0]');
console.log('Original:', originalCosineSimilarity(vec1, vec3));
console.log('New:     ', MathUtils.cosineSimilarity(vec1, vec3));
console.log('Match:   ', Math.abs(originalCosineSimilarity(vec1, vec3) - MathUtils.cosineSimilarity(vec1, vec3)) < 0.000001);

console.log('\\nTest 3: [1,0,0] vs [-1,0,0]');
console.log('Original:', originalCosineSimilarity(vec1, [-1, 0, 0]));
console.log('New:     ', MathUtils.cosineSimilarity(vec1, [-1, 0, 0]));
console.log('Match:   ', Math.abs(originalCosineSimilarity(vec1, [-1, 0, 0]) - MathUtils.cosineSimilarity(vec1, [-1, 0, 0])) < 0.000001);

console.log('\\nTest 4: [1,1,0] vs [1,0,0] (45 degrees)');
const vec4 = [1, 1, 0];
const vec5 = [1, 0, 0];
console.log('Original:', originalCosineSimilarity(vec4, vec5));
console.log('New:     ', MathUtils.cosineSimilarity(vec4, vec5));
console.log('Match:   ', Math.abs(originalCosineSimilarity(vec4, vec5) - MathUtils.cosineSimilarity(vec4, vec5)) < 0.000001);

// Test set cosine similarity
console.log('\\nSet cosine similarity test:');
const set1 = new Set(['a', 'b', 'c']);
const set2 = new Set(['a', 'b', 'd']);
console.log('Set1 size:', set1.size);
console.log('Set2 size:', set2.size);
console.log('Intersection:', [...set1].filter(x => set2.has(x)).length);

// Original set cosine implementation
function originalSetCosineSimilarity(a, b) {
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const magA = Math.sqrt(a.size);
  const magB = Math.sqrt(b.size);
  if (magA === 0 || magB === 0) return 0;
  return intersection.size / (magA * magB);
}

console.log('\\nTest 5: Set cosine {a,b,c} vs {a,b,d}');
console.log('Original:', originalSetCosineSimilarity(set1, set2));
console.log('New:     ', MathUtils.setCosineSimilarity(set1, set2));
console.log('Match:   ', Math.abs(originalSetCosineSimilarity(set1, set2) - MathUtils.setCosineSimilarity(set1, set2)) < 0.000001);

console.log('\\nAll tests completed.');