import React from 'react';
import './ErrorBoundary.css';

/**
 * Error Boundary Component
 * 
 * Catches React errors in child components and displays a fallback UI
 * instead of crashing the entire app.
 * 
 * Features:
 * - Catches render errors, lifecycle errors, and constructor errors
 * - Displays user-friendly error message
 * - Shows error details in development mode
 * - Provides "Try Again" button to reset
 * - Logs errors to console for debugging
 * 
 * @example
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * 
 * @example
 * // Custom fallback
 * <ErrorBoundary
 *   fallback={<div>Custom error UI</div>}
 *   onError={(error, errorInfo) => sendToAnalytics(error)}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);

    // Store error details in state
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error callback
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (err) {
        console.error('Error in onError callback:', err);
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call optional reset callback
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (err) {
        console.error('Error in onReset callback:', err);
      }
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h2 className="error-boundary-title">Something went wrong</h2>
            <p className="error-boundary-message">
              {this.props.message || 'An unexpected error occurred. Please try refreshing the page.'}
            </p>

            {/* Show error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary-details">
                <summary>Error Details (Development Mode)</summary>
                <div className="error-boundary-details-content">
                  <p className="error-boundary-error-message">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="error-boundary-stack">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="error-boundary-actions">
              <button
                className="error-boundary-retry-btn"
                onClick={this.handleReset}
              >
                Try Again
              </button>
              <button
                className="error-boundary-reload-btn"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    // No error, render children
    return this.props.children;
  }
}

export default ErrorBoundary;
