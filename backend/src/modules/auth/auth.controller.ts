import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { Request } from 'express';

interface LoginDto {
  username: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerUserDto: RegisterUserDto, @Req() req: Request) {
    const userAgent = Array.isArray(req.headers['user-agent'])
      ? req.headers['user-agent'].join(', ')
      : req.headers['user-agent'];
    return this.authService.register(registerUserDto, req.ip, userAgent);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const userAgent = Array.isArray(req.headers['user-agent'])
      ? req.headers['user-agent'].join(', ')
      : req.headers['user-agent'];
    return this.authService.login(
      loginDto.username,
      loginDto.password,
      req.ip,
      userAgent,
    );
  }
}
