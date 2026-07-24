import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { AtualizarStatusDto, CriarPedidoDto, ListarPedidosDto } from './dto';
import { PedidosService } from './pedidos.service';

@ApiTags('Pedidos') @ApiBearerAuth() @Controller('pedidos')
export class PedidosController {
  constructor(private service: PedidosService) {}
  @Post() @Roles(Role.CLIENTE) @ApiOperation({ summary: 'Cria pedido, baixa estoque e processa pagamento mock' })
  criar(@Body() dto: CriarPedidoDto, @CurrentUser() user: AuthUser) { return this.service.criar(dto, user.sub); }
  @Get() @ApiOperation({ summary: 'Lista pedidos com filtros por canal e status' })
  listar(@Query() q: ListarPedidosDto, @CurrentUser() user: AuthUser) { return this.service.listar(q, user); }
  @Get(':id') buscar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) { return this.service.buscar(id, user); }
  @Patch(':id/status') @Roles(Role.COZINHA, Role.ATENDENTE, Role.GERENTE, Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza status respeitando transições de negócio' })
  status(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarStatusDto, @CurrentUser() user: AuthUser) { return this.service.atualizarStatus(id, dto.status, user.sub); }
  @Post(':id/cancelamento') @ApiOperation({ summary: 'Cancela pedido, repõe estoque e estorna pontos' })
  cancelar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) { return this.service.cancelar(id, user); }
  @Get(':id/auditoria') @Roles(Role.GERENTE, Role.ADMIN) auditoria(@Param('id', ParseIntPipe) id: number) { return this.service.auditoria(id); }
}
