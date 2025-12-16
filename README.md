# CRM SaaS - Versão 1 (MVP Vendável)

Sistema de CRM (Customer Relationship Management) SaaS multi-tenant desenvolvido com React, Node.js, TypeScript e PostgreSQL.

## 📋 Sobre o Projeto

Este é um CRM SaaS B2B robusto, utilizável e vendável que fecha o ciclo mínimo completo de um CRM:
- Cadastro de contatos e empresas
- Gestão de leads e oportunidades
- Pipeline de vendas configurável
- Acompanhamento com tarefas e notas
- Busca e filtros avançados
- Importação/exportação de dados

### Características Principais

- **Multi-tenant**: Isolamento completo de dados por tenant
- **Autenticação e Autorização**: JWT com ACL (permissões por objeto e campo)
- **Modelo de Dados Personalizável**: Entidades e campos customizáveis
- **Interface Responsiva**: Desktop, tablet e mobile

## 🏗️ Arquitetura

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + TypeScript + Express
- **Banco de Dados**: PostgreSQL 16
- **ORM/Migrações**: Prisma
- **Containerização**: Docker + Docker Compose

## 📁 Estrutura do Projeto

```
CRM_pronta/
├── backend/          # API REST (Node.js + TypeScript)
├── frontend/         # Aplicação React (TypeScript)
├── docs/             # Documentação
├── v1/               # Documentação do projeto (roadmaps, decisões)
└── docker-compose.dev.yml  # Orquestração de containers (desenvolvimento)
```

## 🚀 Início Rápido

### Pré-requisitos

- Docker e Docker Compose
- Node.js 20+ e npm
- Git

### Setup

1. **Clone o repositório** (ou navegue até a pasta do projeto)

2. **Configure as variáveis de ambiente**:
   ```bash
   cd backend
   cp env.example .env
   # Edite o .env conforme necessário
   ```

3. **Inicie o ambiente com Docker**:
   ```bash
   docker compose -f docker-compose.dev.yml up
   ```

4. **Acesse a aplicação**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health

Para instruções detalhadas, consulte [docs/SETUP.md](docs/SETUP.md).

## 📚 Documentação

- **[Setup Local](docs/SETUP.md)** - Guia completo de configuração do ambiente
- **[Roadmap V1](v1/fases_2/Roadmap-Funcionalidades-V1.md)** - Sequência de implementação (10 etapas)
- **[Etapa 0](v1/fases_2/Etapa-00.md)** - Preparação de ambiente e infraestrutura
- **[Decisões de Stack](v1/Decisao-Stack-V1.md)** - Tecnologias escolhidas e justificativas

## 🔄 Roadmap de Implementação

O projeto segue uma sequência de 10 etapas:

1. **Multi-tenant** (isolamento)
2. **Autenticação** (JWT, sessão)
3. **ACL** (gestão de usuários e permissões)
4. **Modelo de Dados** (entidades e campos personalizáveis)
5. **Contatos/Empresas** (CRUD completo)
6. **Leads/Oportunidades** (pipeline de vendas)
7. **Tarefas/Notas** (atividades e histórico)
8. **Busca/Filtros** (descoberta e navegação)
9. **Import/Export** (integração de dados)
10. **Interface/UX** (responsividade e estados)

## 🛠️ Comandos Úteis

### Backend

```bash
cd backend

# Desenvolvimento
npm run dev

# Build
npm run build

# Prisma
npx prisma generate
npx prisma migrate dev
npx prisma studio
```

### Frontend

```bash
cd frontend

# Desenvolvimento
npm run dev

# Build
npm run build
```

### Docker

```bash
# Iniciar ambiente
docker compose -f docker-compose.dev.yml up

# Parar ambiente
docker compose -f docker-compose.dev.yml down

# Ver logs
docker compose -f docker-compose.dev.yml logs -f
```

## 🧪 Testes

Testes serão implementados conforme as etapas do roadmap. Cada etapa deve incluir:
- Testes unitários
- Testes de integração
- Testes de isolamento multi-tenant (quando aplicável)

## 📝 Convenções

- **Commits**: Formato `tipo(escopo): descrição` (ex: `feat(auth): adiciona login com JWT`)
- **Branches**: Gestão manual conforme necessidade
- **Versionamento**: Semantic Versioning (SemVer)

## 🔒 Segurança

- Isolamento multi-tenant garantido (dados nunca vazam entre tenants)
- Autenticação JWT com tokens seguros
- Rate limiting e throttling
- Validação de dados em todas as camadas

## 📄 Licença

[Definir licença conforme necessário]

## 👥 Contribuição

[Instruções de contribuição, se aplicável]

---

**Status**: Em desenvolvimento - Etapa 0 (Preparação de Ambiente) ✅
