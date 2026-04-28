import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { apiService, DepartmentRevenueItem, DepartmentRevenueProject } from '../services/api';
import { useFiscalYear } from '../context/FiscalYearContext';

const fmt = (n: number | null | undefined) => {
  if (n == null) return '-';
  return `${(n / 1_000_000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}백만`;
};

const budgetStatusLabel: Record<string, string> = {
  계속: '계속',
  신규: '신규',
  종료: '종료',
  폐지: '폐지',
};

const budgetStatusColor: Record<string, string> = {
  계속: 'var(--color-success)',
  신규: 'var(--color-info)',
  종료: 'var(--color-text-muted)',
  폐지: 'var(--color-error)',
};

const TEAM_ORDER = [
  '디지털전환팀',
  '제조로봇팀',
  '경기스마트제조혁신센터',
  '기술지원팀',
  '기술사업화팀',
  '경기지식재산센터',
  '혁신클러스터팀',
  '미래사업팀',
  '안산정보산업진흥센터',
];

function ProjectRow({ proj }: { proj: DepartmentRevenueProject }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
      <td style={{ padding: '6px 12px', paddingLeft: 32, color: 'var(--color-text-primary)' }}>{proj.name}</td>
      <td style={{ padding: '6px 12px', textAlign: 'center' }}>
        {proj.budgetStatus ? (
          <span style={{ color: budgetStatusColor[proj.budgetStatus] || 'var(--color-text-secondary)', fontWeight: 500, fontSize: '0.8rem' }}>
            {budgetStatusLabel[proj.budgetStatus] || proj.budgetStatus}
          </span>
        ) : '-'}
      </td>
      <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--color-text-primary)' }}>
        {fmt(proj.totalBudget)}
      </td>
      <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--color-primary)', fontWeight: 500 }}>
        {fmt(proj.expectedPersonnelRevenue)}
      </td>
      <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--color-info)' }}>
        {fmt(proj.expectedIndirectRevenue)}
      </td>
      <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
        {proj.fundingSources
          ? Object.entries(proj.fundingSources)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => `${k} ${(v / 1_000_000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`)
              .join(' / ')
          : '-'}
      </td>
    </tr>
  );
}

function TeamRow({ item }: { item: DepartmentRevenueItem }) {
  const [expanded, setExpanded] = useState(false);

  const totalPersonnel = item.expectedPersonnelRevenue;
  const totalIndirect = item.expectedIndirectRevenue;
  const total = totalPersonnel + totalIndirect;

  return (
    <>
      <tr
        onClick={() => setExpanded((v) => !v)}
        style={{
          backgroundColor: 'var(--color-surface-alt)',
          borderBottom: '1px solid var(--color-border)',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        <td style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <span style={{ color: 'var(--color-text-primary)' }}>{item.team}</span>
          <span style={{
            marginLeft: 8,
            fontSize: '0.78rem',
            fontWeight: 400,
            color: 'var(--color-text-muted)',
          }}>
            {item.projectCount}건
          </span>
        </td>
        <td style={{ padding: '10px 12px', textAlign: 'center' }} />
        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
          {fmt(total)}
        </td>
        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-primary)' }}>
          {fmt(totalPersonnel)}
        </td>
        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-info)' }}>
          {fmt(totalIndirect)}
        </td>
        <td style={{ padding: '10px 12px' }} />
      </tr>
      {expanded && item.projects.map((proj, i) => (
        <ProjectRow key={i} proj={proj} />
      ))}
    </>
  );
}

export const DepartmentRevenue: React.FC = () => {
  const { fiscalYear } = useFiscalYear();
  const [data, setData] = useState<DepartmentRevenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiService.getDepartmentRevenue(fiscalYear)
      .then((res) => {
        // sort by TEAM_ORDER
        const sorted = [...res].filter((d) => d.expectedPersonnelRevenue + d.expectedIndirectRevenue > 0).sort((a, b) => {
          const ai = TEAM_ORDER.indexOf(a.team);
          const bi = TEAM_ORDER.indexOf(b.team);
          if (ai === -1 && bi === -1) return a.team.localeCompare(b.team, 'ko');
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
        setData(sorted);
      })
      .catch(() => setError('데이터 로드 실패'))
      .finally(() => setLoading(false));
  }, [fiscalYear]);

  const grandPersonnel = data.reduce((s, d) => s + d.expectedPersonnelRevenue, 0);
  const grandIndirect  = data.reduce((s, d) => s + d.expectedIndirectRevenue, 0);
  const grandTotal     = grandPersonnel + grandIndirect;

  if (loading) return <div style={{ padding: 32, color: 'var(--color-text-secondary)' }}>로딩 중...</div>;
  if (error)   return <div style={{ padding: 32, color: 'var(--color-error)' }}>{error}</div>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
          부서별 사업 수입 현황
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          {fiscalYear}년 예산 기준 · 단위: 백만원 · 팀명 클릭 시 사업 상세 펼침
        </p>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: '합계 수입', value: grandTotal, color: 'var(--color-text-primary)' },
          { label: '인건비 수입', value: grandPersonnel, color: 'var(--color-primary)' },
          { label: '간접비 수입', value: grandIndirect, color: 'var(--color-info)' },
          { label: '사업 수', value: data.reduce((s, d) => s + d.projectCount, 0), color: 'var(--color-secondary)', unit: '건' },
        ].map((card) => (
          <div key={card.label} style={{
            flex: '1 1 180px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: card.color }}>
              {card.unit
                ? `${card.value.toLocaleString('ko-KR')}${card.unit}`
                : fmt(card.value)}
            </div>
          </div>
        ))}
      </div>

      {/* 테이블 */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-primary)', color: '#fff' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>팀 / 사업명</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, width: 70 }}>현황</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, width: 120 }}>총예산</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, width: 120 }}>인건비 수입</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, width: 120 }}>간접비 수입</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>재원</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <TeamRow key={item.team} item={item} />
            ))}
            {/* 합계 행 */}
            <tr style={{ background: 'var(--color-surface-alt)', fontWeight: 700, borderTop: '2px solid var(--color-border)' }}>
              <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)' }}>합계</td>
              <td />
              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>{fmt(grandTotal)}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-primary)' }}>{fmt(grandPersonnel)}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-info)' }}>{fmt(grandIndirect)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
