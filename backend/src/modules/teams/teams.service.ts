import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './team.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

  async create(dto: CreateTeamDto): Promise<Team> {
    const normalizedName = dto.name.trim();
    const existing = await this.teamRepository.findOne({ where: { name: normalizedName } });
    if (existing) {
      throw new ConflictException(`Team '${normalizedName}' already exists`);
    }

    const team = this.teamRepository.create({
      ...dto,
      name: normalizedName,
      department: dto.department?.trim() || null,
      description: dto.description?.trim() || null,
      managerName: dto.managerName?.trim() || null,
      managerEmail: dto.managerEmail?.trim() || null,
      managerPhone: dto.managerPhone?.trim() || null,
      plannedHeadcount: dto.plannedHeadcount ?? null,
      isActive: dto.isActive ?? true,
    });

    return this.teamRepository.save(team);
  }

  async findAll(): Promise<Team[]> {
    return this.teamRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  async update(id: string, dto: UpdateTeamDto): Promise<Team> {
    const team = await this.teamRepository.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException(`Team '${id}' not found`);
    }

    if (dto.name && dto.name.trim() !== team.name) {
      const existing = await this.teamRepository.findOne({ where: { name: dto.name.trim() } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Team '${dto.name.trim()}' already exists`);
      }
      team.name = dto.name.trim();
    }

    if (dto.department !== undefined) {
      team.department = dto.department?.trim() || null;
    }
    if (dto.description !== undefined) {
      team.description = dto.description?.trim() || null;
    }
    if (dto.managerName !== undefined) {
      team.managerName = dto.managerName?.trim() || null;
    }
    if (dto.managerEmail !== undefined) {
      team.managerEmail = dto.managerEmail?.trim() || null;
    }
    if (dto.managerPhone !== undefined) {
      team.managerPhone = dto.managerPhone?.trim() || null;
    }
    if (dto.plannedHeadcount !== undefined) {
      team.plannedHeadcount = dto.plannedHeadcount ?? null;
    }
    if (dto.isActive !== undefined) {
      team.isActive = dto.isActive;
    }

    return this.teamRepository.save(team);
  }

  async remove(id: string): Promise<void> {
    const result = await this.teamRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Team '${id}' not found`);
    }
  }

  async upsertMany(rows: CreateTeamDto[]): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.name?.trim()) {
          throw new Error('name is required');
        }

        const normalizedName = row.name.trim();
        const existing = await this.teamRepository.findOne({ where: { name: normalizedName } });
        if (existing) {
          await this.update(existing.id, row);
        } else {
          await this.create(row);
        }
        success++;
      } catch (error) {
        failed++;
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }
}
