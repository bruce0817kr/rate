import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-4)',
            color: 'var(--color-text-muted)',
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          marginBottom: 'var(--space-2)',
          color: 'var(--color-text-primary)',
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-4)',
            maxWidth: 300,
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <button className="btn btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 5,
}) => {
  return (
    <table>
      <thead>
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i}>
              <div
                style={{
                  height: 16,
                  backgroundColor: 'var(--color-border)',
                  borderRadius: 4,
                  width: '80%',
                }}
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <td key={colIndex}>
                <div
                  style={{
                    height: 16,
                    backgroundColor: 'var(--color-border)',
                    borderRadius: 4,
                    width: colIndex === 0 ? '70%' : '50%',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
