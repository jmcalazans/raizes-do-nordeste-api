import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { CriarPromocaoDto, StatusPromocaoDto } from './dto';
import { FidelidadeService } from './fidelidade.service';

@ApiTags('Fidelidade e promoções') @Controller()
export class FidelidadeController {
  constructor(private service: FidelidadeService) {}
  @Get('fidelidade/saldo') @ApiBearerAuth() @Roles(Role.CLIENTE) saldo(@CurrentUser() u: AuthUser) { return this.service.saldo(u.sub); }
  @Get('fidelidade/historico') @ApiBearerAuth() @Roles(Role.CLIENTE) historico(@CurrentUser() u: AuthUser) { return this.service.historico(u.sub); }
  @Public() @Get('promocoes') promocoes(@Query('unidadeId') unidadeId?: string, @Query('produtoId') produtoId?: string) { return this.service.listarPromocoes(unidadeId ? Number(unidadeId) : undefined, produtoId ? Number(produtoId) : undefined); }
  @Post('promocoes') @ApiBearerAuth() @Roles(Role.GERENTE, Role.ADMIN) criar(@Body() dto: CriarPromocaoDto, @CurrentUser() u: AuthUser) { return this.service.criarPromocao(dto, u.sub); }
  @Patch('promocoes/:id/status') @ApiBearerAuth() @Roles(Role.GERENTE, Role.ADMIN) status(@Param('id', ParseIntPipe) id: number, @Body() dto: StatusPromocaoDto, @CurrentUser() u: AuthUser) { return this.service.statusPromocao(id, dto.ativa, u.sub); }
}
