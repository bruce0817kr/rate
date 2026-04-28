import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  ChevronLeft,
  LayoutDashboard,
  Users,
  UserRound,
  FolderKanban,
  Bell,
  Settings,
  ShieldCheck,
  Upload,
  BarChart2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../services/api';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { path: '/', label: '대시보드', icon: <LayoutDashboard size={18} /> },
  { path: '/teams', label: '팀 관리', icon: <Users size={18} /> },
  { path: '/team-members', label: '팀원 관리', icon: <UserRound size={18} /> },
  { path: '/projects', label: '사업 관리', icon: <FolderKanban size={18} /> },
  { path: '/department-revenue', label: '부서별 수입 현황', icon: <BarChart2 size={18} /> },
  { path: '/alerts', label: '알림', icon: <Bell size={18} /> },
  {
    path: '/settings',
    label: '설정',
    icon: <Settings size={18} />,
    roles: ['ADMIN', 'STRATEGY_PLANNING', 'HR_GENERAL_AFFAIRS'],
  },
  {
    path: '/audit-logs',
    label: '감사 로그',
    icon: <ShieldCheck size={18} />,
    roles: ['ADMIN', 'STRATEGY_PLANNING', 'HR_GENERAL_AFFAIRS'],
  },
  {
    path: '/upload',
    label: '데이터 업로드',
    icon: <Upload size={18} />,
    roles: ['ADMIN', 'STRATEGY_PLANNING', 'HR_GENERAL_AFFAIRS'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const visibleItems = navItems.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (user?.role === 'ADMIN') return true;
    return !!user && item.roles.includes(user.role);
  });

  return (
    <aside
      style={{
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        transition: 'width 0.2s ease',
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 60,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 'var(--header-height)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 var(--space-4)',
        }}
      >
        {!collapsed && (
          <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.92rem' }}>
            GTP 인건비 관리 시스템
          </div>
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-alt)',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav style={{ padding: 'var(--space-3) var(--space-2)' }}>
        {visibleItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              style={{
                width: '100%',
                marginBottom: 'var(--space-2)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'rgba(45, 90, 39, 0.1)' : 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: 'var(--space-2)',
                padding: collapsed ? '10px 0' : '10px 12px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
