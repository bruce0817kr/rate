import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { apiService, TeamMemberDetail as TeamMemberDetailData } from '../services/api';
import { showToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';

const profileFields: Array<{ label: string; key: 'team' | 'position' | 'highestEducation' | 'educationYear' }> = [
  { label: '팀', key: 'team' },
  { label: '보직/직위', key: 'position' },
  { label: '최종 학위', key: 'highestEducation' },
  { label: '학위 연도', key: 'educationYear' },
];

const roleLabels: Record<string, string> = {
  PRINCIPAL_INVESTIGATOR: '연구책임자(PI)',
  CO_INVESTIGATOR: '공동연구자',
  RESEARCH_ASSISTANT: '연구보조원',
  PARTICIPATING_RESEARCHER: '참여연구원',
};

export const TeamMemberDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canViewSalary } = useAuth();
  const [member, setMember] = useState<TeamMemberDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<TeamMemberDetailData>>({});

  const loadMember = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getTeamMember(id);
      setMember(data);
      setEditForm(data);
    } catch {
      setMember(null);
      setError('팀원 상세 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  const saveEdits = async () => {
    if (!member) return;

    try {
      const updated = await apiService.updatePersonnel(member.personnelId, {
        name: editForm.name,
        team: editForm.team,
        position: editForm.position,
        salaryReferencePosition: editForm.salaryReferencePosition || '',
        highestEducation: editForm.highestEducation,
        educationYear: editForm.educationYear,
      });

      setMember((current) =>
        current
          ? {
              ...current,
              name: updated.name,
              team: updated.team,
              position: updated.position,
              salaryReferencePosition: updated.salaryReferencePosition,
              positionAverageAnnualSalary: updated.positionAverageAnnualSalary,
              highestEducation: updated.highestEducation,
              educationYear: updated.educationYear,
            }
          : current,
      );
      setIsEditing(false);
      showToast('success', '팀원 정보를 수정했습니다.');
    } catch {
      showToast('error', '팀원 정보 수정에 실패했습니다.');
    }
  };

  const removeParticipation = async (projectPersonnelId: string) => {
    try {
      await apiService.deleteProjectPersonnel(projectPersonnelId);
      await loadMember();
      showToast('success', '참여 이력을 삭제했습니다.');
    } catch {
      showToast('error', '참여 이력 삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>팀원 상세 정보를 불러오는 중입니다...</div>;
  }

  if (!member) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
        <p style={{ color: 'var(--color-error)' }}>{error || '팀원 정보를 찾을 수 없습니다.'}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/team-members')} style={{ marginTop: 'var(--space-4)' }}>
          팀원 목록으로
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <button
          onClick={() => navigate('/team-members')}
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
          팀원 목록으로
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>{member.name}</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {member.team} | {member.position} | 사번: {member.employeeId}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsEditing((value) => !value)}>
            <Edit size={16} style={{ marginRight: 'var(--space-2)' }} />
            {isEditing ? '취소' : '수정'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>참여 중인 사업</h3>
          {member.activeParticipations.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>현재 참여 중인 사업이 없습니다.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {member.activeParticipations.map((participation) => (
                <div
                  key={participation.projectPersonnelId}
                  style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{participation.projectName}</div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                        {roleLabels[participation.role] || participation.role} | {Number(participation.participationRate || 0).toFixed(1)}%
                      </div>
                    </div>
                    <button
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-error)' }}
                      onClick={() => removeParticipation(participation.projectPersonnelId)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ marginTop: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {new Date(participation.startDate).toLocaleDateString('ko-KR')} ~{' '}
                    {participation.endDate ? new Date(participation.endDate).toLocaleDateString('ko-KR') : '현재'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>기본 정보</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {profileFields.map(({ label, key }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
                  {label}
                </label>
                {isEditing ? (
                  <input
                    value={String(editForm[key] || '')}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        [key]: key === 'educationYear' ? Number(event.target.value || 0) : event.target.value,
                      }))
                    }
                    style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                  />
                ) : (
                  <div style={{ fontWeight: 500 }}>{String(member[key] || '-')}</div>
                )}
              </div>
            ))}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
                급여 기준 직급
              </label>
              {isEditing ? (
                <input
                  value={String(editForm.salaryReferencePosition || '')}
                  onChange={(event) => setEditForm((current) => ({ ...current, salaryReferencePosition: event.target.value }))}
                  style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                />
              ) : (
                <div style={{ fontWeight: 500 }}>{String(member.salaryReferencePosition || member.position || '-')}</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
                직급 평균 연봉
              </label>
              <div style={{ fontWeight: 500 }}>
                {canViewSalary() ? (member.positionAverageAnnualSalary ? Number(member.positionAverageAnnualSalary).toLocaleString('ko-KR') : '-') : '권한 없음'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
                총 참여율
              </label>
              <div style={{ fontWeight: 600 }}>{Number(member.totalParticipationRate || 0).toFixed(1)}%</div>
            </div>

            {isEditing && (
              <button className="btn btn-primary" onClick={saveEdits}>
                변경사항 저장
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
