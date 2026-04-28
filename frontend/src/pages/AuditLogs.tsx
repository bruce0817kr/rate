import React, { useCallback, useEffect, useState } from 'react';
import apiService from '../services/api';

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  performedBy: string;
  ipAddress?: string;
  timestamp: string;
}

const actionLabel: Record<AuditLog['action'], string> = {
  CREATE: '생성',
  UPDATE: '수정',
  DELETE: '삭제',
};

const actionColor: Record<AuditLog['action'], string> = {
  CREATE: '#10b981',
  UPDATE: '#f59e0b',
  DELETE: '#ef4444',
};

const entityTypeLabel = (value: string) => {
  const labels: Record<string, string> = {
    User: '사용자',
    Personnel: '팀원',
    Project: '사업',
    Participation: '참여',
    ParticipationAlert: '알림',
  };
  return labels[value] || value;
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getAuditLogs({
        entityType: entityTypeFilter || undefined,
        limit: 100,
      });
      setLogs(data as AuditLog[]);
    } catch {
      setError('감사 로그를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [entityTypeFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a2e' }}>감사 로그</h1>
        <select
          value={entityTypeFilter}
          onChange={(event) => setEntityTypeFilter(event.target.value)}
          style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
        >
          <option value="">전체 엔티티</option>
          <option value="User">사용자</option>
          <option value="Personnel">팀원</option>
          <option value="Project">사업</option>
          <option value="Participation">참여</option>
          <option value="ParticipationAlert">알림</option>
        </select>
      </div>

      {error && (
        <div style={{ background: '#fee', border: '1px solid #fcc', borderRadius: '6px', padding: '12px', marginBottom: '20px', color: '#c00' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>불러오는 중...</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#f8f9fa', borderRadius: '8px', color: '#666' }}>표시할 감사 로그가 없습니다.</div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>시간</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>행위</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>엔티티</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>엔티티 ID</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>수행자</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>IP 주소</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '12px 16px' }}>{new Date(log.timestamp).toLocaleString('ko-KR')}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'white',
                        backgroundColor: actionColor[log.action],
                      }}
                    >
                      {actionLabel[log.action]}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{entityTypeLabel(log.entityType)}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{log.entityId}</td>
                  <td style={{ padding: '12px 16px' }}>{log.performedBy}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{log.ipAddress || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
