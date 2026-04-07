/**
 * Frontend - useAsync hook for handling async operations with loading states
 * Usage:
 *   const { execute, status, value, error } = useAsync(fetchData, false);
 */

import { useState, useCallback } from 'react';

export function useAsync(asyncFunction, immediate = true) {
  const [status, setStatus] = useState('idle');
  const [value, setValue] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setStatus('pending');
    setValue(null);
    setError(null);

    try {
      const response = await asyncFunction(...args);
      setValue(response);
      setStatus('success');
      return response;
    } catch (error) {
      setError(error);
      setStatus('error');
      throw error;
    }
  }, [asyncFunction]);

  // Execute immediately on mount if requested
  React.useEffect(() => {
    if (immediate) {
      execute().catch(() => {}); // Ignore errors during immediate execution
    }
  }, [execute, immediate]);

  return { execute, status, value, error };
}

/**
 * Async boundary component for handling loading/error states
 */
export function AsyncBoundary({ status, error, children }) {
  if (status === 'pending') {
    return (
      <div className="async-pending">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="async-error">
        <span>⚠️ Error: {error?.message || 'Unknown error'}</span>
      </div>
    );
  }

  if (status === 'success') {
    return children;
  }

  return null;
}

/**
 * Hook for loading state with auto-dismiss
 */
export function useLoadingState(initialState = false, autoHideDuration = 0) {
  const [isLoading, setIsLoading] = useState(initialState);

  const show = useCallback(() => {
    setIsLoading(true);
    if (autoHideDuration > 0) {
      setTimeout(() => setIsLoading(false), autoHideDuration);
    }
  }, [autoHideDuration]);

  const hide = useCallback(() => setIsLoading(false), []);

  return { isLoading, show, hide };
}
