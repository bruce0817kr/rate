import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { apiService, ProjectPersonnelRecord, ProjectRecord, TeamRecord } from '../services/api';
import { showToast } from '../components/ui/Toast';
import { ProjectFormData, ProjectModal } from '../components/modals/ProjectModal';
import { useFiscalYear } from '../context/FiscalYearContext';

const typeLabels: Record<string, string> = {
  NATIONAL_RD: '국가 R&D',
  LOCAL_SUBSIDY: '지자체 보조',
  MIXED: '복합',
};

const statusLabels: Record<string, { label: string; className: string }> = {
  PLANNING: { label: '기획', className: 'badge-info' },
  APPROVED: { label: '승인', className: 'badge-warning' },
  IN_PROGRESS: { label: '진행 중', className: 'badge-success' },
  COMPLETED: { label: '완료', className: 'badge-info' },
  AUDITING: { label: '감사 중', className: 'badge-error' },
};

interface ProjectListRow extends ProjectRecord {
  participationRate: number;
  memberCount: number;
}

type SortKey = 'name' | 'projectType' | 'managingTeam' | 'participationRate' | 'memberCount' | 'status';

const toPayload = (form: ProjectFormData, fiscalYear: number) => {
  const participatingTeams = form.participatingTeams
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!participatingTeams.includes(form.managingTeam.trim())) {
    participatingTeams.unshift(form.managingTeam.trim());
  }

  return {
    name: form.name.trim(),
    fiscalYear,
    projectType: form.projectType,
    managingDepartment: form.managingDepartment.trim(),
    managingTeam: form.managingTeam.trim(),
    participatingTeams,
    startDate: `${form.startDate}T00:00:00.000Z`,
    endDate: `${form.endDate}T00:00:00.000Z`,
    totalBudget: Number(form.totalBudget),
    personnelBudget: Number(form.personnelBudget),
    status: form.status,
  };
};

