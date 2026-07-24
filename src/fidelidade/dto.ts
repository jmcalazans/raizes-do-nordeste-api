import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class CriarPromocaoDto {
  @ApiProperty({ example: 'São João' }) @IsString() nome!: string;
  @IsOptional() @IsString() descricao?: string;
  @ApiProperty({ example: 15 }) @Type(() => Number) @IsInt() @Min(1) @Max(90) percentual!: number;
  @ApiProperty({ example: '2026-06-01T00:00:00Z' }) @IsDateString() inicio!: string;
  @ApiProperty({ example: '2026-06-30T23:59:59Z' }) @IsDateString() fim!: string;
  @IsOptional() @Type(() => Number) @IsInt() @IsPositive() unidadeId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @IsPositive() produtoId?: number;
}

export class StatusPromocaoDto { @IsBoolean() ativa!: boolean; }
