# Fase 2 – Estrutura SaaS e multi-tenant

## Objetivo da Fase
Definir e estabelecer a arquitetura multi-tenant do CRM SaaS, garantindo **isolamento lógico de dados**, **contexto de tenant** em todas as operações e capacidade de provisionar novos clientes.

## Procedimentos
- Definir o **modelo de tenant**:
  - Identidade do tenant (ID, slug)
  - Limites de tenant (se houver no V1)
  - Ciclo de vida do tenant (criação, suspensão, exclusão)
- Definir a **estratégia de isolamento** (onde e como o isolamento acontece).
- Definir como o **contexto de tenant** é resolvido:
  - Em cada request (backend)
  - Em cada operação de persistência/consulta (banco)
- Definir como o sistema tratará **metadados por tenant**:
  - Configurações do tenant
  - Metadados do schema (entidades/campos) por tenant
- Definir o **processo de provisionamento** do V1:
  - Criação de tenant
  - Criação do primeiro usuário admin do tenant
  - Seed data (opcional) para demonstração
- Definir o padrão de **logging e auditoria com escopo de tenant** (toda telemetria deve carregar o tenant).
- Definir **limites de segurança**:
  - Garantias mínimas anti “cross-tenant”
  - Estratégia de validação/monitoramento de vazamento

## Decisões Técnicas

### Decisão 1 — Estratégia de multi-tenancy
- **O que está sendo decidido**: Como isolar dados entre tenants.
- **Alternativas consideradas**:
  - (A) Banco por tenant
  - (B) Schema por tenant
  - (C) Tabelas compartilhadas com coluna `tenant_id` (isolamento lógico)
- **Decisão tomada**: **Tabelas compartilhadas com `tenant_id`** como padrão do V1.
- **Justificativa objetiva**: Menor custo operacional e menor atrito de provisionamento no V1, mantendo isolamento lógico consistente quando combinado com controles na camada de acesso e/ou políticas do banco.

### Decisão 2 — Onde impor o isolamento
- **O que está sendo decidido**: Se o isolamento é garantido por aplicação, por banco, ou ambos.
- **Alternativas consideradas**:
  - (A) Apenas aplicação (sempre filtrar por `tenant_id`)
  - (B) Banco (row-level security/políticas) + aplicação
- **Decisão tomada**: **Aplicação como obrigatória**, e **banco como reforço** quando viável.
- **Justificativa objetiva**: A aplicação precisa ser correta por padrão; reforço no banco reduz risco de erro humano e amplia segurança.

### Decisão 3 — Resolução do contexto de tenant
- **O que está sendo decidido**: Como identificar o tenant em cada requisição.
- **Alternativas consideradas**:
  - (A) Subdomínio por tenant
  - (B) Header explícito (ex.: `X-Tenant`)
  - (C) Path prefix (ex.: `/t/{tenant}`)
- **Decisão tomada**: **Estratégia única e consistente** no V1 (preferencialmente subdomínio quando o produto é vendido como SaaS).
- **Justificativa objetiva**: Simplifica UX e reduz risco de “usuário no tenant errado”.

### Decisão 4 — Modelo de provisionamento (onboarding de tenant)
- **O que está sendo decidido**: Se o tenant é criado self-serve, manual (operacional) ou híbrido.
- **Alternativas consideradas**:
  - (A) 100% self-serve
  - (B) 100% manual (time cria tenant)
  - (C) Híbrido (fluxo self-serve + aprovação)
- **Decisão tomada**: **Híbrido ou manual no V1**, dependendo de capacidade de suporte e risco.
- **Justificativa objetiva**: Produto vendido cedo costuma exigir controle maior de onboarding e configuração inicial.

## Tecnologias Selecionadas
- **Banco relacional (ex.: PostgreSQL)**: suporte forte a integridade e (quando desejado) políticas de isolamento.
- **Mecanismo de migrações**: para evolução controlada do schema no V1.
- **Gerenciamento de domínios/subdomínios (quando aplicável)**: para roteamento por tenant.
- **Observabilidade (logs estruturados)** com campos obrigatórios: `tenant_id`, `user_id` (quando houver), `request_id`.

## Pré-requisitos para Avançar
- [ ] Estratégia de multi-tenancy decidida e documentada (incluindo trade-offs)
- [ ] Forma de resolução de tenant definida (subdomínio/header/path) e padronizada
- [ ] Modelo de dados de tenant definido (campos mínimos, lifecycle)
- [ ] Regras de isolamento definidas (o que deve sempre ser filtrado por tenant)
- [ ] Processo de provisionamento definido (criar tenant + criar admin)
- [ ] Plano de validação de isolamento (testes/checagens) definido


