import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius = 'var(--radius-md)',
  style,
  className,
}: SkeletonProps) {
  return (
    <span
      className={`skeleton-shimmer ${className ?? ''}`}
      style={{
        display: 'block',
        width,
        height,
        borderRadius,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

interface SkeletonCardProps {
  style?: React.CSSProperties;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Card image placeholder */}
      <Skeleton height="160px" borderRadius={0} />
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Skeleton height="14px" width="75%" />
        <Skeleton height="12px" width="50%" />
        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
          <Skeleton height="20px" width="40px" borderRadius="var(--radius-full)" />
          <Skeleton height="20px" width="40px" borderRadius="var(--radius-full)" />
        </div>
      </div>
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
  style?: React.CSSProperties;
}

export function SkeletonText({ lines = 3, lastLineWidth = '60%', style }: SkeletonTextProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="14px"
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}
