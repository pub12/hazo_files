/**
 * Naming utilities for hazo_files package
 * Functions for generating file/folder names from naming rule schemas
 */

import type {
  NamingRuleSchema,
  PatternSegment,
  GeneratedNameResult,
  NamingVariable,
  NameGenerationOptions,
} from '../types/naming';
import { getExtension, getNameWithoutExtension, sanitizeFilename } from './path-utils';

/** Default date formats supported by the system */
export const DEFAULT_DATE_FORMATS = [
  'YYYY',
  'YY',
  'MM',
  'M',
  'DD',
  'D',
  'MMM',
  'MMMM',
  'YYYY-MM-DD',
  'YYYY-MMM-DD',
  'DD-MM-YYYY',
  'MM-DD-YYYY',
] as const;

/** Month names for formatting */
const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** System date variables with descriptions */
export const SYSTEM_DATE_VARIABLES: NamingVariable[] = [
  { variable_name: 'YYYY', description: 'Full year (4 digits)', example_value: '2024', category: 'date' },
  { variable_name: 'YY', description: 'Year (2 digits)', example_value: '24', category: 'date' },
  { variable_name: 'MM', description: 'Month (2 digits, 01-12)', example_value: '01', category: 'date' },
  { variable_name: 'M', description: 'Month (1-12)', example_value: '1', category: 'date' },
  { variable_name: 'DD', description: 'Day (2 digits, 01-31)', example_value: '15', category: 'date' },
  { variable_name: 'D', description: 'Day (1-31)', example_value: '15', category: 'date' },
  { variable_name: 'MMM', description: 'Short month name', example_value: 'Jan', category: 'date' },
  { variable_name: 'MMMM', description: 'Full month name', example_value: 'January', category: 'date' },
  { variable_name: 'YYYY-MM-DD', description: 'ISO date format', example_value: '2024-01-15', category: 'date' },
  { variable_name: 'YYYY-MMM-DD', description: 'Date with month name', example_value: '2024-Jan-15', category: 'date' },
  { variable_name: 'DD-MM-YYYY', description: 'Day-Month-Year', example_value: '15-01-2024', category: 'date' },
  { variable_name: 'MM-DD-YYYY', description: 'Month-Day-Year', example_value: '01-15-2024', category: 'date' },
];

/** System file metadata variables */
export const SYSTEM_FILE_VARIABLES: NamingVariable[] = [
  { variable_name: 'original_name', description: 'Original filename without extension', example_value: 'document', category: 'file' },
  { variable_name: 'extension', description: 'Original file extension with dot', example_value: '.pdf', category: 'file' },
  { variable_name: 'ext', description: 'Extension without dot', example_value: 'pdf', category: 'file' },
];

/** System counter variables */
export const SYSTEM_COUNTER_VARIABLES: NamingVariable[] = [
  { variable_name: 'counter', description: 'Auto-incrementing number (3 digits)', example_value: '001', category: 'counter' },
];

/** All system variables combined */
export const ALL_SYSTEM_VARIABLES: NamingVariable[] = [
  ...SYSTEM_DATE_VARIABLES,
  ...SYSTEM_FILE_VARIABLES,
  ...SYSTEM_COUNTER_VARIABLES,
];

/**
 * Format a date according to the format token
 */
export function formatDateToken(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  switch (format) {
    case 'YYYY':
      return String(year);
    case 'YY':
      return String(year).slice(-2);
    case 'MM':
      return String(month + 1).padStart(2, '0');
    case 'M':
      return String(month + 1);
    case 'DD':
      return String(day).padStart(2, '0');
    case 'D':
      return String(day);
    case 'MMM':
      return MONTH_NAMES_SHORT[month];
    case 'MMMM':
      return MONTH_NAMES_FULL[month];
    case 'YYYY-MM-DD':
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    case 'YYYY-MMM-DD':
      return `${year}-${MONTH_NAMES_SHORT[month]}-${String(day).padStart(2, '0')}`;
    case 'DD-MM-YYYY':
      return `${String(day).padStart(2, '0')}-${String(month + 1).padStart(2, '0')}-${year}`;
    case 'MM-DD-YYYY':
      return `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`;
    default:
      return format;
  }
}

/**
 * Check if a variable name is a date format
 */
export function isDateVariable(
  variableName: string,
  dateFormats: readonly string[] = DEFAULT_DATE_FORMATS
): boolean {
  return dateFormats.includes(variableName);
}

/**
 * Check if a variable name is a file metadata variable
 */
export function isFileMetadataVariable(variableName: string): boolean {
  return ['original_name', 'extension', 'ext'].includes(variableName);
}

