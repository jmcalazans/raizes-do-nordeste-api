import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LgpdService {
  constructor(private prisma: PrismaService) {}
  async meusDados(usuarioId: number) {
    return this.prisma.usuario.findUnique({ where: { id: usuarioId }, select: { id: true, nome: true, email: true, role: true, pontos: true, consentimentoLgpd: true, consentimentoEm: true, criadoEm: true, consentimentos: true, pedidos: { select: { id: true, canalPedido: true, status: true, total: true, criadoEm: true } } } });
  }
  async consentimento(usuarioId: number, concedido: boolean, finalidade: string) {
    const usuario = await this.prisma.$transaction(async (tx) => {
      const u = await tx.usuario.update({ where: { id: usuarioId }, data: { consentimentoLgpd: concedido, consentimentoEm: concedido ? new Date() : null } });
      await tx.consentimentoLgpd.create({ data: { usuarioId, finalidade, concedido } });
      await tx.auditoria.create({ data: { usuarioId, acao: concedido ? 'CONCEDER_CONSENTIMENTO' : 'REVOGAR_CONSENTIMENTO', recurso: 'Usuario', recursoId: String(usuarioId), detalhes: JSON.stringify({ finalidade }) } });
      return u;
    });
    return { consentimentoLgpd: usuario.consentimentoLgpd, consentimentoEm: usuario.consentimentoEm };
  }
  async anonimizar(usuarioId: number, senha: string) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    if (!await bcrypt.compare(senha, usuario.senhaHash)) throw new UnauthorizedException('Senha inválida.');
    await this.prisma.$transaction(async (tx) => {
      await tx.auditoria.create({ data: { usuarioId, acao: 'ANONIMIZAR_DADOS', recurso: 'Usuario', recursoId: String(usuarioId), detalhes: 'Solicitação do titular.' } });
      await tx.usuario.update({ where: { id: usuarioId }, data: { nome: 'TITULAR ANONIMIZADO', email: `anonimo-${usuarioId}@removido.local`, senhaHash: await bcrypt.hash(randomUUID(), 12), consentimentoLgpd: false, consentimentoEm: null } });
    });
    return { message: 'Dados pessoais anonimizados. Registros transacionais mínimos foram preservados para integridade e obrigações legais.' };
  }
}
