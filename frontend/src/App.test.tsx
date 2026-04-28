import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => jest.fn(),
    useLocation: () => ({ state: null }),
  }),
  { virtual: true },
);

jest.mock('./context/AuthContext', () => ({
  useAuth: () => ({
    login: jest.fn(),
  }),
}));

import Login from './pages/Login';

test('renders login and signup entry points', () => {
  render(<Login />);
  expect(screen.getByRole('heading', { name: 'GTP 참여율 관리 시스템' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '회원가입' })).toBeInTheDocument();
});
