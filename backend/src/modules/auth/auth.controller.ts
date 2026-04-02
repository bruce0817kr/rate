import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface LoginDto {
  username: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly jwtService: JwtService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    if (loginDto.username === 'admin' && loginDto.password === 'admin123') {
      const payload = { sub: 'admin', username: 'admin', roles: ['admin'] };
      return { access_token: this.jwtService.sign(payload), token_type: 'Bearer', expires_in: 3600 };
    }
    
    if (loginDto.password === 'password123') {
      const payload = { sub: loginDto.username, username: loginDto.username, roles: ['user'] };
      return { access_token: this.jwtService.sign(payload), token_type: 'Bearer', expires_in: 3600 };
    }
    
    throw new UnauthorizedException('Invalid credentials');
  }
}