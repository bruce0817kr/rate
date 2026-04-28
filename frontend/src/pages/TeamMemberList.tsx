import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, Upload, Trash2 } from 'lucide-react';
import { IndividualParticipationChart } from '../components/charts/IndividualParticipationChart';
import { TeamMemberModal } from '../components/modals/TeamMemberModal';
import { EmptyState } from '../components/ui/EmptyState';
import { apiService, IndividualParticipation, PersonnelRecord, TeamRecord } from '../services/api';
import { showToast } from '../components/ui/Toast';

interface TeamMember {
  id: string;
  employeeId: string;
  name: string;
  team: string;
  position: string;
  participationRate: number;
  status: 'ok' | 'warning' | 'critical';
}

type SortKey = 'name' | 'team' | 'position' | 'participationRate' | 'status';
type ColumnKey = 'name' | 'team' | 'position' | 'participationRate' | 'status';

type ColumnWidths = {
  name: number;
  team: number;
  position: number;
  participationRate: number;
  status: number;
};

const MIN_WIDTH: Record<ColumnKey, number> = {
  name: 120,
  team: 120,
  position: 120,
  participationRate: 110,
  status: 100,
};

const normalizeStatus = (status?: string, participationRate?: number): TeamMember['status'] => {
  if (status === 'CRITICAL' || (participationRate || 0) > 100) return 'critical';
  if (status === 'WARNING' || (participationRate || 0) >= 90) return 'warning';
  return 'ok';
};

const statusLabel = (status: TeamMember['status']) =>
  status === 'critical' ? '위험' : status === 'warning' ? '주의' : '정상';

const statusRank = (status: TeamMember['status']) => {
  if (status === 'critical') return 3;
  if (status === 'warning') return 2;
  return 1;
};

