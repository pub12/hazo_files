/**
 * useNamingRule Hook
 * Manages naming rule state with undo/redo support
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  PatternSegment,
  NamingRuleSchema,
  NamingRuleHistoryEntry,
  UseNamingRuleReturn,
} from '../../types/naming';
import {
  generateSegmentId,
  clonePattern,
} from '../../common/naming-utils';

const MAX_HISTORY_SIZE = 50;

export interface UseNamingRuleOptions {
  /** Initial schema to load */
  initialSchema?: NamingRuleSchema;
  /** Callback when patterns change */
  onChange?: (schema: NamingRuleSchema) => void;
}

/**
 * Hook for managing naming rule patterns with undo/redo
 */
export function useNamingRule(options: UseNamingRuleOptions = {}): UseNamingRuleReturn {
  const { initialSchema, onChange } = options;

  // Pattern state
  const [filePattern, setFilePattern] = useState<PatternSegment[]>(
    initialSchema?.filePattern ? clonePattern(initialSchema.filePattern) : []
  );
  const [folderPattern, setFolderPattern] = useState<PatternSegment[]>(
    initialSchema?.folderPattern ? clonePattern(initialSchema.folderPattern) : []
  );

  // History for undo/redo
  const [history, setHistory] = useState<NamingRuleHistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Track initial state for isDirty
  const initialStateRef = useRef<{ filePattern: PatternSegment[]; folderPattern: PatternSegment[] }>({
    filePattern: initialSchema?.filePattern ? clonePattern(initialSchema.filePattern) : [],
    folderPattern: initialSchema?.folderPattern ? clonePattern(initialSchema.folderPattern) : [],
  });

  // Flag to prevent recording history during undo/redo
  const isUndoRedoRef = useRef(false);

  // Record state to history
  const recordHistory = useCallback(() => {
    if (isUndoRedoRef.current) return;

    const entry: NamingRuleHistoryEntry = {
      filePattern: clonePattern(filePattern),
      folderPattern: clonePattern(folderPattern),
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(entry);

      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        return newHistory.slice(-MAX_HISTORY_SIZE);
      }
      return newHistory;
    });

    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
  }, [filePattern, folderPattern, historyIndex]);

  // Notify onChange when patterns change
  useEffect(() => {
    if (onChange) {
      onChange(getSchema());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePattern, folderPattern]);

  // Get current schema
  const getSchema = useCallback((): NamingRuleSchema => {
    return {
      version: 1,
      filePattern: clonePattern(filePattern),
      folderPattern: clonePattern(folderPattern),
      metadata: {
        updatedAt: new Date().toISOString(),
      },
    };
  }, [filePattern, folderPattern]);

  // Load schema
  const loadSchema = useCallback((schema: NamingRuleSchema) => {
    const newFilePattern = schema.filePattern ? clonePattern(schema.filePattern) : [];
    const newFolderPattern = schema.folderPattern ? clonePattern(schema.folderPattern) : [];

    setFilePattern(newFilePattern);
    setFolderPattern(newFolderPattern);

    // Reset history
    setHistory([]);
    setHistoryIndex(-1);

    // Update initial state ref
    initialStateRef.current = {
      filePattern: clonePattern(newFilePattern),
      folderPattern: clonePattern(newFolderPattern),
    };
  }, []);

  // Reset to initial state
  const reset = useCallback(() => {
    setFilePattern(clonePattern(initialStateRef.current.filePattern));
    setFolderPattern(clonePattern(initialStateRef.current.folderPattern));
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex < 0) return;

    isUndoRedoRef.current = true;

    const entry = history[historyIndex];
    if (entry) {
      setFilePattern(clonePattern(entry.filePattern));
      setFolderPattern(clonePattern(entry.folderPattern));
    }

    setHistoryIndex((prev) => prev - 1);

    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    isUndoRedoRef.current = true;

    const entry = history[historyIndex + 1];
    if (entry) {
      setFilePattern(clonePattern(entry.filePattern));
      setFolderPattern(clonePattern(entry.folderPattern));
    }

    setHistoryIndex((prev) => prev + 1);

    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, [history, historyIndex]);

  // File pattern operations
  const addToFilePattern = useCallback(
    (segment: PatternSegment, index?: number) => {
      recordHistory();
      setFilePattern((prev) => {
        const newSegment = { ...segment, id: generateSegmentId() };
        if (index !== undefined && index >= 0 && index <= prev.length) {
          const newPattern = [...prev];
          newPattern.splice(index, 0, newSegment);
          return newPattern;
        }
        return [...prev, newSegment];
      });
    },
    [recordHistory]
  );

  const removeFromFilePattern = useCallback(
    (id: string) => {
      recordHistory();
      setFilePattern((prev) => prev.filter((seg) => seg.id !== id));
    },
    [recordHistory]
  );

  const updateFilePatternSegment = useCallback(
    (id: string, value: string) => {
      recordHistory();
      setFilePattern((prev) =>
        prev.map((seg) => (seg.id === id ? { ...seg, value } : seg))
      );
    },
    [recordHistory]
  );

  const reorderFilePattern = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      recordHistory();
      setFilePattern((prev) => {
        const newPattern = [...prev];
        const [removed] = newPattern.splice(fromIndex, 1);
        newPattern.splice(toIndex, 0, removed);
        return newPattern;
      });
    },
    [recordHistory]
  );

  const clearFilePattern = useCallback(() => {
    recordHistory();
    setFilePattern([]);
  }, [recordHistory]);

  // Folder pattern operations
  const addToFolderPattern = useCallback(
    (segment: PatternSegment, index?: number) => {
      recordHistory();
      setFolderPattern((prev) => {
        const newSegment = { ...segment, id: generateSegmentId() };
        if (index !== undefined && index >= 0 && index <= prev.length) {
          const newPattern = [...prev];
          newPattern.splice(index, 0, newSegment);
          return newPattern;
        }
        return [...prev, newSegment];
      });
    },
    [recordHistory]
  );

  const removeFromFolderPattern = useCallback(
    (id: string) => {
      recordHistory();
      setFolderPattern((prev) => prev.filter((seg) => seg.id !== id));
    },
    [recordHistory]
  );

  const updateFolderPatternSegment = useCallback(
    (id: string, value: string) => {
      recordHistory();
      setFolderPattern((prev) =>
        prev.map((seg) => (seg.id === id ? { ...seg, value } : seg))
      );
    },
    [recordHistory]
  );

  const reorderFolderPattern = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      recordHistory();
      setFolderPattern((prev) => {
        const newPattern = [...prev];
        const [removed] = newPattern.splice(fromIndex, 1);
        newPattern.splice(toIndex, 0, removed);
        return newPattern;
      });
    },
    [recordHistory]
  );

  const clearFolderPattern = useCallback(() => {
    recordHistory();
    setFolderPattern([]);
  }, [recordHistory]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Compute isDirty
  const isDirty =
    JSON.stringify(filePattern) !== JSON.stringify(initialStateRef.current.filePattern) ||
    JSON.stringify(folderPattern) !== JSON.stringify(initialStateRef.current.folderPattern);

  return {
    // State
    filePattern,
    folderPattern,
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
    isDirty,

    // File pattern operations
    addToFilePattern,
    removeFromFilePattern,
    updateFilePatternSegment,
    reorderFilePattern,
    clearFilePattern,

    // Folder pattern operations
    addToFolderPattern,
    removeFromFolderPattern,
    updateFolderPatternSegment,
    reorderFolderPattern,
    clearFolderPattern,

    // History
    undo,
    redo,

    // Schema
    getSchema,
    loadSchema,
    reset,
  };
}
