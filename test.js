import { rungreply } from './src/index.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test helper function
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Test function
async function runTests() {
  console.log('🧪 Running greply tests...\n');
  
  try {
    // Test 1: Complex promise chain with path resolution
    console.log('Test 1: Complex promise chain with path resolution');
    const file1 = resolve(__dirname, 'README.md');
    const result1 = await rungreply({ 
      query: '# greply', 
      target: file1, 
      fixedStrings: true 
    });
    
    // Strip ANSI color codes and check for exact line number format
    const cleanOutput1 = result1.stdout.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
    assert(cleanOutput1.includes('README.md:1:# greply'), 
      `Expected output to include "README.md:1:# greply", got: ${cleanOutput1}`);
    console.log('✅ Test 1 passed\n');
    
    // Test 2: Simple target string
    console.log('Test 2: Simple target string');
    const result2 = await rungreply({ 
      query: '# greply', 
      target: 'README.md', 
      fixedStrings: true 
    });
    
    // Strip ANSI color codes and check for exact line number format
    const cleanOutput2 = result2.stdout.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
    assert(cleanOutput2.includes('README.md:1:# greply'), 
      `Expected output to include "README.md:1:# greply", got: ${cleanOutput2}`);
    console.log('✅ Test 2 passed\n');
    
    // Test 3: No matches should not throw error
    console.log('Test 3: No matches should not throw error');
    const result3 = await rungreply({ 
      query: 'nonexistentquery12345', 
      target: 'README.md', 
      fixedStrings: true 
    });
    
    assert(result3.code === 1, `Expected exit code 1 for no matches, got: ${result3.code}`);
    assert(result3.stdout === '', `Expected empty stdout for no matches, got: ${result3.stdout}`);
    console.log('✅ Test 3 passed\n');
    
    // Test 4: Case sensitive search
    console.log('Test 4: Case sensitive search');
    const result4 = await rungreply({ 
      query: 'GREPL', 
      target: 'README.md', 
      fixedStrings: true,
      matchCase: true 
    });
    
    // Should find no matches with case sensitive search
    assert(result4.code === 1, `Expected exit code 1 for case sensitive no match, got: ${result4.code}`);
    console.log('✅ Test 4 passed\n');
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
