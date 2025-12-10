/**
 * Naming rule types for hazo_files package
 * Used for configuring and generating file/folder names based on patterns
 */

/** Variable category for grouping in UI */
export type VariableCategory = 'user' | 'date' | 'file' | 'counter';

/** A variable that can be used in naming patterns */
export interface NamingVariable {
  /** Variable name (without braces), e.g., "project_name", "YYYY" */
  variable_name: string;
  /** Human-readable description */
  description: string;
  /** Example value for preview */
  example_value: string;
  /** Category for grouping in UI */
  category?: VariableCategory;
}

/** A segment in a naming pattern */
export interface PatternSegment {
  /** Unique ID for React keys and drag-drop operations */
  id: string;
  /** Type of segment */
  type: 'variable' | 'literal';
  /** Variable name (for type='variable') or literal text (for type='literal') */
  value: string;
}

/** Complete naming rule schema */
export interface NamingRuleSchema {
  /** Schema version for future compatibility */
  version: number;
  /** Pattern segments for file names */
  filePattern: PatternSegment[];
  /** Pattern segments for folder names (can include / for nested paths) */
  folderPattern: PatternSegment[];
  /** Optional metadata */
  metadata?: {
    /** Optional name for the rule */
    name?: string;
    /** Optional description */
    description?: string;
    /** ISO date string when created */
    createdAt?: string;
    /** ISO date string when last updated */
    updatedAt?: string;
  };
}

/** Result of name generation */
export interface GeneratedNameResult {
  /** Whether generation was successful */
  success: boolean;
  /** Generated name (if successful) */
  name?: string;
  /** Error message (if failed) */
  error?: string;
}

/** Options for name generation functions */
export interface NameGenerationOptions {
  /** Custom date formats to use (overrides defaults) */
  dateFormats?: string[];
  /** Date to use for date variables (defaults to current date) */
  date?: Date;
  /** Whether to preserve original file extension (default: true) */
  preserveExtension?: boolean;
  /** Counter value for {counter} variable */
  counterValue?: number;
  /** Number of digits for counter padding (default: 3) */
  counterDigits?: number;
}

/** History entry for undo/redo in the configurator */
export interface NamingRuleHistoryEntry {
  /** File pattern at this point */
  filePattern: PatternSegment[];
  /** Folder pattern at this point */
  folderPattern: PatternSegment[];
  /** Timestamp of the change */
  timestamp: number;
}

/** Props for the NamingRuleConfigurator component */
export interface NamingRuleConfiguratorProps {
  /** User-defined variables to include */
  variables: NamingVariable[];

  /** Initial schema to load (for editing existing rules) */
  initialSchema?: NamingRuleSchema;

  /** Callback when schema changes */
  onChange?: (schema: NamingRuleSchema) => void;

  /** Callback when user exports the schema */
  onExport?: (schema: NamingRuleSchema) => void;

  /** Callback when user imports a schema */
  onImport?: (schema: NamingRuleSchema) => void;

  /** Additional CSS class name */
  className?: string;

  /** Custom date formats (overrides config defaults) */
  customDateFormats?: string[];

  /** Read-only mode - disables editing */
  readOnly?: boolean;

  /** Original file name for preview (to show extension preservation) */
  sampleFileName?: string;
}

/** State returned by useNamingRule hook */
export interface UseNamingRuleState {
  /** Current file pattern */
  filePattern: PatternSegment[];
  /** Current folder pattern */
  folderPattern: PatternSegment[];
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Whether patterns have been modified from initial state */
  isDirty: boolean;
}

/** Actions returned by useNamingRule hook */
export interface UseNamingRuleActions {
  // File pattern operations
  addToFilePattern: (segment: PatternSegment, index?: number) => void;
  removeFromFilePattern: (id: string) => void;
  updateFilePatternSegment: (id: string, value: string) => void;
  reorderFilePattern: (fromIndex: number, toIndex: number) => void;
  clearFilePattern: () => void;

  // Folder pattern operations
  addToFolderPattern: (segment: PatternSegment, index?: number) => void;
  removeFromFolderPattern: (id: string) => void;
  updateFolderPatternSegment: (id: string, value: string) => void;
  reorderFolderPattern: (fromIndex: number, toIndex: number) => void;
  clearFolderPattern: () => void;

  // History operations
  undo: () => void;
  redo: () => void;

  // Schema operations
  getSchema: () => NamingRuleSchema;
  loadSchema: (schema: NamingRuleSchema) => void;
  reset: () => void;
}

/** Return type of useNamingRule hook */
export interface UseNamingRuleReturn extends UseNamingRuleState, UseNamingRuleActions {}
