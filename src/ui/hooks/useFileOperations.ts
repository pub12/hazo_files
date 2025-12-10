/**
 * useFileOperations Hook
 * Provides file operation utilities with loading states and error handling
 */

import { useState, useCallback } from 'react';
import type { OperationResult } from '../../types';

export interface OperationState {
  isLoading: boolean;
  error: string | null;
  lastResult: OperationResult<unknown> | null;
}

export interface UseFileOperationsReturn {
  state: OperationState;
  execute: <T>(operation: () => Promise<OperationResult<T>>) => Promise<OperationResult<T>>;
  reset: () => void;
}

export function useFileOperations(): UseFileOperationsReturn {
  const [state, setState] = useState<OperationState>({
    isLoading: false,
    error: null,
    lastResult: null,
  });

  const execute = useCallback(async <T>(
    operation: () => Promise<OperationResult<T>>
  ): Promise<OperationResult<T>> => {
    setState({ isLoading: true, error: null, lastResult: null });

    try {
      const result = await operation();
      setState({
        isLoading: false,
        error: result.success ? null : result.error || 'Operation failed',
        lastResult: result,
      });
      return result;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown error';
      const result: OperationResult<T> = { success: false, error: errorMessage };
      setState({
        isLoading: false,
        error: errorMessage,
        lastResult: result,
      });
      return result;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, lastResult: null });
  }, []);

  return { state, execute, reset };
}

/**
 * Hook for managing multiple concurrent operations
 */
export interface MultiOperationState {
  activeOperations: Set<string>;
  errors: Map<string, string>;
}

export interface UseMultiFileOperationsReturn {
  state: MultiOperationState;
  isOperating: (id: string) => boolean;
  getError: (id: string) => string | undefined;
  execute: <T>(id: string, operation: () => Promise<OperationResult<T>>) => Promise<OperationResult<T>>;
  clear: (id: string) => void;
  clearAll: () => void;
}

export function useMultiFileOperations(): UseMultiFileOperationsReturn {
  const [state, setState] = useState<MultiOperationState>({
    activeOperations: new Set(),
    errors: new Map(),
  });

  const isOperating = useCallback((id: string) => {
    return state.activeOperations.has(id);
  }, [state.activeOperations]);

  const getError = useCallback((id: string) => {
    return state.errors.get(id);
  }, [state.errors]);

  const execute = useCallback(async <T>(
    id: string,
    operation: () => Promise<OperationResult<T>>
  ): Promise<OperationResult<T>> => {
    setState(prev => {
      const newActive = new Set(prev.activeOperations);
      newActive.add(id);
      const newErrors = new Map(prev.errors);
      newErrors.delete(id);
      return { activeOperations: newActive, errors: newErrors };
    });

    try {
      const result = await operation();

      setState(prev => {
        const newActive = new Set(prev.activeOperations);
        newActive.delete(id);
        const newErrors = new Map(prev.errors);
        if (!result.success && result.error) {
          newErrors.set(id, result.error);
        }
        return { activeOperations: newActive, errors: newErrors };
      });

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown error';

      setState(prev => {
        const newActive = new Set(prev.activeOperations);
        newActive.delete(id);
        const newErrors = new Map(prev.errors);
        newErrors.set(id, errorMessage);
        return { activeOperations: newActive, errors: newErrors };
      });

      return { success: false, error: errorMessage };
    }
  }, []);

  const clear = useCallback((id: string) => {
    setState(prev => {
      const newErrors = new Map(prev.errors);
      newErrors.delete(id);
      return { ...prev, errors: newErrors };
    });
  }, []);

  const clearAll = useCallback(() => {
    setState({ activeOperations: new Set(), errors: new Map() });
  }, []);

  return { state, isOperating, getError, execute, clear, clearAll };
}

export default useFileOperations;
