import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface IndividualParticipationChartProps {
  data: {
    id: string;
    name: string;
    team: string;
    position: string;
    participationRate: number;
    status: 'ok' | 'warning' | 'critical';
    [key: string]: any;
  }[];
  onMemberClick?: (member: any) => void;
}

const getStatusColor = (participationRate: number) => {
  if (participationRate > 100) return '#D35E3B';
  if (participationRate >= 90) return '#E8A838';
  return '#2D5A27';
};

export const IndividualParticipationChart: React.FC<IndividualParticipationChartProps> = ({
  data,
  onMemberClick,
}) => {
  const totalMembers = data.length;
  const criticalCount = data.filter((member) => member.participationRate > 100).length;
  const warningCount = data.filter(
    (member) => member.participationRate >= 90 && member.participationRate <= 100,
  ).length;
  const normalCount = Math.max(0, totalMembers - criticalCount - warningCount);

  const statusChartData = [
    { name: '정상', value: normalCount, fill: '#2D5A27' },
    { name: '주의', value: warningCount, fill: '#E8A838' },
    { name: '위험', value: criticalCount, fill: '#D35E3B' },
  ].filter((item) => item.value > 0);

  const riskMembers = [...data]
    .sort((left, right) => right.participationRate - left.participationRate)
    .slice(0, 8);

  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
          개인별 참여율 현황
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          상태 분포와 참여율 상위 인력을 함께 보여줍니다.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div
          style={{
            flex: 1,
            padding: 'var(--space-3)',
            backgroundColor: 'rgba(45, 90, 39, 0.1)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2D5A27' }}>{normalCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>정상</div>
        </div>
        <div
          style={{
            flex: 1,
            padding: 'var(--space-3)',
            backgroundColor: 'rgba(232, 168, 56, 0.1)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#B8860B' }}>{warningCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>주의</div>
        </div>
        <div
          style={{
            flex: 1,
            padding: 'var(--space-3)',
            backgroundColor: 'rgba(211, 94, 59, 0.1)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#D35E3B' }}>{criticalCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>위험</div>
        </div>
      </div>

      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusChartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {statusChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, payload) => [
                `${value}명`,
                (payload?.payload as { name?: string } | undefined)?.name || '구분',
              ]}
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 'var(--space-3)', maxHeight: 170, overflowY: 'auto' }}>
        {riskMembers.map((member) => (
          <div
            key={member.id}
            onClick={() => onMemberClick?.(member)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-2) 0',
              borderBottom: '1px solid var(--color-border)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: getStatusColor(member.participationRate),
                }}
              />
              <span style={{ fontSize: '0.875rem' }}>{member.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({member.team})</span>
            </div>
            <span
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: getStatusColor(member.participationRate),
              }}
            >
              {Number(member.participationRate || 0).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
