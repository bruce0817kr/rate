import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface Personnel {
  id: string;
  name: string;
  team: string;
  position: string;
}

interface ProjectPersonnelFormData {
  personnelId: string;
  participationRate: number;
  role: string;
  startDate: string;
}

interface ProjectMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProjectPersonnelFormData) => void;
  availablePersonnel: Personnel[];
  currentParticipationRate?: number;
}

const roles = [
  { value: 'PRINCIPAL_INVESTIGATOR', label: '연구책임자(PI)' },
  { value: 'PARTICIPATING_RESEARCHER', label: '참여연구원' },
];

export const ProjectMemberModal: React.FC<ProjectMemberModalProps> = ({
  isOpen,
  onClose,
  onSave,
  availablePersonnel,
  currentParticipationRate = 0,
}) => {
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [participationRate, setParticipationRate] = useState(50);
  const [role, setRole] = useState('PARTICIPATING_RESEARCHER');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const totalAfterAdd = currentParticipationRate + participationRate;
  const willExceed100 = totalAfterAdd > 100;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPersonnelId) {
      alert('팀원을 선택해주세요.');
      return;
    }
    if (willExceed100) {
      alert('총 참여율이 100%를 초과합니다. 참여율을 조정해주세요.');
      return;
    }

    onSave({ personnelId: selectedPersonnelId, participationRate, role, startDate });
    onClose();
    setSelectedPersonnelId('');
    setParticipationRate(50);
    setRole('PARTICIPATING_RESEARCHER');
    setStartDate(new Date().toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
          maxWidth: 500,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>참여 인력 추가</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 'var(--space-1)', color: 'var(--color-text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: 'var(--space-1)' }}>팀원 선택 *</label>
              <select
                value={selectedPersonnelId}
                onChange={(event) => setSelectedPersonnelId(event.target.value)}
                required
                style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
              >
                <option value="">팀원을 선택하세요...</option>
                {availablePersonnel.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} ({person.team} / {person.position})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: 'var(--space-1)' }}>역할 *</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                required
                style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
              >
                {roles.map((roleOption) => (
                  <option key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                연구책임자(PI)는 1인당 최대 3개까지 허용됩니다.
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: 'var(--space-1)' }}>참여율(%) *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <input
                  type="number"
                  value={participationRate}
                  onChange={(event) => setParticipationRate(Math.max(0, Math.min(100, parseInt(event.target.value, 10) || 0)))}
                  min={0}
                  max={100}
                  required
                  style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
                />
                <span style={{ fontWeight: 500, minWidth: 40 }}>%</span>
              </div>
              <div style={{ marginTop: 'var(--space-2)' }}>
                <input
                  type="range"
                  value={participationRate}
                  onChange={(event) => setParticipationRate(parseInt(event.target.value, 10))}
                  min={0}
                  max={100}
                  style={{ width: '100%' }}
                />
              </div>

              {currentParticipationRate > 0 && (
                <div
                  style={{
                    marginTop: 'var(--space-2)',
                    padding: 'var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: willExceed100 ? 'rgba(211, 94, 59, 0.1)' : 'rgba(45, 90, 39, 0.1)',
                    border: `1px solid ${willExceed100 ? 'var(--color-error)' : 'var(--color-success)'}`,
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: willExceed100 ? 'var(--color-error)' : 'var(--color-success)', fontWeight: 500 }}>
                    현재 사업 참여율 합계: {currentParticipationRate}%
                    {willExceed100 ? (
                      <span style={{ marginLeft: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} /> 추가 시 {totalAfterAdd}% (100% 초과)
                      </span>
                    ) : (
                      <span style={{ marginLeft: 'var(--space-2)' }}>추가 시 {totalAfterAdd}%</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: 'var(--space-1)' }}>참여 시작일 *</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
                style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={willExceed100}>
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
