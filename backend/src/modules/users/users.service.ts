import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { Personnel } from '../personnel/personnel.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      username: createUserDto.username,
      passwordHash,
      name: createUserDto.name,
      role: createUserDto.role as UserRole,
    });

    return this.usersRepository.save(user);
  }

  async registerFromPersonnel(registerUserDto: RegisterUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { username: registerUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const personnel = await this.personnelRepository.findOne({
      where: {
        employeeId: registerUserDto.employeeId,
        isActive: true,
      },
    });

    if (!personnel) {
      throw new NotFoundException('No active personnel record matched the signup request');
    }

    const passwordHash = await bcrypt.hash(registerUserDto.password, 10);

    const user = this.usersRepository.create({
      username: registerUserDto.username,
      passwordHash,
      name: personnel.name,
      role: UserRole.GENERAL,
      isActive: true,
    });

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'username', 'name', 'role', 'isActive', 'createdAt'],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'username', 'name', 'role', 'isActive', 'createdAt'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }
    if (updateUserDto.role) {
      user.role = updateUserDto.role as UserRole;
    }
    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    return this.usersRepository.save(user);
  }

  async updateMyProfile(id: string, name: string): Promise<User> {
    const user = await this.findOne(id);
    user.name = name;
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}
