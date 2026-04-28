import { withBasePath } from '../config/appBasePath';

const API_BASE_URL = process.env.REACT_APP_API_URL || withBasePath('/api');

export type UserRole =
  | 'ADMIN'
  | 'STRATEGY_PLANNING'
  | 'HR_GENERAL_AFFAIRS'
  | 'HR_FINANCE'
  | 'GENERAL';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  canManageActualSalary?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface TeamUtilization {
  teamName: string;
  totalAllocation: number;
  availableCapacity: number;
  utilizationPercentage: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
}

export interface ParticipationAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  entityId: string;
  entityType: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface IndividualParticipation {
  personnelId: string;
  employeeId: string;
  name: string;
  team: string;
  position: string;
  totalParticipationRate: number;
  piRoleCount: number;
  totalRoleCount: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  activeParticipations: {
    projectPersonnelId: string;
    projectId: string;
    projectName: string;
    participationRate: number;
    role: string;
    startDate: string;
    endDate: string | null;
  }[];
}

export interface TeamMemberDetail extends IndividualParticipation {
  salaryReferencePosition?: string | null;
  positionAverageAnnualSalary?: number | null;
  highestEducation?: string;
  educationYear?: number;
}

export interface PersonnelRecord {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  team: string;
  position: string;
  salaryReferencePosition?: string | null;
  positionAverageAnnualSalary?: number | null;
  highestEducation?: string;
  educationYear?: number;
  isActive: boolean;
}

export interface TeamRecord {
  id: string;
  name: string;
  department?: string | null;
  description?: string | null;
  managerName?: string | null;
  managerEmail?: string | null;
  managerPhone?: string | null;
  plannedHeadcount?: number | null;
  isActive: boolean;
}

export interface ProjectRecord {
  id: string;
  name: string;
  fiscalYear?: number | null;
  projectType: string;
  managingDepartment: string;
  managingTeam: string;
  participatingTeams: string[];
  totalBudget: number;
  personnelBudget: number;
  personnelCostFinalTotal?: number | null;
  startDate: string;
  endDate: string;
  status: string;
}

export interface DepartmentRevenueProject {
  name: string;
  budgetStatus: string | null;
  expectedPersonnelRevenue: number | null;
  expectedIndirectRevenue: number | null;
  totalBudget: number;
  fundingSources: Record<string, number> | null;
}

export interface DepartmentRevenueItem {
  team: string;
  projectCount: number;
  expectedPersonnelRevenue: number;
  expectedIndirectRevenue: number;
  projects: DepartmentRevenueProject[];
}

export interface ProjectPersonnelSegmentRecord {
  id: string;
  startDate: string;
  endDate: string;
  participationRate: number;
  personnelCostOverride?: number | null;
  sortOrder?: number;
  notes?: string | null;
}

export interface ProjectPersonnelRecord {
  id: string;
  participationRate: number;
  fiscalYear?: number | null;
  actualAnnualSalaryOverride?: number | null;
  participationMonths?: number;
  personnelCostOverride?: number | null;
  role: string;
  startDate: string;
  endDate: string | null;
  participatingTeam: string;
  personnel?: PersonnelRecord;
  project?: ProjectRecord;
  segments?: ProjectPersonnelSegmentRecord[];
}

export interface SalaryBandRecord {
  id: string;
  position: string;
  fiscalYear?: number | null;
  averageAnnualSalary: number;
  isActive: boolean;
}

