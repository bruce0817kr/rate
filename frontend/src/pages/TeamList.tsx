import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService, TeamRecord } from '../services/api';
import { showToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import { getNonBusinessDepartments } from '../config/teamFilters';

interface TeamRow {
  id: string;
  persistedId?: string;
  name: string;
  department: string;
  description?: string;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  plannedHeadcount?: number | null;
  memberCount: number;
  projectCount: number;
}

interface TeamFormState {
  name: string;
  department: string;
  description: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
  plannedHeadcount: string;
  isActive: boolean;
}

type TeamSortKey = 'department' | 'name' | 'memberCount' | 'projectCount';
type TeamColumnKey = 'department' | 'name' | 'memberCount' | 'projectCount';

type TeamColumnWidths = {
  department: number;
  name: number;
  memberCount: number;
  projectCount: number;
};

const MIN_WIDTH: Record<TeamColumnKey, number> = {
  department: 140,
  name: 180,
  memberCount: 110,
  projectCount: 110,
};

const toFormState = (team?: Partial<TeamRecord>): TeamFormState => ({
  name: team?.name || '',
  department: team?.department || '',
  description: team?.description || '',
  managerName: team?.managerName || '',
  managerEmail: team?.managerEmail || '',
  managerPhone: team?.managerPhone || '',
  plannedHeadcount: team?.plannedHeadcount ? String(team.plannedHeadcount) : '',
  isActive: team?.isActive ?? true,
});

const compareString = (a: string, b: string) => a.localeCompare(b, 'ko');

export const TeamList: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { fiscalYear } = useFiscalYear();
  const canManage = hasRole(['ADMIN', 'STRATEGY_PLANNING', 'HR_GENERAL_AFFAIRS', 'HR_FINANCE']);

  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRow | null>(null);
  const [formState, setFormState] = useState<TeamFormState>(toFormState());
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [hideNonBusinessDepartments, setHideNonBusinessDepartments] = useState(false);
  const [nonBusinessDepartments, setNonBusinessDepartments] = useState<string[]>(() =>
    getNonBusinessDepartments(),
  );
  const [sortKey, setSortKey] = useState<TeamSortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [columnWidths, setColumnWidths] = useState<TeamColumnWidths>({
    department: 220,
    name: 260,
    memberCount: 130,
    projectCount: 130,
  });

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [teamRecords, personnel, projects] = await Promise.all([
        apiService.getTeams().catch(() => [] as TeamRecord[]),
        apiService.getPersonnel(),
        apiService.getProjects(fiscalYear),
      ]);

      const byName = new Map<string, TeamRow>();

      teamRecords
        .filter((team) => team.isActive)
        .forEach((team) => {
          byName.set(team.name, {
            id: team.id,
            persistedId: team.id,
            name: team.name,
            department: team.department || '',
            description: team.description || '',
            managerName: team.managerName || '',
            managerEmail: team.managerEmail || '',
            managerPhone: team.managerPhone || '',
            plannedHeadcount: team.plannedHeadcount ?? null,
            memberCount: 0,
            projectCount: 0,
          });
        });

      personnel
        .filter((person) => person.isActive)
        .forEach((person) => {
          if (!byName.has(person.team)) return;
          byName.get(person.team)!.memberCount += 1;
        });

      projects.forEach((project) => {
        const impactedTeams = new Set([project.managingTeam, ...project.participatingTeams]);
        impactedTeams.forEach((teamName) => {
          if (!byName.has(teamName)) return;
          byName.get(teamName)!.projectCount += 1;
        });
      });

      setTeams(Array.from(byName.values()));
    } catch {
      setTeams([]);
      setError('팀 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    const refresh = () => setNonBusinessDepartments(getNonBusinessDepartments());
    window.addEventListener('storage', refresh);
    window.addEventListener('nonBusinessDepartmentsChanged', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('nonBusinessDepartmentsChanged', refresh);
    };
  }, []);

  const handleSort = (nextKey: TeamSortKey) => {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setSortDir('asc');
  };

  const beginResize = (event: React.MouseEvent, key: TeamColumnKey) => {
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

  const departmentOptions = useMemo(() => {
    const set = new Set(teams.map((team) => team.department).filter(Boolean));
    return Array.from(set).sort((a, b) => compareString(a, b));
  }, [teams]);

  const visibleTeams = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return teams
      .filter((team) => {
        if (
          hideNonBusinessDepartments &&
          nonBusinessDepartments.length > 0 &&
          nonBusinessDepartments.includes(team.department)
        ) {
          return false;
        }
        if (departmentFilter !== 'ALL' && team.department !== departmentFilter) {
          return false;
        }
        if (!q) return true;

        return (
          team.name.toLowerCase().includes(q) ||
          team.department.toLowerCase().includes(q) ||
          (team.managerName || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'department') return compareString(a.department, b.department) * dir;
        if (sortKey === 'name') return compareString(a.name, b.name) * dir;
        if (sortKey === 'memberCount') return (a.memberCount - b.memberCount) * dir;
        return (a.projectCount - b.projectCount) * dir;
      });
  }, [
    teams,
    searchTerm,
    hideNonBusinessDepartments,
    nonBusinessDepartments,
    departmentFilter,
    sortKey,
    sortDir,
  ]);

  const handleTeamUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManage) {
      showToast('error', '팀 관리 권한이 필요합니다.');
      return;
    }

    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    try {
      await apiService.uploadTeamFile(selectedFile);
      await loadTeams();
      showToast('success', '팀 파일 업로드가 완료되었습니다.');
    } catch {
      showToast('error', '팀 파일 업로드에 실패했습니다.');
    } finally {
      event.target.value = '';
    }
  };

  const handleDeleteTeam = async (team: TeamRow) => {
    if (!canManage) {
      showToast('error', '팀 관리 권한이 필요합니다.');
      return;
    }

    if (!team.persistedId) {
      showToast('error', '연결된 팀 데이터에서만 삭제할 수 있습니다.');
      return;
    }

    if (!window.confirm(`팀 '${team.name}'을(를) 삭제하시겠습니까?`)) return;

    try {
      await apiService.deleteTeam(team.persistedId);
      await loadTeams();
      showToast('success', '팀을 삭제했습니다.');
    } catch (error: any) {
      const detail = error?.message ? ` (${error.message})` : '';
      showToast('error', `팀 삭제에 실패했습니다.${detail}`);
    }
  };

  const handleSaveTeam = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canManage) {
      showToast('error', '팀 추가/수정 권한이 없습니다.');
      return;
    }

    const payload = {
      name: formState.name.trim(),
      department: formState.department.trim() || undefined,
      description: formState.description.trim() || undefined,
      managerName: formState.managerName.trim() || undefined,
      managerEmail: formState.managerEmail.trim() || undefined,
      managerPhone: formState.managerPhone.trim() || undefined,
      plannedHeadcount: formState.plannedHeadcount ? Number(formState.plannedHeadcount) : undefined,
      isActive: formState.isActive,
    };

    try {
      if (editingTeam?.persistedId) {
        await apiService.updateTeam(editingTeam.persistedId, payload);
        showToast('success', '팀 정보를 수정했습니다.');
      } else {
        await apiService.createTeam(payload);
        showToast('success', '팀을 추가했습니다.');
      }
      setIsModalOpen(false);
      setEditingTeam(null);
      await loadTeams();
    } catch {
      showToast('error', '팀 저장에 실패했습니다.');
    }
  };

  const modalTitle = useMemo(() => (editingTeam ? '팀 수정' : '팀 추가'), [editingTeam]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>팀 관리</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            팀 정보를 추가/수정/삭제하고 상세 화면을 확인할 수 있습니다.
          </p>
          {!canManage && (
            <p style={{ color: 'var(--color-warning)', marginTop: 'var(--space-1)', fontSize: '0.85rem' }}>
              현재 계정은 조회만 가능합니다. (추가/수정/삭제 불가)
            </p>
          )}
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              ref={uploadInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleTeamUpload}
            />
            <button className="btn btn-secondary" type="button" onClick={() => uploadInputRef.current?.click()}>
              <Upload size={16} style={{ marginRight: 'var(--space-2)' }} />
              팀 파일 업로드
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                setEditingTeam(null);
                setFormState(toFormState());
                setIsModalOpen(true);
              }}
            >
              <Plus size={16} style={{ marginRight: 'var(--space-2)' }} />
              팀 추가
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-2)' }}>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="팀명, 부서, 팀장명 검색"
          />
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option value="ALL">전체 부서</option>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={hideNonBusinessDepartments}
              onChange={(event) => setHideNonBusinessDepartments(event.target.checked)}
            />
            비사업부서 숨김
          </label>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>팀 데이터를 불러오는 중입니다...</div>
        ) : error ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-error)' }}>{error}</div>
        ) : (
          <table style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th
                  style={{ width: columnWidths.department, cursor: 'pointer', position: 'relative' }}
                  onClick={() => handleSort('department')}
                >
                  부서 {sortKey === 'department' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  <div
                    onMouseDown={(event) => beginResize(event, 'department')}
                    style={{ position: 'absolute', top: 0, right: 0, width: 8, height: '100%', cursor: 'col-resize' }}
                  />
                </th>
                <th
                  style={{ width: columnWidths.name, cursor: 'pointer', position: 'relative' }}
                  onClick={() => handleSort('name')}
                >
                  팀 {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  <div
                    onMouseDown={(event) => beginResize(event, 'name')}
                    style={{ position: 'absolute', top: 0, right: 0, width: 8, height: '100%', cursor: 'col-resize' }}
                  />
                </th>
                <th
                  style={{ width: columnWidths.memberCount, cursor: 'pointer', position: 'relative' }}
                  onClick={() => handleSort('memberCount')}
                >
                  팀원 수 {sortKey === 'memberCount' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  <div
                    onMouseDown={(event) => beginResize(event, 'memberCount')}
                    style={{ position: 'absolute', top: 0, right: 0, width: 8, height: '100%', cursor: 'col-resize' }}
                  />
                </th>
                <th
                  style={{ width: columnWidths.projectCount, cursor: 'pointer', position: 'relative' }}
                  onClick={() => handleSort('projectCount')}
                >
                  사업 수 {sortKey === 'projectCount' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  <div
                    onMouseDown={(event) => beginResize(event, 'projectCount')}
                    style={{ position: 'absolute', top: 0, right: 0, width: 8, height: '100%', cursor: 'col-resize' }}
                  />
                </th>
                <th style={{ textAlign: 'right' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {visibleTeams.map((team) => (
                <tr key={team.id}>
                  <td
                    title={team.department}
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {team.department || '-'}
                  </td>
                  <td
                    title={team.name}
                    style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {team.name}
                  </td>
                  <td>{team.memberCount}</td>
                  <td>{team.projectCount}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 'var(--space-1)' }}>
                      {canManage && (
                        <>
                          <button
                            className="btn btn-secondary"
                            type="button"
                            style={{ padding: 'var(--space-1) var(--space-2)', fontSize: '0.75rem' }}
                            onClick={() => {
                              setEditingTeam(team);
                              setFormState(toFormState(team));
                              setIsModalOpen(true);
                            }}
                          >
                            <Pencil size={12} style={{ marginRight: '4px' }} />
                            수정
                          </button>
                          <button
                            className="btn btn-secondary"
                            type="button"
                            style={{ padding: 'var(--space-1) var(--space-2)', fontSize: '0.75rem' }}
                            onClick={() => handleDeleteTeam(team)}
                          >
                            <Trash2 size={12} style={{ marginRight: '4px' }} />
                            삭제
                          </button>
                        </>
                      )}
                      <button
                        className="btn btn-secondary"
                        type="button"
                        style={{ padding: 'var(--space-1) var(--space-2)', fontSize: '0.75rem' }}
                        onClick={() => navigate(`/teams/${encodeURIComponent(team.name)}`)}
                      >
                        <Building2 size={12} style={{ marginRight: '4px' }} />
                        상세
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleTeams.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-6)' }}>
                    조건에 맞는 팀이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && canManage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 720, padding: 'var(--space-4)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>{modalTitle}</h3>
            <form onSubmit={handleSaveTeam}>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <label>
                    <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>팀명 *</div>
                    <input
                      required
                      value={formState.name}
                      onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </label>
                  <label>
                    <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>부서</div>
                    <input
                      value={formState.department}
                      onChange={(event) => setFormState((prev) => ({ ...prev, department: event.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </label>
                </div>

                <label>
                  <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>설명</div>
                  <input
                    value={formState.description}
                    onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                    style={{ width: '100%' }}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <label>
                    <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>팀장명</div>
                    <input
                      value={formState.managerName}
                      onChange={(event) => setFormState((prev) => ({ ...prev, managerName: event.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </label>
                  <label>
                    <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>팀장 이메일</div>
                    <input
                      value={formState.managerEmail}
                      onChange={(event) => setFormState((prev) => ({ ...prev, managerEmail: event.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <label>
                    <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>팀장 연락처</div>
                    <input
                      value={formState.managerPhone}
                      onChange={(event) => setFormState((prev) => ({ ...prev, managerPhone: event.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </label>
                  <label>
                    <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>계획 인원</div>
                    <input
                      type="number"
                      min={0}
                      value={formState.plannedHeadcount}
                      onChange={(event) => setFormState((prev) => ({ ...prev, plannedHeadcount: event.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                <button className="btn btn-secondary" type="button" onClick={() => setIsModalOpen(false)}>
                  취소
                </button>
                <button className="btn btn-primary" type="submit">
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
