import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarPromocaoDto } from './dto';

@Injectable()
export class FidelidadeService {
  constructor(private prisma: PrismaService) {}
  async saldo(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId }, select: { pontos: true, consentimentoLgpd: true } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');
    return usuario;
  }
  historico(usuarioId: number) { return this.prisma.movimentoPontos.findMany({ where: { usuarioId }, orderBy: { criadoEm: 'desc' } }); }
  listarPromocoes(unidadeId?: number, produtoId?: number) {
    const agora = new Date();
    return this.prisma.promocao.findMany({ where: { ativa: true, inicio: { lte: agora }, fim: { gte: agora }, AND: [{ OR: [{ unidadeId: null }, { unidadeId }] }, { OR: [{ produtoId: null }, { produtoId }] }] }, orderBy: { percentual: 'desc' } });
  }
  async criarPromocao(dto: CriarPromocaoDto, usuarioId: number) {
    if (new Date(dto.fim) <= new Date(dto.inicio)) throw new BadRequestException('A data final deve ser posterior à data inicial.');
    if (dto.unidadeId && !await this.prisma.unidade.findUnique({ where: { id: dto.unidadeId } })) throw new NotFoundException('Unidade não encontrada.');
    if (dto.produtoId && !await this.prisma.produto.findUnique({ where: { id: dto.produtoId } })) throw new NotFoundException('Produto não encontrado.');
    const promocao = await this.prisma.promocao.create({ data: { ...dto, inicio: new Date(dto.inicio), fim: new Date(dto.fim) } });
    await this.prisma.auditoria.create({ data: { usuarioId, acao: 'CRIAR_PROMOCAO', recurso: 'Promocao', recursoId: String(promocao.id), detalhes: JSON.stringify(dto) } });
    return promocao;
  }
  async statusPromocao(id: number, ativa: boolean, usuarioId: number) {
    if (!await this.prisma.promocao.findUnique({ where: { id } })) throw new NotFoundException('Promoção não encontrada.');
    const promocao = await this.prisma.promocao.update({ where: { id }, data: { ativa } });
    await this.prisma.auditoria.create({ data: { usuarioId, acao: 'ALTERAR_PROMOCAO', recurso: 'Promocao', recursoId: String(id), detalhes: JSON.stringify({ ativa }) } }); return promocao;
  }
}