const formatParticipationRate = (value: number) =>
  value.toLocaleString('ko-KR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

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

const comparePositionThenName = (left: TeamMember, right: TeamMember, dir: 1 | -1) => {
  const rankDiff = (getPositionRank(left.position) - getPositionRank(right.position)) * dir;
  if (rankDiff !== 0) return rankDiff;
  return left.name.localeCompare(right.name, 'ko') * dir;
};

export const TeamMemberList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TeamMember['status']>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({
    name: 160,
    team: 170,
    position: 160,
    participationRate: 130,
    status: 110,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [personnel, participations, teamRecords] = await Promise.all([
        apiService.getPersonnel(),
        apiService.getIndividualParticipations(),
        apiService.getTeams().catch(() => [] as TeamRecord[]),
      ]);

      const participationMap = new Map<string, IndividualParticipation>(
        participations.map((item) => [item.personnelId, item]),
      );

      const nextMembers = personnel
        .filter((person) => person.isActive)
        .map((person: PersonnelRecord) => {
          const participation = participationMap.get(person.id);
          const participationRate = Number(participation?.totalParticipationRate || 0);

          return {
            id: person.id,
            employeeId: person.employeeId,
            name: person.name,
            team: person.team,
            position: person.position,
            participationRate,
            status: normalizeStatus(participation?.status, participationRate),
          };
        });

      setMembers(nextMembers);
      setTeams(teamRecords.filter((team) => team.isActive));
    } catch {
      setMembers([]);
      setError('팀원 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialQuery = params.get('query');
    if (initialQuery) {
      setSearchTerm(initialQuery);
    }
  }, [location.search]);

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setSortDir('asc');
  };

  const beginResize = (event: React.MouseEvent, key: ColumnKey) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = columnWidths[key];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setColumnWidths((prev) => ({
        ...prev,
        [key]: Math.max(MIN_WIDTH[key], startWidth + delta),
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleMemberClick = (member: TeamMember) => {
    navigate(`/team-members/${member.id}`);
  };

  const handleAddMember = async (data: {
    employeeId: string;
    name: string;
    team: string;
    position: string;
    salaryReferencePosition?: string;
    highestEducation?: string;
    educationYear?: number;
    department?: string;
    employmentType?: string;
    hireDate?: string;
    positionAverageAnnualSalary?: number;
  }) => {
    try {
      await apiService.createPersonnel(data);
      await loadMembers();
      showToast('success', `${data.name} 팀원을 추가했습니다.`);
    } catch {
      showToast('error', '팀원 추가에 실패했습니다.');
    }
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    try {
      await apiService.uploadPersonnelFile(selectedFile);
      await loadMembers();
      showToast('success', '팀원 파일 업로드가 완료되었습니다.');
    } catch {
      showToast('error', '팀원 파일 업로드에 실패했습니다.');
    } finally {
      event.target.value = '';
    }
  };

  const handlePurgeMockData = async () => {
    try {
      const result = await apiService.purgeMockPersonnel();
      await loadMembers();
      showToast('success', `모의 데이터 ${result.deletedCount}건을 정리했습니다.`);
    } catch {
      showToast('error', '모의 데이터 정리에 실패했습니다.');
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (!window.confirm(`팀원 '${member.name}'을 삭제하시겠습니까?`)) return;

    try {
      await apiService.deletePersonnel(member.id);
      await loadMembers();
      showToast('success', '팀원을 삭제했습니다.');
    } catch {
      showToast('error', '팀원 삭제에 실패했습니다.');
    }
  };

  const teamOptions = useMemo(() => {
    const values = new Set<string>();
    teams.forEach((team) => values.add(team.name));
    members.forEach((member) => values.add(member.team));
    return Array.from(values).sort((left, right) => left.localeCompare(right, 'ko'));
  }, [members, teams]);

  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const dir = sortDir === 'asc' ? 1 : -1;

    return members
      .filter((member) => {
        if (teamFilter !== 'ALL' && member.team !== teamFilter) return false;
        if (statusFilter !== 'ALL' && member.status !== statusFilter) return false;
        if (!q) return true;

        return (
          member.name.toLowerCase().includes(q) ||
          member.employeeId.toLowerCase().includes(q) ||
          member.team.toLowerCase().includes(q) ||
          member.position.toLowerCase().includes(q)
        );
      })
      .sort((left, right) => {
        if (sortKey === 'name') return left.name.localeCompare(right.name, 'ko') * dir;
        if (sortKey === 'team') {
          const teamDiff = left.team.localeCompare(right.team, 'ko') * dir;
          if (teamDiff !== 0) return teamDiff;
          return comparePositionThenName(left, right, dir);
        }
        if (sortKey === 'position') return comparePositionThenName(left, right, dir);
        if (sortKey === 'participationRate') return (left.participationRate - right.participationRate) * dir;
        return (statusRank(left.status) - statusRank(right.status)) * dir;
      });
  }, [members, searchTerm, teamFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const pagedMembers = filteredMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>팀원 관리</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>팀원 추가, 삭제와 참여율 상태를 관리합니다.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input
            ref={uploadInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleBulkUpload}
            style={{ display: 'none' }}
          />
          <button className="btn btn-secondary" onClick={() => uploadInputRef.current?.click()}>
            <Upload size={16} style={{ marginRight: 'var(--space-2)' }} />
            팀원 파일 업로드
          </button>
          <button className="btn btn-secondary" onClick={handlePurgeMockData}>
            <Trash2 size={16} style={{ marginRight: 'var(--space-2)' }} />
            모의 데이터 정리
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} style={{ marginRight: 'var(--space-2)' }} />
            팀원 추가
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-2)' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="이름, 사번, 팀, 직위를 검색하세요"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{ width: '100%', paddingLeft: 36 }}
            />
          </div>
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
            <option value="ALL">전체 팀</option>
            {teamOptions.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | TeamMember['status'])}>
            <option value="ALL">전체 상태</option>
            <option value="ok">정상</option>
            <option value="warning">주의</option>
            <option value="critical">위험</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 'var(--space-6)' }}>
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          {loading ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              팀원 데이터를 불러오는 중입니다...
            </div>
          ) : error ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-error)' }}>{error}</div>
          ) : filteredMembers.length === 0 ? (
            <EmptyState
              title="팀원이 없습니다"
              description="현재 조건에 맞는 팀원 데이터가 없습니다."
              action={{
                label: '팀원 추가',
                onClick: () => setIsModalOpen(true),
              }}
            />
          ) : (
            <table style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: columnWidths.name, cursor: 'pointer', position: 'relative' }} onClick={() => handleSort('name')}>
                    이름 {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    <div onMouseDown={(event) => beginResize(event, 'name')} style={{ position: 'absolute', top: 0, right: 0, width: 8, height: '100%', cursor: 'col-resize' }} />
                  </th>
                  <th style={{ width: columnWidths.team, cursor: 'pointer', position: 'relative' }} onClick={() => handleSort('team')}>
                    팀 {sortKey === 'team' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    <div onMouseDown={(event) => beginResize(event, 'team')} style={{ position: 'absolute', top: 0, right: 0, width: 8, height: '100%', cursor: 'col-resize' }} />
                  </th>
                  <th style={{ width: columnWidths.position, cursor: 'pointer', position: 'relative' }} onClick={() => handleSort('position')}>
                    직위 {sortKey === 'position' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    <div onMouseDown={(event) => beginResize(event, 'position')} style={{ position: 'absolute', top: 0, right: 0, width: 8, height: '100%', cursor: 'col-resize' }} />
                  </th>
                  <th style={{ width: columnWidths.participationRate, cursor: 'pointer', position: 'relative' }} onClick={() => handleSort('participationRate')}>
                    참여율 {sortKey === 'participationRate' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    <div onMouseDown={(event) => beginResize(event, 'participationRate')} style={{ position: 'absolute', top: 0, right: 0, width: 8, height: '100%', cursor: 'col-resize' }} />
                  </th>
                  <th style={{ width: columnWidths.status, cursor: 'pointer', position: 'relative' }} onClick={() => handleSort('status')}>
                    상태 {sortKey === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    <div onMouseDown={(event) => beginResize(event, 'status')} style={{ position: 'absolute', top: 0, right: 0, width: 8, height: '100%', cursor: 'col-resize' }} />
                  </th>
                  <th style={{ textAlign: 'right' }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {pagedMembers.map((member) => (
                  <tr key={member.id} style={{ cursor: 'pointer' }} onClick={() => handleMemberClick(member)}>
                    <td title={member.name} style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</td>
                    <td title={member.team} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.team}</td>
                    <td title={member.position} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.position}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            member.participationRate > 100
                              ? 'var(--color-error)'
                              : member.participationRate >= 90
                                ? '#B8860B'
                                : 'var(--color-success)',
                        }}
                      >
                        {formatParticipationRate(member.participationRate)}%
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${member.status === 'critical' ? 'badge-error' : member.status === 'warning' ? 'badge-warning' : 'badge-success'}`}>
                        {statusLabel(member.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 'var(--space-1)' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: 'var(--space-1) var(--space-2)', fontSize: '0.75rem' }}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMemberClick(member);
                          }}
                        >
                          상세/수정
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: 'var(--space-1) var(--space-2)', fontSize: '0.75rem' }}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteMember(member);
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16, fontSize: '0.875rem' }}>
            <button className="btn btn-secondary" style={{ padding: '4px 12px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>이전</button>
            <span style={{ color: 'var(--color-text-secondary)' }}>{page} / {totalPages} ({filteredMembers.length}명)</span>
            <button className="btn btn-secondary" style={{ padding: '4px 12px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>다음</button>
          </div>
        )}
        <IndividualParticipationChart data={filteredMembers} onMemberClick={handleMemberClick} />
      </div>

      <TeamMemberModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddMember} teamOptions={teamOptions} />
    </div>
  );
};
