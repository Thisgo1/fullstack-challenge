# Desafio Full-stack - Crash Game 🎮

# Crash Game — Fullstack Challenge

## Setup

### Pré-requisitos

- Bun >= 1.x
- Docker & Docker Compose

### Subir tudo

```bash
git clone <repo>
cd fullstack-challenge
bun install
bun run docker:up
```

O comando `docker:up` sobe todos os serviços sem nenhum passo manual:

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Game Service | http://localhost:4001 |
| Wallet Service | http://localhost:4002 |
| Kong (API Gateway) | http://localhost:8000 |
| Keycloak | http://localhost:8080 |
| RabbitMQ Management | http://localhost:15672 |

### Usuário de teste

| Campo | Valor |
|---|---|
| Username | player |
| Password | player123 |
| Saldo inicial | R$ 1.000,00 |

O usuário é pré-configurado no Keycloak e a wallet é criada automaticamente com saldo ao subir o serviço.

### Rodar testes

```bash
# Unitários (não requer Docker)
cd services/games   && bun test tests/unit
cd services/wallets && bun test tests/unit

# E2E (requer docker:up)
cd services/games   && bun test tests/e2e
cd services/wallets && bun test tests/e2e
```

---

## Arquitetura

```
Frontend (TanStack Start)
    ↓ HTTP/REST + WebSocket
  nginx (proxy)
    ↓
  Kong (API Gateway)
    ↓
┌─────────────────┬──────────────────┐
│  Game Service   │  Wallet Service  │
│  (NestJS :4001) │  (NestJS :4002)  │
└────────┬────────┴────────┬─────────┘
         │    RabbitMQ     │
         └────────┬────────┘
              PostgreSQL
                  │
              Keycloak (IdP)
```

### Bounded Contexts

**Game Service** — responsável pelo ciclo de vida das rodadas, apostas, algoritmo provably fair e WebSocket em tempo real.

**Wallet Service** — responsável pela carteira do jogador: saldo, crédito e débito. Nunca se comunica diretamente com o Game Service via HTTP — apenas via mensagens assíncronas.

---

## Decisões de Arquitetura

### DDD em camadas

Cada serviço segue quatro camadas com regra estrita de dependência:

```
domain/         → regras de negócio puras, zero dependência externa
application/    → orquestração dos use cases
infrastructure/ → Prisma, RabbitMQ, WebSocket
presentation/   → controllers HTTP, WebSocket gateway
```

**Decisão:** a camada `domain` não importa nada do NestJS, Prisma ou qualquer framework. Isso permite testar toda a lógica de negócio sem banco rodando, e trocar o ORM sem tocar no domínio.

**Trade-off:** mais arquivos e mais boilerplate. Compensado pelo ganho em testabilidade e clareza de responsabilidades — cada arquivo responde uma pergunta específica sobre o que o sistema faz.

---

### Entidades com construtor privado

```ts
static create(id: string, playerId: string): Wallet {
  return new Wallet(id, playerId, 0n, new Date());
}

static restore(id: string, playerId: string, balance: bigint, createdAt: Date): Wallet {
  return new Wallet(id, playerId, balance, createdAt);
}
```

**Decisão:** ninguém cria um objeto em estado inválido. `create()` aplica regras de criação, `restore()` reconstrói do banco sem revalidar.

**Por que usei dois métodos?** Criar uma `Wallet` nova é diferente de reconstituir uma que já existe no banco. A primeira aplica defaults e validações de negócio; a segunda apenas hidrata o objeto com dados já validados anteriormente.

---

### BigInt para valores monetários

Todo valor monetário é armazenado em centavos como `BIGINT` no PostgreSQL e `bigint` no TypeScript.

**Decisão:** `0.1 + 0.2 === 0.30000000000000004` em JavaScript. Qualquer operação com `float` em dinheiro é uma vulnerabilidade. Centavos inteiros eliminam o problema completamente.

**Trade-off:** serialização JSON não suporta `bigint` nativamente — todos os valores monetários são convertidos para `string` na camada de apresentação.

---

### Máquina de estados explícita no Round

```
BETTING → RUNNING → CRASHED
```

Cada transição é protegida por guards que lançam erro se chamada fora de ordem.

**Decisão:** tornar impossível ter uma rodada em estado inconsistente. `round.start()` lança erro se chamado em uma rodada que já iniciou. `round.crash()` lança erro se chamado em uma rodada que ainda não iniciou.

**Trade-off:** mais verboso do que um simples campo `status: string`. Compensado pela segurança — o compilador e os testes garantem que transições inválidas são impossíveis.