class ApiService {
  private token: string | null = null;
  private currentUser: User | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
    const userJson = localStorage.getItem('auth_user');
    if (userJson) {
      try {
        this.currentUser = JSON.parse(userJson);
      } catch {
        this.currentUser = null;
      }
    }
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  setUser(user: User) {
    this.currentUser = user;
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  getToken(): string | null {
    return this.token;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  clearToken() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
      }
      let detail = '';
      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const body = await response.json();
          if (typeof body?.message === 'string') {
            detail = body.message;
          } else if (Array.isArray(body?.message)) {
            detail = body.message.join(', ');
          }
        } else {
          const text = await response.text();
          if (text) {
            detail = text;
          }
        }
      } catch {
        detail = '';
      }

      throw new Error(
        detail
          ? `API Error: ${response.status} ${response.statusText} - ${detail}`
          : `API Error: ${response.status} ${response.statusText}`,
      );
    }

    if (response.status === 204) {
      return {} as T;
    }
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    if (contentType.includes('application/json')) {
      return JSON.parse(text) as T;
    }
    return text as T;
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    this.setToken(response.access_token);
    this.setUser(response.user);
    return response;
  }

  async register(payload: RegisterRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(response.access_token);
    this.setUser(response.user);
    return response;
  }

  async getTeamUtilization(): Promise<TeamUtilization[]> {
    return this.request<TeamUtilization[]>('/participation-monitoring/team-utilization');
  }

  async getIndividualParticipations(): Promise<IndividualParticipation[]> {
    return this.request<IndividualParticipation[]>('/participation-monitoring/individual');
  }

  async getTeamMember(id: string): Promise<TeamMemberDetail> {
    return this.request<TeamMemberDetail>(`/participation-monitoring/individual/${id}`);
  }

  async getParticipationAlerts(): Promise<ParticipationAlert[]> {
    return this.request<ParticipationAlert[]>('/participation-monitoring/alerts');
  }

  async getPersonnel(): Promise<PersonnelRecord[]> {
    return this.request<PersonnelRecord[]>('/personnel');
  }

  async getProjects(fiscalYear?: number): Promise<ProjectRecord[]> {
    return this.request<ProjectRecord[]>(`/projects${fiscalYear ? `?fiscalYear=${fiscalYear}` : ''}`);
  }

  async getDepartmentRevenue(fiscalYear?: number): Promise<DepartmentRevenueItem[]> {
    return this.request<DepartmentRevenueItem[]>(`/projects/department-revenue${fiscalYear ? `?fiscalYear=${fiscalYear}` : ''}`);
  }

  async createProject(data: {
    name: string;
    projectType: string;
    managingDepartment: string;
    startDate: string;
    endDate: string;
    totalBudget: number;
    personnelBudget: number;
    fiscalYear?: number;
    status?: string;
    managingTeam: string;
    participatingTeams: string[];
  }) {
    return this.request<ProjectRecord>('/projects', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        status: data.status || 'PLANNING',
      }),
    });
  }

  async getTeams(): Promise<TeamRecord[]> {
    return this.request<TeamRecord[]>('/teams');
  }

  async getProject(id: string): Promise<ProjectRecord> {
    return this.request<ProjectRecord>(`/projects/${id}`);
  }

  async updateProject(
    id: string,
    data: Partial<{
      name: string;
      projectType: string;
      managingDepartment: string;
      startDate: string;
      endDate: string;
      totalBudget: number;
      personnelBudget: number;
      personnelCostFinalTotal: number | null;
      status: string;
      managingTeam: string;
      participatingTeams: string[];
    }>,
  ) {
    return this.request<ProjectRecord>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async copyFiscalYear(sourceYear: number, targetYear: number) {
    return this.request<{
      salaryBandsCreated: number;
      projectsCreated: number;
      assignmentsCreated: number;
    }>('/projects/copy-year', {
      method: 'POST',
      body: JSON.stringify({ sourceYear, targetYear }),
    });
  }

  async getProjectPersonnel(fiscalYear?: number): Promise<ProjectPersonnelRecord[]> {
    return this.request<ProjectPersonnelRecord[]>(`/project-personnel${fiscalYear ? `?fiscalYear=${fiscalYear}` : ''}`);
  }

  async createProjectPersonnel(data: {
    personnelId: string;
    projectId: string;
    participationRate: number;
    fiscalYear?: number;
    actualAnnualSalaryOverride?: number;
    participationMonths?: number;
    personnelCostOverride?: number;
    segments?: Array<{
      startDate: string;
      endDate: string;
      participationRate: number;
      personnelCostOverride?: number | null;
      sortOrder?: number;
      notes?: string;
    }>;
    role: string;
    startDate: string;
    calculationMethod?: string;
    expenseCode?: string;
    legalBasisCode?: string;
    participatingTeam?: string;
  }) {
    return this.request<ProjectPersonnelRecord>('/project-personnel', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        actualAnnualSalaryOverride: data.actualAnnualSalaryOverride,
        participationMonths: data.participationMonths ?? 12,
        personnelCostOverride: data.personnelCostOverride,
        segments: data.segments,
        calculationMethod: data.calculationMethod || 'MONTHLY',
        expenseCode: data.expenseCode || 'personnel-base',
        legalBasisCode: data.legalBasisCode || 'DEFAULT',
        participatingTeam: data.participatingTeam || 'UNASSIGNED',
      }),
    });
  }

  async updateProjectPersonnel(id: string, data: {
    participationRate?: number;
    actualAnnualSalaryOverride?: number;
    participationMonths?: number;
    personnelCostOverride?: number | null;
    role?: string;
    endDate?: string;
    segments?: Array<{
      startDate: string;
      endDate: string;
      participationRate: number;
      personnelCostOverride?: number | null;
      sortOrder?: number;
      notes?: string;
    }>;
  }) {
    return this.request<ProjectPersonnelRecord>(`/project-personnel/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...data,
        actualAnnualSalaryOverride: data.actualAnnualSalaryOverride,
      }),
    });
  }

  async deleteProjectPersonnel(id: string) {
    return this.request<void>(`/project-personnel/${id}`, {
      method: 'DELETE',
    });
  }

  async createPersonnel(data: {
    employeeId: string;
    name: string;
    team: string;
    position: string;
    salaryReferencePosition?: string;
    highestEducation?: string;
    educationYear?: number;
    positionAverageAnnualSalary?: number;
    department?: string;
    ssn?: string;
    employmentType?: string;
    hireDate?: string;
  }) {
    return this.request<PersonnelRecord>('/personnel', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        department: data.department || data.team,
        ssn: data.employeeId,
        employmentType: data.employmentType || 'FULL_TIME',
        hireDate: data.hireDate || new Date().toISOString().split('T')[0],
        salaryReferencePosition: data.salaryReferencePosition,
        positionAverageAnnualSalary: data.positionAverageAnnualSalary,
      }),
    });
  }

  async deletePersonnel(id: string) {
    return this.request<void>(`/personnel/${id}`, {
      method: 'DELETE',
    });
  }

  async createTeam(data: {
    name: string;
    department?: string;
    description?: string;
    managerName?: string;
    managerEmail?: string;
    managerPhone?: string;
    plannedHeadcount?: number;
    isActive?: boolean;
  }) {
    return this.request<TeamRecord>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(
    id: string,
    data: Partial<{
      name: string;
      department: string;
      description: string;
      managerName: string;
      managerEmail: string;
      managerPhone: string;
      plannedHeadcount: number;
      isActive: boolean;
    }>,
  ) {
    return this.request<TeamRecord>(`/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id: string) {
    return this.request<void>(`/teams/${id}`, {
      method: 'DELETE',
    });
  }

  async getSalaryBands(fiscalYear?: number) {
    return this.request<SalaryBandRecord[]>(`/salary-bands${fiscalYear ? `?fiscalYear=${fiscalYear}` : ''}`);
  }

  async createSalaryBand(data: {
    position: string;
    fiscalYear?: number;
    averageAnnualSalary: number;
    isActive?: boolean;
  }) {
    return this.request<SalaryBandRecord>('/salary-bands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSalaryBand(
    id: string,
    data: Partial<{
      position: string;
      fiscalYear: number;
      averageAnnualSalary: number;
      isActive: boolean;
    }>,
  ) {
    return this.request<SalaryBandRecord>(`/salary-bands/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteSalaryBand(id: string) {
    return this.request<void>(`/salary-bands/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadPersonnelFile(file: File) {
    return this.uploadFile('/upload/personnel', file);
  }

  async uploadTeamFile(file: File) {
    return this.uploadFile('/upload/teams', file);
  }

  async purgeMockPersonnel() {
    return this.request<{ deletedCount: number }>('/personnel/purge-mock', {
      method: 'POST',
    });
  }

  private async uploadFile(endpoint: string, file: File) {
    const url = `${API_BASE_URL}${endpoint}`;
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async updatePersonnel(id: string, data: Partial<{
    name: string;
    team: string;
    position: string;
    salaryReferencePosition: string;
    positionAverageAnnualSalary: number;
    highestEducation: string;
    educationYear: number;
  }>) {
    return this.request<PersonnelRecord>(`/personnel/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async acknowledgeAlert(alertId: string) {
    return this.request(`/participation-monitoring/acknowledge-alert/${alertId}`, {
      method: 'POST',
    });
  }

  async getAuditLogs(params?: {
    entityType?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.entityType) queryParams.append('entityType', params.entityType);
    if (params?.entityId) queryParams.append('entityId', params.entityId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return this.request(`/audit/logs${query ? `?${query}` : ''}`);
  }

  async getUsers() {
    return this.request<User[]>('/users');
  }

  async getMyProfile() {
    return this.request<User>('/users/me');
  }

  async updateMyProfile(data: { name: string }) {
    return this.request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async createUser(data: {
    username: string;
    password: string;
    name: string;
    role: UserRole;
    canManageActualSalary?: boolean;
  }) {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: {
    name?: string;
    role?: UserRole;
    isActive?: boolean;
    canManageActualSalary?: boolean;
  }) {
    return this.request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string) {
    return this.request<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
export default apiService;
