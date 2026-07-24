import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { AnonimizarDto, ConsentimentoDto } from './dto';
import { LgpdService } from './lgpd.service';
@ApiTags('LGPD') @ApiBearerAuth() @Controller('lgpd')
export class LgpdController {
  constructor(private service: LgpdService) {}
  @Get('meus-dados') dados(@CurrentUser() u: AuthUser) { return this.service.meusDados(u.sub); }
  @Patch('consentimento') consentimento(@CurrentUser() u: AuthUser, @Body() dto: ConsentimentoDto) { return this.service.consentimento(u.sub, dto.concedido, dto.finalidade); }
  @Post('anonimizacao') anonimizar(@CurrentUser() u: AuthUser, @Body() dto: AnonimizarDto) { return this.service.anonimizar(u.sub, dto.senha); }
}