export const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const { fiscalYear } = useFiscalYear();
  const [projects, setProjects] = useState<ProjectListRow[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [copyingYear, setCopyingYear] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectsData, assignments, teamRecords] = await Promise.all([
        apiService.getProjects(fiscalYear),
        apiService.getProjectPersonnel(fiscalYear),
        apiService.getTeams().catch(() => [] as TeamRecord[]),
      ]);

      const activeAssignments = assignments.filter(
        (assignment: ProjectPersonnelRecord) => !assignment.endDate || new Date(assignment.endDate) > new Date(),
      );

      setProjects(
        projectsData.map((project) => {
          const projectAssignments = activeAssignments.filter((assignment) => assignment.project?.id === project.id);
          const totalParticipationRate = projectAssignments.reduce(
            (sum, assignment) => sum + Number(assignment.participationRate || 0),
            0,
          );
          const memberCount = projectAssignments.length;
          return {
            ...project,
            participationRate: memberCount > 0 ? totalParticipationRate / memberCount : 0,
            memberCount,
          };
        }),
      );
      setTeams(teamRecords.filter((team) => team.isActive));
    } catch {
      setProjects([]);
      setTeams([]);
      setError('사업 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const visibleProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const direction = sortDir === 'asc' ? 1 : -1;

    return projects
      .filter((project) => {
        if (typeFilter !== 'ALL' && project.projectType !== typeFilter) return false;
        if (statusFilter !== 'ALL' && project.status !== statusFilter) return false;
        if (!query) return true;
        return (
          project.name.toLowerCase().includes(query) ||
          project.managingTeam.toLowerCase().includes(query) ||
          project.managingDepartment.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (sortKey === 'name') return a.name.localeCompare(b.name, 'ko') * direction;
        if (sortKey === 'projectType') return a.projectType.localeCompare(b.projectType) * direction;
        if (sortKey === 'managingTeam') return a.managingTeam.localeCompare(b.managingTeam, 'ko') * direction;
        if (sortKey === 'participationRate') return (a.participationRate - b.participationRate) * direction;
        if (sortKey === 'memberCount') return (a.memberCount - b.memberCount) * direction;
        return a.status.localeCompare(b.status) * direction;
      });
  }, [projects, searchTerm, typeFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(visibleProjects.length / PAGE_SIZE));
  const pagedProjects = visibleProjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setSortDir('asc');
  };

  const handleSaveProject = async (form: ProjectFormData) => {
    try {
      const payload = toPayload(form, fiscalYear);
      if (editingProject) {
        await apiService.updateProject(editingProject.id, payload);
        showToast('success', '사업 정보를 수정했습니다.');
      } else {
        await apiService.createProject(payload);
        showToast('success', '사업을 추가했습니다.');
      }
      setEditingProject(null);
      await loadProjects();
    } catch (error: any) {
      showToast('error', `사업 저장에 실패했습니다.${error?.message ? ` (${error.message})` : ''}`);
      throw error;
    }
  };

  const handleDeleteProject = async (project: ProjectRecord) => {
    if (!window.confirm(`사업 '${project.name}'을 삭제하시겠습니까?`)) return;

    try {
      await apiService.deleteProject(project.id);
      await loadProjects();
      showToast('success', '사업을 삭제했습니다.');
    } catch (error: any) {
      showToast('error', `사업 삭제에 실패했습니다.${error?.message ? ` (${error.message})` : ''}`);
    }
  };

  const copyPreviousYear = async () => {
    const sourceYear = fiscalYear - 1;
    if (!window.confirm(`${sourceYear}년 데이터를 ${fiscalYear}년으로 복사하시겠습니까? 이미 있는 항목은 건너뜁니다.`)) return;

    setCopyingYear(true);
    try {
      const result = await apiService.copyFiscalYear(sourceYear, fiscalYear);
      await loadProjects();
      showToast(
        'success',
        `복사 완료: 사업 ${result.projectsCreated}건, 참여 ${result.assignmentsCreated}건, 평균연봉 ${result.salaryBandsCreated}건`,
      );
    } catch (error: any) {
      showToast('error', `전년도 복사에 실패했습니다.${error?.message ? ` (${error.message})` : ''}`);
    } finally {
      setCopyingYear(false);
    }
  };

  const sortIndicator = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>사업 관리</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {fiscalYear}년 사업을 추가, 수정, 삭제하고 참여율 현황을 확인합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" type="button" onClick={copyPreviousYear} disabled={copyingYear}>
            {copyingYear ? '전년도 복사 중...' : `${fiscalYear - 1}년 복사`}
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              setEditingProject(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} style={{ marginRight: 'var(--space-2)' }} />
            사업 추가
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-2)' }}>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="사업명, 주관 팀, 주관 부서 검색"
          />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="ALL">전체 유형</option>
            <option value="NATIONAL_RD">국가 R&D</option>
            <option value="LOCAL_SUBSIDY">지자체 보조</option>
            <option value="MIXED">복합</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">전체 상태</option>
            <option value="PLANNING">기획</option>
            <option value="APPROVED">승인</option>
            <option value="IN_PROGRESS">진행 중</option>
            <option value="COMPLETED">완료</option>
            <option value="AUDITING">감사 중</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>사업 목록을 불러오는 중입니다...</div>
        ) : error ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-error)' }}>{error}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>사업명{sortIndicator('name')}</th>
                <th onClick={() => handleSort('projectType')} style={{ cursor: 'pointer' }}>유형{sortIndicator('projectType')}</th>
                <th onClick={() => handleSort('managingTeam')} style={{ cursor: 'pointer' }}>주관 팀{sortIndicator('managingTeam')}</th>
                <th onClick={() => handleSort('participationRate')} style={{ cursor: 'pointer' }}>평균 참여율{sortIndicator('participationRate')}</th>
                <th onClick={() => handleSort('memberCount')} style={{ cursor: 'pointer' }}>참여 인원{sortIndicator('memberCount')}</th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>상태{sortIndicator('status')}</th>
                <th style={{ textAlign: 'right' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {pagedProjects.map((project) => (
                <tr key={project.id}>
                  <td title={project.name}>
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${project.id}`)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        color: 'var(--color-accent)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        textAlign: 'left',
                      }}
                    >
                      {project.name}
                    </button>
                  </td>
                  <td>{typeLabels[project.projectType] || project.projectType}</td>
                  <td>{project.managingTeam}</td>
                  <td>{project.participationRate.toFixed(1)}%</td>
                  <td>{project.memberCount}</td>
                  <td>
                    <span className={`badge ${statusLabels[project.status]?.className || 'badge-info'}`}>
                      {statusLabels[project.status]?.label || project.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 'var(--space-1)' }}>
                      <button className="btn btn-secondary" style={{ padding: 'var(--space-1) var(--space-2)', fontSize: '0.75rem' }} onClick={() => navigate(`/projects/${project.id}`)}>
                        상세
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: 'var(--space-1) var(--space-2)', fontSize: '0.75rem' }}
                        onClick={() => {
                          setEditingProject(project);
                          setIsModalOpen(true);
                        }}
                      >
                        <Pencil size={12} style={{ marginRight: 4 }} />
                        수정
                      </button>
                      <button className="btn btn-secondary" style={{ padding: 'var(--space-1) var(--space-2)', fontSize: '0.75rem' }} onClick={() => handleDeleteProject(project)}>
                        <Trash2 size={12} style={{ marginRight: 4 }} />
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleProjects.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-6)' }}>
                    조건에 맞는 사업이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16, fontSize: '0.875rem' }}>
          <button className="btn btn-secondary" style={{ padding: '4px 12px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>이전</button>
          <span style={{ color: 'var(--color-text-secondary)' }}>{page} / {totalPages} ({visibleProjects.length}건)</span>
          <button className="btn btn-secondary" style={{ padding: '4px 12px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>다음</button>
        </div>
      )}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        editData={editingProject}
        defaultFiscalYear={fiscalYear}
        teams={teams}
      />
    </div>
  );
};
