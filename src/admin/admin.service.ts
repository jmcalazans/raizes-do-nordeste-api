import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarProdutoDto, AtualizarUnidadeDto, CriarProdutoDto, CriarUnidadeDto } from './dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async criarUnidade(dto: CriarUnidadeDto, usuarioId: number) {
    const produtos = await this.prisma.produto.findMany({ select: { id: true } });
    const unidade = await this.prisma.unidade.create({ data: { ...dto, uf: dto.uf.toUpperCase(), estoques: { create: produtos.map((p) => ({ produtoId: p.id, quantidade: 0 })) } } });
    await this.auditar(usuarioId, 'CRIAR_UNIDADE', 'Unidade', unidade.id, dto);
    return unidade;
  }
  listarUnidades() { return this.prisma.unidade.findMany({ orderBy: { nome: 'asc' } }); }
  async atualizarUnidade(id: number, dto: AtualizarUnidadeDto, usuarioId: number) {
    await this.exigirUnidade(id);
    const unidade = await this.prisma.unidade.update({ where: { id }, data: { ...dto, uf: dto.uf?.toUpperCase() } });
    await this.auditar(usuarioId, 'ATUALIZAR_UNIDADE', 'Unidade', id, dto); return unidade;
  }
  async criarProduto(dto: CriarProdutoDto, usuarioId: number) {
    const unidades = await this.prisma.unidade.findMany({ select: { id: true } });
    const produto = await this.prisma.produto.create({ data: { ...dto, estoques: { create: unidades.map((u) => ({ unidadeId: u.id, quantidade: 0 })) } } });
    await this.auditar(usuarioId, 'CRIAR_PRODUTO', 'Produto', produto.id, dto); return { ...produto, preco: Number(produto.preco) };
  }
  async listarProdutos(page: number, limit: number) {
    const [dados, total] = await this.prisma.$transaction([this.prisma.produto.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { nome: 'asc' } }), this.prisma.produto.count()]);
    return { dados: dados.map((p) => ({ ...p, preco: Number(p.preco) })), meta: { page, limit, total } };
  }
  async atualizarProduto(id: number, dto: AtualizarProdutoDto, usuarioId: number) {
    if (!await this.prisma.produto.findUnique({ where: { id } })) throw new NotFoundException('Produto não encontrado.');
    const produto = await this.prisma.produto.update({ where: { id }, data: dto });
    await this.auditar(usuarioId, 'ATUALIZAR_PRODUTO', 'Produto', id, dto); return { ...produto, preco: Number(produto.preco) };
  }
  async definirEstoque(unidadeId: number, produtoId: number, quantidade: number, usuarioId: number) {
    await this.exigirUnidade(unidadeId);
    if (!await this.prisma.produto.findUnique({ where: { id: produtoId } })) throw new NotFoundException('Produto não encontrado.');
    const anterior = await this.prisma.estoque.findUnique({ where: { unidadeId_produtoId: { unidadeId, produtoId } } });
    const estoque = await this.prisma.estoque.upsert({ where: { unidadeId_produtoId: { unidadeId, produtoId } }, update: { quantidade }, create: { unidadeId, produtoId, quantidade } });
    await this.prisma.movimentoEstoque.create({ data: { estoqueId: estoque.id, tipo: 'AJUSTE', quantidade, motivo: `Ajuste administrativo; saldo anterior ${anterior?.quantidade ?? 0}` } });
    await this.auditar(usuarioId, 'AJUSTAR_ESTOQUE', 'Estoque', estoque.id, { anterior: anterior?.quantidade ?? 0, quantidade }); return estoque;
  }
  private async exigirUnidade(id: number) { if (!await this.prisma.unidade.findUnique({ where: { id } })) throw new NotFoundException('Unidade não encontrada.'); }
  private auditar(usuarioId: number, acao: string, recurso: string, id: number, detalhes: object) { return this.prisma.auditoria.create({ data: { usuarioId, acao, recurso, recursoId: String(id), detalhes: JSON.stringify(detalhes) } }); }
}
