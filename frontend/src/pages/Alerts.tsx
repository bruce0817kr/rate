import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Info } from 'lucide-react';
import { apiService, ParticipationAlert } from '../services/api';
import { showToast } from '../components/ui/Toast';

type FilterKey = 'ALL' | 'DANGER' | 'WARNING' | 'INFO';

const iconMap = {
  CRITICAL: { icon: AlertTriangle, color: 'var(--color-error)', bg: 'rgba(211, 94, 59, 0.1)' },
  HIGH: { icon: AlertTriangle, color: 'var(--color-error)', bg: 'rgba(211, 94, 59, 0.1)' },
  MEDIUM: { icon: AlertTriangle, color: '#B8860B', bg: 'rgba(232, 168, 56, 0.1)' },
  LOW: { icon: Info, color: 'var(--color-info)', bg: 'rgba(74, 124, 155, 0.1)' },
};

const getFilterKey = (severity: string): Exclude<FilterKey, 'ALL'> => {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'DANGER';
  if (severity === 'MEDIUM') return 'WARNING';
  return 'INFO';
};

export const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<ParticipationAlert[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getParticipationAlerts();
      setAlerts(data);
    } catch {
      setAlerts([]);
      setError('알림 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await apiService.acknowledgeAlert(alertId);
      setAcknowledgedIds((current) => [...current, alertId]);
      showToast('success', '알림을 확인 처리했습니다.');
    } catch {
      showToast('error', '알림 확인 처리에 실패했습니다.');
    }
  };

  const handleViewDetail = (alert: ParticipationAlert) => {
    if (alert.entityType === 'Personnel') {
      navigate(`/team-members/${alert.entityId}`);
      return;
    }
    if (alert.entityType === 'Project') {
      navigate(`/projects/${alert.entityId}`);
      return;
    }
    if (alert.entityType === 'Team') {
      navigate(`/teams/${encodeURIComponent(alert.entityId)}`);
    }
  };

  const unacknowledgedAlerts = useMemo(
    () => alerts.filter((alert) => !acknowledgedIds.includes(alert.id)),
    [acknowledgedIds, alerts],
  );

  const counts = useMemo(
    () =>
      unacknowledgedAlerts.reduce(
        (acc, alert) => {
          acc.total += 1;
          const key = getFilterKey(alert.severity);
          if (key === 'DANGER') acc.위험 += 1;
          if (key === 'WARNING') acc.주의 += 1;
          if (key === 'INFO') acc.정보 += 1;
          return acc;
        },
        { total: 0, 위험: 0, 주의: 0, 정보: 0 },
      ),
    [unacknowledgedAlerts],
  );

  const visibleAlerts = useMemo(() => {
    if (filter === 'ALL') return unacknowledgedAlerts;
    return unacknowledgedAlerts.filter((alert) => getFilterKey(alert.severity) === filter);
  }, [filter, unacknowledgedAlerts]);

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>알림</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>참여율 및 운영 경고를 확인하고 처리합니다.</p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', alignItems: 'center' }}>
        <button className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('ALL')}>
          전체 ({counts.total})
        </button>
        <button className={`btn ${filter === 'DANGER' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('DANGER')}>
          위험 ({counts.위험})
        </button>
        <button className={`btn ${filter === 'WARNING' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('WARNING')}>
          주의 ({counts.주의})
        </button>
        <button className={`btn ${filter === 'INFO' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('INFO')}>
          정보 ({counts.정보})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>알림을 불러오는 중입니다...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-error)' }}>{error}</div>
      ) : visibleAlerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>표시할 알림이 없습니다.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {visibleAlerts.map((alert) => {
            const config = iconMap[alert.severity as keyof typeof iconMap] || iconMap.LOW;
            const Icon = config.icon;
            return (
              <div
                key={alert.id}
                className="card"
                style={{ padding: 'var(--space-4)', borderLeft: `4px solid ${config.color}`, backgroundColor: config.bg }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: config.bg,
                    }}
                  >
                    <Icon size={20} color={config.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                      <span style={{ fontWeight: 600 }}>{alert.title}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>{alert.message}</p>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                      <button
                        onClick={() => handleViewDetail(alert)}
                        className="btn btn-secondary"
                        style={{ padding: 'var(--space-1) var(--space-3)', fontSize: '0.75rem' }}
                      >
                        상세보기
                      </button>
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="btn btn-secondary"
                        style={{ padding: 'var(--space-1) var(--space-3)', fontSize: '0.75rem' }}
                      >
                        확인
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
