import { Controller, Post } from '@nestjs/common';
import { SeedService } from './personnel.seed';
import { UsersService } from '../modules/users/users.service';
import { UserRole } from '../modules/users/user.entity';
import * as bcrypt from 'bcrypt';

@Controller('seed')
export class SeedController {
  constructor(
    private readonly seedService: SeedService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async seed() {
    await this.seedService.seed();

    const existingAdmin = await this.usersService.findByUsername('admin');
    if (!existingAdmin) {
      await this.usersService.create({
        username: 'admin',
        password: 'admin123',
        name: '관리자',
        role: UserRole.ADMIN,
      });
    }

    return { message: 'Seed completed successfully' };
  }
}
