# Fase 3 – Autenticação e gestão de sessão

## Objetivo da Fase
Estabelecer autenticação e gestão de sessão para usuários do SaaS, garantindo que o acesso esteja **sempre associado a um tenant** e protegendo o sistema contra abuso básico (rate limiting).

## Procedimentos
- Definir o modelo de identidade do usuário:
  - Usuário pertence a qual escopo (sempre a um tenant no V1)
  - Atributos mínimos (nome, email)
- Definir os fluxos de autenticação do V1:
  - Login/logout
  - Recuperação/reset de senha
  - Alteração de senha
- Definir o modelo de sessão:
  - Tokens de autenticação (forma, expiração e renovação)
  - Revogação/expiração
- Definir a forma de **vincular sessão ao tenant**:
  - Sessão carrega tenant
  - Validação explícita a cada request
- Definir rate limiting / throttling para:
  - Login
  - Reset de senha
  - Endpoints sensíveis
- Definir logs mínimos de autenticação (mesmo que logs detalhados entrem em V2, o V1 deve ter rastreabilidade básica).

## Decisões Técnicas

### Decisão 1 — Modelo de autenticação (sessão vs token)
- **O que está sendo decidido**: Como representar sessão/autenticação no V1.
- **Alternativas consideradas**:
  - (A) Sessão stateful (cookie + storage servidor)
  - (B) Token stateless (ex.: JWT) + política de expiração
  - (C) Modelo híbrido (token curto + refresh/rotina de renovação)
- **Decisão tomada**: **Híbrido** (token de acesso com expiração curta + mecanismo de renovação/revogação compatível com SaaS).
- **Justificativa objetiva**: Permite segurança e controle de sessão sem depender de estado pesado em servidor.

### Decisão 2 — Identificador principal de usuário
- **O que está sendo decidido**: Se email é o login primário e como tratar unicidade.
- **Alternativas consideradas**:
  - (A) Email único global
  - (B) Email único por tenant
- **Decisão tomada**: **Email único por tenant** no V1 (ou global se o modelo comercial exigir “um usuário em múltiplos tenants” já no V1).
- **Justificativa objetiva**: Evita amarrar arquitetura a um cenário multi-tenant cross-org antes de haver necessidade real.

### Decisão 3 — Rate limiting
- **O que está sendo decidido**: Como limitar abuso de endpoints sensíveis.
- **Alternativas consideradas**:
  - (A) Por IP
  - (B) Por usuário (quando autenticado)
  - (C) Por tenant
  - (D) Combinação
- **Decisão tomada**: **Combinação por IP + tenant** para endpoints sensíveis.
- **Justificativa objetiva**: SaaS multi-tenant precisa conter abuso sem impactar desproporcionalmente um cliente.

### Decisão 4 — Segurança de recuperação/reset de senha
- **O que está sendo decidido**: Regras mínimas do fluxo de reset.
- **Alternativas consideradas**:
  - (A) Token curto e single-use com expiração
  - (B) Links longos e estáticos
- **Decisão tomada**: **Token single-use com expiração** e trilha mínima de auditoria.
- **Justificativa objetiva**: Reduz risco de sequestro de conta.

## Tecnologias Selecionadas
- **Identidade**: autenticação baseada em tokens (padrão do mercado SaaS).
- **Criptografia de senha**: algoritmo moderno e resistente (ex.: Argon2/bcrypt, conforme política do time).
- **Rate limiting**: mecanismo centralizado compatível com o runtime (pode usar cache/armazenamento dedicado quando necessário).
- **Email transacional (para reset)**: provedor de email transacional (categoria) para envio confiável.

## Pré-requisitos para Avançar
- [ ] Fluxos definidos: login/logout, reset, alteração de senha
- [ ] Modelo de sessão definido (expiração, renovação, revogação)
- [ ] Sessão vinculada a tenant (regra e validação definidas)
- [ ] Rate limiting definido para endpoints sensíveis
- [ ] Regras mínimas de logging/auditoria de auth definidas


