import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';

describe('Raízes API (e2e)', () => {
  let app: INestApplication;
  let clienteToken: string;
  let gerenteToken: string;

  beforeAll(async () => {
    app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });
  afterAll(() => app.close());

  it('T01 autentica cliente', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'cliente@raizes.com', senha: 'Cliente@123' }).expect(200);
    clienteToken = res.body.accessToken;
    expect(clienteToken).toBeTruthy();
  });
  it('T02 autentica gerente', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'gerente@raizes.com', senha: 'Cliente@123' }).expect(200);
    gerenteToken = res.body.accessToken;
  });
  it('T03 consulta cardápio', async () => {
    const res = await request(app.getHttpServer()).get('/api/unidades/1/cardapio').expect(200);
    expect(res.body.dados.length).toBeGreaterThan(0);
  });
  it('T04 rejeita acesso sem token', () => request(app.getHttpServer()).get('/api/pedidos').expect(401));
  it('T05 impede CLIENTE de movimentar estoque', () => request(app.getHttpServer()).post('/api/unidades/1/estoque/1/entrada').set('Authorization', `Bearer ${clienteToken}`).send({ quantidade: 1, motivo: 'Teste' }).expect(403));
  it('T06 cria pedido aprovado', async () => {
    const res = await request(app.getHttpServer()).post('/api/pedidos').set('Authorization', `Bearer ${clienteToken}`).send({ unidadeId: 1, canalPedido: 'APP', itens: [{ produtoId: 1, quantidade: 1 }], aprovarPagamento: true }).expect(201);
    expect(res.body.status).toBe('RECEBIDO');
  });
  it('T07 registra pagamento recusado', async () => {
    const res = await request(app.getHttpServer()).post('/api/pedidos').set('Authorization', `Bearer ${clienteToken}`).send({ unidadeId: 1, canalPedido: 'TOTEM', itens: [{ produtoId: 2, quantidade: 1 }], aprovarPagamento: false }).expect(201);
    expect(res.body.status).toBe('PAGAMENTO_RECUSADO');
  });
  it('T08 rejeita canal ausente', () => request(app.getHttpServer()).post('/api/pedidos').set('Authorization', `Bearer ${clienteToken}`).send({ unidadeId: 1, itens: [{ produtoId: 1, quantidade: 1 }] }).expect(400));
  it('T09 retorna 404 para produto inexistente', () => request(app.getHttpServer()).post('/api/pedidos').set('Authorization', `Bearer ${clienteToken}`).send({ unidadeId: 1, canalPedido: 'WEB', itens: [{ produtoId: 99999, quantidade: 1 }] }).expect(404));
  it('T10 permite entrada de estoque pelo gerente', () => request(app.getHttpServer()).post('/api/unidades/1/estoque/1/entrada').set('Authorization', `Bearer ${gerenteToken}`).send({ quantidade: 1, motivo: 'Teste automatizado' }).expect(201));
  it('T11 lista promoções vigentes', async () => {
    const res = await request(app.getHttpServer()).get('/api/promocoes?unidadeId=1&produtoId=1').expect(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
  it('T12 consulta saldo de fidelidade', async () => {
    const res = await request(app.getHttpServer()).get('/api/fidelidade/saldo').set('Authorization', `Bearer ${clienteToken}`).expect(200);
    expect(typeof res.body.pontos).toBe('number');
  });
  it('T13 cancela pedido e repõe recursos', async () => {
    const criado = await request(app.getHttpServer()).post('/api/pedidos').set('Authorization', `Bearer ${clienteToken}`).send({ unidadeId: 1, canalPedido: 'PICKUP', itens: [{ produtoId: 3, quantidade: 1 }], aprovarPagamento: true }).expect(201);
    const cancelado = await request(app.getHttpServer()).post(`/api/pedidos/${criado.body.id}/cancelamento`).set('Authorization', `Bearer ${clienteToken}`).expect(201);
    expect(cancelado.body.status).toBe('CANCELADO');
  });
  it('T14 gerente cadastra produto', async () => {
    const res = await request(app.getHttpServer()).post('/api/admin/produtos').set('Authorization', `Bearer ${gerenteToken}`).send({ nome: `Produto teste ${Date.now()}`, descricao: 'Criado por teste', preco: 7.5 }).expect(201);
    expect(res.body.id).toBeTruthy();
  });
  it('T15 titular exporta os próprios dados', async () => {
    const res = await request(app.getHttpServer()).get('/api/lgpd/meus-dados').set('Authorization', `Bearer ${clienteToken}`).expect(200);
    expect(res.body).not.toHaveProperty('senhaHash');
    expect(res.body.email).toBe('cliente@raizes.com');
  });
  it('T16 recusa anonimização com senha incorreta', () => request(app.getHttpServer()).post('/api/lgpd/anonimizacao').set('Authorization', `Bearer ${clienteToken}`).send({ senha: 'SenhaIncorreta@123' }).expect(401));
});
