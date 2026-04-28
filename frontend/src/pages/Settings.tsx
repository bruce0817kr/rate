import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Plus, Save, Trash2 } from 'lucide-react';
import { showToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import Tooltip from '../components/ui/Tooltip';
import { apiService, SalaryBandRecord, TeamRecord, User, UserRole } from '../services/api';
import {
  DEFAULT_NON_BUSINESS_DEPARTMENTS,
  getNonBusinessDepartments,
  saveNonBusinessDepartments,
} from '../config/teamFilters';
import { useFiscalYear } from '../context/FiscalYearContext';

interface SalaryBandDraft {
  position: string;
  averageAnnualSalary: number;
}

interface NewSalaryBandForm {
  position: string;
  averageAnnualSalary: string;
}

interface NewUserForm {
  username: string;
  password: string;
  name: string;
  role: UserRole;
}

const defaultNewSalaryBandForm: NewSalaryBandForm = {
  position: '',
  averageAnnualSalary: '',
};

const defaultNewUserForm: NewUserForm = {
  username: '',
  password: '',
  name: '',
  role: 'GENERAL',
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: '관리자',
  STRATEGY_PLANNING: '전략기획팀',
  HR_GENERAL_AFFAIRS: '인사총무팀',
  HR_FINANCE: '인사재무팀',
  GENERAL: '일반',
};

export const Settings: React.FC = () => {
  const { user, canViewSalary, hasRole, updateCurrentUser } = useAuth();
  const { fiscalYear } = useFiscalYear();
  const isAdmin = hasRole(['ADMIN']);
  const canEditSalarySettings = hasRole(['ADMIN', 'STRATEGY_PLANNING', 'HR_GENERAL_AFFAIRS']);

  const [salaryBands, setSalaryBands] = useState<SalaryBandRecord[]>([]);
  const [salaryBandDrafts, setSalaryBandDrafts] = useState<Record<string, SalaryBandDraft>>({});
  const [newSalaryBandForm, setNewSalaryBandForm] = useState<NewSalaryBandForm>(defaultNewSalaryBandForm);
  const [savingSalaryBandIds, setSavingSalaryBandIds] = useState<Record<string, boolean>>({});
  const [addingSalaryBand, setAddingSalaryBand] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [userDrafts, setUserDrafts] = useState<Record<string, { name: string; role: UserRole; isActive: boolean; canManageActualSalary: boolean }>>({});
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>(defaultNewUserForm);
  const [savingNewUser, setSavingNewUser] = useState(false);

  const [teamRecords, setTeamRecords] = useState<TeamRecord[]>([]);
  const [nonBusinessDepartments, setNonBusinessDepartments] = useState<string[]>(() => getNonBusinessDepartments());
  const [newDepartmentName, setNewDepartmentName] = useState('');

  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const teams = await apiService.getTeams().catch(() => [] as TeamRecord[]);
      setTeamRecords(teams.filter((team) => team.isActive));
      setNonBusinessDepartments(getNonBusinessDepartments());

      if (canViewSalary()) {
        const bands = await apiService.getSalaryBands(fiscalYear);
        setSalaryBands(bands);
        setSalaryBandDrafts(
          bands.reduce<Record<string, SalaryBandDraft>>((acc, item) => {
            acc[item.id] = {
              position: item.position,
              averageAnnualSalary: Number(item.averageAnnualSalary),
            };
            return acc;
          }, {}),
        );
      } else {
        setSalaryBands([]);
        setSalaryBandDrafts({});
      }

      if (isAdmin) {
        const fetchedUsers = await apiService.getUsers();
        setUsers(fetchedUsers);
        setUserDrafts(
          fetchedUsers.reduce<Record<string, { name: string; role: UserRole; isActive: boolean; canManageActualSalary: boolean }>>((acc, item) => {
            acc[item.id] = {
              name: item.name,
              role: item.role,
              isActive: item.isActive !== false,
              canManageActualSalary: item.canManageActualSalary === true,
            };
            return acc;
          }, {}),
        );
      } else {
        setUsers([]);
        setUserDrafts({});
      }
    } catch {
      showToast('error', '설정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [canViewSalary, fiscalYear, isAdmin]);

  useEffect(() => {
    setProfileName(user?.name || '');
  }, [user?.name]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveMyProfile = async () => {
    const trimmed = profileName.trim();
    if (!trimmed) {
      showToast('error', '이름을 입력해 주세요.');
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await apiService.updateMyProfile({ name: trimmed });
      updateCurrentUser(updated);
      showToast('success', '프로필을 저장했습니다.');
    } catch {
      showToast('error', '프로필 저장에 실패했습니다.');
    } finally {
      setSavingProfile(false);
    }
  };

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    teamRecords.forEach((team) => {
      if (team.department?.trim()) {
        set.add(team.department.trim());
      }
    });
    DEFAULT_NON_BUSINESS_DEPARTMENTS.forEach((item) => set.add(item));
    nonBusinessDepartments.forEach((item) => set.add(item));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [teamRecords, nonBusinessDepartments]);

  const sortedSalaryBands = useMemo(
    () => [...salaryBands].sort((a, b) => a.position.localeCompare(b.position, 'ko')),
    [salaryBands],
  );

  const toggleNonBusinessDepartment = (department: string) => {
    setNonBusinessDepartments((prev) =>
      prev.includes(department)
        ? prev.filter((item) => item !== department)
        : [...prev, department],
    );
  };

  const addNonBusinessDepartment = () => {
    const trimmed = newDepartmentName.trim();
    if (!trimmed) {
      showToast('error', '부서명을 입력해 주세요.');
      return;
    }
    if (nonBusinessDepartments.includes(trimmed)) {
      showToast('warning', '이미 등록된 부서입니다.');
      return;
    }
    setNonBusinessDepartments((prev) => [...prev, trimmed]);
    setNewDepartmentName('');
  };

  const saveDepartmentSettings = () => {
    if (nonBusinessDepartments.length === 0) {
      showToast('error', '비사업부서는 1개 이상 선택해 주세요.');
      return;
    }
    saveNonBusinessDepartments(nonBusinessDepartments);
    showToast('success', '비사업부서 설정을 저장했습니다.');
  };

  const updateSalaryBandDraft = (id: string, patch: Partial<SalaryBandDraft>) => {
    setSalaryBandDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { position: '', averageAnnualSalary: 0 }),
        ...patch,
      },
    }));
  };

  const saveSalaryBand = async (id: string) => {
    const draft = salaryBandDrafts[id];
    if (!draft) return;
    if (!draft.position.trim()) {
      showToast('error', '직급명을 입력해 주세요.');
      return;
    }
    if (draft.averageAnnualSalary < 0) {
      showToast('error', '평균 연봉은 0 이상이어야 합니다.');
      return;
    }

    setSavingSalaryBandIds((prev) => ({ ...prev, [id]: true }));
    try {
      const updated = await apiService.updateSalaryBand(id, {
        position: draft.position.trim(),
        fiscalYear,
        averageAnnualSalary: draft.averageAnnualSalary,
      });
      setSalaryBands((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setSalaryBandDrafts((prev) => ({
        ...prev,
        [id]: {
          position: updated.position,
          averageAnnualSalary: Number(updated.averageAnnualSalary),
        },
      }));
      showToast('success', '직급별 평균 연봉을 저장했습니다.');
    } catch {
      showToast('error', '직급별 평균 연봉 저장에 실패했습니다.');
    } finally {
      setSavingSalaryBandIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const deleteSalaryBand = async (id: string) => {
    const target = salaryBands.find((item) => item.id === id);
    if (!target) return;
    if (!window.confirm(`'${target.position}' 직급 평균 연봉 설정을 삭제하시겠습니까?`)) return;

    try {
      await apiService.deleteSalaryBand(id);
      setSalaryBands((prev) => prev.filter((item) => item.id !== id));
      setSalaryBandDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      showToast('success', '직급 평균 연봉 설정을 삭제했습니다.');
    } catch {
      showToast('error', '직급 평균 연봉 설정 삭제에 실패했습니다.');
    }
  };

  const addSalaryBand = async () => {
    const payload = {
      position: newSalaryBandForm.position.trim(),
      fiscalYear,
      averageAnnualSalary: Number(newSalaryBandForm.averageAnnualSalary),
    };
    if (!payload.position) {
      showToast('error', '직급명을 입력해 주세요.');
      return;
    }
    if (!Number.isFinite(payload.averageAnnualSalary) || payload.averageAnnualSalary < 0) {
      showToast('error', '평균 연봉 값을 확인해 주세요.');
      return;
    }

    setAddingSalaryBand(true);
    try {
      const created = await apiService.createSalaryBand(payload);
      setSalaryBands((prev) => [...prev, created].sort((a, b) => a.position.localeCompare(b.position, 'ko')));
      setSalaryBandDrafts((prev) => ({
        ...prev,
        [created.id]: {
          position: created.position,
          averageAnnualSalary: Number(created.averageAnnualSalary),
        },
      }));
      setNewSalaryBandForm(defaultNewSalaryBandForm);
      showToast('success', '직급 평균 연봉 설정을 추가했습니다.');
    } catch {
      showToast('error', '직급 평균 연봉 설정 추가에 실패했습니다.');
    } finally {
      setAddingSalaryBand(false);
    }
  };

  const updateUserDraft = (
    userId: string,
    patch: Partial<{ name: string; role: UserRole; isActive: boolean; canManageActualSalary: boolean }>,
  ) => {
    setUserDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || { name: '', role: 'GENERAL', isActive: true, canManageActualSalary: false }),
        ...patch,
      },
    }));
  };

  const saveUser = async (entry: User) => {
    const draft = userDrafts[entry.id];
    if (!draft) return;
    if (!draft.name.trim()) {
      showToast('error', '사용자 이름을 입력해 주세요.');
      return;
    }

    try {
      const updated = await apiService.updateUser(entry.id, {
        name: draft.name.trim(),
        role: draft.role,
        isActive: draft.isActive,
        canManageActualSalary: draft.canManageActualSalary,
      });
      setUsers((prev) => prev.map((item) => (item.id === entry.id ? { ...item, ...updated } : item)));
      setUserDrafts((prev) => ({
        ...prev,
        [entry.id]: {
          name: updated.name,
          role: updated.role,
          isActive: updated.isActive !== false,
          canManageActualSalary: updated.canManageActualSalary === true,
        },
      }));
      showToast('success', '사용자 정보를 저장했습니다.');
    } catch {
      showToast('error', '사용자 정보 저장에 실패했습니다.');
    }
  };

  const deleteUser = async (entry: User) => {
    if (entry.id === user?.id) {
      showToast('error', '본인 계정은 삭제할 수 없습니다.');
      return;
    }
    if (!window.confirm(`사용자 '${entry.username}'를 삭제하시겠습니까?`)) return;

    try {
      await apiService.deleteUser(entry.id);
      setUsers((prev) => prev.filter((item) => item.id !== entry.id));
      setUserDrafts((prev) => {
        const next = { ...prev };
        delete next[entry.id];
        return next;
      });
      showToast('success', '사용자를 삭제했습니다.');
    } catch {
      showToast('error', '사용자 삭제에 실패했습니다.');
    }
  };

  const addUser = async () => {
    const payload = {
      username: newUserForm.username.trim(),
      password: newUserForm.password,
      name: newUserForm.name.trim(),
      role: newUserForm.role,
      canManageActualSalary: false,
    };
    if (!payload.username || !payload.password || !payload.name) {
      showToast('error', '아이디, 비밀번호, 이름을 모두 입력해 주세요.');
      return;
    }

    setSavingNewUser(true);
    try {
      const created = await apiService.createUser(payload);
      setUsers((prev) => [...prev, created]);
      setUserDrafts((prev) => ({
        ...prev,
        [created.id]: {
          name: created.name,
          role: created.role,
          isActive: created.isActive !== false,
          canManageActualSalary: created.canManageActualSalary === true,
        },
      }));
      setNewUserForm(defaultNewUserForm);
      setShowNewUserForm(false);
      showToast('success', '사용자를 추가했습니다.');
    } catch {
      showToast('error', '사용자 추가에 실패했습니다.');
    } finally {
      setSavingNewUser(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>설정</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>프로필, 비사업부서, 직급별 평균 연봉, 사용자 권한을 관리합니다.</p>
      </div>

      <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>내 프로필</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          표시 이름을 수정할 수 있습니다.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', alignItems: 'end' }}>
          <label>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>이름</div>
            <input value={profileName} onChange={(event) => setProfileName(event.target.value)} style={{ width: '100%' }} />
          </label>
          <button className="btn btn-primary" onClick={saveMyProfile} disabled={savingProfile}>
            <Save size={14} style={{ marginRight: 'var(--space-1)' }} />
            {savingProfile ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>팀 관리 필터 설정</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          팀 관리의 비사업부서 체크에서 제외할 부서를 선택하세요.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          {departmentOptions.map((department) => (
            <label key={department} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={nonBusinessDepartments.includes(department)}
                onChange={() => toggleNonBusinessDepartment(department)}
              />
              <span>{department}</span>
            </label>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--space-2)' }}>
          <input
            value={newDepartmentName}
            onChange={(event) => setNewDepartmentName(event.target.value)}
            placeholder="목록에 없는 부서를 직접 추가"
          />
          <button className="btn btn-secondary" onClick={addNonBusinessDepartment}>추가</button>
          <button className="btn btn-primary" onClick={saveDepartmentSettings}>적용</button>
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>직급별 평균 연봉 설정</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>직급별 기준 평균 연봉을 관리합니다.</p>
          </div>
        </div>

        {!canViewSalary() ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-8)',
              background: '#f8f9fa',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-muted)',
            }}
          >
            <Lock size={20} style={{ marginRight: 'var(--space-2)' }} />
            <span>평균 연봉 설정 조회 권한이 없습니다.</span>
            <Tooltip content="수정 권한: 관리자, 전략기획팀, 인사총무팀" />
          </div>
        ) : loading ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>평균 연봉 설정을 불러오는 중...</div>
        ) : (
          <>
            <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', background: 'var(--color-surface-alt)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-2)', alignItems: 'end' }}>
                <label>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>직급</div>
                  <input
                    value={newSalaryBandForm.position}
                    onChange={(event) => setNewSalaryBandForm((prev) => ({ ...prev, position: event.target.value }))}
                  />
                </label>
                <label>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>평균 연봉(원)</div>
                  <input
                    type="number"
                    min={0}
                    value={newSalaryBandForm.averageAnnualSalary}
                    onChange={(event) => setNewSalaryBandForm((prev) => ({ ...prev, averageAnnualSalary: event.target.value }))}
                  />
                </label>
                <button className="btn btn-primary" onClick={addSalaryBand} disabled={!canEditSalarySettings || addingSalaryBand}>
                  <Plus size={14} style={{ marginRight: 'var(--space-1)' }} />
                  {addingSalaryBand ? '추가 중...' : '추가'}
                </button>
              </div>
            </div>

            {sortedSalaryBands.length === 0 ? (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>등록된 평균 연봉 설정이 없습니다.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>직급</th>
                    <th>평균 연봉(원)</th>
                    <th style={{ textAlign: 'right' }}>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSalaryBands.map((band) => {
                    const draft = salaryBandDrafts[band.id] || {
                      position: band.position,
                      averageAnnualSalary: Number(band.averageAnnualSalary),
                    };
                    const isSaving = !!savingSalaryBandIds[band.id];

                    return (
                      <tr key={band.id}>
                        <td>
                          <input
                            value={draft.position}
                            onChange={(event) => updateSalaryBandDraft(band.id, { position: event.target.value })}
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            value={draft.averageAnnualSalary}
                            onChange={(event) => updateSalaryBandDraft(band.id, { averageAnnualSalary: Number(event.target.value || 0) })}
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 'var(--space-1)' }}>
                            <button className="btn btn-secondary" onClick={() => saveSalaryBand(band.id)} disabled={!canEditSalarySettings || isSaving}>
                              {isSaving ? '저장 중...' : '저장'}
                            </button>
                            <button className="btn btn-secondary" style={{ color: 'var(--color-error)' }} onClick={() => deleteSalaryBand(band.id)} disabled={!canEditSalarySettings}>
                              <Trash2 size={12} style={{ marginRight: '4px' }} />
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {isAdmin && (
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>사용자 권한 관리</h3>
            <button className="btn btn-primary" onClick={() => setShowNewUserForm((prev) => !prev)}>
              <Plus size={14} style={{ marginRight: 'var(--space-1)' }} /> 사용자 추가
            </button>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            사용자 기본 권한과 실제 연봉 조회/입력 권한을 함께 관리합니다.
          </p>

          {showNewUserForm && (
            <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', background: 'var(--color-surface-alt)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 'var(--space-2)', alignItems: 'end' }}>
                <label>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>아이디</div>
                  <input value={newUserForm.username} onChange={(event) => setNewUserForm((prev) => ({ ...prev, username: event.target.value }))} />
                </label>
                <label>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>비밀번호</div>
                  <input type="password" value={newUserForm.password} onChange={(event) => setNewUserForm((prev) => ({ ...prev, password: event.target.value }))} />
                </label>
                <label>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>이름</div>
                  <input value={newUserForm.name} onChange={(event) => setNewUserForm((prev) => ({ ...prev, name: event.target.value }))} />
                </label>
                <label>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>역할</div>
                  <select value={newUserForm.role} onChange={(event) => setNewUserForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}>
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <button className="btn btn-primary" onClick={addUser} disabled={savingNewUser}>
                  {savingNewUser ? '추가 중...' : '추가'}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>사용자 목록을 불러오는 중...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>아이디</th>
                  <th>역할</th>
                  <th>실연봉 권한</th>
                  <th>상태</th>
                  <th style={{ textAlign: 'right' }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {users.map((entry) => {
                  const draft = userDrafts[entry.id] || {
                    name: entry.name,
                    role: entry.role,
                    isActive: entry.isActive !== false,
                    canManageActualSalary: entry.canManageActualSalary === true,
                  };
                  return (
                    <tr key={entry.id}>
                      <td>
                        <input value={draft.name} onChange={(event) => updateUserDraft(entry.id, { name: event.target.value })} style={{ width: '100%' }} />
                      </td>
                      <td>{entry.username}</td>
                      <td>
                        <select value={draft.role} onChange={(event) => updateUserDraft(entry.id, { role: event.target.value as UserRole })}>
                          {Object.entries(roleLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="checkbox"
                            checked={draft.canManageActualSalary}
                            onChange={(event) => updateUserDraft(entry.id, { canManageActualSalary: event.target.checked })}
                          />
                          <span>{draft.canManageActualSalary ? '허용' : '없음'}</span>
                        </label>
                      </td>
                      <td>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="checkbox"
                            checked={draft.isActive}
                            onChange={(event) => updateUserDraft(entry.id, { isActive: event.target.checked })}
                          />
                          <span>{draft.isActive ? '활성' : '비활성'}</span>
                        </label>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 'var(--space-1)' }}>
                          <button className="btn btn-secondary" style={{ padding: 'var(--space-1) var(--space-2)', fontSize: '0.75rem' }} onClick={() => saveUser(entry)}>
                            저장
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: 'var(--space-1) var(--space-2)', fontSize: '0.75rem', color: 'var(--color-error)' }}
                            onClick={() => deleteUser(entry)}
                          >
                            <Trash2 size={12} style={{ marginRight: '4px' }} /> 삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
