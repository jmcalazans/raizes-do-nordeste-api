import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsPositive, IsString, Min } from 'class-validator';

export class MovimentoDto {
  @ApiProperty({ example: 20 }) @Type(() => Number) @IsInt() @IsPositive() quantidade!: number;
  @ApiProperty({ example: 'Reposição semanal' }) @IsString() motivo!: string;
}

export class PaginacaoDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) limit = 20;
}
