import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSalaryBandDto } from './dto/create-salary-band.dto';
import { UpdateSalaryBandDto } from './dto/update-salary-band.dto';
import { SalaryBand } from './salary-band.entity';

@Injectable()
export class SalaryBandsService {
  constructor(
    @InjectRepository(SalaryBand)
    private readonly salaryBandRepository: Repository<SalaryBand>,
  ) {}

  async findAll(): Promise<SalaryBand[]> {
    return this.salaryBandRepository.find({
      where: { isActive: true },
      order: { position: 'ASC' },
    });
  }

  async create(dto: CreateSalaryBandDto): Promise<SalaryBand> {
    if (dto.maxAmount < dto.minAmount) {
      throw new ConflictException('maxAmount must be greater than or equal to minAmount');
    }

    const normalizedPosition = dto.position.trim();
    const existing = await this.salaryBandRepository.findOne({
      where: { position: normalizedPosition },
    });
    if (existing) {
      throw new ConflictException(`Salary band for '${normalizedPosition}' already exists`);
    }

    const salaryBand = this.salaryBandRepository.create({
      position: normalizedPosition,
      minAmount: dto.minAmount,
      maxAmount: dto.maxAmount,
      isActive: dto.isActive ?? true,
    });
    return this.salaryBandRepository.save(salaryBand);
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
    if (dto.minAmount !== undefined) salaryBand.minAmount = dto.minAmount;
    if (dto.maxAmount !== undefined) salaryBand.maxAmount = dto.maxAmount;
    if (dto.isActive !== undefined) salaryBand.isActive = dto.isActive;

    if (salaryBand.maxAmount < salaryBand.minAmount) {
      throw new ConflictException('maxAmount must be greater than or equal to minAmount');
    }

    return this.salaryBandRepository.save(salaryBand);
  }

  async remove(id: string): Promise<void> {
    const salaryBand = await this.salaryBandRepository.findOne({ where: { id } });
    if (!salaryBand) {
      throw new NotFoundException(`Salary band '${id}' not found`);
    }

    await this.salaryBandRepository.remove(salaryBand);
  }
}

