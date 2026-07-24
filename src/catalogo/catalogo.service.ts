import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogoService {
  constructor(private prisma: PrismaService) {}

  listarUnidades() { return this.prisma.unidade.findMany({ where: { ativa: true } }); }

  async cardapio(unidadeId: number, page: number, limit: number) {
    if (!await this.prisma.unidade.findUnique({ where: { id: unidadeId } })) throw new NotFoundException('Unidade não encontrada.');
    const where = { unidadeId, quantidade: { gt: 0 }, produto: { ativo: true } };
    const [dados, total] = await this.prisma.$transaction([
      this.prisma.estoque.findMany({ where, include: { produto: true }, skip: (page - 1) * limit, take: limit }),
      this.prisma.estoque.count({ where }),
    ]);
    return { dados: dados.map((e) => ({ id: e.produto.id, nome: e.produto.nome, descricao: e.produto.descricao, preco: Number(e.produto.preco), disponivel: e.quantidade })), meta: { page, limit, total } };
  }

  async entrada(unidadeId: number, produtoId: number, quantidade: number, motivo: string, usuarioId: number) {
    const estoque = await this.prisma.estoque.findUnique({ where: { unidadeId_produtoId: { unidadeId, produtoId } } });
    if (!estoque) throw new NotFoundException('Estoque da unidade/produto não encontrado.');
    const atualizado = await this.prisma.$transaction(async (tx) => {
      const registro = await tx.estoque.update({ where: { id: estoque.id }, data: { quantidade: { increment: quantidade } } });
      await tx.movimentoEstoque.create({ data: { estoqueId: estoque.id, tipo: 'ENTRADA', quantidade, motivo } });
      await tx.auditoria.create({ data: { usuarioId, acao: 'ENTRADA_ESTOQUE', recurso: 'Estoque', recursoId: String(estoque.id), detalhes: JSON.stringify({ quantidade, motivo }) } });
      return registro;
    });
    return atualizado;
  }
}
