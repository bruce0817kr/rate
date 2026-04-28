import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface TeamMemberFormData {
  employeeId: string;
  name: string;
  team: string;
  position: string;
  salaryReferencePosition?: string;
  positionAverageAnnualSalary?: number;
  highestEducation?: string;
  educationYear?: number;
  department?: string;
  employmentType?: string;
  hireDate?: string;
}

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TeamMemberFormData) => void | Promise<void>;
  teamOptions: string[];
  editData?: TeamMemberFormData | null;
}

const initialForm: TeamMemberFormData = {
  employeeId: '',
  name: '',
  team: '',
  position: '',
  salaryReferencePosition: '',
  positionAverageAnnualSalary: undefined,
  highestEducation: '',
  educationYear: undefined,
  department: '',
  employmentType: 'FULL_TIME',
  hireDate: '',
};

const employmentLabelMap: Record<string, string> = {
  FULL_TIME: '정규직',
  CONTRACT: '계약직',
  PART_TIME: '시간제',
  DISPATCHED: '파견',
};

const defaultPositionOptions = ['본부장', '팀장', '수석부장', '부장', '차장', '과장', '대리', '주임', '사원'];
const salaryReferenceOptions = ['부장', '차장', '과장', '대리', '주임', '사원'];

export const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
  isOpen,
  onClose,
  onSave,
  teamOptions,
  editData,
}) => {
  const [formData, setFormData] = useState<TeamMemberFormData>(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(editData ? { ...initialForm, ...editData } : initialForm);
    setSaving(false);
  }, [editData, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...formData,
        salaryReferencePosition: formData.salaryReferencePosition?.trim() || undefined,
        highestEducation: formData.highestEducation?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        hireDate: formData.hireDate?.trim() || undefined,
        employmentType: formData.employmentType?.trim() || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

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
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: 760,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{editData ? '팀원 수정' : '팀원 추가'}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <label>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>사번 *</div>
                <input
                  required
                  value={formData.employeeId}
                  onChange={(event) => setFormData((prev) => ({ ...prev, employeeId: event.target.value }))}
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>이름 *</div>
                <input
                  required
                  value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  style={{ width: '100%' }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <label>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>팀 *</div>
                <input
                  list="team-options"
                  required
                  value={formData.team}
                  onChange={(event) => setFormData((prev) => ({ ...prev, team: event.target.value }))}
                  style={{ width: '100%' }}
                />
                <datalist id="team-options">
                  {teamOptions.map((teamName) => (
                    <option key={teamName} value={teamName} />
                  ))}
                </datalist>
              </label>
              <label>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>보직/직위 *</div>
                <input
                  list="position-options"
                  required
                  value={formData.position}
                  onChange={(event) => setFormData((prev) => ({ ...prev, position: event.target.value }))}
                  style={{ width: '100%' }}
                />
                <datalist id="position-options">
                  {defaultPositionOptions.map((position) => (
                    <option key={position} value={position} />
                  ))}
                </datalist>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-3)' }}>
              <label>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>급여 기준 직급</div>
                <input
                  list="salary-reference-options"
                  value={formData.salaryReferencePosition || ''}
                  onChange={(event) => setFormData((prev) => ({ ...prev, salaryReferencePosition: event.target.value }))}
                  style={{ width: '100%' }}
                />
                <datalist id="salary-reference-options">
                  {salaryReferenceOptions.map((position) => (
                    <option key={position} value={position} />
                  ))}
                </datalist>
              </label>
              <label>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>직급 평균 연봉(원)</div>
                <input
                  type="number"
                  min={0}
                  value={formData.positionAverageAnnualSalary ?? ''}
                  onChange={(event) => setFormData((prev) => ({ ...prev, positionAverageAnnualSalary: event.target.value ? Number(event.target.value) : undefined }))}
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>최종 학위</div>
                <input
                  value={formData.highestEducation || ''}
                  onChange={(event) => setFormData((prev) => ({ ...prev, highestEducation: event.target.value }))}
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>학위 연도</div>
                <input
                  type="number"
                  min={1970}
                  max={new Date().getFullYear()}
                  value={formData.educationYear || ''}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      educationYear: event.target.value ? Number(event.target.value) : undefined,
                    }))
                  }
                  style={{ width: '100%' }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
              <label>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>부서</div>
                <input
                  value={formData.department || ''}
                  onChange={(event) => setFormData((prev) => ({ ...prev, department: event.target.value }))}
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>고용 형태</div>
                <select
                  value={formData.employmentType || 'FULL_TIME'}
                  onChange={(event) => setFormData((prev) => ({ ...prev, employmentType: event.target.value }))}
                  style={{ width: '100%' }}
                >
                  {Object.entries(employmentLabelMap).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>입사일</div>
                <input
                  type="date"
                  value={formData.hireDate || ''}
                  onChange={(event) => setFormData((prev) => ({ ...prev, hireDate: event.target.value }))}
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          </div>

          <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '저장 중...' : editData ? '수정 저장' : '추가 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
