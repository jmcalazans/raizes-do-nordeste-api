import { ApiProperty } from '@nestjs/swagger';
import { CanalPedido, PedidoStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsPositive, Min, ValidateNested } from 'class-validator';

export class ItemPedidoDto {
  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() @IsPositive() produtoId!: number;
  @ApiProperty({ example: 2 }) @Type(() => Number) @IsInt() @IsPositive() quantidade!: number;
}

export class CriarPedidoDto {
  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() @IsPositive() unidadeId!: number;
  @ApiProperty({ enum: CanalPedido, example: CanalPedido.APP }) @IsEnum(CanalPedido) canalPedido!: CanalPedido;
  @ApiProperty({ type: [ItemPedidoDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ItemPedidoDto) itens!: ItemPedidoDto[];
  @ApiProperty({ description: 'Use true para aprovação e false para recusa no gateway mock', example: true }) @IsOptional() aprovarPagamento = true;
  @ApiProperty({ description: '10 pontos equivalem a R$ 1,00', example: 0, required: false }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) pontosResgatar = 0;
}

export class ListarPedidosDto {
  @IsOptional() @IsEnum(CanalPedido) canalPedido?: CanalPedido;
  @IsOptional() @IsEnum(PedidoStatus) status?: PedidoStatus;
  @Type(() => Number) @IsInt() @IsPositive() page = 1;
  @Type(() => Number) @IsInt() @IsPositive() limit = 20;
}

export class AtualizarStatusDto {
  @ApiProperty({ enum: PedidoStatus, example: PedidoStatus.EM_PREPARO }) @IsEnum(PedidoStatus) status!: PedidoStatus;
}
