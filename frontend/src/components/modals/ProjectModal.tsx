import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ProjectRecord, TeamRecord } from '../../services/api';

export interface ProjectFormData {
  name: string;
  projectType: 'NATIONAL_RD' | 'LOCAL_SUBSIDY' | 'MIXED';
  managingDepartment: string;
  managingTeam: string;
  participatingTeams: string;
  startDate: string;
  endDate: string;
  totalBudget: string;
  personnelBudget: string;
  status: 'PLANNING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'AUDITING';
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProjectFormData) => void | Promise<void>;
  editData?: ProjectRecord | null;
  defaultFiscalYear?: number;
  teams?: TeamRecord[];
}

const getDefaultForm = (defaultFiscalYear?: number): ProjectFormData => {
  const year = defaultFiscalYear || new Date().getFullYear();
  return {
    name: '',
    projectType: 'NATIONAL_RD',
    managingDepartment: '',
    managingTeam: '',
    participatingTeams: '',
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    totalBudget: '',
    personnelBudget: '',
    status: 'PLANNING',
  };
};

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editData,
  defaultFiscalYear,
  teams = [],
}) => {
  const [form, setForm] = useState<ProjectFormData>(() => getDefaultForm(defaultFiscalYear));
  const [saving, setSaving] = useState(false);

  const departmentOptions = useMemo(
    () =>
      Array.from(new Set(teams.map((team) => (team.department || '').trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'ko'),
      ),
    [teams],
  );

  const teamOptions = useMemo(() => {
    if (!form.managingDepartment) {
      return teams.map((team) => team.name).sort((a, b) => a.localeCompare(b, 'ko'));
    }

    return teams
      .filter((team) => (team.department || '').trim() === form.managingDepartment)
      .map((team) => team.name)
      .sort((a, b) => a.localeCompare(b, 'ko'));
  }, [teams, form.managingDepartment]);

  useEffect(() => {
    if (!isOpen) return;
    if (!editData) {
      setForm(getDefaultForm(defaultFiscalYear));
      return;
    }

    setForm({
      name: editData.name,
      projectType: editData.projectType as ProjectFormData['projectType'],
      managingDepartment: editData.managingDepartment,
      managingTeam: editData.managingTeam,
      participatingTeams: editData.participatingTeams.join(', '),
      startDate: editData.startDate.slice(0, 10),
      endDate: editData.endDate.slice(0, 10),
      totalBudget: String(editData.totalBudget),
      personnelBudget: String(editData.personnelBudget),
      status: editData.status as ProjectFormData['status'],
    });
  }, [defaultFiscalYear, editData, isOpen]);

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
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
      onClick={onClose}
    >
      <div className="card" style={{ width: '100%', maxWidth: 760, padding: 'var(--space-4)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{editData ? '사업 수정' : '사업 추가'}</h3>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <label>
                <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>사업명 *</div>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>사업 유형 *</div>
                <select
                  value={form.projectType}
                  onChange={(e) => setForm((prev) => ({ ...prev, projectType: e.target.value as ProjectFormData['projectType'] }))}
                  style={{ width: '100%' }}
                >
                  <option value="NATIONAL_RD">국가 R&D</option>
                  <option value="LOCAL_SUBSIDY">지자체 보조</option>
                  <option value="MIXED">복합</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <label>
                <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>주관 부서 *</div>
                <select
                  required
                  value={form.managingDepartment}
                  onChange={(e) => {
                    const nextDepartment = e.target.value;
                    const candidateTeams = teams
                      .filter((team) => (team.department || '').trim() === nextDepartment)
                      .map((team) => team.name);

                    setForm((prev) => ({
                      ...prev,
                      managingDepartment: nextDepartment,
                      managingTeam: candidateTeams.includes(prev.managingTeam)
                        ? prev.managingTeam
                        : (candidateTeams[0] || ''),
                    }));
                  }}
                  style={{ width: '100%' }}
                >
                  <option value="">부서를 선택하세요</option>
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>주관 팀 *</div>
                <select
                  required
                  value={form.managingTeam}
                  onChange={(e) => setForm((prev) => ({ ...prev, managingTeam: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  <option value="">팀을 선택하세요</option>
                  {teamOptions.map((teamName) => (
                    <option key={teamName} value={teamName}>
                      {teamName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>참여 팀</div>
              <input
                value={form.participatingTeams}
                onChange={(e) => setForm((prev) => ({ ...prev, participatingTeams: e.target.value }))}
                placeholder="쉼표(,)로 구분"
                style={{ width: '100%' }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <label>
                <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>시작일 *</div>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>종료일 *</div>
                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
              <label>
                <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>총 사업비 *</div>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.totalBudget}
                  onChange={(e) => setForm((prev) => ({ ...prev, totalBudget: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>인건비 *</div>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.personnelBudget}
                  onChange={(e) => setForm((prev) => ({ ...prev, personnelBudget: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                <div style={{ marginBottom: 'var(--space-1)', fontSize: '0.875rem', fontWeight: 500 }}>상태</div>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as ProjectFormData['status'] }))}
                  style={{ width: '100%' }}
                >
                  <option value="PLANNING">기획</option>
                  <option value="APPROVED">승인</option>
                  <option value="IN_PROGRESS">진행 중</option>
                  <option value="COMPLETED">완료</option>
                  <option value="AUDITING">감사 중</option>
                </select>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            <button className="btn btn-secondary" type="button" onClick={onClose} disabled={saving}>
              취소
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
