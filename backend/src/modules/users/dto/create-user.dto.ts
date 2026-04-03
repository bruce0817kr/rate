import { IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsString()
  role: string;
}

export class UpdateUserDto {
  @IsString()
  name?: string;

  @IsString()
  role?: string;

  isActive?: boolean;
}
