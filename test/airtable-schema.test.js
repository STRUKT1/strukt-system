/**
 * Basic tests for Airtable Schema Adapter
 * 
 * These are lightweight tests to validate the adapter functionality
 * without requiring live Airtable connections.
 */

const assert = require('assert');
const path = require('path');

// Test the adapter module
function testAdapter() {
  console.log('🧪 Testing Airtable Schema Adapter...');
  
  try {
    const { adapter, getTableIds, getFieldIds } = require('../src/schema/airtableAdapter.js');
    
    // Test version info
    const version = adapter.getVersion();
    assert(version.spec_version === 'v1.0.0', 'Expected spec_version v1.0.0');
    assert(version.owner_repo === 'STRUKT1/strukt-system', 'Expected owner_repo to be STRUKT1/strukt-system');
    console.log('✅ Version info loaded correctly');
    
    // Test table ID resolution
    const usersTableId = adapter.getTableId('users');
    assert(usersTableId === 'tbl87AICCbvbgrLCY', 'Users table ID should match');
    console.log('✅ Table ID resolution works');
    
    // Test field ID resolution
    const emailFieldId = adapter.getFieldId('users', 'email_address');
    assert(emailFieldId === 'fldgyVjQJc389lqNA', 'Email field ID should match');
    console.log('✅ Field ID resolution works');
    
    // Test legacy compatibility
    const legacyTableIds = getTableIds();
    assert(legacyTableIds.users === 'tbl87AICCbvbgrLCY', 'Legacy table IDs should work');
    console.log('✅ Legacy table IDs compatibility works');
    
    const legacyFieldIds = getFieldIds();
    assert(legacyFieldIds.chat.Created === 'fld1WNv8Oj0PU0ODt', 'Legacy field IDs should work');
    console.log('✅ Legacy field IDs compatibility works');
    
    // Test shadow write flag
    const shadowEnabled = adapter.isShadowWriteEnabled();
    assert(typeof shadowEnabled === 'boolean', 'Shadow write flag should be boolean');
    console.log('✅ Shadow write flag accessible');
    
    // Test error handling for invalid table
    try {
      adapter.getTableId('nonexistent');
      assert(false, 'Should throw error for nonexistent table');
    } catch (error) {
      assert(error.message.includes('not found'), 'Should throw descriptive error');
      console.log('✅ Error handling for invalid table works');
    }
    
    console.log('🎉 All adapter tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Adapter test failed:', error.message);
    return false;
  }
}

// Test schema version format
function testSchemaVersionFormat() {
  console.log('🧪 Testing Schema Version Format...');
  
  try {
    const { adapter } = require('../src/schema/airtableAdapter.js');
    
    // Test version info includes spec_version
    const version = adapter.getVersion();
    assert(version.spec_version, 'Should have spec_version field');
    assert(version.spec_version.startsWith('v'), 'spec_version should start with v');
    assert(version.owner_repo === 'STRUKT1/strukt-system', 'Expected owner_repo to be STRUKT1/strukt-system');
    assert(version.updated_at.includes('T'), 'updated_at should be ISO8601 format');
    console.log('✅ Schema version format is correct');
    
    // Test backward compatibility
    assert(version.version === version.spec_version, 'Should provide backward compatibility');
    console.log('✅ Backward compatibility maintained');
    
    console.log('🎉 All schema version format tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Schema version format test failed:', error.message);
    return false;
  }
}

// Test shadow write utilities
function testShadowWrites() {
  console.log('🧪 Testing Shadow Write Utilities...');
  
  try {
    const { applyShadowWrites, mapIncomingRecord, ENABLE_SHADOW_WRITES } = require('../utils/logging.js');
    
    // Test shadow writes function exists and works
    const testPayload = { field1: 'value1', field2: 'value2' };
    const result = applyShadowWrites('test_table', testPayload);
    assert(typeof result === 'object', 'Should return an object');
    console.log('✅ Shadow writes function works');
    
    // Test incoming record mapping
    const testRecord = { fields: { field1: 'value1' } };
    const mappedRecord = mapIncomingRecord('test_table', testRecord);
    assert(typeof mappedRecord === 'object', 'Should return an object');
    console.log('✅ Incoming record mapping works');
    
    // Test shadow write flag
    assert(typeof ENABLE_SHADOW_WRITES === 'boolean', 'Shadow write flag should be boolean');
    console.log('✅ Shadow write flag is accessible');
    
    console.log('🎉 All shadow write tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Shadow write test failed:', error.message);
    return false;
  }
}

// Test schema spec file structure
function testSchemaSpec() {
  console.log('🧪 Testing Schema Specification...');
  
  try {
    const fs = require('fs');
    const specPath = path.join(__dirname, '../schema/AIRTABLE_SPEC.yaml');
    
    // Test file exists
    assert(fs.existsSync(specPath), 'Schema spec file should exist');
    console.log('✅ Schema spec file exists');
    
    // Test file is readable
    const content = fs.readFileSync(specPath, 'utf-8');
    assert(content.length > 0, 'Schema spec should have content');
    assert(content.includes('spec_version:'), 'Should contain spec_version field');
    assert(content.includes('tables:'), 'Should contain tables section');
    console.log('✅ Schema spec file is readable and has expected structure');
    
    console.log('🎉 All schema spec tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Schema spec test failed:', error.message);
    return false;
  }
}

// Run all tests
function runAllTests() {
  console.log('🚀 Running Airtable Schema Tests\n');
  
  const results = [
    testSchemaSpec(),
    testSchemaVersionFormat(),
    testAdapter(),
    testShadowWrites()
  ];
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} test suites passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed successfully!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testAdapter,
  testShadowWrites,
  testSchemaSpec,
  testSchemaVersionFormat,
  runAllTests
};