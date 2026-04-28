import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { StatCard } from '../components/ui/StatCard';
import { IndividualParticipationChart } from '../components/charts/IndividualParticipationChart';
import { TeamParticipationChart } from '../components/charts/TeamParticipationChart';
import { useFiscalYear } from '../context/FiscalYearContext';

interface DashboardData {
  teamMembers: Array<{
    id: string;
    name: string;
    team: string;
    position: string;
    participationRate: number;
    status: 'ok' | 'warning' | 'critical';
  }>;
  teams: Array<{
    name: string;
    totalAllocation: number;
    memberCount: number;
  }>;
  alerts: Array<{
    id: string;
    type: 'danger' | 'warning';
    title: string;
    message: string;
    time: string;
  }>;
  stats: {
    totalPersonnel: number;
    activeProjects: number;
    alertsCount: number;
    monthlyCost: number;
  };
}

const POLLING_INTERVAL = 30000;

const getAverageAnnualSalary = (value?: number | null): number => Number(value ?? 0);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { fiscalYear } = useFiscalYear();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = apiService.getToken();
      if (!token) {
        setError('로그인이 필요합니다.');
        setLoading(false);
        return;
      }

      const [individualData, teamUtilization, alertsData, projectsData, assignments] = await Promise.all([
        apiService.getIndividualParticipations(),
        apiService.getTeamUtilization(),
        apiService.getParticipationAlerts(),
        apiService.getProjects(fiscalYear),
        apiService.getProjectPersonnel(fiscalYear),
      ]);

      const allMembers = (individualData as any[]).map((item: any) => ({
        id: item.personnelId,
        name: item.name,
        team: item.team,
        position: item.position,
        participationRate: Number(item.totalParticipationRate || 0),
        status: (item.status === 'CRITICAL' ? 'critical' : item.status === 'WARNING' ? 'warning' : 'ok') as
          | 'ok'
          | 'warning'
          | 'critical',
      }));

      const teamMembers = allMembers;

      const activeProjects = (projectsData as any[]).filter(
        (project: any) => project.status === 'IN_PROGRESS' || project.status === 'APPROVED',
      ).length;

      const alertsCount = allMembers.filter((member) => member.participationRate >= 90).length;

      const activeAssignments = (assignments as any[]).filter(
        (assignment: any) => !assignment.endDate || new Date(assignment.endDate) > new Date(),
      );

      const monthlyCost = activeAssignments.reduce((sum: number, assignment: any) => {
        const annualSalary =
          Number(assignment.actualAnnualSalaryOverride || 0) > 0
            ? Number(assignment.actualAnnualSalaryOverride)
            : getAverageAnnualSalary(assignment.personnel?.positionAverageAnnualSalary);
        const rate = Number(assignment.participationRate || 0);
        return sum + annualSalary / 12 * (rate / 100);
      }, 0);

      setData({
        teamMembers,
        teams: (teamUtilization as any[]).map((team: any) => ({
          name: team.teamName,
          totalAllocation: Number(team.utilizationPercentage || 0),
          memberCount: Number(team.memberCount || 0),
        })),
        alerts: (alertsData as any[]).slice(0, 3).map((alert: any) => ({
          id: alert.id,
          type: alert.severity === 'CRITICAL' ? 'danger' : 'warning',
          title: alert.title,
          message: alert.message,
          time: '방금',
        })),
        stats: {
          totalPersonnel: allMembers.length,
          activeProjects,
          alertsCount,
          monthlyCost: Math.round(monthlyCost),
        },
      });

      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError('대시보드 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <p>데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <p style={{ color: 'var(--color-error)' }}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>현황 개요</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          전체 인력과 사업의 참여율, 경고, 인건비 현황을 확인합니다.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <StatCard
          title="전체 인력"
          value={data.stats.totalPersonnel}
          subtitle="명"
          icon="users"
          variant="success"
          tooltip="현재 등록되어 있는 전체 인력 수입니다."
        />
        <StatCard
          title="진행 사업"
          value={data.stats.activeProjects}
          subtitle="건"
          icon="projects"
          variant="default"
          tooltip="승인 또는 진행 중 상태의 사업 수입니다."
        />
        <StatCard
          title="참여율 경고"
          value={data.stats.alertsCount}
          subtitle="명(90% 이상)"
          icon="alerts"
          variant="danger"
          tooltip="총 참여율이 90% 이상인 인원 수입니다."
        />
        <StatCard
          title="월 인건비"
          value={data.stats.monthlyCost.toLocaleString('ko-KR')}
          subtitle="원"
          icon="budget"
          variant="default"
          tooltip="현재 참여 인력 배정 기준으로 계산한 월 인건비 합계입니다."
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <IndividualParticipationChart
          data={data.teamMembers}
          onMemberClick={(member) => navigate(`/team-members/${member.id}`)}
        />
        <TeamParticipationChart data={data.teams} />
      </div>

      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-4)',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>최근 알림</h3>
          <button className="btn btn-secondary" onClick={() => navigate('/alerts')} style={{ fontSize: '0.75rem' }}>
            전체 보기
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {data.alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: alert.type === 'danger' ? 'rgba(211, 94, 59, 0.05)' : 'rgba(232, 168, 56, 0.05)',
                borderLeft: `3px solid ${alert.type === 'danger' ? 'var(--color-error)' : 'var(--color-warning)'}`,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: alert.type === 'danger' ? 'var(--color-error)' : 'var(--color-warning)',
                  marginTop: 6,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{alert.title}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{alert.time}</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                  {alert.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {lastUpdated && (
        <div
          style={{
            textAlign: 'right',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            marginTop: 'var(--space-4)',
          }}
        >
          마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')} (30초마다 자동 갱신)
        </div>
      )}
    </div>
  );
};
