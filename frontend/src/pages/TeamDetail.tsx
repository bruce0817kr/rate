import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiService } from '../services/api';
import { useFiscalYear } from '../context/FiscalYearContext';

interface TeamMemberRow {
  personnelId: string;
  name: string;
  position: string;
  participationRate: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
}

interface TeamProjectRow {
  id: string;
  name: string;
  status: string;
}

interface TeamDetailState {
  teamName: string;
  department: string;
  memberCount: number;
  projectCount: number;
  totalAllocation: number;
  members: TeamMemberRow[];
  projects: TeamProjectRow[];
}

const statusLabel: Record<string, string> = {
  OK: '정상',
  WARNING: '주의',
  CRITICAL: '위험',
  PLANNING: '기획',
  APPROVED: '승인',
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
  AUDITING: '감사 중',
};

const positionPriority: Record<string, number> = {
  원장: 1,
  본부장: 2,
  부장: 2,
  팀장: 3,
  차장: 4,
  과장: 5,
  대리: 6,
  주임: 7,
  사원: 8,
};

const getPositionRank = (position?: string): number => {
  if (!position) return 999;
  return positionPriority[position.trim()] ?? 999;
};

const formatParticipationRate = (value: number) =>
  value.toLocaleString('ko-KR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

export const TeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fiscalYear } = useFiscalYear();
  const [team, setTeam] = useState<TeamDetailState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    const teamName = decodeURIComponent(id || '');
    setLoading(true);
    setError(null);

    try {
      const [personnel, projects, participations, teamUtilization] = await Promise.all([
        apiService.getPersonnel(),
        apiService.getProjects(fiscalYear),
        apiService.getIndividualParticipations(),
        apiService.getTeamUtilization(),
      ]);

      const teamPersonnel = personnel.filter((person) => person.team === teamName && person.isActive);
      const participationMap = new Map(participations.map((entry) => [entry.personnelId, entry]));
      const projectsForTeam = projects.filter(
        (project) => project.managingTeam === teamName || project.participatingTeams.includes(teamName),
      );
      const allocation = teamUtilization.find((entry) => entry.teamName === teamName)?.totalAllocation || 0;

      setTeam({
        teamName,
        department: teamPersonnel[0]?.department || '',
        memberCount: teamPersonnel.length,
        projectCount: projectsForTeam.length,
        totalAllocation: allocation,
        members: teamPersonnel
          .map((person) => ({
            personnelId: person.id,
            name: person.name,
            position: person.position,
            participationRate: Number(participationMap.get(person.id)?.totalParticipationRate || 0),
            status: participationMap.get(person.id)?.status || 'OK',
          }))
          .sort((left, right) => {
            const rankDiff = getPositionRank(left.position) - getPositionRank(right.position);
            if (rankDiff !== 0) return rankDiff;
            return left.name.localeCompare(right.name, 'ko');
          }),
        projects: projectsForTeam.map((project) => ({ id: project.id, name: project.name, status: project.status })),
      });
    } catch {
      setTeam(null);
      setError('팀 상세 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear, id]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>팀 상세 정보를 불러오는 중입니다...</div>;
  }

  if (!team) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
        <p style={{ color: 'var(--color-error)' }}>{error || '팀 정보를 찾을 수 없습니다.'}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/teams')} style={{ marginTop: 'var(--space-4)' }}>
          팀 목록으로
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <button
          onClick={() => navigate('/teams')}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <ArrowLeft size={16} />
          팀 목록으로
        </button>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>{team.teamName}</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          {team.department || '-'} | 팀원 {team.memberCount}명 | 사업 {team.projectCount}개 | 총 참여율 {team.totalAllocation}%
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>팀원 목록</h3>
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>직위</th>
                <th>참여율</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {team.members.map((member) => (
                <tr key={member.personnelId}>
                  <td style={{ fontWeight: 600 }}>{member.name}</td>
                  <td>{member.position}</td>
                  <td>{formatParticipationRate(member.participationRate)}%</td>
                  <td>{statusLabel[member.status] || member.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>연계 사업</h3>
          <table>
            <thead>
              <tr>
                <th>사업명</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {team.projects.map((project) => (
                <tr key={project.id}>
                  <td style={{ fontWeight: 600 }}>{project.name}</td>
                  <td>{statusLabel[project.status] || project.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
