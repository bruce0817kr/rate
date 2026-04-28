import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FiscalYearProvider } from './context/FiscalYearContext';
import ProtectedRoute from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { TeamList } from './pages/TeamList';
import { TeamDetail } from './pages/TeamDetail';
import { TeamMemberList } from './pages/TeamMemberList';
import { TeamMemberDetail } from './pages/TeamMemberDetail';
import { ProjectList } from './pages/ProjectList';
import { ProjectDetail } from './pages/ProjectDetail';
import { Alerts } from './pages/Alerts';
import { Settings } from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import AuditLogs from './pages/AuditLogs';
import DataUpload from './pages/DataUpload';
import { DepartmentRevenue } from './pages/DepartmentRevenue';
import { ToastContainer } from './components/ui/Toast';
import { APP_BASE_PATH } from './config/appBasePath';
import './styles/globals.css';

function App() {
  return (
    <BrowserRouter basename={APP_BASE_PATH || undefined}>
      <AuthProvider>
        <FiscalYearProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'STRATEGY_PLANNING', 'HR_GENERAL_AFFAIRS']}>
                <AppLayout>
                  <AuditLogs />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'STRATEGY_PLANNING', 'HR_GENERAL_AFFAIRS']}>
                <AppLayout>
                  <DataUpload />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/teams" element={<TeamList />} />
                    <Route path="/teams/:id" element={<TeamDetail />} />
                    <Route path="/team-members" element={<TeamMemberList />} />
                    <Route path="/team-members/:id" element={<TeamMemberDetail />} />
                    <Route path="/projects" element={<ProjectList />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="/department-revenue" element={<DepartmentRevenue />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute allowedRoles={['ADMIN', 'STRATEGY_PLANNING', 'HR_GENERAL_AFFAIRS']}>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
          </Routes>
        </FiscalYearProvider>
      </AuthProvider>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
