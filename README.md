# API Raízes do Nordeste

Projeto multidisciplinar da trilha Back-end. A API implementa um fluxo multicanal completo de pedido, validação de estoque, pagamento externo simulado e atualização de status.

## Tecnologias e arquitetura

- Node.js 22, TypeScript e NestJS 11
- Prisma ORM e SQLite (banco relacional local, sem dependência externa)
- JWT, Passport e bcrypt
- Swagger/OpenAPI e validação com `class-validator`
- Camadas equivalentes a API (`controllers`), Application/Domain (`services`) e Infrastructure (`Prisma`)

O SQLite foi escolhido para tornar a avaliação reproduzível com um único comando. O uso do Prisma permite trocar o datasource para PostgreSQL em uma evolução futura.

## Configuração e execução

```bash
cp .env.example .env
npm install
npx prisma generate
npm run db:setup
npm run start:dev
```

A API ficará em `http://localhost:3000/api` e o Swagger em `http://localhost:3000/docs`.

O script `db:setup` aplica a migration SQL idempotente e executa o seed. Para compilar e validar:

```bash
npm run build
npm test
```

## Usuários do seed

Todos usam a senha `Cliente@123`:

| Perfil | E-mail |
|---|---|
| CLIENTE | `cliente@raizes.com` |
| GERENTE | `gerente@raizes.com` |
| COZINHA | `cozinha@raizes.com` |

## Fluxo principal

1. `POST /api/auth/login`: obtém JWT.
2. `GET /api/unidades/1/cardapio`: consulta produtos disponíveis.
3. `POST /api/pedidos`: cria pedido com `canalPedido`, valida estoque e simula pagamento.
4. `PATCH /api/pedidos/{id}/status`: cozinha/gerência avança `RECEBIDO → EM_PREPARO → PRONTO → ENTREGUE`.
5. `GET /api/pedidos/{id}/auditoria`: gerente consulta a rastreabilidade.
6. `POST /api/pedidos/{id}/cancelamento`: cancela, repõe estoque e estorna pontos.

O pagamento mock é controlado por `aprovarPagamento`: `true` aprova e reserva/baixa estoque; `false` recusa, registra o motivo e preserva o estoque.

## Regras principais

- O canal é obrigatório e aceita `APP`, `TOTEM`, `BALCAO`, `PICKUP` ou `WEB`.
- Clientes visualizam apenas os próprios pedidos; GERENTE/ADMIN podem consultar auditoria.
- COZINHA, ATENDENTE, GERENTE e ADMIN atualizam status.
- Produto inexistente gera 404; estoque insuficiente ou transição inválida gera 409; DTO inválido gera 400.
- Senhas usam bcrypt (12 rounds) e nunca aparecem nas respostas.
- Erros seguem o contrato `{ error, message, details, timestamp, path, requestId }`.
- Promoções vigentes são aplicadas automaticamente por unidade/produto, sempre usando o maior desconto aplicável.
- Fidelidade gera 1 ponto por real pago; 10 pontos valem R$ 1,00 no resgate e exigem consentimento.
- GERENTE/ADMIN gerenciam unidades, produtos, estoque e campanhas pelas rotas `/api/admin` e `/api/promocoes`.

## LGPD

Dados mínimos coletados: nome, e-mail, hash de senha e registro de consentimento. Finalidades: autenticação, identificação do titular no pedido e fidelização. A base legal do cadastro/fidelização é consentimento; dados estritamente necessários à compra podem também apoiar execução de contrato. O titular pode exportar seus dados, alterar o consentimento e solicitar anonimização autenticada em `/api/lgpd`. O sistema preserva somente registros transacionais necessários à integridade e às obrigações legais, restringe auditoria por perfil e nunca devolve hashes.

## Testes

Importe `postman/Raizes-do-Nordeste.postman_collection.json` e execute as requisições na ordem numérica. A coleção mantém tokens e o último `pedidoId` em variáveis. Ela cobre cenários positivos e negativos de autenticação, autorização, validação, pedido, pagamento, cancelamento, fidelidade, promoções, administração, LGPD e auditoria. Além disso, `npm test` executa 16 testes automatizados de integração.