/**
 * Check if a variable name is the counter variable
 */
export function isCounterVariable(variableName: string): boolean {
  return variableName === 'counter' || variableName.startsWith('counter:');
}

/**
 * Format counter value with padding
 */
export function formatCounter(value: number, digits: number = 3): string {
  return String(value).padStart(digits, '0');
}

/**
 * Get file metadata values from a filename
 */
export function getFileMetadataValues(filename?: string): Record<string, string> {
  if (!filename) {
    return {
      original_name: '',
      extension: '',
      ext: '',
    };
  }

  const extension = getExtension(filename);
  const originalName = getNameWithoutExtension(filename);

  return {
    original_name: originalName,
    extension: extension,
    ext: extension.startsWith('.') ? extension.slice(1) : extension,
  };
}

/**
 * Generate a name from a pattern and variable values
 * Internal function used by both file and folder name generators
 */
function generateNameFromPattern(
  pattern: PatternSegment[],
  variables: Record<string, string>,
  options: NameGenerationOptions = {},
  originalFileName?: string
): GeneratedNameResult {
  if (pattern.length === 0) {
    return { success: false, error: 'Pattern is empty' };
  }

  const {
    dateFormats = DEFAULT_DATE_FORMATS,
    date = new Date(),
    counterValue = 1,
    counterDigits = 3,
  } = options;

  // Get file metadata if original filename is provided
  const fileMetadata = getFileMetadataValues(originalFileName);

  const parts: string[] = [];

  for (const segment of pattern) {
    if (segment.type === 'literal') {
      parts.push(segment.value);
    } else if (segment.type === 'variable') {
      const varName = segment.value;

      // Check if it's a date variable
      if (isDateVariable(varName, dateFormats)) {
        parts.push(formatDateToken(date, varName));
      }
      // Check if it's a file metadata variable
      else if (isFileMetadataVariable(varName)) {
        parts.push(fileMetadata[varName] || '');
      }
      // Check if it's a counter variable
      else if (isCounterVariable(varName)) {
        // Support counter:N format for custom digit count
        if (varName.startsWith('counter:')) {
          const customDigits = parseInt(varName.split(':')[1], 10);
          parts.push(formatCounter(counterValue, isNaN(customDigits) ? counterDigits : customDigits));
        } else {
          parts.push(formatCounter(counterValue, counterDigits));
        }
      }
      // Check user-provided variables
      else if (varName in variables) {
        parts.push(variables[varName]);
      }
      // Missing variable
      else {
        return {
          success: false,
          error: `Missing value for variable: ${varName}`,
        };
      }
    }
  }

  const name = parts.join('');

  if (!name.trim()) {
    return { success: false, error: 'Generated name is empty' };
  }

  return { success: true, name };
}

/**
 * Generate a folder name using the schema and variable values
 * Supports nested paths with / separators in the pattern
 */
export function hazo_files_generate_folder_name(
  schema: NamingRuleSchema,
  variables: Record<string, string>,
  options?: NameGenerationOptions
): GeneratedNameResult {
  const result = generateNameFromPattern(
    schema.folderPattern,
    variables,
    options
  );

  if (!result.success || !result.name) {
    return result;
  }

  // Sanitize each path segment for nested paths
  const segments = result.name.split('/');
  const sanitizedSegments = segments
    .map(seg => seg.trim())
    .filter(seg => seg.length > 0)
    .map(seg => sanitizeFilename(seg));

  if (sanitizedSegments.length === 0) {
    return { success: false, error: 'Generated folder name is empty' };
  }

  return {
    success: true,
    name: sanitizedSegments.join('/'),
  };
}

/**
 * Generate a file name using the schema and variable values
 * Optionally preserves the original file extension
 */
export function hazo_files_generate_file_name(
  schema: NamingRuleSchema,
  variables: Record<string, string>,
  originalFileName?: string,
  options?: NameGenerationOptions
): GeneratedNameResult {
  const { preserveExtension = true, ...restOptions } = options || {};

  const result = generateNameFromPattern(
    schema.filePattern,
    variables,
    restOptions,
    originalFileName
  );

  if (!result.success || !result.name) {
    return result;
  }

  let finalName = result.name;

  // Handle extension preservation
  if (originalFileName && preserveExtension) {
    const originalExtension = getExtension(originalFileName);
    if (originalExtension) {
      // Remove any extension from generated name
      const nameWithoutExt = getNameWithoutExtension(finalName);
      finalName = nameWithoutExt + originalExtension;
    }
  }

  return {
    success: true,
    name: sanitizeFilename(finalName),
  };
}