---

### Provably Fair

Algoritmo baseado no Bustabit (open source, auditado pela comunidade):

1. Servidor gera `seed` aleatória (32 bytes de entropia)
2. Calcula `seedHash = SHA256(seed)` e publica **antes** da rodada
3. Jogadores apostam sem saber o resultado
4. Após o crash, servidor revela a `seed`
5. Qualquer jogador pode verificar: `SHA256(seed) === seedHash` e recalcular o crash point

**Por que HMAC e não SHA256 simples?**
`HMAC(serverSecret, seed)` adiciona o `serverSecret` como segundo fator. Sem ele, qualquer um com a seed poderia calcular o resultado antes da rodada. Com HMAC, mesmo que a seed vaze, o resultado só é calculável com o secret do servidor.

**Por que 52 bits de precisão?**
JavaScript usa IEEE 754 com 52 bits de mantissa. Usar mais bits causaria perda silenciosa de precisão na divisão float.

**Por que hash chain?**
Cada rodada deriva sua seed da anterior: `seed_N = SHA256(seed_{N+1})`. Isso garante que o servidor gerou todas as seeds antes do jogo começar — qualquer adulteração em qualquer rodada quebra a cadeia inteira.

---

### RabbitMQ para comunicação entre serviços

Três eventos projetados:

| Evento | Publisher | Consumer | Ação |
|---|---|---|---|
| `bet.placed` | Games | Wallets | Debita o valor apostado |
| `bet.won` | Games | Wallets | Credita o payout |
| `bet.lost` | Games | — | Apenas log |

**Por que assíncrono e não HTTP direto?**
Se o Wallet Service estiver fora do ar no momento do cashout e usássemos HTTP, o crédito se perderia. Com RabbitMQ, a mensagem fica na fila e o crédito acontece quando o serviço voltar.

**Por que topic exchange?**
Permite roteamento por padrão — `bet.*` captura todos os eventos de aposta. Mais flexível que direct (match exato) ou fanout (todos recebem). Se um novo serviço precisar escutar eventos de aposta no futuro, basta criar uma nova fila e fazer bind — sem mudar o publisher.

**Por que ack manual?**
Com `autoAck`, a mensagem é removida da fila ao ser entregue. Se o serviço cair antes de processar, o dinheiro se perde. Com ack manual, a mensagem só sai da fila após o crédito/débito ser confirmado no banco. Custo: complexidade adicional no consumer.

**Por que `prefetch(1)`?**
Processa uma mensagem por vez — garante ordem e evita processar o mesmo crédito duas vezes em caso de falha parcial.

---

### Repositórios com inversão de dependência

Interface no domínio, implementação no Prisma na infraestrutura:

```ts
// Domain — define o contrato
export interface IWalletRepository {
  findByPlayerId(playerId: string): Promise<Wallet | null>;
  save(wallet: Wallet): Promise<void>;
}

// Infrastructure — implementa o contrato
export class PrismaWalletRepository implements IWalletRepository { ... }
```

**Decisão:** o domínio dita o contrato, a infraestrutura se adapta. Se amanhã trocarmos Prisma por TypeORM, o domínio e os use cases não mudam.

**Por que Symbol como token de injeção?**
Interfaces TypeScript são apagadas pelo compilador — o Nest não consegue resolver interfaces em runtime. Um `Symbol` único é o token que o Nest usa para saber qual implementação injetar.

---

### Game Loop

`setInterval` gerenciando o ciclo automaticamente:

```
BETTING (10s) → RUNNING → CRASHED → espera 5s → nova rodada
```

Multiplicador cresce exponencialmente: `100 * e^(elapsed/6000)`.

**Por que exponencial?**
Cresce devagar no início (zona segura onde muitos sacam) e rápido no final (zona de risco). Cria a tensão natural do jogo — você sempre sente que pode esperar um pouco mais, mas o risco aumenta.

**Por que `OnModuleInit` com delay de 2s?**
Garante que banco e RabbitMQ estão prontos antes do loop iniciar. Sem o delay, o primeiro round pode falhar ao tentar salvar antes do Prisma estar conectado.

---

### WebSocket

Gateway socket.io no namespace `/game`. Emite a cada 100ms durante `RUNNING`:

| Evento | Quando | Payload |
|---|---|---|
| `round:betting` | Nova fase de apostas | roundId, seedHash, duration |
| `round:started` | Rodada começa | roundId |
| `multiplier:tick` | A cada 100ms | roundId, multiplier, display |
| `round:crashed` | Crash | roundId, crashPoint, display |

