import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { CatalogoService } from './catalogo.service';
import { MovimentoDto, PaginacaoDto } from './dto';

@ApiTags('Catálogo e estoque')
@Controller()
export class CatalogoController {
  constructor(private service: CatalogoService) {}
  @Public() @Get('unidades') @ApiOperation({ summary: 'Lista unidades ativas' }) unidades() { return this.service.listarUnidades(); }
  @Public() @Get('unidades/:id/cardapio') @ApiOperation({ summary: 'Cardápio disponível por unidade' })
  cardapio(@Param('id', ParseIntPipe) id: number, @Query() q: PaginacaoDto) { return this.service.cardapio(id, q.page, q.limit); }
  @Post('unidades/:unidadeId/estoque/:produtoId/entrada') @ApiBearerAuth() @Roles(Role.GERENTE, Role.ADMIN)
  @ApiOperation({ summary: 'Registra entrada no estoque (GERENTE/ADMIN)' })
  entrada(@Param('unidadeId', ParseIntPipe) unidadeId: number, @Param('produtoId', ParseIntPipe) produtoId: number, @Body() dto: MovimentoDto, @CurrentUser() user: AuthUser) {
    return this.service.entrada(unidadeId, produtoId, dto.quantidade, dto.motivo, user.sub);
  }
}
