import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Personnel } from '../modules/personnel/personnel.entity';
import { Project } from '../modules/projects/project.entity';
import { ProjectPersonnel } from '../modules/participation/project-personnel.entity';
import { ProjectPersonnelRole } from '../modules/participation/project-personnel-role.enum';
import { PersonnelEmploymentType } from '../modules/personnel/personnel.enum';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectPersonnel)
    private projectPersonnelRepository: Repository<ProjectPersonnel>,
  ) {}

  async seed() {
    // Clear existing data (optional, be careful in production)
    await this.projectPersonnelRepository.delete({});
    await this.personnelRepository.delete({});
    await this.projectRepository.delete({});

    const teams = [
      { name: '개발팀1', department: '개발부' },
      { name: '개발팀2', department: '개발부' },
      { name: '디자인팀', department: '디자인부' },
      { name: '기획팀', department: '기획부' },
      { name: '마케팅팀', department: '마케팅부' },
      { name: '영업팀', department: '영업부' },
      { name: '인사팀', department: '인사부' },
      { name: '재무팀', department: '재무부' },
      { name: '해외사업팀', department: '글로벌부' },
      { name: '연구팀', department: '연구부' },
    ];

    const personnel: Personnel[] = [];
    const projects: Project[] = [];
    const projectPersonnel: ProjectPersonnel[] = [];

    let employeeId = 1;

    for (const [teamIndex, team] of teams.entries()) {
      // Create team leader
      const leader = this.personnelRepository.create({
        employeeId: `EMP${String(employeeId).padStart(4, '0')}`,
        name: `${team.name} 팀장`,
        ssn: `${String(employeeId).padStart(6, '0')}-${String(employeeId).padStart(2, '0')}-${String(employeeId).padStart(4, '0')}`,
        department: team.department,
        team: team.name,
        position: '팀장',
        salaryBand: '5000-6000', // 팀장 급여대역
        employmentType: PersonnelEmploymentType.FULL_TIME,
        hireDate: new Date(2020, 0, 1),
        isActive: true,
        salaryValidity: {
          startDate: new Date(2020, 0, 1),
          endDate: null,
        },
      });
      personnel.push(leader);

      // Create 4 team members
      for (let i = 0; i < 4; i++) {
        employeeId++;
        const member = this.personnelRepository.create({
          employeeId: `EMP${String(employeeId).padStart(4, '0')}`,
          name: `${team.name} 구성원${i + 1}`,
          ssn: `${String(employeeId).padStart(6, '0')}-${String(employeeId).padStart(2, '0')}-${String(employeeId).padStart(4, '0')}`,
          department: team.department,
          team: team.name,
          position: i % 2 === 0 ? '선임' : '주임',
          salaryBand: '3000-4000', // 일반 직원 급여대역
          employmentType: PersonnelEmploymentType.FULL_TIME,
          hireDate: new Date(2021, 0, 1),
          isActive: true,
          salaryValidity: {
            startDate: new Date(2021, 0, 1),
            endDate: null,
          },
        });
        personnel.push(member);
      }

      employeeId++; // increment for next team leader
    }

    // Save all personnel
    const savedPersonnel = await this.personnelRepository.save(personnel);

    // Create sample projects
    const projectData = [
      {
        name: 'AI 기반 스마트 팜 기술 개발',
        projectType: 'NATIONAL_RD' as const,
        managingDepartment: '연구부',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
        totalBudget: 5000000000,
        personnelBudget: 1500000000,
        status: 'IN_PROGRESS' as const,
        managingTeam: '연구팀',
        participatingTeams: ['연구팀', '개발팀1', '디자인팀'],
      },
      {
        name: '경기북부 테크노밸리 조성 사업',
        projectType: 'LOCAL_SUBSIDY' as const,
        managingDepartment: '개발부',
        startDate: new Date('2022-06-01'),
        endDate: new Date('2024-05-31'),
        totalBudget: 10000000000,
        personnelBudget: 3000000000,
        status: 'IN_PROGRESS' as const,
        managingTeam: '개발팀1',
        participatingTeams: ['개발팀1', '개발팀2', '디자인팀', '기획팀'],
      },
      {
        name: '청년 창업 지원 플랫폼 구축',
        projectType: 'MIXED' as const,
        managingDepartment: '기획부',
        startDate: new Date('2023-03-01'),
        endDate: new Date('2024-02-29'),
        totalBudget: 3000000000,
        personnelBudget: 900000000,
        status: 'APPROVED' as const,
        managingTeam: '기획팀',
        participatingTeams: ['기획팀', '마케팅팀', '인사팀', '재무팀'],
      },
    ];

    for (const proj of projectData) {
      const project = this.projectRepository.create({
        ...proj,
        participatingTeams: proj.participatingTeams,
      });
      projects.push(project);
    }

    const savedProjects = await this.projectRepository.save(projects);

    // Create project-personnel assignments
    for (const project of savedProjects) {
       // Assign team leader as Principal Investigator
       const leader = savedPersonnel.find(p => p.team === project.managingTeam && p.position === '팀장');
       if (leader) {
         const pp = this.projectPersonnelRepository.create({
           project,
           personnel: leader,
           participationRate: 50, // 팀장은 50% 참여
           startDate: new Date(project.startDate),
           endDate: project.endDate ? new Date(project.endDate) : null,
           calculationMethod: 'MONTHLY' as const,
           expenseCode: 'personnel-base',
           legalBasisCode: 'LEGAL_001',
           participatingTeam: leader.team,
           role: ProjectPersonnelRole.PRINCIPAL_INVESTIGATOR, // 팀장은 연구책임자
         });
         projectPersonnel.push(pp);
       }

       // Assign 2 random members from the managing team as Co-Researchers
       const teamMembers = savedPersonnel.filter(
         p => p.team === project.managingTeam && p.position !== '팀장',
       );
       for (let i = 0; i < Math.min(2, teamMembers.length); i++) {
         const member = teamMembers[i];
         const pp = this.projectPersonnelRepository.create({
           project,
           personnel: member,
           participationRate: 30, // 구성원은 30% 참여
           startDate: new Date(project.startDate),
           endDate: project.endDate ? new Date(project.endDate) : null,
           calculationMethod: 'MONTHLY' as const,
           expenseCode: 'personnel-base',
           legalBasisCode: 'LEGAL_001',
           participatingTeam: member.team,
           role: ProjectPersonnelRole.CO_RESEARCHER, // 구성원은 공동연구원
         });
         projectPersonnel.push(pp);
       }

       // Assign members from participating teams (excluding managing team) as Participating Researchers
       for (const teamName of project.participatingTeams.filter(t => t !== project.managingTeam)) {
         const teamMembers = savedPersonnel.filter(p => p.team === teamName && p.position !== '팀장');
         for (let i = 0; i < Math.min(1, teamMembers.length); i++) {
           const member = teamMembers[i];
           const pp = this.projectPersonnelRepository.create({
             project,
             personnel: member,
             participationRate: 20, // 다른 팀 구성원은 20% 참여
             startDate: new Date(project.startDate),
             endDate: project.endDate ? new Date(project.endDate) : null,
             calculationMethod: 'MONTHLY' as const,
             expenseCode: 'personnel-base',
             legalBasisCode: 'LEGAL_001',
             participatingTeam: member.team,
             role: ProjectPersonnelRole.PARTICIPATING_RESEARCHER, // 다른 팀 구성원은 참여연구원
           });
           projectPersonnel.push(pp);
         }
       }
    }

    await this.projectPersonnelRepository.save(projectPersonnel);

    console.log('Seeding completed successfully');
    console.log(`Created ${savedPersonnel.length} personnel`);
    console.log(`Created ${savedProjects.length} projects`);
    console.log(`Created ${projectPersonnel.length} project-personnel assignments`);
  }
}