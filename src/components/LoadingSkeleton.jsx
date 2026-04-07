import React from 'react';
import './LoadingSkeleton.css';

/**
 * Loading Skeleton Component
 * 
 * Displays animated placeholder skeletons while content is loading.
 * Provides better perceived performance than spinners.
 * 
 * @param {Object} props
 * @param {'text'|'title'|'avatar'|'card'|'list'|'table'} props.type - Skeleton type
 * @param {number} props.count - Number of skeleton items (for list/table) - default: 3
 * @param {number} props.width - Width in pixels or percentage
 * @param {number} props.height - Height in pixels
 * @param {boolean} props.circle - Render as circle (for avatars)
 * @param {string} props.className - Additional CSS classes
 * 
 * @example
 * // Single text line
 * <LoadingSkeleton type="text" />
 * 
 * @example
 * // Title + text
 * <LoadingSkeleton type="title" />
 * <LoadingSkeleton type="text" count={3} />
 * 
 * @example
 * // Card skeleton
 * <LoadingSkeleton type="card" />
 * 
 * @example
 * // Custom dimensions
 * <LoadingSkeleton width={200} height={100} />
 */
export function LoadingSkeleton({
  type = 'text',
  count = 1,
  width,
  height,
  circle = false,
  className = '',
}) {
  // Render based on type
  const renderSkeleton = () => {
    switch (type) {
      case 'title':
        return (
          <div className={`skeleton skeleton-title ${className}`} style={{ width, height }} />
        );
      
      case 'text':
        return Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`skeleton skeleton-text ${className}`}
            style={{
              width: i === count - 1 ? `${Math.random() * 30 + 60}%` : width, // Last line shorter
              height,
            }}
          />
        ));
      
      case 'avatar':
        return (
          <div
            className={`skeleton skeleton-avatar ${circle ? 'skeleton-circle' : ''} ${className}`}
            style={{ width: width || 48, height: height || 48 }}
          />
        );
      
      case 'card':
        return (
          <div className={`skeleton-card ${className}`}>
            <div className="skeleton skeleton-card-image" style={{ height: height || 200 }} />
            <div className="skeleton-card-content">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" style={{ width: '70%' }} />
            </div>
          </div>
        );
      
      case 'list':
        return (
          <div className={`skeleton-list ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="skeleton-list-item">
                <div className="skeleton skeleton-avatar skeleton-circle" />
                <div className="skeleton-list-item-content">
                  <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                  <div className="skeleton skeleton-text skeleton-text-sm" style={{ width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'table':
        return (
          <div className={`skeleton-table ${className}`}>
            {/* Header */}
            <div className="skeleton-table-row skeleton-table-header">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton skeleton-text" />
              ))}
            </div>
            {/* Rows */}
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="skeleton-table-row">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="skeleton skeleton-text" />
                ))}
              </div>
            ))}
          </div>
        );
      
      default:
        return (
          <div
            className={`skeleton ${circle ? 'skeleton-circle' : ''} ${className}`}
            style={{ width, height }}
          />
        );
    }
  };

  return <div className="skeleton-wrapper">{renderSkeleton()}</div>;
}

/**
 * Network Map Skeleton
 * Specialized skeleton for the network device map
 */
export function NetworkMapSkeleton() {
  return (
    <div className="skeleton-network-map">
      <LoadingSkeleton type="title" width="40%" />
      <div className="skeleton-network-map-stats">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-network-map-stat">
            <LoadingSkeleton type="text" width="60%" />
            <LoadingSkeleton type="title" width="80%" />
          </div>
        ))}
      </div>
      <LoadingSkeleton type="list" count={5} />
    </div>
  );
}

/**
 * AI Insights Skeleton
 * Specialized skeleton for AI insights section
 */
export function AIInsightsSkeleton() {
  return (
    <div className="skeleton-ai-insights">
      <div className="skeleton-ai-insights-header">
        <LoadingSkeleton type="avatar" circle />
        <div className="skeleton-ai-insights-header-text">
          <LoadingSkeleton type="title" width="30%" />
          <LoadingSkeleton type="text" width="50%" />
        </div>
      </div>
      <div className="skeleton-ai-insights-content">
        <LoadingSkeleton type="text" count={4} />
      </div>
      <div className="skeleton-ai-insights-actions">
        <LoadingSkeleton width={100} height={36} />
        <LoadingSkeleton width={120} height={36} />
      </div>
    </div>
  );
}

export default LoadingSkeleton;
