import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsEmail()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}
