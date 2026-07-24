import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
async function main() {
  const senhaHash = await bcrypt.hash('Cliente@123', 12);
  const usuarios = [
    ['Cliente Demonstração', 'cliente@raizes.com', Role.CLIENTE],
    ['Gerente Demonstração', 'gerente@raizes.com', Role.GERENTE],
    ['Cozinha Demonstração', 'cozinha@raizes.com', Role.COZINHA],
  ] as const;
  for (const [nome, email, role] of usuarios) await prisma.usuario.upsert({ where: { email }, update: {}, create: { nome, email, role, senhaHash, consentimentoLgpd: true, consentimentoEm: new Date() } });
  const unidade = await prisma.unidade.upsert({ where: { id: 1 }, update: {}, create: { nome: 'Raízes Recife Centro', cidade: 'Recife', uf: 'PE' } });
  const produtos = [
    { id: 1, nome: 'Cuscuz com queijo coalho', descricao: 'Cuscuz tradicional recheado', preco: 18.9 },
    { id: 2, nome: 'Tapioca de carne de sol', descricao: 'Tapioca com carne de sol e queijo', preco: 24.5 },
    { id: 3, nome: 'Suco de cajá', descricao: 'Copo de 400 ml', preco: 9.9 },
  ];
  for (const p of produtos) {
    const produto = await prisma.produto.upsert({ where: { id: p.id }, update: {}, create: p });
    await prisma.estoque.upsert({ where: { unidadeId_produtoId: { unidadeId: unidade.id, produtoId: produto.id } }, update: {}, create: { unidadeId: unidade.id, produtoId: produto.id, quantidade: 50 } });
  }
  await prisma.promocao.upsert({ where: { id: 1 }, update: {}, create: { id: 1, nome: 'Promoção de demonstração', descricao: '10% no cuscuz durante 2026', percentual: 10, inicio: new Date('2026-01-01T00:00:00Z'), fim: new Date('2026-12-31T23:59:59Z'), unidadeId: 1, produtoId: 1 } });
  console.log('Seed concluído. Senha dos usuários: Cliente@123');
}
main().finally(() => prisma.$disconnect());
