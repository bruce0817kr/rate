import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Personnel } from './personnel.entity';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { SalaryBand } from '../salary-bands/salary-band.entity';

@Injectable()
export class PersonnelService {
  constructor(
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    @InjectRepository(SalaryBand)
    private salaryBandRepository: Repository<SalaryBand>,
  ) {}

  private getDefaultSalaryReferencePosition(position: string): string | null {
    const normalized = position.trim();
    if (normalized === '본부장' || normalized === '수석부장') {
      return '부장';
    }
    if (normalized === '팀장') {
      return null;
    }
    return normalized;
  }

  private async resolvePositionAverageAnnualSalary(
    position: string,
    salaryReferencePosition?: string | null,
    explicitValue?: number | null,
  ): Promise<number | null> {
    if (explicitValue !== undefined && explicitValue !== null) {
      return explicitValue;
    }

    const referencePosition = salaryReferencePosition?.trim() || this.getDefaultSalaryReferencePosition(position);
    if (!referencePosition) {
      return null;
    }

    const positionSetting = await this.salaryBandRepository.findOne({
      where: { position: referencePosition, isActive: true },
    });

    return positionSetting ? Number(positionSetting.averageAnnualSalary) : null;
  }

  async createPersonnel(createPersonnelDto: CreatePersonnelDto): Promise<Personnel> {
    // Check if employeeId already exists
    const existingPersonnel = await this.personnelRepository.findOne({
      where: { employeeId: createPersonnelDto.employeeId },
    });

    if (existingPersonnel) {
      throw new ConflictException(`Personnel with employeeId ${createPersonnelDto.employeeId} already exists`);
    }

    // Create new personnel entity
    const personnel = this.personnelRepository.create({
      ...createPersonnelDto,
      gender: createPersonnelDto.gender || 'UNSPECIFIED',
      highestEducation: createPersonnelDto.highestEducation || 'UNKNOWN',
      educationYear: createPersonnelDto.educationYear || new Date().getFullYear(),
      nationalResearcherNumber: createPersonnelDto.nationalResearcherNumber || createPersonnelDto.employeeId,
      birthDate: createPersonnelDto.birthDate ? new Date(createPersonnelDto.birthDate) : new Date('1970-01-01'),
      // SSN will be encrypted in a real implementation
      // For now, we'll store as-is (in production, use proper encryption)
      ssn: createPersonnelDto.ssn,
      salaryReferencePosition:
        createPersonnelDto.salaryReferencePosition?.trim() ||
        this.getDefaultSalaryReferencePosition(createPersonnelDto.position),
      positionAverageAnnualSalary: await this.resolvePositionAverageAnnualSalary(
        createPersonnelDto.position,
        createPersonnelDto.salaryReferencePosition,
        createPersonnelDto.positionAverageAnnualSalary,
      ),
      // Set default salary validity period
      salaryValidity: {
        startDate: new Date(createPersonnelDto.hireDate),
        endDate: null,
      },
      isActive: createPersonnelDto.isActive ?? true,
    });

    return await this.personnelRepository.save(personnel);
  }

  async findAllPersonnel(options: FindManyOptions<Personnel> = {}): Promise<Personnel[]> {
    return await this.personnelRepository.find(options);
  }

  async findPersonnelById(id: string): Promise<Personnel> {
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    if (!personnel) {
      throw new NotFoundException(`Personnel with ID ${id} not found`);
    }
    return personnel;
  }

  async findPersonnelByEmployeeId(employeeId: string): Promise<Personnel> {
    const personnel = await this.personnelRepository.findOne({ where: { employeeId } });
    if (!personnel) {
      throw new NotFoundException(`Personnel with employeeId ${employeeId} not found`);
    }
    return personnel;
  }

  async updatePersonnel(id: string, updateData: Partial<CreatePersonnelDto>): Promise<Personnel> {
    const personnel = await this.findPersonnelById(id);
    
    // Merge update data
    Object.assign(personnel, updateData);

    if (updateData.position !== undefined || updateData.salaryReferencePosition !== undefined || updateData.positionAverageAnnualSalary !== undefined) {
      const nextReferencePosition =
        updateData.salaryReferencePosition !== undefined
          ? (updateData.salaryReferencePosition?.trim() || null)
          : (personnel.salaryReferencePosition ?? this.getDefaultSalaryReferencePosition(updateData.position || personnel.position));
      personnel.salaryReferencePosition = nextReferencePosition;
      personnel.positionAverageAnnualSalary = await this.resolvePositionAverageAnnualSalary(
        updateData.position || personnel.position,
        nextReferencePosition,
        updateData.positionAverageAnnualSalary,
      );
    }
    
    // If hireDate is updated, adjust salary validity start date
    if (updateData.hireDate) {
      personnel.salaryValidity.startDate = new Date(updateData.hireDate);
    }
    
    // If terminationDate is set, adjust salary validity end date
    if (updateData.terminationDate !== undefined) {
      personnel.salaryValidity.endDate = updateData.terminationDate 
        ? new Date(updateData.terminationDate) 
        : null;
    }
    
    return await this.personnelRepository.save(personnel);
  }

  async removePersonnel(id: string): Promise<void> {
    const result = await this.personnelRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Personnel with ID ${id} not found`);
    }
  }

  async deactivatePersonnel(id: string): Promise<Personnel> {
    const personnel = await this.findPersonnelById(id);
    personnel.isActive = false;
    return await this.personnelRepository.save(personnel);
  }

  async purgeMockPersonnel(): Promise<{ deletedCount: number }> {
    const deleteResult = await this.personnelRepository
      .createQueryBuilder()
      .delete()
      .from(Personnel)
      .where("name ~ :pattern", { pattern: '(팀원|구성원)[0-9]+$' })
      .orWhere("employeeId ~ :employeePattern", { employeePattern: '^EMP[0-9]{4,}$' })
      .execute();

    return { deletedCount: deleteResult.affected || 0 };
  }

  // Helper method to encrypt SSN (placeholder - would use proper encryption in production)
  private encryptSSN(ssn: string): string {
    // In production, use proper encryption like AES-256-GCM with a secure key
    // For demonstration, we'll just return the SSN as-is
    // WARNING: This is NOT secure - only for development purposes
    return ssn;
  }

  // Helper method to decrypt SSN (placeholder - would use proper decryption in production)
  private decryptSSN(encryptedSSN: string): string {
    // In production, use proper decryption
    // For demonstration, we'll just return the SSN as-is
    // WARNING: This is NOT secure - only for development purposes
    return encryptedSSN;
  }
}
