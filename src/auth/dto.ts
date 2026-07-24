import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsString, MinLength } from 'class-validator';

export class CadastroDto {
  @ApiProperty({ example: 'Maria Silva' }) @IsString() @MinLength(3) nome!: string;
  @ApiProperty({ example: 'maria@email.com' }) @IsEmail() email!: string;
  @ApiProperty({ example: 'Senha@123' }) @IsString() @MinLength(8) senha!: string;
  @ApiProperty({ example: true }) @IsBoolean() consentimentoLgpd!: boolean;
}

export class LoginDto {
  @ApiProperty({ example: 'cliente@raizes.com' }) @IsEmail() email!: string;
  @ApiProperty({ example: 'Cliente@123' }) @IsString() senha!: string;
}
