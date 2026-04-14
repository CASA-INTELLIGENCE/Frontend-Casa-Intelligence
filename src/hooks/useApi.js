import { useState, useCallback, useRef, useEffect } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Custom hook for API calls with loading states, retry logic, timeout, and cancellation
 * 
 * Features:
 * - Loading/Error/Data states
 * - Automatic retry with configurable attempts
 * - Request timeout
 * - Request cancellation (AbortController)
 * - Auto-execute on mount (optional)
 * 
 * @param {string} endpoint - API endpoint (e.g., '/api/insights', '/api/tv/status')
 * @param {Object} options - Configuration options
 * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE) - default: 'GET'
 * @param {number} options.timeout - Request timeout in ms - default: 10000 (10s)
 * @param {number} options.retryAttempts - Number of retry attempts - default: 2
 * @param {number} options.retryDelay - Delay between retries in ms - default: 1000
 * @param {boolean} options.autoExecute - Execute on mount - default: false
 * @param {Function} options.onSuccess - Callback on success - optional
 * @param {Function} options.onError - Callback on error - optional
 * 
 * @returns {Object} API state and controls
 * @returns {*} data - Response data (null if not loaded)
 * @returns {boolean} loading - Loading state
 * @returns {string|null} error - Error message (null if no error)
 * @returns {number} attempt - Current retry attempt number
 * @returns {Function} execute - Function to trigger API call
 * @returns {Function} retry - Function to retry last failed request
 * @returns {Function} cancel - Function to cancel ongoing request
 * @returns {Function} reset - Function to reset state
 * 
 * @example
 * // Basic usage (manual trigger)
 * const { data, loading, error, execute } = useApi('/api/insights');
 * 
 * const handleClick = async () => {
 *   const result = await execute();
 *   if (result.success) {
 *     console.log('Data:', result.data);
 *   }
 * };
 * 
 * @example
 * // Auto-execute on mount
 * const { data, loading, error } = useApi('/api/tv/status', {
 *   autoExecute: true,
 *   retryAttempts: 3,
 * });
 * 
 * @example
 * // POST with body
 * const { loading, execute } = useApi('/api/tv/power', { method: 'POST' });
 * 
 * const turnOn = () => execute({ action: 'on' });
 */
export function useApi(endpoint, options = {}) {
  const {
    method = 'GET',
    timeout = 10000,
    retryAttempts = 2,
    retryDelay = 1000,
    autoExecute = false,
    onSuccess = null,
    onError = null,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const abortControllerRef = useRef(null);
  const timeoutRef = useRef(null);
  const lastRequestRef = useRef(null); // Store last request params for retry

  // Cancel ongoing request
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setLoading(false);
  }, []);

  // Execute API call
  const execute = useCallback(async (bodyOrParams = null) => {
    // Cancel any pending request
    cancel();

    // Store params for retry
    lastRequestRef.current = bodyOrParams;

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let currentAttempt = 0;

    while (currentAttempt <= retryAttempts) {
      try {
        setAttempt(currentAttempt);

        const fetchOptions = {
          method,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
        };

        let url = `${BASE_URL}${endpoint}`;

        if (method === 'GET' && bodyOrParams) {
          // Append query params for GET
          const params = new URLSearchParams(bodyOrParams);
          url += `?${params.toString()}`;
        } else if (bodyOrParams) {
          // Add body for POST/PUT/PATCH/DELETE
          fetchOptions.body = JSON.stringify(bodyOrParams);
        }

        // Start timeout timer
        const timeoutPromise = new Promise((_, reject) => {
          timeoutRef.current = setTimeout(() => {
            controller.abort();
            reject(new Error(`Request timeout after ${timeout}ms`));
          }, timeout);
        });

        // Race between fetch and timeout
        const fetchPromise = fetch(url, fetchOptions);
        const response = await Promise.race([fetchPromise, timeoutPromise]);

        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Check HTTP status
        if (!response.ok) {
          let errorText = response.statusText;
          try {
            const errorJson = await response.json();
            errorText = errorJson.detail || errorJson.message || errorText;
          } catch {
            // Couldn't parse JSON, use status text
            try {
              errorText = await response.text();
            } catch {
              // Couldn't get text either
            }
          }
          
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Parse JSON response
        const result = await response.json();

        setData(result);
        setLoading(false);
        setError(null);
        setAttempt(0);

        // Success callback
        if (onSuccess) {
          try {
            onSuccess(result);
          } catch (err) {
            console.error('onSuccess callback error:', err);
          }
        }

        return { success: true, data: result };

      } catch (err) {
        // Don't retry if aborted
        if (err.name === 'AbortError') {
          setLoading(false);
          return { success: false, cancelled: true };
        }

        currentAttempt++;

        // Last attempt failed
        if (currentAttempt > retryAttempts) {
          const errorMessage = err.message || 'Request failed';
          setError(errorMessage);
          setLoading(false);
          setAttempt(0);

          console.error(`❌ API ${method} ${endpoint} failed:`, errorMessage);

          // Error callback
          if (onError) {
            try {
              onError(errorMessage, err);
            } catch (callbackErr) {
              console.error('onError callback error:', callbackErr);
            }
          }

          return { success: false, error: errorMessage };
        }

        // Wait before retry
        console.warn(
          `⚠️  API ${method} ${endpoint} attempt ${currentAttempt}/${retryAttempts + 1} failed: ${err.message}. ` +
          `Retrying in ${retryDelay}ms...`
        );
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    // Shouldn't reach here, but just in case
    return { success: false, error: 'Unknown error' };
  }, [endpoint, method, timeout, retryAttempts, retryDelay, cancel, onSuccess, onError]);

  // Retry last failed request
  const retry = useCallback(() => {
    if (lastRequestRef.current !== undefined) {
      return execute(lastRequestRef.current);
    }
    return execute();
  }, [execute]);

  // Reset state
  const reset = useCallback(() => {
    cancel();
    setData(null);
    setError(null);
    setAttempt(0);
    lastRequestRef.current = null;
  }, [cancel]);

  // Auto-execute on mount
  useEffect(() => {
    if (autoExecute) {
      execute();
    }

    // Cleanup on unmount
    return () => {
      cancel();
    };
  }, [autoExecute]); // Only run on mount, not when execute changes

  return {
    data,
    loading,
    error,
    attempt,
    execute,
    retry,
    cancel,
    reset,
  };
}
