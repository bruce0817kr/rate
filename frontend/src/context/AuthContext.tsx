import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import apiService, { User, UserRole } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  updateCurrentUser: (nextUser: User) => void;
  hasRole: (roles: UserRole[]) => boolean;
  canViewSalary: () => boolean;
  canManageActualSalary: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = apiService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await apiService.login({ username, password });
    setUser(response.user);
  }, []);

  const register = useCallback(async (payload: { username: string; password: string }) => {
    const response = await apiService.register(payload);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    apiService.clearToken();
    setUser(null);
  }, []);

  const updateCurrentUser = useCallback((nextUser: User) => {
    apiService.setUser(nextUser);
    setUser(nextUser);
  }, []);

  const hasRole = useCallback((roles: UserRole[]) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return roles.includes(user.role);
  }, [user]);

  const canViewSalary = useCallback(() => {
    return !!user;
  }, [user]);

  const canManageActualSalary = useCallback(() => {
    if (!user) return false;
    return user.role === 'ADMIN' || user.canManageActualSalary === true;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateCurrentUser,
        hasRole,
        canViewSalary,
        canManageActualSalary,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
