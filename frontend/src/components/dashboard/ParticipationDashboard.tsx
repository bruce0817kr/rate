import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { RefreshCw, Users, BarChart3 } from 'lucide-react';
import { apiService } from '../../services/api';
import { useFiscalYear } from '../../context/FiscalYearContext';

interface ParticipationData {
  projectName: string;
  projectType: string;
  managingTeam: string;
  totalParticipationRate: number;
  personnelCount: number;
  status: string;
}

interface TeamParticipation {
  teamName: string;
  totalAllocation: number;
  availableCapacity: number;
  status: 'ok' | 'warning' | 'critical';
}

const projectTypeLabel = (value: string) => {
  const labels: Record<string, string> = {
    NATIONAL_RD: '국가 R&D',
    LOCAL_SUBSIDY: '지자체 보조',
    MIXED: '복합',
  };
  return labels[value] || value;
};

const projectStatusLabel = (value: string) => {
  const labels: Record<string, string> = {
    PLANNING: '기획',
    APPROVED: '승인',
    IN_PROGRESS: '진행 중',
    COMPLETED: '완료',
    AUDITING: '감사 중',
  };
  return labels[value] || value;
};

const teamStatusLabel = (value: TeamParticipation['status']) => {
  if (value === 'critical') return '위험';
  if (value === 'warning') return '주의';
  return '정상';
};

const ParticipationDashboard: React.FC = () => {
  const [participationData, setParticipationData] = useState<ParticipationData[]>([]);
  const [teamParticipation, setTeamParticipation] = useState<TeamParticipation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { fiscalYear } = useFiscalYear();

  useEffect(() => {
    fetchData();
  }, [fiscalYear]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [teamData, projects, assignments] = await Promise.all([
        apiService.getTeamUtilization(),
        apiService.getProjects(fiscalYear),
        apiService.getProjectPersonnel(fiscalYear),
      ]);

      setTeamParticipation(
        teamData.map((team) => ({
          teamName: team.teamName,
          totalAllocation: team.totalAllocation,
          availableCapacity: team.availableCapacity,
          status: team.status.toLowerCase() as 'ok' | 'warning' | 'critical',
        })),
      );

      const activeAssignments = assignments.filter(
        (assignment) => !assignment.endDate || new Date(assignment.endDate) > new Date(),
      );

      setParticipationData(
        projects.map((project) => {
          const projectAssignments = activeAssignments.filter((assignment) => assignment.project?.id === project.id);
          return {
            projectName: project.name,
            projectType: project.projectType,
            managingTeam: project.managingTeam,
            totalParticipationRate: projectAssignments.reduce(
              (sum, assignment) => sum + Number(assignment.participationRate || 0),
              0,
            ),
            personnelCount: projectAssignments.length,
            status: project.status,
          };
        }),
      );
    } catch {
      setParticipationData([]);
      setTeamParticipation([]);
      setError('참여율 대시보드를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (rate: number): { variant: string; text: string } => {
    if (rate >= 95) return { variant: 'danger', text: '위험' };
    if (rate >= 90) return { variant: 'warning', text: '주의' };
    return { variant: 'success', text: '정상' };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-4">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">참여율 대시보드를 불러오는 중입니다...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">참여율 대시보드</h2>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <h3 className="text-lg font-semibold">사업별 참여 현황</h3>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>사업명</TableCell>
                <TableCell>유형</TableCell>
                <TableCell>주관 팀</TableCell>
                <TableCell>총 참여율</TableCell>
                <TableCell>참여 인원</TableCell>
                <TableCell>상태</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participationData.map((row) => {
                const status = getStatusBadge(row.totalParticipationRate);
                return (
                  <TableRow key={row.projectName}>
                    <TableCell>{row.projectName}</TableCell>
                    <TableCell>{projectTypeLabel(row.projectType)}</TableCell>
                    <TableCell>{row.managingTeam}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{row.totalParticipationRate.toFixed(1)}%</Badge>
                    </TableCell>
                    <TableCell>{row.personnelCount}</TableCell>
                    <TableCell>{projectStatusLabel(row.status)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <h3 className="text-lg font-semibold">팀별 배정 현황</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamParticipation.map((team) => (
              <div key={team.teamName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <h4 className="font-medium">{team.teamName}</h4>
                  </div>
                  <span>{team.totalAllocation.toFixed(1)}%</span>
                </div>
                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>가용 비율 {team.availableCapacity.toFixed(1)}%</span>
                  <span>{teamStatusLabel(team.status)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">보고서</h3>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              내보내기
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted/50 rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground">필요 시 이 영역을 차트 라이브러리와 연결할 수 있습니다.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParticipationDashboard;
