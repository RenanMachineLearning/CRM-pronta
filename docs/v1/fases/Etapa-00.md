# Fase 0 – Preparação de ambiente e infraestrutura base

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

---

## Detalhamento dos Procedimentos

### 1. Escopo técnico do V1
**Baseado em**: `Features/meu_projeto/v1/Roadmap-V1.md`

**Funcionalidades core a serem implementadas**:
- Multi-tenant com isolamento de dados
- Autenticação e autorização (JWT)
- Gestão de usuários e ACL (permissões por objeto/campo)
- Modelo de dados personalizável (entidades e campos customizados)
- CRUD de Contatos, Empresas, Leads e Oportunidades
- Pipeline de vendas configurável
- Tarefas e Notas vinculadas a registros
- Busca global e filtros avançados
- Importação/exportação de dados (CSV/Excel)
- Interface responsiva (desktop, tablet, mobile)

**Requisitos não-funcionais**:
- Performance: tempo de resposta < 500ms para operações CRUD
- Segurança: isolamento multi-tenant garantido, rate limiting, auditoria
- Disponibilidade: 99% uptime (SLA básico para V1)
- Escalabilidade: suportar até 100 tenants simultâneos na V1

### 2. Modelo operacional de ambientes

#### Ambiente Local (Desenvolvimento)
- **Objetivo**: Desenvolvimento e testes locais
- **Stack**: Docker Compose com:
  - Container do backend (Node.js + TypeScript)
  - Container do frontend (React + TypeScript)
  - Container do PostgreSQL (versão mais recente estável)
- **Configuração**: Variáveis de ambiente via arquivo `.env` (não versionado)
- **Acesso**: `localhost` com portas mapeadas (ex.: frontend:3000, backend:4000, postgres:5432)

#### Ambiente Staging (Pré-produção)
- **Objetivo**: Validação antes de produção, testes de integração, demonstrações
- **Stack**: Docker Compose em servidor cloud (provedor a definir)
- **Configuração**: Variáveis de ambiente via secrets manager do provedor
- **Acesso**: Subdomínio ou domínio dedicado (ex.: `staging.crm-app.com`)
- **Dados**: Dados sintéticos ou cópia anonimizada de produção

#### Ambiente Produção
- **Objetivo**: Operação comercial com clientes reais
- **Stack**: Docker Compose em servidor cloud (provedor a definir)
- **Configuração**: Variáveis de ambiente via secrets manager do provedor
- **Acesso**: Domínio principal (ex.: `app.crm-app.com`)
- **Dados**: Dados reais de clientes (backup obrigatório)

### 3. Governança de repositório

#### Estrutura de repositórios
- **Frontend**: Repositório separado (ex.: `crm-frontend`)
- **Backend**: Repositório separado (ex.: `crm-backend`)

#### Organização de pastas (padrão sugerido)

**Backend**:
```
backend/
├── src/
│   ├── config/          # Configurações (DB, env)
│   ├── controllers/     # Lógica de controle
│   ├── models/          # Modelos de dados (Prisma)
│   ├── routes/          # Rotas da API
│   ├── middleware/      # Middlewares (auth, tenant, etc)
│   ├── services/        # Lógica de negócio
│   ├── utils/           # Utilitários
│   └── types/           # Tipos TypeScript
├── prisma/
│   ├── schema.prisma    # Schema do banco
│   └── migrations/      # Migrações versionadas
├── tests/               # Testes
├── docker/              # Dockerfiles e configs
└── .github/
    └── workflows/       # GitHub Actions
```

**Frontend**:
```
frontend/
├── src/
│   ├── components/      # Componentes React
│   ├── pages/          # Páginas/rotas
│   ├── hooks/          # Custom hooks
│   ├── services/       # Chamadas à API
│   ├── store/          # Estado global (se usar)
│   ├── types/          # Tipos TypeScript
│   └── utils/          # Utilitários
├── public/              # Assets estáticos
└── .github/
    └── workflows/       # GitHub Actions
```

