# Fase 1 – Preparação de ambiente e infraestrutura base

## Objetivo da Fase
Estabelecer o ambiente de desenvolvimento e entrega (CI/CD e ambientes), definindo a base técnica mínima para suportar um CRM SaaS multi-tenant vendável na V1.

## Procedimentos
- Definir o **escopo técnico do V1** a partir das funcionalidades listadas na V1 (do arquivo de roadmap por versões).
- Definir o **modelo operacional de ambientes**:
  - Local (dev)
  - Staging (pré-produção)
  - Produção
- Definir padrões de **governança de repositório**:
  - Organização de pastas, convenções de commits e versionamento
  - Fluxo de branches e estratégia de releases
- Definir a **estratégia de deploy** (como o produto chega em staging/produção).
- Definir **gestão de configuração e segredos** (variáveis de ambiente e secrets).
- Definir requisitos mínimos de **observabilidade** (logs, métricas e rastreabilidade) para o V1 vendável.
- Definir estratégia mínima de **backup e restore** para dados do CRM e metadados.
- Definir o “Definition of Done” (DoD) do V1 para entregas incrementais (critérios de aceite por fase).
- Preparar documentação de onboarding técnico:
  - Setup local
  - Como subir staging
  - Como executar deploy
  - Como observar logs e incidentes

## Decisões Técnicas

### Decisão 1 — Stack tecnológica base (frontend, backend, banco)
- **O que está sendo decidido**: Qual stack base sustenta o V1 com multi-tenant, ACL e evolução do schema.
- **Alternativas consideradas**:
  - (A) Backend tipado + API HTTP/REST + DB relacional
  - (B) Backend dinâmico + DB relacional
  - (C) DB NoSQL como fonte primária
- **Decisão tomada**: **DB relacional como fonte primária**, com backend que suporte governança e segurança de forma explícita.
- **Justificativa objetiva**: Multi-tenant com isolamento lógico, permissões por objeto/campo e auditoria favorecem consistência transacional e modelagem relacional.

### Decisão 2 — Modelo de entrega e execução (containers vs serverless vs VMs)
- **O que está sendo decidido**: Como empacotar e operar o produto nos ambientes.
- **Alternativas consideradas**:
  - (A) Containers
  - (B) Serverless
  - (C) VMs tradicionais
- **Decisão tomada**: **Containers** como padrão inicial.
- **Justificativa objetiva**: Reduz diferença entre local/staging/prod e facilita replicabilidade e rollout incremental.

### Decisão 3 — CI/CD mínimo para V1
- **O que está sendo decidido**: O pipeline mínimo de build/test/deploy.
- **Alternativas consideradas**:
  - (A) Pipeline único (build + checks + deploy)
  - (B) Pipelines separados por ambiente
- **Decisão tomada**: **Pipeline mínimo com etapas explícitas** (build → checks → deploy staging → deploy produção).
- **Justificativa objetiva**: Evita “deploy manual” e reduz risco comercial no primeiro cliente.

### Decisão 4 — Observabilidade mínima no V1 (logs e rastreabilidade)
- **O que está sendo decidido**: Quais sinais operacionais são obrigatórios já no V1 vendável.
- **Alternativas consideradas**:
  - (A) Apenas logs de aplicação
  - (B) Logs + métricas + tracing distribuído
- **Decisão tomada**: **Logs estruturados + métricas mínimas**; tracing como opcional se o time tiver capacidade.
- **Justificativa objetiva**: V1 precisa suportar suporte e diagnóstico sem elevar custo/complexidade além do necessário.

### Decisão 5 — Backup e restore
- **O que está sendo decidido**: Como garantir recuperação em falhas e erros operacionais.
- **Alternativas consideradas**:
  - (A) Backups diários com retenção curta
  - (B) Backups frequentes com retenção longa
- **Decisão tomada**: **Backup automatizado com teste de restore** como requisito de prontidão comercial.
- **Justificativa objetiva**: Produto vendável exige capacidade de recuperação comprovada.

## Tecnologias Selecionadas
- **Banco de dados relacional (ex.: PostgreSQL)**: fonte primária de dados do CRM e metadados.
- **Containerização (Docker)**: padronização de execução em dev/staging/prod.
- **Orquestração**: começar simples (um orquestrador gerenciado ou equivalente) e evoluir conforme volume.
- **CI/CD (ex.: GitHub Actions / GitLab CI)**: automação de build/checks/deploy.
- **Gestão de segredos (ex.: Secret Manager do provedor cloud)**: armazenamento seguro de credenciais.
- **Observabilidade**:
  - **Logs estruturados**
  - **Métricas (ex.: Prometheus-compatible)**
  - **Alertas (ex.: Alertmanager-compatible)**
- **IaC (ex.: Terraform)**: reprodutibilidade da infra (quando aplicável).

## Pré-requisitos para Avançar
- [ ] Escopo técnico do V1 validado (com base no roadmap por versões)
- [ ] Estratégia de ambientes definida (local/staging/prod) e documentada
- [ ] Estratégia de deploy definida e reproduzível
- [ ] Pipeline CI/CD mínimo definido (mesmo que ainda não completo)
- [ ] Estratégia de segredos definida
- [ ] Observabilidade mínima definida (o que logar/medir/alertar)
- [ ] Estratégia de backup definida e plano de teste de restore acordado
- [ ] DoD e critérios de aceite por fase definidos


