import { checkPathAccess, checkPathAccessSync } from './a2a-client/packages/execution/src/fs-access.js';

// Test with a file that should exist
console.log('Testing access to package.json:');
checkPathAccess('./package.json').then(result => {
  console.log('Async result:', result);
});
console.log('Sync result:', checkPathAccessSync('./package.json'));

// Test with a file that should not exist
console.log('\nTesting access to non-existent file:');
checkPathAccess('./non-existent-file.txt').then(result => {
  console.log('Async result:', result);
});
console.log('Sync result:', checkPathAccessSync('./non-existent-file.txt'));

console.log('\nAll tests completed.');