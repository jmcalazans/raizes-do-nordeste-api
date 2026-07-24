import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CanalPedido, PedidoStatus, Prisma, Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CriarPedidoDto, ListarPedidosDto } from './dto';

const transicoes: Partial<Record<PedidoStatus, PedidoStatus[]>> = {
  RECEBIDO: [PedidoStatus.EM_PREPARO],
  EM_PREPARO: [PedidoStatus.PRONTO],
  PRONTO: [PedidoStatus.ENTREGUE],
};

@Injectable()
export class PedidosService {
  constructor(private prisma: PrismaService) {}

  async criar(dto: CriarPedidoDto, clienteId: number) {
    const cliente = await this.prisma.usuario.findUnique({ where: { id: clienteId } });
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');
    const unidade = await this.prisma.unidade.findUnique({ where: { id: dto.unidadeId } });
    if (!unidade?.ativa) throw new NotFoundException('Unidade não encontrada ou inativa.');
    const ids = [...new Set(dto.itens.map((i) => i.produtoId))];
    if (ids.length !== dto.itens.length) throw new ConflictException('Não repita o mesmo produto no pedido.');
    const estoques = await this.prisma.estoque.findMany({ where: { unidadeId: dto.unidadeId, produtoId: { in: ids } }, include: { produto: true } });
    if (estoques.length !== ids.length) throw new NotFoundException('Um ou mais produtos não existem no cardápio da unidade.');
    for (const item of dto.itens) {
      const estoque = estoques.find((e) => e.produtoId === item.produtoId)!;
      if (!estoque.produto.ativo) throw new ConflictException(`Produto ${item.produtoId} está inativo.`);
      if (estoque.quantidade < item.quantidade) throw new ConflictException(`Estoque insuficiente para ${estoque.produto.nome}. Disponível: ${estoque.quantidade}.`);
    }
    const agora = new Date();
    const promocoes = await this.prisma.promocao.findMany({ where: { ativa: true, inicio: { lte: agora }, fim: { gte: agora }, OR: [{ unidadeId: null }, { unidadeId: dto.unidadeId }] } });
    const calculados = dto.itens.map((item) => {
      const produto = estoques.find((e) => e.produtoId === item.produtoId)!.produto;
      const promocao = promocoes.filter((p) => p.produtoId === null || p.produtoId === item.produtoId).sort((a, b) => b.percentual - a.percentual)[0];
      const precoOriginal = Number(produto.preco);
      const precoUnitario = Number((precoOriginal * (1 - (promocao?.percentual ?? 0) / 100)).toFixed(2));
      return { produtoId: item.produtoId, quantidade: item.quantidade, precoUnitario, subtotal: Number((precoUnitario * item.quantidade).toFixed(2)), desconto: Number(((precoOriginal - precoUnitario) * item.quantidade).toFixed(2)) };
    });
    const totalAposPromocoes = calculados.reduce((s, i) => s + i.subtotal, 0);
    if (dto.pontosResgatar > 0 && !cliente.consentimentoLgpd) throw new ConflictException('É necessário consentimento para participar da fidelização.');
    if (dto.pontosResgatar > cliente.pontos) throw new ConflictException(`Saldo de pontos insuficiente. Disponível: ${cliente.pontos}.`);
    const maximoResgatavel = Math.floor(totalAposPromocoes * 10);
    if (dto.pontosResgatar > maximoResgatavel) throw new ConflictException(`O máximo de pontos para este pedido é ${maximoResgatavel}.`);
    const descontoPontos = dto.pontosResgatar / 10;
    const total = Number((totalAposPromocoes - descontoPontos).toFixed(2));
    const descontoPromocional = calculados.reduce((s, i) => s + i.desconto, 0);
    const pontosGerados = cliente.consentimentoLgpd ? Math.floor(total) : 0;

    return this.prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.create({ data: {
        clienteId, unidadeId: dto.unidadeId, canalPedido: dto.canalPedido, total,
        desconto: Number((descontoPromocional + descontoPontos).toFixed(2)), pontosResgatados: dto.aprovarPagamento !== false ? dto.pontosResgatar : 0, pontosGerados: dto.aprovarPagamento !== false ? pontosGerados : 0,
        itens: { create: calculados.map(({ desconto: _desconto, ...item }) => item) },
      }, include: { itens: true } });
      const aprovado = dto.aprovarPagamento !== false;
      if (aprovado) for (const item of dto.itens) {
        const estoque = estoques.find((e) => e.produtoId === item.produtoId)!;
        await tx.estoque.update({ where: { id: estoque.id }, data: { quantidade: { decrement: item.quantidade } } });
        await tx.movimentoEstoque.create({ data: { estoqueId: estoque.id, tipo: 'SAIDA', quantidade: item.quantidade, motivo: `Pedido #${pedido.id}` } });
      }
      if (aprovado && (pontosGerados > 0 || dto.pontosResgatar > 0)) {
        await tx.usuario.update({ where: { id: clienteId }, data: { pontos: { increment: pontosGerados - dto.pontosResgatar } } });
        if (dto.pontosResgatar > 0) await tx.movimentoPontos.create({ data: { usuarioId: clienteId, pedidoId: pedido.id, tipo: 'RESGATE', pontos: dto.pontosResgatar, descricao: `Resgate no pedido #${pedido.id}` } });
        if (pontosGerados > 0) await tx.movimentoPontos.create({ data: { usuarioId: clienteId, pedidoId: pedido.id, tipo: 'CREDITO', pontos: pontosGerados, descricao: `Crédito do pedido #${pedido.id}` } });
      }
      await tx.pagamento.create({ data: { pedidoId: pedido.id, transacaoId: randomUUID(), status: aprovado ? 'APROVADO' : 'RECUSADO', motivoRecusa: aprovado ? null : 'Pagamento recusado pelo gateway mock.', payload: JSON.stringify({ mock: true, aprovado, total }) } });
      const status = aprovado ? PedidoStatus.RECEBIDO : PedidoStatus.PAGAMENTO_RECUSADO;
      const atualizado = await tx.pedido.update({ where: { id: pedido.id }, data: { status }, include: { itens: { include: { produto: true } }, pagamento: true } });
      await tx.auditoria.create({ data: { usuarioId: clienteId, acao: 'CRIAR_PEDIDO', recurso: 'Pedido', recursoId: String(pedido.id), detalhes: JSON.stringify({ canalPedido: dto.canalPedido, pagamento: aprovado ? 'APROVADO' : 'RECUSADO' }) } });
      return this.serializar(atualizado);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async listar(q: ListarPedidosDto, user: AuthUser) {
    const where: Prisma.PedidoWhereInput = { canalPedido: q.canalPedido, status: q.status };
    if (user.role === Role.CLIENTE) where.clienteId = user.sub;
    const [dados, total] = await this.prisma.$transaction([
      this.prisma.pedido.findMany({ where, include: { itens: { include: { produto: true } }, pagamento: true }, orderBy: { criadoEm: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
      this.prisma.pedido.count({ where }),
    ]);
    return { dados: dados.map((p) => this.serializar(p)), meta: { page: q.page, limit: q.limit, total } };
  }

  async buscar(id: number, user: AuthUser) {
    const pedido = await this.prisma.pedido.findUnique({ where: { id }, include: { itens: { include: { produto: true } }, pagamento: true } });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');
    if (user.role === Role.CLIENTE && pedido.clienteId !== user.sub) throw new ForbiddenException('Você não pode acessar este pedido.');
    return this.serializar(pedido);
  }

  async atualizarStatus(id: number, novo: PedidoStatus, usuarioId: number) {
    const pedido = await this.prisma.pedido.findUnique({ where: { id } });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');
    if (!transicoes[pedido.status]?.includes(novo)) throw new ConflictException(`Transição de ${pedido.status} para ${novo} não permitida.`);
    const atualizado = await this.prisma.$transaction(async (tx) => {
      const p = await tx.pedido.update({ where: { id }, data: { status: novo } });
      await tx.auditoria.create({ data: { usuarioId, acao: 'ALTERAR_STATUS', recurso: 'Pedido', recursoId: String(id), detalhes: JSON.stringify({ anterior: pedido.status, novo }) } });
      return p;
    });
    return { ...atualizado, total: Number(atualizado.total) };
  }

  async cancelar(id: number, user: AuthUser) {
    const pedido = await this.prisma.pedido.findUnique({ where: { id }, include: { itens: true, pagamento: true, cliente: true } });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');
    if (user.role === Role.CLIENTE && pedido.clienteId !== user.sub) throw new ForbiddenException('Você não pode cancelar este pedido.');
    if (pedido.status !== PedidoStatus.RECEBIDO) throw new ConflictException('Somente pedidos no status RECEBIDO podem ser cancelados.');
    if (pedido.cliente.pontos < pedido.pontosGerados) throw new ConflictException('Os pontos gerados por este pedido já foram utilizados; procure um gerente.');
    return this.prisma.$transaction(async (tx) => {
      for (const item of pedido.itens) {
        const estoque = await tx.estoque.update({ where: { unidadeId_produtoId: { unidadeId: pedido.unidadeId, produtoId: item.produtoId } }, data: { quantidade: { increment: item.quantidade } } });
        await tx.movimentoEstoque.create({ data: { estoqueId: estoque.id, tipo: 'ENTRADA', quantidade: item.quantidade, motivo: `Cancelamento do pedido #${id}` } });
      }
      const ajuste = pedido.pontosResgatados - pedido.pontosGerados;
      if (ajuste !== 0) await tx.usuario.update({ where: { id: pedido.clienteId }, data: { pontos: { increment: ajuste } } });
      if (pedido.pontosGerados > 0) await tx.movimentoPontos.create({ data: { usuarioId: pedido.clienteId, pedidoId: id, tipo: 'ESTORNO', pontos: pedido.pontosGerados, descricao: `Estorno do crédito do pedido #${id}` } });
      if (pedido.pontosResgatados > 0) await tx.movimentoPontos.create({ data: { usuarioId: pedido.clienteId, pedidoId: id, tipo: 'CREDITO', pontos: pedido.pontosResgatados, descricao: `Devolução do resgate do pedido #${id}` } });
      const atualizado = await tx.pedido.update({ where: { id }, data: { status: PedidoStatus.CANCELADO } });
      await tx.auditoria.create({ data: { usuarioId: user.sub, acao: 'CANCELAR_PEDIDO', recurso: 'Pedido', recursoId: String(id), detalhes: JSON.stringify({ estoqueReposto: true, pontosAjustados: ajuste }) } });
      return { ...atualizado, total: Number(atualizado.total), desconto: Number(atualizado.desconto) };
    });
  }

  async auditoria(id: number) {
    if (!await this.prisma.pedido.findUnique({ where: { id } })) throw new NotFoundException('Pedido não encontrado.');
    return this.prisma.auditoria.findMany({ where: { recurso: 'Pedido', recursoId: String(id) }, orderBy: { criadoEm: 'asc' } });
  }

  private serializar<T extends { total: Prisma.Decimal; desconto?: Prisma.Decimal; itens?: Array<{ precoUnitario: Prisma.Decimal; subtotal: Prisma.Decimal; [key: string]: unknown }> }>(p: T) {
    return { ...p, total: Number(p.total), desconto: p.desconto === undefined ? undefined : Number(p.desconto), itens: p.itens?.map((i) => ({ ...i, precoUnitario: Number(i.precoUnitario), subtotal: Number(i.subtotal) })) };
  }
}
