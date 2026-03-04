/**
 * Integration test for fs-utils protocol result functions
 */

// Test importing the functions
try {
    const { readFileForResult, writeFileForResult, listDirectoryForResult } = require('./dist/index.js');
    
    console.log('✅ Successfully imported protocol result functions');
    console.log('Available functions:');
    console.log('- readFileForResult:', typeof readFileForResult);
    console.log('- writeFileForResult:', typeof writeFileForResult);
    console.log('- listDirectoryForResult:', typeof listDirectoryForResult);
    
    // Test that the functions are actually exported
    if (typeof readFileForResult === 'function' && 
        typeof writeFileForResult === 'function' && 
        typeof listDirectoryForResult === 'function') {
        console.log('✅ All protocol result functions are properly exported');
    } else {
        console.log('❌ Some protocol result functions are missing');
    }
    
} catch (error) {
    console.error('❌ Failed to import protocol result functions:', error.message);
}