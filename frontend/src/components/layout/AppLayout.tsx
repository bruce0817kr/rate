import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

type LayoutMode = 'centered' | 'wide';
const LAYOUT_MODE_KEY = 'ui.layout.mode';

const pageTitles: Array<{ prefix: string; title: string }> = [
  { prefix: '/teams/', title: '팀 상세' },
  { prefix: '/team-members/', title: '팀원 상세' },
  { prefix: '/projects/', title: '사업 상세' },
  { prefix: '/teams', title: '팀 관리' },
  { prefix: '/team-members', title: '팀원 관리' },
  { prefix: '/projects', title: '사업 관리' },
  { prefix: '/department-revenue', title: '부서별 수입 현황' },
  { prefix: '/alerts', title: '알림' },
  { prefix: '/settings', title: '설정' },
  { prefix: '/audit-logs', title: '감사로그' },
  { prefix: '/upload', title: '데이터 업로드' },
  { prefix: '/', title: '대시보드' },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('centered');
  const location = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem(LAYOUT_MODE_KEY);
    if (saved === 'centered' || saved === 'wide') {
      setLayoutMode(saved);
    }
  }, []);

  const handleChangeLayoutMode = (next: LayoutMode) => {
    setLayoutMode(next);
    localStorage.setItem(LAYOUT_MODE_KEY, next);
  };

  const title = useMemo(() => {
    const match = pageTitles.find((page) => location.pathname.startsWith(page.prefix));
    return match?.title || '페이지';
  }, [location.pathname]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />

      <main
        style={{
          flex: 1,
          marginLeft: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          transition: 'margin-left 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header
          title={title}
          layoutMode={layoutMode}
          onChangeLayoutMode={handleChangeLayoutMode}
        />

        <div
          style={{
            flex: 1,
            padding: 'var(--space-6)',
            backgroundColor: 'var(--color-background)',
          }}
        >
          <div className={`app-content-shell app-content-${layoutMode}`}>{children}</div>
        </div>
      </main>
    </div>
  );
};