#### Convenções de commits
- **Formato**: `tipo(escopo): descrição breve`
- **Tipos**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- **Exemplo**: `feat(auth): adiciona login com JWT`

#### Versionamento
- **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH`
- **V1**: Versão inicial (ex.: `1.0.0` para primeira release comercial)
- **Releases**: Tags Git com versão (ex.: `v1.0.0`)

#### Fluxo de branches
- **Gestão manual** conforme necessidade do projeto
- **Sugestão mínima**: 
  - `main`: código estável e deployado
  - `develop`: desenvolvimento ativo (opcional)
  - `feature/*`: novas funcionalidades
  - `fix/*`: correções de bugs

### 4. Estratégia de deploy

#### Pipeline CI/CD (GitHub Actions)

**Backend**:
1. **Build**: Instalar dependências, compilar TypeScript, validar tipos
2. **Testes**: Executar testes unitários e de integração
3. **Lint/Format**: Validar código (ESLint, Prettier)
4. **Build Docker**: Criar imagem Docker do backend
5. **Deploy Staging**: Deploy automático para staging (após merge em `main`)
6. **Deploy Produção**: Deploy manual (aprovado) para produção

**Frontend**:
1. **Build**: Instalar dependências, compilar TypeScript, build de produção
2. **Testes**: Executar testes unitários
3. **Lint/Format**: Validar código (ESLint, Prettier)
4. **Build Docker**: Criar imagem Docker do frontend
5. **Deploy Staging**: Deploy automático para staging (após merge em `main`)
6. **Deploy Produção**: Deploy manual (aprovado) para produção

**Rollback**: Manter versão anterior disponível para rollback rápido em caso de problemas.

### 5. Gestão de configuração e segredos

#### Variáveis de ambiente (por ambiente)

**Local**:
- Arquivo `.env` (não versionado, usar `.env.example` como template)
- Valores locais para desenvolvimento

**Staging/Produção**:
- Secrets manager do provedor cloud (a definir)
- Alternativa inicial: variáveis de ambiente criptografadas no repositório (GitHub Secrets)

#### Segredos obrigatórios
- `DATABASE_URL`: String de conexão PostgreSQL
- `JWT_SECRET`: Chave secreta para assinatura de tokens JWT
- `JWT_EXPIRES_IN`: Tempo de expiração de tokens
- `NODE_ENV`: Ambiente (`development`, `staging`, `production`)
- `FRONTEND_URL`: URL do frontend (para CORS)
- `EMAIL_*`: Configurações de email (para recuperação de senha)
- `TENANT_IDENTIFIER_*`: Configurações de identificação de tenant (subdomínio, header, etc.)

#### Template `.env.example`
Criar arquivo `.env.example` em cada repositório com todas as variáveis necessárias (sem valores sensíveis).

### 6. Observabilidade mínima para V1

#### Logs estruturados
- **Formato**: JSON logs
- **Campos obrigatórios em cada log**:
  - `timestamp`: Data/hora do evento
  - `level`: Nível (info, warn, error, debug)
  - `tenant_id`: ID do tenant (quando aplicável)
  - `user_id`: ID do usuário (quando aplicável)
  - `request_id`: ID único da requisição (para rastreabilidade)
  - `message`: Mensagem descritiva
  - `context`: Contexto adicional (erro, dados relevantes)

**Exemplo**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "error",
  "tenant_id": "tenant-123",
  "user_id": "user-456",
  "request_id": "req-789",
  "message": "Falha ao criar contato",
  "error": "ValidationError: email inválido"
}
```

#### Métricas básicas (Prometheus-compatible)
- **Latência**: Tempo de resposta por endpoint (p50, p95, p99)
- **Taxa de erro**: Percentual de requisições com erro (4xx, 5xx)
- **Throughput**: Requisições por segundo
- **Health checks**: Status do banco de dados, conectividade

#### Alertas críticos
- **Downtime**: Aplicação não responde
- **Erros 5xx**: Taxa de erros 5xx > 5%
- **Falhas de banco**: Conexão com PostgreSQL falhando
- **Alta latência**: p95 > 2s

#### Ferramentas sugeridas (a implementar)
- **Logs**: Winston ou Pino (Node.js) com formatação JSON
- **Métricas**: Prometheus client library
- **Alertas**: Alertmanager ou integração com provedor cloud

### 7. Estratégia de backup e restore

#### Backup do banco de dados
- **Frequência**: Diário (backup completo) + incremental a cada 6 horas
- **Retenção**: 30 dias de backups diários + 7 backups semanais + 3 backups mensais
- **Método**: `pg_dump` automatizado via cron job ou script
- **Armazenamento**: Storage do provedor cloud (separado da instância de produção)

#### Backup de metadados e configurações
- **Frequência**: Diária
- **Conteúdo**: Configurações de tenants, customizações de schema, permissões
- **Método**: Export via API ou dump de tabelas específicas

#### Teste de restore
- **Frequência**: Mensal (antes de cada release importante)
- **Processo**: 
  1. Restaurar backup em ambiente isolado
  2. Validar integridade dos dados
  3. Testar operações básicas
  4. Documentar resultado

#### Disaster recovery
- **RTO (Recovery Time Objective)**: < 4 horas
- **RPO (Recovery Point Objective)**: < 6 horas (dados do último backup incremental)

### 8. Definition of Done (DoD) para V1

#### Critérios gerais para cada fase
- [ ] Código revisado e aprovado
- [ ] Testes unitários passando (cobertura mínima: 60%)
- [ ] Testes de integração passando (quando aplicável)
- [ ] Documentação atualizada (README, comentários no código)
- [ ] Sem erros de lint/type-check
- [ ] Funcionalidade testada manualmente em ambiente local
- [ ] Isolamento multi-tenant validado (quando aplicável)

#### Critérios específicos por fase
- **Fase 2 (Multi-tenant)**: Testes de isolamento passando, nenhum vazamento de dados entre tenants
- **Fase 3 (Autenticação)**: Testes de segurança básicos passando, rate limiting ativo
- **Fase 4 (ACL)**: Permissões testadas para cada role, auditoria funcionando
- **Fase 5-8 (Funcionalidades)**: CRUD completo funcionando, validações implementadas
- **Fase 9 (Busca)**: Performance aceitável (< 500ms) com volume moderado
- **Fase 10 (Importação)**: Validação de dados funcionando, relatórios de erro completos
- **Fase 11 (Interface)**: Responsividade testada em múltiplos dispositivos
- **Fase 12 (Validação)**: Todos os critérios de prontidão comercial atendidos

### 9. Documentação de onboarding técnico

#### Documentos a criar
1. **README.md** (cada repositório):
   - Descrição do projeto
   - Pré-requisitos
   - Instruções de setup local
   - Como executar testes
   - Estrutura do projeto

2. **docs/SETUP.md**:
   - Setup completo do ambiente local (Docker, dependências)
   - Configuração de variáveis de ambiente
   - Como rodar migrações
   - Como acessar serviços (frontend, backend, banco)

3. **docs/DEPLOY.md**:
   - Processo de deploy para staging
   - Processo de deploy para produção
   - Rollback em caso de problemas
   - Checklist pré-deploy

4. **docs/OBSERVABILITY.md**:
   - Como acessar logs
   - Como visualizar métricas
   - Como interpretar alertas
   - Troubleshooting comum

5. **docs/ARCHITECTURE.md**:
   - Visão geral da arquitetura
   - Decisões técnicas principais
   - Diagramas de fluxo (quando aplicável)

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

### Decisão 6 — Estrutura de repositórios (monorepo vs multi-repo)
- **O que está sendo decidido**: Como organizar o código do frontend e backend.
- **Alternativas consideradas**:
  - (A) Monorepo (frontend + backend no mesmo repositório)
  - (B) Multi-repo (repositórios separados)
- **Decisão tomada**: **Multi-repo** — repositórios separados para frontend e backend.
- **Justificativa objetiva**: Separação clara de responsabilidades, versionamento independente e menor acoplamento entre equipes/contextos.

### Decisão 7 — Ferramenta de migrações de banco de dados
- **O que está sendo decidido**: Como gerenciar evolução do schema do PostgreSQL de forma versionada e reproduzível.
- **Alternativas consideradas**:
  - (A) Prisma (ORM + migrações integradas)
  - (B) TypeORM (ORM com migrações)
  - (C) Knex.js (query builder + migrações)
  - (D) node-pg-migrate (apenas migrações)
- **Decisão tomada**: **Prisma** como ferramenta de migrações e ORM.
- **Justificativa objetiva**: 
  - TypeScript-first com tipagem forte e geração automática de tipos
  - Migrações declarativas e versionadas integradas
  - Excelente suporte a PostgreSQL e multi-tenant
  - Prisma Studio para visualização de dados durante desenvolvimento
  - Boa documentação e ecossistema maduro

### Decisão 8 — Estratégia de branches e versionamento
- **O que está sendo decidido**: Como gerenciar branches, merges e releases.
- **Alternativas consideradas**:
  - (A) Git Flow (branches: main, develop, feature, release, hotfix)
  - (B) GitHub Flow (branches: main, feature)
  - (C) Trunk-based development
  - (D) Gestão manual sem automação específica
- **Decisão tomada**: **Gestão manual de branches** — sem automação específica de fluxo.
- **Justificativa objetiva**: Flexibilidade para adaptar o fluxo conforme necessidade do projeto e equipe, sem overhead de ferramentas de automação no início.

### Decisão 9 — Orquestração de containers (local e produção)
- **O que está sendo decidido**: Como orquestrar containers Docker nos diferentes ambientes.
- **Alternativas consideradas**:
  - (A) Docker Compose (simples, adequado para pequena/média escala)
  - (B) Kubernetes (complexo, adequado para grande escala)
  - (C) Docker Swarm (meio termo)
- **Decisão tomada**: **Docker Compose** para todos os ambientes (local, staging, produção).
- **Justificativa objetiva**: 
  - Simplicidade operacional para V1
  - Reduz diferença entre ambientes
  - Suficiente para escala inicial de SaaS
  - Pode evoluir para Kubernetes quando necessário

### Decisão 10 — Provedor cloud e infraestrutura
- **O que está sendo decidido**: Onde hospedar staging e produção.
- **Alternativas consideradas**:
  - (A) AWS
  - (B) Google Cloud Platform
  - (C) Azure
  - (D) DigitalOcean
  - (E) Outro provedor
- **Decisão tomada**: **A definir no final da V1** — decisão adiada para quando houver mais clareza sobre requisitos de escala, custo e região.
- **Justificativa objetiva**: Foco inicial em desenvolvimento local; decisão de cloud pode ser tomada com mais informações sobre necessidades reais do produto.

### Decisão 11 — Infrastructure as Code (IaC)
- **O que está sendo decidido**: Como versionar e reproduzir infraestrutura de forma automatizada.
- **Alternativas consideradas**:
  - (A) Terraform (padrão da indústria, multi-cloud)
  - (B) Pulumi (código em linguagens de programação)
  - (C) CloudFormation (AWS-specific)
  - (D) Sem IaC inicialmente
- **Decisão tomada**: **Terraform** como opção prática, a ser implementado quando a infraestrutura de staging/produção for definida.
- **Justificativa objetiva**: 
  - Padrão da indústria com ampla adoção
  - Multi-cloud (útil já que o provedor ainda não foi escolhido)
  - Estado versionado e reproduzível
  - Pode ser implementado progressivamente conforme necessidade

## Tecnologias Selecionadas

### Stack base (conforme `Decisao-Stack-V1.md`)
- **Frontend**: React + TypeScript (aplicação web responsiva)
- **Backend**: Node.js + TypeScript (API HTTP/REST)
- **Banco de dados**: PostgreSQL (versão mais recente estável — atualmente 16.x)
- **Runtime/Deploy**: Docker (local) + containers (staging/produção)

### Ferramentas de desenvolvimento e operação
- **Containerização**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Migrações de banco**: Prisma (ORM + migrações)
- **Gestão de segredos**: A definir com o provedor cloud (ex.: AWS Secrets Manager, GCP Secret Manager, ou variáveis de ambiente criptografadas)
- **Observabilidade**:
  - **Logs estruturados**: JSON logs com `tenant_id`, `user_id`, `request_id`
  - **Métricas**: Prometheus-compatible (métricas básicas: latência, taxa de erro, throughput)
  - **Alertas**: Alertmanager-compatible (alertas críticos: downtime, erros 5xx, falhas de banco)
- **IaC**: Terraform (a implementar quando infraestrutura de staging/produção for definida)
- **Estrutura de repositórios**: Multi-repo (frontend e backend em repositórios separados)

## Pré-requisitos para Avançar
- [x] Escopo técnico do V1 validado (com base no roadmap por versões)
- [x] Estratégia de ambientes definida (local/staging/prod) e documentada
- [x] Estratégia de deploy definida e reproduzível
- [x] Pipeline CI/CD mínimo definido (GitHub Actions com etapas explícitas)
- [x] Estratégia de segredos definida (`.env` local, secrets manager cloud para staging/prod)
- [x] Observabilidade mínima definida (logs estruturados JSON, métricas Prometheus-compatible, alertas críticos)
- [x] Estratégia de backup definida e plano de teste de restore acordado (backup diário + incremental, teste mensal)
- [x] DoD e critérios de aceite por fase definidos

**Status**: Todos os pré-requisitos conceituais foram definidos. A implementação prática ocorrerá durante o desenvolvimento da Fase 1.

---

## Resumo das Decisões Tomadas

### Stack Tecnológica
- **Frontend**: React + TypeScript
- **Backend**: Node.js + TypeScript (API REST)
- **Banco de dados**: PostgreSQL (versão mais recente estável)
- **Migrações**: Prisma (ORM + migrações)

### Infraestrutura e Deploy
- **Containerização**: Docker + Docker Compose (todos os ambientes)
- **CI/CD**: GitHub Actions
- **Estrutura**: Multi-repo (frontend e backend separados)
- **Provedor cloud**: A definir no final da V1
- **IaC**: Terraform (a implementar quando infraestrutura for definida)

### Operação
- **Logs**: JSON estruturado com `tenant_id`, `user_id`, `request_id`
- **Métricas**: Prometheus-compatible (latência, taxa de erro, throughput)
- **Backup**: Diário completo + incremental a cada 6h, retenção de 30 dias
- **Branches**: Gestão manual conforme necessidade

### Governança
- **Commits**: Formato `tipo(escopo): descrição`
- **Versionamento**: Semantic Versioning (SemVer)
- **DoD**: Critérios definidos por fase

---

## Próximos Passos

1. **Criar repositórios** (frontend e backend separados)
2. **Configurar estrutura inicial** conforme padrões definidos
3. **Setup do ambiente local** com Docker Compose
4. **Configurar Prisma** no backend com schema inicial
5. **Configurar GitHub Actions** com pipeline básico
6. **Criar documentação inicial** (README, SETUP.md)
7. **Iniciar Fase 2** (Estrutura SaaS e multi-tenant)

---

## Notas Finais

- Todas as decisões foram tomadas com base em requisitos de V1 vendável
- Decisões podem ser revisadas conforme aprendizado durante desenvolvimento
- Provedor cloud será escolhido no final da V1 com mais informações sobre necessidades reais
- IaC (Terraform) será implementado quando infraestrutura de staging/produção for definida


