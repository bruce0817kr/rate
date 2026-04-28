import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EMAIL_DOMAIN = process.env.REACT_APP_COMPANY_EMAIL_DOMAIN || 'gtp.or.kr';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const email = form.username.trim().toLowerCase();
    if (!email.endsWith(`@${EMAIL_DOMAIN}`)) {
      setError(`회사 이메일(@${EMAIL_DOMAIN})만 가입할 수 있습니다.`);
      setIsLoading(false);
      return;
    }

    try {
      await register({ username: email, password: form.password });
      navigate('/', { replace: true });
    } catch {
      setError('회원가입에 실패했습니다. 이미 가입된 계정이거나 입력값이 올바르지 않습니다.');
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
          maxWidth: '440px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>
            회원가입
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            회사 이메일과 비밀번호로 계정을 생성합니다.
          </p>
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
              회사 이메일
            </label>
            <input
              type="email"
              value={form.username}
              onChange={(event) => updateField('username', event.target.value)}
              required
              placeholder={`example@${EMAIL_DOMAIN}`}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

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
              비밀번호
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
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
            }}
          >
            {isLoading ? '회원가입 중...' : '회원가입'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
          이미 계정이 있나요?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            로그인
          </button>
        </div>
      </div>
    </div>
  );
}
