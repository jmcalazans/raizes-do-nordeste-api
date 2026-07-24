import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, Length, Min, MinLength } from 'class-validator';

export class CriarUnidadeDto {
  @ApiProperty({ example: 'Raízes Salvador Centro' }) @IsString() @MinLength(3) nome!: string;
  @ApiProperty({ example: 'Salvador' }) @IsString() cidade!: string;
  @ApiProperty({ example: 'BA' }) @IsString() @Length(2, 2) uf!: string;
  @IsOptional() @IsBoolean() ativa = true;
}
export class AtualizarUnidadeDto extends PartialType(CriarUnidadeDto) {}

export class CriarProdutoDto {
  @ApiProperty({ example: 'Bolo de macaxeira' }) @IsString() @MinLength(3) nome!: string;
  @IsOptional() @IsString() descricao?: string;
  @ApiProperty({ example: 12.9 }) @Type(() => Number) @IsNumber() @IsPositive() preco!: number;
  @IsOptional() @IsBoolean() ativo = true;
}
export class AtualizarProdutoDto extends PartialType(CriarProdutoDto) {}

export class DefinirEstoqueDto {
  @ApiProperty({ example: 20 }) @Type(() => Number) @IsInt() @Min(0) quantidade!: number;
}
