import React from 'react';
import { TrendingUp, TrendingDown, Users, FolderKanban, AlertTriangle, Banknote } from 'lucide-react';
import Tooltip from './Tooltip';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: 'users' | 'projects' | 'alerts' | 'budget';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  tooltip?: string;
}

const iconMap = {
  users: Users,
  projects: FolderKanban,
  alerts: AlertTriangle,
  budget: Banknote,
};

const variantStyles = {
  default: {
    backgroundColor: 'var(--color-surface)',
    iconColor: 'var(--color-primary)',
    iconBg: 'rgba(45, 90, 39, 0.1)',
  },
  success: {
    backgroundColor: 'rgba(45, 90, 39, 0.05)',
    iconColor: 'var(--color-success)',
    iconBg: 'rgba(45, 90, 39, 0.1)',
  },
  warning: {
    backgroundColor: 'rgba(232, 168, 56, 0.05)',
    iconColor: '#B8860B',
    iconBg: 'rgba(232, 168, 56, 0.1)',
  },
  danger: {
    backgroundColor: 'rgba(211, 94, 59, 0.05)',
    iconColor: 'var(--color-error)',
    iconBg: 'rgba(211, 94, 59, 0.1)',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  variant = 'default',
  tooltip,
}) => {
  const Icon = iconMap[icon];
  const styles = variantStyles[variant];

  return (
    <div
      className="card"
      style={{
        padding: 'var(--space-4)',
        backgroundColor: styles.backgroundColor,
        borderLeft: `4px solid ${styles.iconColor}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-1)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {title}
            {tooltip && <Tooltip content={tooltip} iconOnly />}
          </p>
          <p
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            {value}
          </p>
          {subtitle && (
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                marginTop: 'var(--space-1)',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-lg)',
            backgroundColor: styles.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={24} color={styles.iconColor} />
        </div>
      </div>

      {trend && trendValue && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            marginTop: 'var(--space-3)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {trend === 'up' && <TrendingUp size={14} color="var(--color-error)" />}
          {trend === 'down' && <TrendingDown size={14} color="var(--color-success)" />}
          {trend === 'neutral' && <TrendingUp size={14} color="var(--color-text-muted)" />}
          <span
            style={{
              fontSize: '0.75rem',
              color: trend === 'up' ? 'var(--color-error)' : trend === 'down' ? 'var(--color-success)' : 'var(--color-text-muted)',
            }}
          >
            {trendValue}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            전월 대비
          </span>
        </div>
      )}
    </div>
  );
};
