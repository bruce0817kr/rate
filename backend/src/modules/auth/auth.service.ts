import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.validatePassword(user, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(
    username: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    let user: any;
    try {
      user = await this.validateUser(username, password);
    } catch (error) {
      await this.auditService.logChange(
        'AuthLogin',
        username,
        'CREATE',
        {
          success: false,
          username,
          reason: 'INVALID_CREDENTIALS',
          loggedAt: new Date().toISOString(),
        },
        'anonymous',
        ipAddress,
        userAgent,
      );
      throw error;
    }

    const payload = {
      sub: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      canManageActualSalary: user.canManageActualSalary === true,
    };

    const response = {
      access_token: this.jwtService.sign(payload),
      token_type: 'Bearer',
      expires_in: 3600,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        canManageActualSalary: user.canManageActualSalary === true,
      },
    };

    await this.auditService.logChange(
      'AuthLogin',
      user.id,
      'CREATE',
      {
        success: true,
        username: user.username,
        role: user.role,
        loggedAt: new Date().toISOString(),
      },
      user.id,
      ipAddress,
      userAgent,
    );

    return response;
  }

  async register(registerUserDto: RegisterUserDto, ipAddress?: string, userAgent?: string) {
    const created = await this.usersService.registerWithCompanyEmail(registerUserDto);
    await this.auditService.logChange(
      'AuthRegister',
      created.id,
      'CREATE',
      {
        success: true,
        username: created.username,
        role: created.role,
        createdAt: new Date().toISOString(),
      },
      created.id,
      ipAddress,
      userAgent,
    );
    return this.login(registerUserDto.username, registerUserDto.password, ipAddress, userAgent);
  }
}
