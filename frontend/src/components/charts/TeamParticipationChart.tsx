import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface TeamData {
  name: string;
  totalAllocation: number;
  memberCount: number;
}

interface TeamParticipationChartProps {
  data: TeamData[];
}

const getBarColor = (value: number) => {
  if (value >= 95) return '#D35E3B';
  if (value >= 80) return '#E8A838';
  return '#2D5A27';
};

export const TeamParticipationChart: React.FC<TeamParticipationChartProps> = ({ data }) => {
  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
          팀별 참여율 현황
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          가로축은 팀, 세로축은 팀 평균 참여율입니다.
        </p>
      </div>

      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={55}
            />
            <YAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(1)}%`, '참여율']}
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
              }}
            />
            <Bar dataKey="totalAllocation" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.totalAllocation)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#2D5A27' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>정상 (&lt;80%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#E8A838' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>주의 (80-95%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#D35E3B' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>위험 (&gt;95%)</span>
        </div>
      </div>
    </div>
  );
};
