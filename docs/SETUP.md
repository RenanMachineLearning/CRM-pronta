# Guia de Setup - Ambiente Local

Este guia explica como configurar o ambiente de desenvolvimento local do CRM SaaS.

## Pré-requisitos

Certifique-se de ter instalado:
- **Docker** (versão 20+)
- **Docker Compose** (versão 2+)
- **Node.js** (versão 20 LTS ou superior)
- **npm** (vem com Node.js)
- **Git**

## Estrutura do Projeto

O projeto está organizado em dois repositórios/pastas principais:
- `backend/` - API REST com Node.js + TypeScript + Prisma
- `frontend/` - Aplicação React + TypeScript + Vite

## Setup Inicial

### 1. Clonar/Configurar Repositórios

Se ainda não tiver o código, clone os repositórios ou crie as pastas conforme a estrutura definida.

### 2. Configurar Variáveis de Ambiente

#### Backend

Copie o arquivo de exemplo e ajuste conforme necessário:

```bash
cd backend
cp env.example .env
```

Edite o arquivo `.env` e configure:
- `DATABASE_URL`: String de conexão com PostgreSQL
- `JWT_SECRET`: Chave secreta para tokens JWT (use uma chave forte em produção)
- `FRONTEND_URL`: URL do frontend (para CORS)

### 3. Instalar Dependências

#### Opção A: Usando Docker (Recomendado)

```bash
# Na raiz do projeto
docker compose -f docker-compose.dev.yml up -d postgres

# Aguardar PostgreSQL estar pronto, depois:
cd backend
npm install
npx prisma generate
npx prisma migrate dev

cd ../frontend
npm install
```

#### Opção B: Localmente (sem Docker)

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev

# Frontend
cd ../frontend
npm install
```

## Executar o Ambiente

### Usando Docker Compose (Recomendado)

```bash
# Na raiz do projeto
docker compose -f docker-compose.dev.yml up
```

Isso irá iniciar:
- PostgreSQL na porta `5432`
- Backend na porta `4000`
- Frontend na porta `3000`

### Executar Localmente (sem Docker)

#### Backend

```bash
cd backend
npm run dev
```

O backend estará disponível em `http://localhost:4000`

#### Frontend

```bash
cd frontend
npm run dev
```

O frontend estará disponível em `http://localhost:3000`

#### PostgreSQL

Se não estiver usando Docker, certifique-se de ter PostgreSQL rodando localmente e configure a `DATABASE_URL` no `.env` do backend.

## Comandos Úteis

### Prisma (Backend)

```bash
cd backend

# Gerar Prisma Client
npx prisma generate

# Criar nova migração
npx prisma migrate dev --name nome_da_migracao

# Abrir Prisma Studio (interface visual do banco)
npx prisma studio
```

### Docker

```bash
# Parar todos os containers
docker compose -f docker-compose.dev.yml down

# Parar e remover volumes (cuidado: apaga dados do banco)
docker compose -f docker-compose.dev.yml down -v

# Ver logs
docker compose -f docker-compose.dev.yml logs -f

# Rebuild dos containers
docker compose -f docker-compose.dev.yml build --no-cache
```

## Verificar se Está Funcionando

1. **Backend Health Check**: Acesse `http://localhost:4000/health`
   - Deve retornar: `{"status":"ok","timestamp":"...","environment":"development"}`

2. **Frontend**: Acesse `http://localhost:3000`
   - Deve exibir a página inicial do CRM

3. **PostgreSQL**: Conecte usando:
   ```bash
   psql -h localhost -U crm_user -d crm_db
   # Senha: crm_password
   ```

## Troubleshooting

### Erro de conexão com banco

- Verifique se o PostgreSQL está rodando: `docker ps`
- Verifique a `DATABASE_URL` no `.env` do backend
- Aguarde alguns segundos após iniciar o PostgreSQL (pode levar tempo para inicializar)

### Erro de porta já em uso

- Verifique se outra aplicação está usando as portas 3000, 4000 ou 5432
- Pare os containers: `docker compose -f docker-compose.dev.yml down`
- Ou altere as portas no `docker-compose.dev.yml`

### Erro de Prisma

- Execute `npx prisma generate` no diretório do backend
- Verifique se o schema do Prisma está correto em `backend/prisma/schema.prisma`

## Próximos Passos

Após o setup estar funcionando:
1. Verificar a documentação da **Etapa 1** (Multi-tenant)
2. Começar a implementar as funcionalidades conforme o roadmap

