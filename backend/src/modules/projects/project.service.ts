import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async createProject(createProjectDto: CreateProjectDto): Promise<Project> {
    // Check if project with same name already exists
    const existingProject = await this.projectRepository.findOne({
      where: { name: createProjectDto.name },
    });

    if (existingProject) {
      throw new ConflictException(`Project with name ${createProjectDto.name} already exists`);
    }

    // Create new project entity
    const project = this.projectRepository.create({
      ...createProjectDto,
      status: createProjectDto.status ?? 'PLANNING',
      legalBasis: createProjectDto.legalBasis ?? {},
      internalRules: createProjectDto.internalRules ?? {},
    });

    return await this.projectRepository.save(project);
  }

  async findAllProjects(options: FindManyOptions<Project> = {}): Promise<Project[]> {
    return await this.projectRepository.find(options);
  }

  async findProjectById(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async updateProject(id: string, updateData: Partial<CreateProjectDto>): Promise<Project> {
    const project = await this.findProjectById(id);
    
    // Merge update data
    Object.assign(project, updateData);
    
    return await this.projectRepository.save(project);
  }

  async removeProject(id: string): Promise<void> {
    const result = await this.projectRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  }

  async findProjectsByManagingTeam(team: string): Promise<Project[]> {
    return await this.projectRepository.find({
      where: { managingTeam: team },
    });
  }

  async findProjectsByParticipatingTeam(team: string): Promise<Project[]> {
    return await this.projectRepository.find({
      where: { participatingTeams: team },
    });
  }
}