# Diagramas da solução

## Casos de uso

```mermaid
flowchart LR
  Cliente["Cliente (App/Web/Totem)"] --> Cardapio["Consultar cardápio por unidade"]
  Cliente --> Pedido["Realizar pedido multicanal"]
  Atendente["Atendente (Balcão)"] --> Pedido
  Pedido --> Estoque["Validar estoque"]
  Pedido --> Pagamento["Solicitar pagamento mock"]
  Gateway["Gateway externo"] --> Pagamento
  Cozinha["Cozinha"] --> Status["Atualizar status do pedido"]
  Gerente["Gerente/Administrador"] --> Estoque
  Gerente --> Auditoria["Consultar auditoria"]
```

## DER

```mermaid
erDiagram
  USUARIO ||--o{ PEDIDO : realiza
  USUARIO ||--o{ AUDITORIA : executa
  USUARIO ||--o{ MOVIMENTO_PONTOS : possui
  USUARIO ||--o{ CONSENTIMENTO_LGPD : registra
  UNIDADE ||--o{ PEDIDO : recebe
  UNIDADE ||--o{ ESTOQUE : possui
  PRODUTO ||--o{ ESTOQUE : integra
  ESTOQUE ||--o{ MOVIMENTO_ESTOQUE : registra
  PEDIDO ||--|{ ITEM_PEDIDO : contem
  PRODUTO ||--o{ ITEM_PEDIDO : referencia
  PEDIDO ||--o| PAGAMENTO : possui
  PEDIDO ||--o{ MOVIMENTO_PONTOS : origina
  UNIDADE ||--o{ PROMOCAO : segmenta
  PRODUTO ||--o{ PROMOCAO : segmenta
```

## Classes de domínio

```mermaid
classDiagram
  class Usuario { +id: int +email: string +role: Role +consentimentoLgpd: boolean }
  class Unidade { +id: int +nome: string +cidade: string +ativa: boolean }
  class Produto { +id: int +nome: string +preco: decimal +ativo: boolean }
  class Estoque { +unidadeId: int +produtoId: int +quantidade: int }
  class Pedido { +id: int +canalPedido: Canal +status: Status +total: decimal }
  class ItemPedido { +quantidade: int +precoUnitario: decimal +subtotal: decimal }
  class Pagamento { +status: StatusPagamento +transacaoId: uuid +payload: json }
  class Promocao { +percentual: int +inicio: datetime +fim: datetime +ativa: boolean }
  class MovimentoPontos { +tipo: TipoPontos +pontos: int +descricao: string }
  Usuario "1" --> "*" Pedido
  Unidade "1" --> "*" Estoque
  Produto "1" --> "*" Estoque
  Unidade "1" --> "*" Pedido
  Pedido "1" --> "1..*" ItemPedido
  Produto "1" --> "*" ItemPedido
  Pedido "1" --> "0..1" Pagamento
  Usuario "1" --> "*" MovimentoPontos
  Pedido "1" --> "*" MovimentoPontos
  Unidade "0..1" --> "*" Promocao
  Produto "0..1" --> "*" Promocao
```

## Sequência do fluxo crítico

```mermaid
sequenceDiagram
  actor Cliente
  participant API
  participant Banco
  participant Gateway as Pagamento mock
  Cliente->>API: POST /pedidos (canal e itens)
  API->>Banco: valida unidade, produtos e estoque
  API->>Gateway: solicita pagamento
  Gateway-->>API: aprovado ou recusado
  alt aprovado
    API->>Banco: cria pedido, baixa estoque e status RECEBIDO
  else recusado
    API->>Banco: cria pedido, preserva estoque e status PAGAMENTO_RECUSADO
  end
  API->>Banco: grava auditoria
  API-->>Cliente: 201 + pedido e pagamento
```

## Caso de uso crítico: realizar pedido

- Atores: Cliente/Atendente e gateway de pagamento.
- Pré-condições: usuário autenticado; unidade ativa; produtos cadastrados.
- Fluxo principal: informar unidade, canal e itens; validar disponibilidade; calcular preços no servidor; criar pedido; aprovar pagamento mock; baixar estoque; marcar como `RECEBIDO`; auditar.
- Pós-condição: pedido persistido e rastreável pelo canal.
- Exceções: canal inválido (400), produto/unidade inexistente (404), estoque insuficiente (409), pagamento recusado (pedido persistido sem baixa de estoque).
- Regra futura: aceitar `Idempotency-Key` para impedir pedidos duplicados em retries.

## Cancelamento e compensação

O cancelamento é uma operação transacional disponível enquanto o pedido está em `RECEBIDO`. A API muda o status para `CANCELADO`, devolve cada item ao estoque, registra movimentos, remove os pontos gerados, devolve pontos resgatados e cria auditoria. A atualização genérica de status não aceita `CANCELADO`, evitando cancelamentos sem compensação.

## Fidelização e promoções

O cliente que consentiu recebe um ponto por real efetivamente pago. Dez pontos equivalem a R$ 1,00. Campanhas podem ser gerais ou segmentadas por unidade/produto e possuem período de vigência. Quando mais de uma campanha se aplica ao mesmo item, prevalece o maior percentual para impedir descontos cumulativos não planejados.
