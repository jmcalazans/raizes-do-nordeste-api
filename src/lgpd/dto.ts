import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, MinLength } from 'class-validator';
export class ConsentimentoDto {
  @ApiProperty({ example: false }) @IsBoolean() concedido!: boolean;
  @ApiProperty({ example: 'Programa de fidelização e ofertas personalizadas' }) @IsString() finalidade!: string;
}
export class AnonimizarDto { @ApiProperty({ example: 'Cliente@123' }) @IsString() @MinLength(8) senha!: string; }
