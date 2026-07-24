import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { AdminService } from './admin.service';
import { AtualizarProdutoDto, AtualizarUnidadeDto, CriarProdutoDto, CriarUnidadeDto, DefinirEstoqueDto } from './dto';

@ApiTags('Administração') @ApiBearerAuth() @Roles(Role.GERENTE, Role.ADMIN) @Controller('admin')
export class AdminController {
  constructor(private service: AdminService) {}
  @Post('unidades') criarUnidade(@Body() dto: CriarUnidadeDto, @CurrentUser() u: AuthUser) { return this.service.criarUnidade(dto, u.sub); }
  @Get('unidades') unidades() { return this.service.listarUnidades(); }
  @Patch('unidades/:id') atualizarUnidade(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarUnidadeDto, @CurrentUser() u: AuthUser) { return this.service.atualizarUnidade(id, dto, u.sub); }
  @Post('produtos') criarProduto(@Body() dto: CriarProdutoDto, @CurrentUser() u: AuthUser) { return this.service.criarProduto(dto, u.sub); }
  @Get('produtos') produtos(@Query('page') page = '1', @Query('limit') limit = '20') { return this.service.listarProdutos(Number(page), Number(limit)); }
  @Patch('produtos/:id') atualizarProduto(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarProdutoDto, @CurrentUser() u: AuthUser) { return this.service.atualizarProduto(id, dto, u.sub); }
  @Patch('unidades/:unidadeId/produtos/:produtoId/estoque') estoque(@Param('unidadeId', ParseIntPipe) unidadeId: number, @Param('produtoId', ParseIntPipe) produtoId: number, @Body() dto: DefinirEstoqueDto, @CurrentUser() u: AuthUser) { return this.service.definirEstoque(unidadeId, produtoId, dto.quantidade, u.sub); }
}
