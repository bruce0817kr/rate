import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          padding: '48px',
          width: '100%',
          maxWidth: '460px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1a1a2e',
              marginBottom: '8px',
              lineHeight: 1.4,
            }}
          >
            GTP 참여율 관리 시스템
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>시스템에 로그인해 주세요.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '20px',
                color: '#c00',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333',
              }}
            >
              아이디
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              placeholder="아이디를 입력하세요"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333',
              }}
            >
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              background: isLoading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#666',
          }}
        >
          <strong>테스트 계정</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
            <li>관리자: admin / admin123</li>
          </ul>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
          아직 계정이 없나요?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}