**Por que `EventEmitter2` entre GameLoop e Gateway?**
O `GameLoopService` não deveria conhecer o `GameGateway` diretamente — isso criaria acoplamento entre camadas. O EventEmitter2 é o canal de comunicação interno: o loop publica eventos, o gateway os escuta e repassa para os clientes WebSocket.

**Por que 100ms de tick?**
Abaixo disso, 1000 clientes conectados gerariam 10.000 mensagens/segundo — overhead desnecessário. Acima disso, o multiplicador parece "pular" na tela. 100ms é o equilíbrio entre suavidade visual e carga de servidor.

---

### Autenticação JWT com Keycloak

**Por que validar no serviço e não só no Kong?**
O Kong community não tem plugin OIDC nativo. Validar no serviço é mais seguro — mesmo que alguém acesse a porta direta do serviço bypassando o Kong, ainda precisa de JWT válido.

**Por que `jwks-rsa` e não chave hardcoded?**
O Keycloak rotaciona suas chaves periodicamente. O endpoint JWKS sempre retorna as chaves atuais — zero configuração manual. Se a chave mudar, o sistema continua funcionando automaticamente.

**Por que aceitar dois issuers?**
O token JWT é gerado pelo browser acessando `localhost:8080`. O guard roda dentro do Docker onde o Keycloak é `keycloak:8080`. O issuer no token será `localhost:8080` — precisamos aceitar os dois contextos.

**Por que `sub` do JWT como playerId?**
O `sub` é o identificador único do usuário no Keycloak — imutável e não forjável pelo cliente.

---

### Infraestrutura Docker

**Por que PostgreSQL 18?**
Versão especificada no desafio. Mudança importante: o caminho dos dados passou de `/var/lib/postgresql/data` para `/var/lib/postgresql` — o Postgres 18 gerencia o subdiretório internamente.

**Por que `prisma migrate deploy` e não `migrate dev`?**
`migrate dev` é para desenvolvimento — cria arquivos de migration e requer interação. `migrate deploy` aplica migrations existentes de forma idempotente, sem interação — ideal para CI/CD e Docker.

**Por que `environment` sobrescreve `env_file` no compose?**
`environment` tem precedência sobre `env_file` no Docker Compose. Isso permite que o `.env` local use `localhost:5432` para desenvolvimento, enquanto o Docker usa `postgres:5432` (hostname do container) sem precisar de dois arquivos diferentes.

**Por que nginx no frontend e não servir com Bun?**
O nginx é otimizado para servir arquivos estáticos — compressão gzip, cache headers e proxy reverso sem overhead de runtime JavaScript. O build do Vite gera arquivos estáticos que o nginx serve diretamente.

---

### Frontend

**Por que TanStack Start?**
É o framework preferido na stack da Jungle Gaming. Uso demonstra alinhamento com as tecnologias da empresa.

**Por que Zustand para estado do jogo?**
O multiplicador muda 10x por segundo. Zustand com seletores individuais (`useGameStore(s => s.multiplier)`) re-renderiza apenas o componente que mudou — sem cascata desnecessária pelo React tree.

**Por que `sessionStorage` para tokens OIDC?**
Tokens expiram — `sessionStorage` é limpo ao fechar o browser. `localStorage` persiste indefinidamente, criando risco de token roubado se o computador for compartilhado.

**Por que proxy no nginx e não chamar Kong diretamente?**
O frontend chama `/api/games/*` — o nginx traduz para `http://games:4001/games/*` dentro da rede Docker. Isso evita que o frontend precise conhecer os endereços internos dos serviços.

---

## Trade-offs e Limitações

**Outbox pattern não implementado** — a publicação de eventos RabbitMQ acontece após o save no banco, mas não em uma transaction atômica. Em caso de falha entre o save e o publish, o evento se perde. A solução seria o padrão Outbox (salvar o evento no banco na mesma transaction e publicar em background), mas foi descartado por complexidade dado o prazo.

**Seed do usuário de teste hardcoded** — o UUID do usuário `player` está fixo no `SeedService`. Se o Keycloak for resetado e recriar o usuário com outro UUID, o seed falhará. A solução seria buscar o UUID via API do Keycloak na inicialização.

**Sem rate limiting** — o Kong não tem rate limiting configurado. Em produção isso seria crítico para evitar abuso da API de apostas.

**Auto-cashout não implementado** — jogador não pode definir um multiplicador alvo para saque automático. Seria um bônus de alto valor para o produto.

**Testes E2E dependem de timing** — os testes aguardam fases específicas do game loop via polling. Se o servidor estiver sob carga, os timeouts podem ser insuficientes.

