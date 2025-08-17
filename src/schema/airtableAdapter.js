/**
 * Airtable Schema Adapter for STRUKT System
 * 
 * This module provides typed access to the canonical Airtable schema
 * defined in schema/AIRTABLE_SPEC.yaml. It replaces hard-coded table
 * and field IDs with a centralized, spec-driven approach.
 * 
 * Key responsibilities:
 * - Load and parse the YAML schema specification
 * - Provide typed getters for tables and fields
 * - Handle deprecations and field mapping
 * - Support shadow write/read operations for safe migrations
 */

const fs = require('fs');
const path = require('path');

// Simple YAML parser for basic key-value structures
function parseYAML(yamlContent) {
  const lines = yamlContent.split('\n');
  const result = {};
  const stack = [result];
  let currentIndent = 0;

  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    
    const indent = line.search(/\S/);
    const content = line.trim();
    
    if (content.includes(':')) {
      const [key, ...valueParts] = content.split(':');
      const value = valueParts.join(':').trim();
      
      // Handle indentation changes
      if (indent < currentIndent) {
        const levelsUp = Math.floor((currentIndent - indent) / 2);
        for (let i = 0; i < levelsUp; i++) {
          stack.pop();
        }
      }
      
      currentIndent = indent;
      const current = stack[stack.length - 1];
      
      if (value === '' || value === '{}') {
        // This is a parent object
        current[key.trim()] = {};
        stack.push(current[key.trim()]);
      } else {
        // This is a leaf value
        let parsedValue = value;
        if (value.startsWith('"') && value.endsWith('"')) {
          parsedValue = value.slice(1, -1);
        } else if (value === 'true') {
          parsedValue = true;
        } else if (value === 'false') {
          parsedValue = false;
        } else if (!isNaN(value) && value !== '') {
          parsedValue = Number(value);
        }
        current[key.trim()] = parsedValue;
      }
    }
  }
  
  return result;
}

class AirtableAdapter {
  constructor() {
    this._spec = null;
    this._shadowWritesEnabled = process.env.ENABLE_AIRTABLE_SHADOW_WRITES !== 'false';
  }

  /**
   * Load the YAML specification from the file system
   */
  _loadSpec() {
    if (this._spec) return this._spec;
    
    const specPath = path.join(__dirname, '../../schema/AIRTABLE_SPEC.yaml');
    if (!fs.existsSync(specPath)) {
      throw new Error(`AIRTABLE_SPEC.yaml not found at ${specPath}`);
    }
    
    const yamlContent = fs.readFileSync(specPath, 'utf-8');
    this._spec = parseYAML(yamlContent);
    return this._spec;
  }

  /**
   * Get schema version information
   */
  getVersion() {
    const spec = this._loadSpec();
    return {
      spec_version: spec.spec_version,
      version: spec.spec_version, // backward compatibility
      updated_at: spec.updated_at,
      owner_repo: spec.owner_repo
    };
  }

  /**
   * Get table configuration by name
   */
  getTable(tableName) {
    const spec = this._loadSpec();
    const table = spec.tables?.[tableName];
    if (!table) {
      throw new Error(`Table '${tableName}' not found in schema specification`);
    }
    return table;
  }

  /**
   * Get table ID by name
   */
  getTableId(tableName) {
    const table = this.getTable(tableName);
    return table.id;
  }

  /**
   * Get field configuration by table and field name
   */
  getField(tableName, fieldName) {
    const table = this.getTable(tableName);
    const field = table.fields?.[fieldName];
    if (!field) {
      throw new Error(`Field '${fieldName}' not found in table '${tableName}'`);
    }
    return field;
  }

  /**
   * Get field ID by table and field name
   */
  getFieldId(tableName, fieldName) {
    const field = this.getField(tableName, fieldName);
    return field.id;
  }

  /**
   * Get all table IDs in the legacy format for backward compatibility
   */
  getLegacyTableIds() {
    const spec = this._loadSpec();
    const tableIds = {};
    
    for (const [tableName, table] of Object.entries(spec.tables || {})) {
      tableIds[tableName] = table.id;
    }
    
    return tableIds;
  }

