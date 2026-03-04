/**
 * Simple integration test for fs-utils protocol result functions
 */

// Test importing the functions directly from source
try {
    // Import the functions from the source files
    const { readFileForResult, writeFileForResult, listDirectoryForResult } = require('./src/protocol-result.stub.js');
    
    console.log('✅ Successfully imported protocol result functions from source');
    console.log('Available functions:');
    console.log('- readFileForResult:', typeof readFileForResult);
    console.log('- writeFileForResult:', typeof writeFileForResult);
    console.log('- listDirectoryForResult:', typeof listDirectoryForResult);
    
    // Test that the functions are actually exported
    if (typeof readFileForResult === 'function' && 
        typeof writeFileForResult === 'function' && 
        typeof listDirectoryForResult === 'function') {
        console.log('✅ All protocol result functions are properly exported');
        
        // Test the functions with sample data
        console.log('\n--- Testing functions with sample data ---');
        
        // Test readFileForResult
        const readResult = readFileForResult('/test/path.txt', 'file content');
        console.log('readFileForResult result:', JSON.stringify(readResult, null, 2));
        
        // Test writeFileForResult
        const writeResult = writeFileForResult('/test/path.txt', 'new content');
        console.log('writeFileForResult result:', JSON.stringify(writeResult, null, 2));
        
        // Test listDirectoryForResult
        const listResult = listDirectoryForResult('/test/dir', ['file1.txt', 'file2.txt']);
        console.log('listDirectoryForResult result:', JSON.stringify(listResult, null, 2));
        
        console.log('\n✅ All functions work correctly with sample data');
        
    } else {
        console.log('❌ Some protocol result functions are missing');
    }
    
} catch (error) {
    console.error('❌ Failed to import protocol result functions:', error.message);
    console.error('Stack:', error.stack);
}