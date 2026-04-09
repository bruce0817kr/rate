import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { UsersService } from '../modules/users/users.service';
import { UserRole } from '../modules/users/user.entity';

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(private readonly usersService: UsersService) {}

  async onApplicationBootstrap() {
    const existingAdmin = await this.usersService.findByUsername('admin');

    if (existingAdmin) {
      return;
    }

    await this.usersService.create({
      username: 'admin',
      password: 'admin123',
      name: '관리자',
      role: UserRole.ADMIN,
    });

    this.logger.warn('Created default admin account: admin/admin123');
  }
}
