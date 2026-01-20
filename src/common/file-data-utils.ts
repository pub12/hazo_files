/**
 * File Data Utilities
 * Functions for managing extraction data within the file_data JSON field
 */

import type {
  ExtractionData,
  FileDataStructure,
  AddExtractionOptions,
  RemoveExtractionOptions,
  OperationResult,
} from '../types';

/**
 * Generate a unique ID for extractions
 */
export function generateExtractionId(): string {
  return `ext_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create an empty FileDataStructure
 */
export function createEmptyFileDataStructure(): FileDataStructure {
  return {
    merged_data: {},
    raw_data: [],
  };
}

/**
 * Check if an object has the new extraction structure
 */
export function hasExtractionStructure(obj: unknown): obj is FileDataStructure {
  if (!obj || typeof obj !== 'object') return false;
  const data = obj as Record<string, unknown>;
  return (
    'merged_data' in data &&
    'raw_data' in data &&
    typeof data.merged_data === 'object' &&
    Array.isArray(data.raw_data)
  );
}

/**
 * Type guard for ExtractionData
 */
export function validateExtractionData(data: unknown): data is ExtractionData {
  if (!data || typeof data !== 'object') return false;
  const extraction = data as Record<string, unknown>;
  return (
    typeof extraction.id === 'string' &&
    typeof extraction.extracted_at === 'string' &&
    typeof extraction.data === 'object' &&
    extraction.data !== null
  );
}

/**
 * Type guard for FileDataStructure
 */
export function validateFileDataStructure(data: unknown): data is FileDataStructure {
  if (!hasExtractionStructure(data)) return false;
  return data.raw_data.every(validateExtractionData);
}

/**
 * Deep merge two objects
 * Arrays are concatenated, objects are recursively merged
 */
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      // Concatenate arrays
      result[key] = [...targetValue, ...sourceValue];
    } else if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge objects
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      );
    } else {
      // Overwrite primitive values
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Parse a JSON string or object into FileDataStructure
 * Handles migration from old format (plain object) to new format
 */
export function parseFileData(json: string | Record<string, unknown> | null | undefined): FileDataStructure {
  if (!json) {
    return createEmptyFileDataStructure();
  }

  let parsed: unknown;
  if (typeof json === 'string') {
    try {
      parsed = JSON.parse(json);
    } catch {
      return createEmptyFileDataStructure();
    }
  } else {
    parsed = json;
  }

  // Check if already in new format
  if (hasExtractionStructure(parsed)) {
    return parsed;
  }

  // Migrate old format: move existing data to merged_data
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return {
      merged_data: parsed as Record<string, unknown>,
      raw_data: [],
    };
  }

  return createEmptyFileDataStructure();
}

/**
 * Serialize FileDataStructure to JSON string
 */
export function stringifyFileData(data: FileDataStructure): string {
  return JSON.stringify(data);
}

/**
 * Recalculate merged_data from raw_data array
 */
export function recalculateMergedData(
  rawData: ExtractionData[],
  strategy: 'shallow' | 'deep' = 'shallow'
): Record<string, unknown> {
  if (rawData.length === 0) {
    return {};
  }

  if (strategy === 'deep') {
    return rawData.reduce(
      (acc, extraction) => deepMerge(acc, extraction.data),
      {} as Record<string, unknown>
    );
  }

  // Shallow merge
  return rawData.reduce(
    (acc, extraction) => ({ ...acc, ...extraction.data }),
    {} as Record<string, unknown>
  );
}

/**
 * Add an extraction to FileDataStructure (immutable)
 * Returns a new FileDataStructure with the extraction added
 */
export function addExtractionToFileData(
  fileData: FileDataStructure,
  data: Record<string, unknown>,
  options: AddExtractionOptions = {}
): OperationResult<FileDataStructure> {
  const { id = generateExtractionId(), source, mergeStrategy = 'shallow' } = options;

  const newExtraction: ExtractionData = {
    id,
    extracted_at: new Date().toISOString(),
    data,
    ...(source && { source }),
  };

  const newRawData = [...fileData.raw_data, newExtraction];
  const newMergedData =
    mergeStrategy === 'deep'
      ? deepMerge(fileData.merged_data, data)
      : { ...fileData.merged_data, ...data };

  return {
    success: true,
    data: {
      merged_data: newMergedData,
      raw_data: newRawData,
    },
  };
}

/**
 * Remove an extraction by ID (immutable)
 * Returns a new FileDataStructure with the extraction removed
 */
export function removeExtractionById(
  fileData: FileDataStructure,
  id: string,
  options: RemoveExtractionOptions = {}
): OperationResult<FileDataStructure> {
  const { recalculateMerged = true, mergeStrategy = 'shallow' } = options;

  const index = fileData.raw_data.findIndex((e) => e.id === id);
  if (index === -1) {
    return {
      success: false,
      error: `Extraction with id "${id}" not found`,
    };
  }

  const newRawData = [...fileData.raw_data.slice(0, index), ...fileData.raw_data.slice(index + 1)];

  const newMergedData = recalculateMerged
    ? recalculateMergedData(newRawData, mergeStrategy)
    : fileData.merged_data;

  return {
    success: true,
    data: {
      merged_data: newMergedData,
      raw_data: newRawData,
    },
  };
}

/**
 * Remove an extraction by index (immutable)
 * Returns a new FileDataStructure with the extraction removed
 */
export function removeExtractionByIndex(
  fileData: FileDataStructure,
  index: number,
  options: RemoveExtractionOptions = {}
): OperationResult<FileDataStructure> {
  const { recalculateMerged = true, mergeStrategy = 'shallow' } = options;

  if (index < 0 || index >= fileData.raw_data.length) {
    return {
      success: false,
      error: `Index ${index} out of bounds (0-${fileData.raw_data.length - 1})`,
    };
  }

  const newRawData = [...fileData.raw_data.slice(0, index), ...fileData.raw_data.slice(index + 1)];

  const newMergedData = recalculateMerged
    ? recalculateMergedData(newRawData, mergeStrategy)
    : fileData.merged_data;

  return {
    success: true,
    data: {
      merged_data: newMergedData,
      raw_data: newRawData,
    },
  };
}

/**
 * Get a copy of the merged_data
 */
export function getMergedData(fileData: FileDataStructure): Record<string, unknown> {
  return { ...fileData.merged_data };
}

/**
 * Get a copy of all extractions
 */
export function getExtractions(fileData: FileDataStructure): ExtractionData[] {
  return [...fileData.raw_data];
}

/**
 * Get a specific extraction by ID
 */
export function getExtractionById(
  fileData: FileDataStructure,
  id: string
): ExtractionData | null {
  const extraction = fileData.raw_data.find((e) => e.id === id);
  return extraction ? { ...extraction, data: { ...extraction.data } } : null;
}

/**
 * Get the number of extractions
 */
export function getExtractionCount(fileData: FileDataStructure): number {
  return fileData.raw_data.length;
}

/**
 * Clear all extractions (immutable)
 * Returns a new empty FileDataStructure
 */
export function clearExtractions(): FileDataStructure {
  return createEmptyFileDataStructure();
}

/**
 * Update an extraction's data by ID (immutable)
 * Returns a new FileDataStructure with the extraction updated
 */
export function updateExtractionById(
  fileData: FileDataStructure,
  id: string,
  newData: Record<string, unknown>,
  options: { recalculateMerged?: boolean; mergeStrategy?: 'shallow' | 'deep' } = {}
): OperationResult<FileDataStructure> {
  const { recalculateMerged = true, mergeStrategy = 'shallow' } = options;

  const index = fileData.raw_data.findIndex((e) => e.id === id);
  if (index === -1) {
    return {
      success: false,
      error: `Extraction with id "${id}" not found`,
    };
  }

  const updatedExtraction: ExtractionData = {
    ...fileData.raw_data[index],
    data: newData,
    extracted_at: new Date().toISOString(),
  };

  const newRawData = [
    ...fileData.raw_data.slice(0, index),
    updatedExtraction,
    ...fileData.raw_data.slice(index + 1),
  ];

  const newMergedData = recalculateMerged
    ? recalculateMergedData(newRawData, mergeStrategy)
    : fileData.merged_data;

  return {
    success: true,
    data: {
      merged_data: newMergedData,
      raw_data: newRawData,
    },
  };
}