  /**
   * Get all field IDs in the legacy format for backward compatibility
   */
  getLegacyFieldIds() {
    const spec = this._loadSpec();
    const fieldIds = {};
    
    for (const [tableName, table] of Object.entries(spec.tables || {})) {
      fieldIds[tableName] = {};
      
      for (const [fieldName, field] of Object.entries(table.fields || {})) {
        if (field.id) {
          // Convert camelCase field names to PascalCase for legacy compatibility
          const legacyFieldName = this._toLegacyFieldName(fieldName, field.name);
          fieldIds[tableName][legacyFieldName] = field.id;
        }
      }
    }
    
    return fieldIds;
  }

  /**
   * Convert spec field names to legacy field names used in existing code
   */
  _toLegacyFieldName(specFieldName, actualFieldName) {
    // Map spec field names to existing FIELD_IDS structure
    const mappings = {
      'ai_response': 'AI_Response',
      'email_address': 'Email_Address',
      'supplement_name': 'SupplementName',
      'meal_type': 'MealType',
      'meal_source': 'MealSource',
      'log_type': 'LogType',
      'wake_time': 'WakeTime',
      'went_well': 'WentWell'
    };
    
    // If there's a specific mapping, use it
    if (mappings[specFieldName]) {
      return mappings[specFieldName];
    }
    
    // Otherwise, convert to PascalCase
    return specFieldName.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Check if shadow writes are enabled
   */
  isShadowWriteEnabled() {
    return this._shadowWritesEnabled;
  }

  /**
   * Map outgoing data for shadow writes (canonical -> legacy)
   * Currently a pass-through since no legacy field mappings exist yet
   */
  mapOutgoing(tableName, payload) {
    if (!this.isShadowWriteEnabled()) {
      return payload;
    }
    
    // For now, return the payload as-is since we don't have legacy mappings
    // This will be enhanced when we add actual field deprecations
    return payload;
  }

  /**
   * Map incoming data from legacy format (legacy -> canonical)
   * Currently a pass-through since no legacy field mappings exist yet
   */
  mapIncoming(tableName, record) {
    // For now, return the record as-is since we don't have legacy mappings
    // This will be enhanced when we add actual field deprecations
    return record;
  }

  /**
   * Validate that all tables and fields referenced in code exist in the spec
   */
  validateCodeReferences(expectedTableIds, expectedFieldIds) {
    const errors = [];
    const spec = this._loadSpec();
    
    // Check table IDs
    for (const [tableName, expectedId] of Object.entries(expectedTableIds)) {
      const table = spec.tables?.[tableName];
      if (!table) {
        errors.push(`Table '${tableName}' not found in spec`);
      } else if (table.id !== expectedId) {
        errors.push(`Table '${tableName}' ID mismatch: expected ${expectedId}, got ${table.id}`);
      }
    }
    
    // Check field IDs
    for (const [tableName, fields] of Object.entries(expectedFieldIds)) {
      const table = spec.tables?.[tableName];
      if (!table) continue;
      
      for (const [fieldName, expectedId] of Object.entries(fields)) {
        let found = false;
        for (const [specFieldName, field] of Object.entries(table.fields || {})) {
          const legacyName = this._toLegacyFieldName(specFieldName, field.name);
          if (legacyName === fieldName && field.id === expectedId) {
            found = true;
            break;
          }
        }
        if (!found) {
          errors.push(`Field '${tableName}.${fieldName}' (${expectedId}) not found in spec`);
        }
      }
    }
    
    return errors;
  }
}

// Create singleton instance
const adapter = new AirtableAdapter();

module.exports = {
  AirtableAdapter,
  adapter,
  // Backward compatibility exports
  getTableIds: () => adapter.getLegacyTableIds(),
  getFieldIds: () => adapter.getLegacyFieldIds(),
  getVersion: () => adapter.getVersion()
};