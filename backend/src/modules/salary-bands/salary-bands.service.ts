import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSalaryBandDto } from './dto/create-salary-band.dto';
import { UpdateSalaryBandDto } from './dto/update-salary-band.dto';
import { SalaryBand } from './salary-band.entity';
import { Personnel } from '../personnel/personnel.entity';

@Injectable()
export class SalaryBandsService {
  constructor(
    @InjectRepository(SalaryBand)
    private readonly salaryBandRepository: Repository<SalaryBand>,
    @InjectRepository(Personnel)
    private readonly personnelRepository: Repository<Personnel>,
  ) {}

  private async syncPersonnelAverageSalary(position: string, averageAnnualSalary: number): Promise<void> {
    await this.personnelRepository.update(
      { position },
      { positionAverageAnnualSalary: averageAnnualSalary },
    );
  }

  async findAll(): Promise<SalaryBand[]> {
    return this.salaryBandRepository.find({
      where: { isActive: true },
      order: { position: 'ASC' },
    });
  }

  async create(dto: CreateSalaryBandDto): Promise<SalaryBand> {
    const normalizedPosition = dto.position.trim();
    const existing = await this.salaryBandRepository.findOne({
      where: { position: normalizedPosition },
    });
    if (existing) {
      throw new ConflictException(`Salary band for '${normalizedPosition}' already exists`);
    }

    const salaryBand = this.salaryBandRepository.create({
      position: normalizedPosition,
      averageAnnualSalary: dto.averageAnnualSalary,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.salaryBandRepository.save(salaryBand);
    await this.syncPersonnelAverageSalary(saved.position, Number(saved.averageAnnualSalary));
    return saved;
  }

  async update(id: string, dto: UpdateSalaryBandDto): Promise<SalaryBand> {
    const salaryBand = await this.salaryBandRepository.findOne({ where: { id } });
    if (!salaryBand) {
      throw new NotFoundException(`Salary band '${id}' not found`);
    }

    if (dto.position !== undefined) {
      const normalizedPosition = dto.position.trim();
      const existing = await this.salaryBandRepository.findOne({ where: { position: normalizedPosition } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Salary band for '${normalizedPosition}' already exists`);
      }
      salaryBand.position = normalizedPosition;
    }
    if (dto.averageAnnualSalary !== undefined) salaryBand.averageAnnualSalary = dto.averageAnnualSalary;
    if (dto.isActive !== undefined) salaryBand.isActive = dto.isActive;
    const saved = await this.salaryBandRepository.save(salaryBand);
    await this.syncPersonnelAverageSalary(saved.position, Number(saved.averageAnnualSalary));
    return saved;
  }

  async remove(id: string): Promise<void> {
    const salaryBand = await this.salaryBandRepository.findOne({ where: { id } });
    if (!salaryBand) {
      throw new NotFoundException(`Salary band '${id}' not found`);
    }

    await this.salaryBandRepository.remove(salaryBand);
  }
}
