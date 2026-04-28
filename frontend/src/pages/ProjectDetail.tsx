import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Plus } from 'lucide-react';
import { apiService, PersonnelRecord, ProjectPersonnelRecord, ProjectRecord } from '../services/api';
import { showToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
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

const roleLabels: Record<string, string> = {
  PRINCIPAL_INVESTIGATOR: '연구책임자(PI)',
  CO_INVESTIGATOR: '공동연구원',
  RESEARCH_ASSISTANT: '연구보조원',
  PARTICIPATING_RESEARCHER: '참여연구원',
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

type SegmentDraft = {
  id?: string;
  localId: string;
  startDate: string;
  endDate: string;
  participationRate: number;
  personnelCostOverride: number | null;
  sortOrder: number;
  notes?: string;
};

type AssignmentDraft = {
  actualAnnualSalaryOverride: number;
  segments: SegmentDraft[];
};

const toDateInput = (value?: string | Date | null): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const getAverageAnnualSalary = (value?: number | null): number => Number(value ?? 0);

const formatWithComma = (value: number | string | null | undefined): string => {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(numeric) ? Math.round(numeric).toLocaleString('ko-KR') : '';
};

const parseNumberInput = (raw: string): number => {
  const numeric = Number(raw.replace(/,/g, '').replace(/[^^\d.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

const getPositionRank = (position?: string): number => (position ? positionPriority[position.trim()] ?? 999 : 999);

const compareByPositionThenName = (
  left?: { position?: string; name?: string },
  right?: { position?: string; name?: string },
): number => {
  const rankDiff = getPositionRank(left?.position) - getPositionRank(right?.position);
  return rankDiff !== 0 ? rankDiff : (left?.name || '').localeCompare(right?.name || '', 'ko');
};

const countMonthsInclusive = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()) + 1;
};

const deriveEndDateFromMonths = (startDate: string, months: number): string => {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return '';
  const next = new Date(start);
  next.setUTCMonth(next.getUTCMonth() + Math.max(1, Math.round(months || 1)));
  next.setUTCDate(next.getUTCDate() - 1);
  return toDateInput(next);
};

const getProjectDurationMonths = (project?: ProjectRecord | null): number => {
  if (!project) return 12;
  return countMonthsInclusive(toDateInput(project.startDate), toDateInput(project.endDate));
};

const calcSegmentFormulaCost = (annualSalary: number, segment: SegmentDraft): number => {
  const months = countMonthsInclusive(segment.startDate, segment.endDate);
  return Math.max(0, Math.round((annualSalary / 12) * months * (segment.participationRate / 100)));
};

const calcSegmentAppliedCost = (annualSalary: number, segment: SegmentDraft): number => {
  if (segment.personnelCostOverride !== null && Number.isFinite(segment.personnelCostOverride)) {
    return Math.max(0, segment.personnelCostOverride);
  }
  return calcSegmentFormulaCost(annualSalary, segment);
};

const getCurrentSegmentRate = (segments: SegmentDraft[]): number => {
  const now = new Date();
  const current = segments.find((segment) => new Date(segment.startDate) <= now && new Date(segment.endDate) >= now);
  return Number(current?.participationRate || 0);
};

const buildInitialSegments = (assignment: ProjectPersonnelRecord, project: ProjectRecord): SegmentDraft[] => {
  if (assignment.segments?.length) {
    return [...assignment.segments]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((segment, index) => ({
        id: segment.id,
        localId: segment.id || `${assignment.id}-${index}`,
        startDate: toDateInput(segment.startDate),
        endDate: toDateInput(segment.endDate),
        participationRate: Number(segment.participationRate || 0),
        personnelCostOverride: segment.personnelCostOverride == null ? null : Number(segment.personnelCostOverride),
        sortOrder: segment.sortOrder ?? index,
        notes: segment.notes ?? undefined,
      }));
  }

  const startDate = toDateInput(assignment.startDate) || toDateInput(project.startDate);
  let endDate = toDateInput(assignment.endDate);
  if (!endDate) {
    const start = new Date(startDate);
    const months = Math.max(1, Number(assignment.participationMonths || getProjectDurationMonths(project)));
    const next = new Date(start);
    next.setUTCMonth(next.getUTCMonth() + months);
    next.setUTCDate(next.getUTCDate() - 1);
    endDate = toDateInput(next);
  }

  return [
    {
      localId: `${assignment.id}-fallback`,
      startDate,
      endDate,
      participationRate: Number(assignment.participationRate || 0),
      personnelCostOverride: assignment.personnelCostOverride == null ? null : Number(assignment.personnelCostOverride),
      sortOrder: 0,
    },
  ];
};

const validateSegments = (segments: SegmentDraft[], project: ProjectRecord | null): string | null => {
  if (!project) return null;
  const projectStart = new Date(project.startDate);
  const projectEnd = new Date(project.endDate);
  const ordered = [...segments].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  for (let i = 0; i < ordered.length; i += 1) {
    const segment = ordered[i];
    const start = new Date(segment.startDate);
    const end = new Date(segment.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '구간 날짜를 모두 입력해야 합니다.';
    if (end < start) return '구간 종료일은 시작일보다 빠를 수 없습니다.';
    if (start < projectStart || end > projectEnd) return '모든 구간은 사업 기간 안에 있어야 합니다.';
    if (i > 0 && start <= new Date(ordered[i - 1].endDate)) return '구간 기간이 서로 겹칠 수 없습니다.';
  }

  return null;
};

export const ProjectDetail: React.FC = () => {
  const { canManageActualSalary } = useAuth();
  const { fiscalYear } = useFiscalYear();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [assignments, setAssignments] = useState<ProjectPersonnelRecord[]>([]);
  const [allPersonnel, setAllPersonnel] = useState<PersonnelRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AssignmentDraft>>({});
  const [salaryByReferencePosition, setSalaryByReferencePosition] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [searchCandidate, setSearchCandidate] = useState('');
  const [finalTotalInput, setFinalTotalInput] = useState('');
  const [isManualTotal, setIsManualTotal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [assignmentOrder, setAssignmentOrder] = useState<string[]>([]);
  const [savingAllChanges, setSavingAllChanges] = useState(false);

  const loadProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [projectData, allAssignments, personnel, salaryBands] = await Promise.all([
        apiService.getProject(id),
        apiService.getProjectPersonnel(fiscalYear),
        apiService.getPersonnel(),
        apiService.getSalaryBands(fiscalYear),
      ]);
      const positionSalaryMap = salaryBands.reduce<Record<string, number>>((acc, item) => {
        acc[item.position] = Number(item.averageAnnualSalary);
        return acc;
      }, {});
      const projectAssignments = allAssignments.filter((assignment) => assignment.project?.id === id);
      const nextDrafts: Record<string, AssignmentDraft> = {};
      projectAssignments.forEach((assignment) => {
        const referencePosition = assignment.personnel?.salaryReferencePosition || assignment.personnel?.position;
        const averageSalary = referencePosition ? positionSalaryMap[referencePosition] : undefined;
        const actualAnnualSalaryOverride = Number(assignment.actualAnnualSalaryOverride ?? 0) > 0
          ? Number(assignment.actualAnnualSalaryOverride)
          : getAverageAnnualSalary(averageSalary ?? assignment.personnel?.positionAverageAnnualSalary);
        nextDrafts[assignment.id] = { actualAnnualSalaryOverride, segments: buildInitialSegments(assignment, projectData) };
      });
      setProject(projectData);
      setAssignments(projectAssignments);
      setAllPersonnel(personnel.filter((person) => person.isActive));
      setSalaryByReferencePosition(positionSalaryMap);
      setDrafts(nextDrafts);
      setAssignmentOrder([...projectAssignments].sort((a, b) => compareByPositionThenName(a.personnel, b.personnel)).map((item) => item.id));
    } catch {
      setProject(null);
      setAssignments([]);
      setAllPersonnel([]);
      setDrafts({});
      setAssignmentOrder([]);
      setError('사업 상세 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear, id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const assignmentByPersonnelId = useMemo(() => {
    const map = new Map<string, ProjectPersonnelRecord>();
    assignments.forEach((assignment) => assignment.personnel?.id && map.set(assignment.personnel.id, assignment));
    return map;
  }, [assignments]);

  const projectTeams = useMemo(() => new Set(project ? [project.managingTeam, ...(project.participatingTeams || [])].filter(Boolean) : []), [project]);

  const displayedAssignments = useMemo(() => {
    const byId = new Map(assignments.map((assignment) => [assignment.id, assignment]));
    const ordered = assignmentOrder.map((assignmentId) => byId.get(assignmentId)).filter(Boolean) as ProjectPersonnelRecord[];
    const missing = assignments.filter((assignment) => !assignmentOrder.includes(assignment.id)).sort((a, b) => compareByPositionThenName(a.personnel, b.personnel));
    return [...ordered, ...missing];
  }, [assignments, assignmentOrder]);

  const candidatePersonnel = useMemo(() => {
    const query = searchCandidate.trim().toLowerCase();
    return allPersonnel
      .filter((person) => !assignmentByPersonnelId.has(person.id))
      .filter((person) => (showAllTeams ? true : projectTeams.has(person.team)))
      .filter((person) => !query || person.name.toLowerCase().includes(query) || person.team.toLowerCase().includes(query) || person.employeeId.toLowerCase().includes(query))
      .sort(compareByPositionThenName);
  }, [allPersonnel, assignmentByPersonnelId, showAllTeams, projectTeams, searchCandidate]);

  const totalParticipationRate = useMemo(() => assignments.reduce((sum, assignment) => sum + (drafts[assignment.id] ? getCurrentSegmentRate(drafts[assignment.id].segments) : 0), 0), [assignments, drafts]);
  const calculatedPersonnelTotal = useMemo(() => assignments.reduce((sum, assignment) => sum + (drafts[assignment.id]?.segments.reduce((s, segment) => s + calcSegmentFormulaCost(drafts[assignment.id].actualAnnualSalaryOverride, segment), 0) || 0), 0), [assignments, drafts]);
  const appliedPersonnelTotal = useMemo(() => assignments.reduce((sum, assignment) => sum + (drafts[assignment.id]?.segments.reduce((s, segment) => s + calcSegmentAppliedCost(drafts[assignment.id].actualAnnualSalaryOverride, segment), 0) || 0), 0), [assignments, drafts]);

  useEffect(() => {
    if (!project) return;
    const hasManualTotal = project.personnelCostFinalTotal !== null && project.personnelCostFinalTotal !== undefined;
    setIsManualTotal(hasManualTotal);
    setFinalTotalInput(hasManualTotal ? formatWithComma(Number(project.personnelCostFinalTotal)) : formatWithComma(appliedPersonnelTotal));
  }, [project, appliedPersonnelTotal]);

  const currentTotalCost = isManualTotal ? Math.max(0, parseNumberInput(finalTotalInput || '0')) : appliedPersonnelTotal;

  const updateDraft = (assignmentId: string, updater: (draft: AssignmentDraft) => AssignmentDraft) => {
    setDrafts((prev) => (prev[assignmentId] ? { ...prev, [assignmentId]: updater(prev[assignmentId]) } : prev));
  };

  const updateSegment = (assignmentId: string, localId: string, patch: Partial<SegmentDraft>) => {
    updateDraft(assignmentId, (draft) => ({
      ...draft,
      segments: draft.segments.map((segment) => (segment.localId === localId ? { ...segment, ...patch } : segment)),
    }));
  };

  const addSegment = (assignmentId: string) => {
    updateDraft(assignmentId, (draft) => {
      const lastSegment = draft.segments[draft.segments.length - 1];
      const startDate = lastSegment?.endDate || toDateInput(project?.startDate);
      return {
        ...draft,
        segments: [...draft.segments, { localId: `${assignmentId}-${Date.now()}`, startDate, endDate: startDate, participationRate: 0, personnelCostOverride: null, sortOrder: draft.segments.length }],
      };
    });
  };

  const removeSegment = (assignmentId: string, localId: string) => {
    updateDraft(assignmentId, (draft) => {
      const nextSegments = draft.segments.filter((segment) => segment.localId !== localId).map((segment, index) => ({ ...segment, sortOrder: index }));
      return { ...draft, segments: nextSegments.length ? nextSegments : draft.segments };
    });
  };

  const addPersonnelToProject = async (person: PersonnelRecord) => {
    if (!project) return;
    const referencePosition = person.salaryReferencePosition || person.position;
    const actualAnnualSalaryOverride = getAverageAnnualSalary(
      salaryByReferencePosition[referencePosition] ?? person.positionAverageAnnualSalary,
    );
    const projectStart = toDateInput(project.startDate);
    const projectEnd = toDateInput(project.endDate);
    try {
      await apiService.createProjectPersonnel({
        projectId: project.id,
        personnelId: person.id,
        participationRate: 10,
        fiscalYear,
        actualAnnualSalaryOverride,
        participationMonths: getProjectDurationMonths(project),
        role: 'PARTICIPATING_RESEARCHER',
        startDate: projectStart,
        participatingTeam: person.team || project.managingTeam,
        segments: [{ startDate: projectStart, endDate: projectEnd, participationRate: 10, sortOrder: 0 }],
      });
      await loadProject();
      showToast('success', `${person.name} 팀원을 참여 인력으로 추가했습니다.`);
    } catch (error: any) {
      showToast('error', `참여 인력 추가에 실패했습니다.${error?.message ? ` (${error.message})` : ''}`);
    }
  };

  const saveAssignment = async (assignment: ProjectPersonnelRecord) => {
    const draft = drafts[assignment.id];
    if (!draft) return;
    const validationError = validateSegments(draft.segments, project);
    if (validationError) {
      showToast('error', validationError);
      return;
    }
    try {
      await apiService.updateProjectPersonnel(assignment.id, {
        actualAnnualSalaryOverride: Number(draft.actualAnnualSalaryOverride),
        segments: draft.segments.map((segment, index) => ({
          startDate: segment.startDate,
          endDate: segment.endDate,
          participationRate: Number(segment.participationRate),
          personnelCostOverride: segment.personnelCostOverride == null ? null : Number(segment.personnelCostOverride),
          sortOrder: index,
          notes: segment.notes,
        })),
      });
      await loadProject();
      showToast('success', '참여 구간 정보를 저장했습니다.');
    } catch (error: any) {
      showToast('error', `참여 구간 저장에 실패했습니다.${error?.message ? ` (${error.message})` : ''}`);
    }
  };

  const saveAllAssignments = async () => {
    if (!project) return;
    const invalidAssignment = displayedAssignments.find((assignment) => {
      const draft = drafts[assignment.id];
      return draft ? validateSegments(draft.segments, project) : null;
    });

    if (invalidAssignment) {
      const draft = drafts[invalidAssignment.id];
      showToast('error', validateSegments(draft.segments, project) || '참여 구간 정보를 확인해 주세요.');
      throw new Error('참여 구간 정보가 올바르지 않습니다.');
    }

    await Promise.all(
      displayedAssignments.map((assignment) => {
        const draft = drafts[assignment.id];
        if (!draft) return Promise.resolve();
        return apiService.updateProjectPersonnel(assignment.id, {
          actualAnnualSalaryOverride: Number(draft.actualAnnualSalaryOverride),
          segments: draft.segments.map((segment, index) => ({
            startDate: segment.startDate,
            endDate: segment.endDate,
            participationRate: Number(segment.participationRate),
            personnelCostOverride: segment.personnelCostOverride == null ? null : Number(segment.personnelCostOverride),
            sortOrder: index,
            notes: segment.notes,
          })),
        });
      }),
    );
  };

  const removePersonnel = async (assignmentId: string) => {
    try {
      await apiService.deleteProjectPersonnel(assignmentId);
      await loadProject();
      showToast('success', '참여 인력을 제거했습니다.');
    } catch (error: any) {
      showToast('error', `참여 인력 제거에 실패했습니다.${error?.message ? ` (${error.message})` : ''}`);
    }
  };

  const saveFinalTotal = async () => {
    if (!project) return;
    const numeric = currentTotalCost;
    if (!Number.isFinite(numeric) || numeric < 0) {
      showToast('error', '총 인건비는 0 이상의 숫자여야 합니다.');
      return;
    }
    try {
      const updated = await apiService.updateProject(project.id, { personnelCostFinalTotal: numeric });
      setProject(updated);
      showToast('success', '총 인건비를 저장했습니다.');
    } catch (error: any) {
      showToast('error', `총 인건비 저장에 실패했습니다.${error?.message ? ` (${error.message})` : ''}`);
    }
  };

  const saveAllChanges = async () => {
    if (!project) return;
    const numeric = currentTotalCost;
    if (!Number.isFinite(numeric) || numeric < 0) {
      showToast('error', '총 인건비는 0 이상의 숫자여야 합니다.');
      return;
    }

    setSavingAllChanges(true);
    try {
      await saveAllAssignments();
      const updated = await apiService.updateProject(project.id, { personnelCostFinalTotal: isManualTotal ? numeric : null });
      setProject(updated);
      await loadProject();
      showToast('success', '모든 참여율 조정과 총 인건비를 저장했습니다.');
    } catch (error: any) {
      showToast('error', `전체 저장에 실패했습니다.${error?.message ? ` (${error.message})` : ''}`);
    } finally {
      setSavingAllChanges(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>사업 상세 정보를 불러오는 중입니다...</div>;
  if (!project) return <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}><p style={{ color: 'var(--color-error)' }}>{error || '사업 정보를 찾을 수 없습니다.'}</p><button className="btn btn-secondary" onClick={() => navigate('/projects')} style={{ marginTop: 'var(--space-4)' }}>사업 목록으로</button></div>;

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <button onClick={() => navigate('/projects')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}><ArrowLeft size={16} />사업 목록으로</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}><h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{project.name}</h2><span className={`badge ${statusLabels[project.status]?.className || 'badge-info'}`}>{statusLabels[project.status]?.label || project.status}</span></div>
            <p style={{ color: 'var(--color-text-secondary)' }}>{typeLabels[project.projectType] || project.projectType} | 주관 팀: {project.managingTeam}</p>
          </div>
          <div className="card" style={{ padding: 'var(--space-3)', minWidth: 320, textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>현재 총 참여율</div>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>{totalParticipationRate.toFixed(1)}%</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>계산 총 인건비(원)</div>
            <div style={{ fontWeight: 700 }}>{calculatedPersonnelTotal.toLocaleString('ko-KR')}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>총 인건비(원)</div>
            <div style={{ fontWeight: 700 }}>{currentTotalCost.toLocaleString('ko-KR')}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div className="card" style={{ padding: 'var(--space-4)', border: dragOver ? '2px dashed var(--color-accent)' : undefined }} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); const person = candidatePersonnel.find((item) => item.id === e.dataTransfer.getData('text/personnel-id')); if (person) addPersonnelToProject(person); }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}><h3 style={{ fontSize: '1rem', fontWeight: 600 }}>참여율/인건비 조정</h3><span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>오른쪽 인력 목록에서 드래그해 추가 가능</span></div>
          {displayedAssignments.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>등록된 참여 인력이 없습니다.</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>{displayedAssignments.map((assignment) => {
            const draft = drafts[assignment.id];
            if (!draft) return null;
            const assignmentCost = draft.segments.reduce((sum, segment) => sum + calcSegmentAppliedCost(draft.actualAnnualSalaryOverride, segment), 0);
            return <div key={assignment.id} className="card" style={{ padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div><div style={{ fontWeight: 700 }}>{assignment.personnel?.name || '-'}</div><div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{(assignment.participatingTeam || assignment.personnel?.team || '-') + ' / ' + (roleLabels[assignment.role] || assignment.role)}</div></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div style={{ textAlign: 'right', minWidth: 130 }}><div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>현재 참여율</div><div style={{ fontWeight: 700 }}>{getCurrentSegmentRate(draft.segments).toFixed(1)}%</div></div>
                  <div style={{ textAlign: 'right', minWidth: 160 }}><div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>구간 합계 인건비</div><div style={{ fontWeight: 700 }}>{assignmentCost.toLocaleString('ko-KR')}</div></div>
                  <button className="btn btn-secondary" style={{ padding: 'var(--space-1) var(--space-2)' }} onClick={() => addSegment(assignment.id)}><Plus size={14} style={{ marginRight: 4 }} />구간 추가</button>
                  <button className="btn btn-secondary" style={{ padding: 'var(--space-1) var(--space-2)' }} onClick={() => saveAssignment(assignment)}><Save size={14} style={{ marginRight: 4 }} />저장</button>
                  <button className="btn btn-secondary" style={{ padding: 'var(--space-1) var(--space-2)', color: 'var(--color-error)' }} onClick={() => removePersonnel(assignment.id)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div style={{ marginBottom: 'var(--space-3)', display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}><div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>기준 평균 연봉(원)</label><div style={{ fontWeight: 600, minWidth: 180 }}>{formatWithComma(assignment.personnel?.positionAverageAnnualSalary ?? 0)}</div></div>{canManageActualSalary() && <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>실제 연봉 override(원)</label><input type="text" inputMode="numeric" value={formatWithComma(draft.actualAnnualSalaryOverride)} onChange={(e) => updateDraft(assignment.id, (current) => ({ ...current, actualAnnualSalaryOverride: Math.max(0, parseNumberInput(e.target.value)) }))} style={{ width: 180, textAlign: 'right' }} /></div>}</div>
              <table>
                <thead><tr><th>시작일</th><th>종료일</th><th>참여개월</th><th>참여율(%)</th><th>계산 인건비</th><th>수동 인건비</th><th style={{ textAlign: 'right' }}>삭제</th></tr></thead>
                <tbody>{draft.segments.map((segment, index) => <tr key={segment.localId}><td><input type="date" value={segment.startDate} onChange={(e) => updateSegment(assignment.id, segment.localId, { startDate: e.target.value, sortOrder: index })} /></td><td><input type="date" value={segment.endDate} onChange={(e) => updateSegment(assignment.id, segment.localId, { endDate: e.target.value, sortOrder: index })} /></td><td><input type="number" min={1} max={60} value={countMonthsInclusive(segment.startDate, segment.endDate) || 1} onChange={(e) => updateSegment(assignment.id, segment.localId, { endDate: deriveEndDateFromMonths(segment.startDate, Number(e.target.value || 1)), sortOrder: index })} style={{ width: 90, textAlign: 'right' }} /></td><td><input type="number" min={0} max={100} value={segment.participationRate} onChange={(e) => updateSegment(assignment.id, segment.localId, { participationRate: Math.max(0, Math.min(100, Number(e.target.value || 0))), sortOrder: index })} style={{ width: 90, textAlign: 'right' }} /></td><td style={{ textAlign: 'right' }}>{calcSegmentFormulaCost(draft.actualAnnualSalaryOverride, segment).toLocaleString('ko-KR')}</td><td><input type="text" inputMode="numeric" value={segment.personnelCostOverride === null ? '' : formatWithComma(segment.personnelCostOverride)} onChange={(e) => { const raw = e.target.value.trim(); updateSegment(assignment.id, segment.localId, { personnelCostOverride: raw ? Math.max(0, parseNumberInput(raw)) : null, sortOrder: index }); }} style={{ width: 140, textAlign: 'right' }} /></td><td style={{ textAlign: 'right' }}><button className="btn btn-secondary" style={{ padding: 'var(--space-1) var(--space-2)', color: 'var(--color-error)' }} onClick={() => removeSegment(assignment.id, segment.localId)} disabled={draft.segments.length === 1}><Trash2 size={14} /></button></td></tr>)}</tbody>
              </table>
            </div>;
          })}</div>}
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-2)' }}><span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>총 인건비</span><label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}><input type="checkbox" checked={isManualTotal} onChange={(e) => { const next = e.target.checked; setIsManualTotal(next); if (next) setFinalTotalInput(formatWithComma(appliedPersonnelTotal)); }} />수동 조정</label><input type="text" inputMode="numeric" value={isManualTotal ? finalTotalInput : formatWithComma(appliedPersonnelTotal)} onChange={(e) => { const raw = e.target.value.trim(); setFinalTotalInput(raw ? formatWithComma(Math.max(0, parseNumberInput(raw))) : ''); }} disabled={!isManualTotal} style={{ width: 180, textAlign: 'right' }} /><button className="btn btn-secondary" onClick={saveFinalTotal}>총 인건비만 저장</button><button className="btn btn-primary" onClick={saveAllChanges} disabled={savingAllChanges}>{savingAllChanges ? '전체 저장 중...' : '전체 저장'}</button></div>
        </div>
        <div className="card" style={{ padding: 'var(--space-4)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}><h3 style={{ fontSize: '1rem', fontWeight: 600 }}>인력 추가</h3><label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: '0.8125rem' }}><input type="checkbox" checked={showAllTeams} onChange={(e) => setShowAllTeams(e.target.checked)} />타 팀 포함</label></div><p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', marginBottom: 'var(--space-2)' }}>기본은 사업 수행 팀 기준으로 인력을 보여주며, 필요하면 타 팀 인력도 추가할 수 있습니다.</p><input value={searchCandidate} onChange={(e) => setSearchCandidate(e.target.value)} placeholder="이름, 팀, 사번 검색" style={{ width: '100%', marginBottom: 'var(--space-2)' }} /><div style={{ maxHeight: 460, overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}><table><thead><tr><th>성명</th><th>팀</th><th style={{ textAlign: 'right' }}>추가</th></tr></thead><tbody>{candidatePersonnel.map((person) => <tr key={person.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/personnel-id', person.id)}><td><div style={{ fontWeight: 600 }}>{person.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{person.employeeId}</div></td><td>{person.team}</td><td style={{ textAlign: 'right' }}><button className="btn btn-secondary" style={{ padding: 'var(--space-1) var(--space-2)' }} onClick={() => addPersonnelToProject(person)}><Plus size={14} style={{ marginRight: 4 }} />추가</button></td></tr>)}{candidatePersonnel.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>추가 가능한 인력이 없습니다.</td></tr>}</tbody></table></div></div>
      </div>
    </div>
  );
};