/**
 * Validate a naming rule schema
 */
export function validateNamingRuleSchema(schema: unknown): schema is NamingRuleSchema {
  if (!schema || typeof schema !== 'object') return false;

  const s = schema as Record<string, unknown>;

  if (typeof s.version !== 'number') return false;
  if (!Array.isArray(s.filePattern) || !Array.isArray(s.folderPattern)) return false;

  const isValidSegment = (seg: unknown): seg is PatternSegment => {
    if (!seg || typeof seg !== 'object') return false;
    const segment = seg as Record<string, unknown>;
    return (
      typeof segment.id === 'string' &&
      (segment.type === 'variable' || segment.type === 'literal') &&
      typeof segment.value === 'string'
    );
  };

  return (
    s.filePattern.every(isValidSegment) &&
    s.folderPattern.every(isValidSegment)
  );
}

/**
 * Create an empty naming rule schema
 */
export function createEmptyNamingRuleSchema(): NamingRuleSchema {
  return {
    version: 1,
    filePattern: [],
    folderPattern: [],
    metadata: {
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate a unique ID for pattern segments
 */
export function generateSegmentId(): string {
  return `seg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a variable segment
 */
export function createVariableSegment(variableName: string): PatternSegment {
  return {
    id: generateSegmentId(),
    type: 'variable',
    value: variableName,
  };
}

/**
 * Create a literal segment
 */
export function createLiteralSegment(text: string): PatternSegment {
  return {
    id: generateSegmentId(),
    type: 'literal',
    value: text,
  };
}

/**
 * Convert pattern to human-readable string representation
 */
export function patternToString(pattern: PatternSegment[]): string {
  return pattern
    .map((seg) => (seg.type === 'variable' ? `{${seg.value}}` : seg.value))
    .join('');
}

/**
 * Parse a pattern string to segments
 * Handles {variable} syntax for variables, everything else is literal
 */
export function parsePatternString(patternStr: string): PatternSegment[] {
  const segments: PatternSegment[] = [];
  const regex = /\{([^}]+)\}|([^{]+)/g;
  let match;

  while ((match = regex.exec(patternStr)) !== null) {
    if (match[1]) {
      // Variable (inside braces)
      segments.push(createVariableSegment(match[1]));
    } else if (match[2]) {
      // Literal text
      segments.push(createLiteralSegment(match[2]));
    }
  }

  return segments;
}

/**
 * Clone a pattern with new segment IDs
 */
export function clonePattern(pattern: PatternSegment[]): PatternSegment[] {
  return pattern.map((seg) => ({
    ...seg,
    id: generateSegmentId(),
  }));
}

/**
 * Get preview values for all system variables
 * Uses the current date and provided options
 */
export function getSystemVariablePreviewValues(
  date: Date = new Date(),
  options: { counterValue?: number; counterDigits?: number; originalFileName?: string } = {}
): Record<string, string> {
  const { counterValue = 1, counterDigits = 3, originalFileName } = options;
  const fileMetadata = getFileMetadataValues(originalFileName);

  const values: Record<string, string> = {};

  // Date variables
  for (const format of DEFAULT_DATE_FORMATS) {
    values[format] = formatDateToken(date, format);
  }

  // File metadata variables
  values.original_name = fileMetadata.original_name || 'document';
  values.extension = fileMetadata.extension || '.pdf';
  values.ext = fileMetadata.ext || 'pdf';

  // Counter
  values.counter = formatCounter(counterValue, counterDigits);

  return values;
}

/**
 * Generate a preview name from a pattern using example values
 */
export function generatePreviewName(
  pattern: PatternSegment[],
  userVariables: NamingVariable[],
  options: {
    date?: Date;
    counterValue?: number;
    counterDigits?: number;
    originalFileName?: string;
  } = {}
): string {
  if (pattern.length === 0) {
    return '(empty pattern)';
  }

  const systemValues = getSystemVariablePreviewValues(
    options.date,
    options
  );

  // Build user variable example values
  const userValues: Record<string, string> = {};
  for (const variable of userVariables) {
    userValues[variable.variable_name] = variable.example_value;
  }

  // Combine all values
  const allValues = { ...userValues, ...systemValues };

  const parts: string[] = [];

  for (const segment of pattern) {
    if (segment.type === 'literal') {
      parts.push(segment.value);
    } else if (segment.type === 'variable') {
      const value = allValues[segment.value];
      if (value !== undefined) {
        parts.push(value);
      } else {
        parts.push(`{${segment.value}}`);
      }
    }
  }

  return parts.join('') || '(empty)';
}
