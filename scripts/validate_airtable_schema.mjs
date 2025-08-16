#!/usr/bin/env node

/**
 * Airtable Schema Validator for STRUKT System
 * 
 * This script validates the Airtable schema consistency between:
 * 1. Local code field usage (from field mapping)
 * 2. Airtable Meta API (when credentials are available)
 * 
 * Modes:
 * - Dry-run (default): Validates local mapping consistency only
 * - Live validation: Checks against actual Airtable base when credentials present
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  dryRun: !process.env.AIRTABLE_BASE_ID || !process.env.AIRTABLE_API_KEY,
  verbose: process.env.VERBOSE === '1' || process.argv.includes('--verbose'),
  validateAirtable: process.env.VALIDATE_AIRTABLE === '1',
};

// Expected schema from local codebase
const EXPECTED_SCHEMA = {
  tables: {
    users: {
      id: 'tbl87AICCbvbgrLCY',
      name: 'Users',
      fields: {
        'fldgyVjQJc389lqNA': { name: 'Email Address', type: 'singleLineText', required: true },
        // Add other known user fields based on personalization service usage
      }
    },
    chat: {
      id: 'tblDtOOmahkMYEqmy',
      name: 'Chat Interactions',
      fields: {
        'fldcHOwNiQlFpwuly': { name: 'Name', type: 'singleLineText', required: true },
        'fldDtbxnE1PyTleqo': { name: 'User', type: 'multipleRecordLinks', required: true },
        'fldgNRKet3scJ8PIe': { name: 'Message', type: 'multilineText', required: true },
        'fld3vU9nKXNmu6OZV': { name: 'AI Response', type: 'multilineText', required: true },
        'fld2eLzWRUnKNR7Im': { name: 'Topic', type: 'singleSelect', required: false },
      }
    },
    meals: {
      id: 'tblWLkTKkxkSEcySD',
      name: 'Meals',
      fields: {
        'fldaTFIo8vKLoQYhS': { name: 'User', type: 'multipleRecordLinks', required: true },
        'fldLJXOsnTDqfp9mJ': { name: 'Description', type: 'multilineText', required: false },
        'fldUOPuN6n39Aj1v7': { name: 'Calories', type: 'number', required: false },
        'fldbqKkHfEqmStvbn': { name: 'Protein', type: 'number', required: false },
        'fld8EvDjPVmY5vfhR': { name: 'Carbs', type: 'number', required: false },
        'fldLnl83bsw9ZSCka': { name: 'Fats', type: 'number', required: false },
        'fldoN35qBpJ2y7OFS': { name: 'MealType', type: 'singleSelect', required: false },
        'fld5DuMMbBBnYbCnS': { name: 'MealSource', type: 'singleSelect', required: false },
      }
    },
    workouts: {
      id: 'tblgqvIqFetN2s23J',
      name: 'Workouts',
      fields: {
        'fldUuYZtmkiycOVnb': { name: 'User', type: 'multipleRecordLinks', required: true },
        'fldzVeaYTUHMxMDd9': { name: 'Date', type: 'date', required: false },
        'fld9xRDtOz1mBkDQ5': { name: 'Type', type: 'singleSelect', required: false },
        'fldKkhKomMg3Cf108': { name: 'Description', type: 'multilineText', required: false },
        'fldaij5HlQKv8gMcT': { name: 'Duration', type: 'number', required: false },
        'fld2muGFVrfM0xHmI': { name: 'Calories', type: 'number', required: false },
        'fld1aEpGu5H8DWPxY': { name: 'Notes', type: 'multilineText', required: false },
      }
    },
    supplements: {
      id: 'tblZ8F0Z8ZcMDYdej',
      name: 'Supplements',
      fields: {
        'fldzShNTWJornIZnP': { name: 'User', type: 'multipleRecordLinks', required: true },
        'fldQfsrapotczQaCY': { name: 'Date', type: 'date', required: false },
        'fldSherUQZmn2ts73': { name: 'Time', type: 'singleLineText', required: false },
        'fldad6mLDsXYMks5A': { name: 'SupplementName', type: 'singleLineText', required: false },
        'fldEoF1lbZoj3wPhO': { name: 'Notes', type: 'multilineText', required: false },
        'fldzGOKvw0IF0Rbmn': { name: 'LogType', type: 'singleSelect', required: false },
        'fldiqJbsxO4yx4JvB': { name: 'Confirmed', type: 'checkbox', required: false },
      }
    },
    sleep: {
      id: 'tblFepeTBkng3zDSY',
      name: 'Sleep',
      fields: {
        'fldabdr3bNgGqBawm': { name: 'User', type: 'multipleRecordLinks', required: true },
        'fldTvCL5QQ9g7fXfw': { name: 'Date', type: 'date', required: false },
        'fldt7AKiAq2qfHs89': { name: 'Duration', type: 'number', required: false },
        'fldfdd8WYqyWx6Ckc': { name: 'Quality', type: 'singleSelect', required: false },
        'fldu544VmBsGIvEuw': { name: 'Bedtime', type: 'singleLineText', required: false },
        'fld43mo9Z09vYzoGb': { name: 'WakeTime', type: 'singleLineText', required: false },
        'fldzLiz85up5WqPAq': { name: 'Notes', type: 'multilineText', required: false },
      }
    },
    mood: {
      id: 'tbltkNq7OSUcu4Xpp',
      name: 'Mood',
      fields: {
        'flddOxxse2QJe6DMk': { name: 'User', type: 'multipleRecordLinks', required: true },
        'fldKVcXqCXvabybIb': { name: 'Date', type: 'date', required: false },
        'fldUpnuuJRYIBy4mL': { name: 'Mood', type: 'singleSelect', required: false },
        'fldFMbuWMrBlhScua': { name: 'Notes', type: 'multilineText', required: false },
        'fld6isxdyHYfjqsQM': { name: 'Energy', type: 'singleSelect', required: false },
        'fldmLOpTwpzUc0F4Y': { name: 'Stress', type: 'singleSelect', required: false },
      }
    },
    reflections: {
      id: 'tblDrFwiJTYGjOfEv',
      name: 'Reflections',
      fields: {
        'fldub69oCFo7ruloF': { name: 'User', type: 'multipleRecordLinks', required: true },
        'fldZibMunrMSu8iRC': { name: 'Date', type: 'date', required: false },
        'fldYpH7CM04KeDuT4': { name: 'WentWell', type: 'multilineText', required: false },
        'fldMeD609rZU7w8pI': { name: 'Challenge', type: 'multilineText', required: false },
        'fldmDUQ8fkYCYwCUG': { name: 'Tomorrow', type: 'multilineText', required: false },
        'fldmfnusmD5b4C6Dn': { name: 'Highlight', type: 'multilineText', required: false },
      }
    }
  }
};

class AirtableValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (level === 'error') {
      this.errors.push({ message, details });
      console.error(`❌ ${logMessage}`);
    } else if (level === 'warn') {
      this.warnings.push({ message, details });
      console.warn(`⚠️  ${logMessage}`);
    } else if (level === 'info') {
      console.log(`ℹ️  ${logMessage}`);
    } else if (level === 'success') {
      this.passed.push(message);
      console.log(`✅ ${logMessage}`);
    }

    if (details && CONFIG.verbose) {
      console.log(`    Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  validateLocalSchema() {
    this.log('info', 'Validating local schema consistency...');

    // Check if logging.js exists and has expected structure
    const loggingPath = path.join(__dirname, '../utils/logging.js');
    if (!fs.existsSync(loggingPath)) {
      this.log('error', 'utils/logging.js not found');
      return false;
    }

    try {
      const loggingContent = fs.readFileSync(loggingPath, 'utf-8');
      
      // Validate TABLE_IDS structure
      if (!loggingContent.includes('const TABLE_IDS = {')) {
        this.log('error', 'TABLE_IDS object not found in utils/logging.js');
        return false;
      }

      // Validate FIELD_IDS structure
      if (!loggingContent.includes('const FIELD_IDS = {')) {
        this.log('error', 'FIELD_IDS object not found in utils/logging.js');
        return false;
      }

      // Check for expected table IDs
      for (const [tableName, tableConfig] of Object.entries(EXPECTED_SCHEMA.tables)) {
        if (!loggingContent.includes(tableConfig.id)) {
          this.log('error', `Table ID ${tableConfig.id} for ${tableName} not found in logging.js`);
        } else {
          this.log('success', `Table ID verified: ${tableName} (${tableConfig.id})`);
        }
      }

      // Check for field IDs in each table
      for (const [tableName, tableConfig] of Object.entries(EXPECTED_SCHEMA.tables)) {
        for (const [fieldId, fieldConfig] of Object.entries(tableConfig.fields)) {
          if (!loggingContent.includes(fieldId)) {
            this.log('warn', `Field ID ${fieldId} (${fieldConfig.name}) not found in ${tableName} table`);
          } else {
            this.log('success', `Field ID verified: ${tableName}.${fieldConfig.name} (${fieldId})`);
          }
        }
      }

      // Check for hard-coded table IDs in other files
      this.validateHardCodedIds();

      return true;
    } catch (error) {
      this.log('error', 'Failed to read utils/logging.js', error.message);
      return false;
    }
  }

  validateHardCodedIds() {
    this.log('info', 'Checking for hard-coded table IDs...');

    const filesToCheck = [
      'services/memoryService.js',
      'services/personalisationService.js'
    ];

    for (const file of filesToCheck) {
      const filePath = path.join(__dirname, `../${file}`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Check for hard-coded table IDs
        for (const [tableName, tableConfig] of Object.entries(EXPECTED_SCHEMA.tables)) {
          if (content.includes(`'${tableConfig.id}'`) || content.includes(`"${tableConfig.id}"`)) {
            this.log('warn', `Hard-coded table ID found in ${file}`, {
              tableId: tableConfig.id,
              tableName: tableName,
              suggestion: `Use TABLE_IDS.${tableName} instead`
            });
          }
        }
      }
    }
  }

  async validateAirtableAPI() {
    if (!process.env.AIRTABLE_BASE_ID || !process.env.AIRTABLE_API_KEY) {
      this.log('info', 'Skipping Airtable API validation - credentials not provided');
      return true;
    }

    this.log('info', 'Validating against Airtable Meta API...');

    try {
      // Use native fetch (Node.js 18+)
      const baseId = process.env.AIRTABLE_BASE_ID;
      const apiKey = process.env.AIRTABLE_API_KEY;
      
      const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        this.log('error', `Airtable API error: ${response.status} ${response.statusText}`);
        return false;
      }

      const data = await response.json();
      const remoteTables = data.tables;

      // Validate each expected table
      for (const [tableName, expectedTable] of Object.entries(EXPECTED_SCHEMA.tables)) {
        const remoteTable = remoteTables.find(t => t.id === expectedTable.id);
        
        if (!remoteTable) {
          this.log('error', `Table not found in Airtable: ${tableName} (${expectedTable.id})`);
          continue;
        }

        this.log('success', `Table found: ${tableName} (${remoteTable.name})`);

        // Validate fields
        for (const [fieldId, expectedField] of Object.entries(expectedTable.fields)) {
          const remoteField = remoteTable.fields.find(f => f.id === fieldId);
          
          if (!remoteField) {
            this.log('error', `Field not found: ${expectedField.name} (${fieldId}) in table ${tableName}`);
            continue;
          }

          // Check field type compatibility
          if (this.isFieldTypeCompatible(expectedField.type, remoteField.type)) {
            this.log('success', `Field validated: ${tableName}.${expectedField.name} (${remoteField.type})`);
          } else {
            this.log('warn', `Field type mismatch: ${tableName}.${expectedField.name}`, {
              expected: expectedField.type,
              actual: remoteField.type,
              fieldId: fieldId
            });
          }
        }
      }

      return true;
    } catch (error) {
      this.log('error', 'Failed to validate against Airtable API', error.message);
      return false;
    }
  }

  isFieldTypeCompatible(expectedType, actualType) {
    // Map expected types to Airtable field types
    const typeMapping = {
      'singleLineText': ['singleLineText'],
      'multilineText': ['multilineText'],
      'number': ['number'],
      'date': ['date'],
      'checkbox': ['checkbox'],
      'singleSelect': ['singleSelect'],
      'multipleRecordLinks': ['multipleRecordLinks'],
    };

    const compatibleTypes = typeMapping[expectedType] || [expectedType];
    return compatibleTypes.includes(actualType);
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 AIRTABLE SCHEMA VALIDATION REPORT');
    console.log('='.repeat(80));

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Passed: ${this.passed.length}`);
    console.log(`   ⚠️  Warnings: ${this.warnings.length}`);
    console.log(`   ❌ Errors: ${this.errors.length}`);

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning.message}`);
        if (warning.details && CONFIG.verbose) {
          console.log(`      ${JSON.stringify(warning.details, null, 6)}`);
        }
      });
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message}`);
        if (error.details && CONFIG.verbose) {
          console.log(`      ${JSON.stringify(error.details, null, 6)}`);
        }
      });
    }

    console.log(`\n🏁 Validation ${this.errors.length === 0 ? 'PASSED' : 'FAILED'}`);
    
    if (CONFIG.dryRun) {
      console.log(`\n💡 Running in dry-run mode. Set AIRTABLE_BASE_ID and AIRTABLE_API_KEY for live validation.`);
    }

    console.log('='.repeat(80));
  }
}

async function main() {
  console.log('🚀 Starting Airtable Schema Validation');
  console.log(`Mode: ${CONFIG.dryRun ? 'Dry-run' : 'Live validation'}`);
  console.log(`Verbose: ${CONFIG.verbose}`);
  console.log(`Force Airtable validation: ${CONFIG.validateAirtable}`);

  const validator = new AirtableValidator();

  // Always run local validation
  const localValid = validator.validateLocalSchema();

  // Run live validation if credentials are available or forced
  let remoteValid = true;
  if (!CONFIG.dryRun || CONFIG.validateAirtable) {
    remoteValid = await validator.validateAirtableAPI();
  }

  // Generate final report
  validator.generateReport();

  // Exit with appropriate code
  const success = localValid && remoteValid && validator.errors.length === 0;
  process.exit(success ? 0 : 1);
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Airtable Schema Validator

Usage: node scripts/validate_airtable_schema.mjs [options]

Options:
  --verbose                 Show detailed output
  --help, -h               Show this help message

Environment Variables:
  AIRTABLE_BASE_ID         Airtable base ID (required for live validation)
  AIRTABLE_API_KEY         Airtable API key (required for live validation)
  VALIDATE_AIRTABLE=1      Force Airtable validation even without full credentials
  VERBOSE=1                Enable verbose output

Modes:
  Dry-run (default)        Validate local schema consistency only
  Live validation          Validate against actual Airtable base (requires credentials)
`);
  process.exit(0);
}

// Run the validator
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});