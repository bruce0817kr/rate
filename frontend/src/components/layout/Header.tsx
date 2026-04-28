import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Bell, ChevronDown, UserCircle2, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFiscalYear } from '../../context/FiscalYearContext';

interface HeaderProps {
  title: string;
  layoutMode: 'centered' | 'wide';
  onChangeLayoutMode: (mode: 'centered' | 'wide') => void;
}

const routeDictionary = [
  { keywords: ['대시보드', '홈', 'home', 'dashboard'], path: '/' },
  { keywords: ['팀', 'teams'], path: '/teams' },
  { keywords: ['팀원', '인력', 'members', 'member'], path: '/team-members' },
  { keywords: ['사업', '프로젝트', 'project', 'projects'], path: '/projects' },
  { keywords: ['알림', 'alerts', 'alert'], path: '/alerts' },
  { keywords: ['설정', 'settings'], path: '/settings' },
  { keywords: ['감사', 'audit'], path: '/audit-logs' },
  { keywords: ['업로드', 'upload'], path: '/upload' },
];

export const Header: React.FC<HeaderProps> = ({ title, layoutMode, onChangeLayoutMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { fiscalYear, setFiscalYear, yearOptions } = useFiscalYear();
  const [query, setQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const unreadDot = useMemo(() => location.pathname !== '/alerts', [location.pathname]);

  const submitSearch = () => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return;

    const target = routeDictionary.find((route) =>
      route.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
    );

    if (target) {
      navigate(target.path);
      return;
    }

    navigate(`/team-members?query=${encodeURIComponent(query.trim())}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-6)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          관리연도
          <select
            value={fiscalYear}
            onChange={(event) => setFiscalYear(Number(event.target.value))}
            style={{ width: 92 }}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <div
          style={{
            display: 'inline-flex',
            padding: 4,
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-surface-alt)',
            border: '1px solid var(--color-border)',
          }}
        >
          <button
            type="button"
            onClick={() => onChangeLayoutMode('centered')}
            className={layoutMode === 'centered' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ borderRadius: 'var(--radius-full)', padding: '6px 12px', fontSize: '0.75rem' }}
          >
            Centered
          </button>
          <button
            type="button"
            onClick={() => onChangeLayoutMode('wide')}
            className={layoutMode === 'wide' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ borderRadius: 'var(--radius-full)', padding: '6px 12px', fontSize: '0.75rem' }}
          >
            Wide
          </button>
        </div>

        <div
          style={{
            background: 'var(--color-surface-alt)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
          }}
        >
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submitSearch();
              }
            }}
            placeholder="검색어 입력"
            style={{ border: 'none', outline: 'none', background: 'transparent', minWidth: 180 }}
          />
          <button
            type="button"
            onClick={submitSearch}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              fontSize: '0.75rem',
            }}
          >
            이동
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/alerts')}
          style={{
            position: 'relative',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 'var(--space-2)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
          }}
          title="알림"
        >
          <Bell size={20} />
          {unreadDot && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                backgroundColor: 'var(--color-error)',
                borderRadius: 'var(--radius-full)',
              }}
            />
          )}
        </button>

        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
            }}
            title="프로필 메뉴"
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              {user?.name?.charAt(0) || 'U'}
            </div>
            <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>

          {profileOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: 220,
                background: 'white',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 600 }}>{user?.name || '사용자'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{user?.username}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/settings');
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'white',
                  padding: 'var(--space-3)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <UserCircle2 size={16} />
                프로필 설정
              </button>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'white',
                  padding: 'var(--space-3)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--color-error)',
                }}
              >
                <LogOut size={16} />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
