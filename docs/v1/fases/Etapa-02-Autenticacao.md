# Etapa 2 — Autenticação e Gestão de Sessão

> **Dependências**: Etapa 1 (Multi-tenant) ✅  
> **Stack**: Node.js + TypeScript, PostgreSQL, Prisma, JWT  
> **Referência**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`

## Objetivo da Etapa

Implementar autenticação segura, gestão de sessão e tokens, garantindo que usuários acessem apenas dados do seu tenant. Rate limiting protege o sistema desde o início.

---

## Checklist de Implementação

### 1. Modelo de Dados — Tabela de Usuários

#### Backend (Prisma Schema)
- [x] Criar tabela `User` no schema Prisma
  - [x] Campo `id` (UUID)
  - [x] Campo `email` (único por tenant)
  - [x] Campo `passwordHash` (senha criptografada, nunca texto plano)
  - [x] Campo `name` (nome completo)
  - [x] Campo `tenantId` (foreign key para `Tenant`)
  - [x] Campo `status` (ativo, inativo, bloqueado)
  - [x] Campos `created_at` e `updated_at`
  - [x] Índice único composto: `(tenantId, email)` para garantir email único por tenant

- [x] Criar migração Prisma
  - [x] Executar `prisma migrate dev --name add_users`
  - [x] Validar que a tabela foi criada corretamente

#### Validação
- [x] Testar criação de usuário via Prisma
- [x] Verificar que email único por tenant é respeitado
- [x] Verificar que usuário não pode ser criado sem `tenantId`

---

### 2. Criptografia de Senhas

#### Backend (Node.js + TypeScript)
- [x] Instalar biblioteca de hash (ex: `bcrypt` ou `argon2`)
  - [x] `npm install bcrypt` ou `npm install argon2`
  - [x] Instalar tipos: `npm install -D @types/bcrypt`

- [x] Criar utilitário de hash de senha
  - [x] Função `hashPassword(password: string): Promise<string>`
  - [x] Função `comparePassword(password: string, hash: string): Promise<boolean>`
  - [x] Usar salt rounds adequado (ex: 10-12 para bcrypt)

#### Validação
- [x] Teste unitário: hash de senha gera string diferente
- [x] Teste unitário: comparação de senha correta retorna true
- [x] Teste unitário: comparação de senha incorreta retorna false

---

### 3. Geração e Validação de Tokens JWT

#### Backend (Node.js + TypeScript)
- [x] Instalar biblioteca JWT
  - [x] `npm install jsonwebtoken`
  - [x] Instalar tipos: `npm install -D @types/jsonwebtoken`

- [x] Configurar variáveis de ambiente
  - [x] `JWT_SECRET`: chave secreta para assinatura
  - [x] `JWT_EXPIRES_IN`: tempo de expiração ("12h")
  - [x] Adicionar ao `.env.example`

- [x] Criar utilitário de JWT
  - [x] Função `generateToken(userId: string, tenantId: string): string`
  - [x] Payload do token: `{ userId, tenantId, iat, exp }`
  - [x] Função `verifyToken(token: string): { userId: string, tenantId: string }`
  - [x] Tratamento de erros (token expirado, inválido, etc.)

#### Validação
- [x] Teste unitário: geração de token funciona
- [x] Teste unitário: validação de token válido funciona
- [x] Teste unitário: validação de token expirado falha
- [x] Teste unitário: validação de token inválido falha

---

### 4. Endpoints de Autenticação

#### Backend (Rotas)
- [x] Criar rota `POST /api/auth/login`
  - [x] Receber `email` e `password` no body
  - [x] Validar que email e senha foram fornecidos
  - [x] Buscar usuário por email e tenantId (do contexto)
  - [x] Comparar senha com hash armazenado
  - [x] Se válido: gerar token JWT e retornar
  - [x] Se inválido: retornar erro 401 (credenciais inválidas)
  - [x] Não revelar se email existe ou não (segurança)

- [x] Criar rota `POST /api/auth/logout`
  - [x] Invalidar token (se usar blacklist) ou apenas retornar sucesso
  - [x] Para JWT stateless: apenas retornar sucesso (cliente remove token)

- [x] Criar rota `POST /api/auth/refresh` (opcional)
  - [x] Receber token atual
  - [x] Validar token
  - [x] Gerar novo token e retornar (retorna 501 - não implementado na V1)

#### Validação
- [x] Teste E2E: login com credenciais válidas retorna token
- [x] Teste E2E: login com credenciais inválidas retorna 401
- [x] Teste E2E: login com email inexistente retorna 401 (sem revelar)
- [x] Teste E2E: token retornado pode ser usado em requisições autenticadas

---

### 5. Middleware de Autenticação

#### Backend (Node.js + TypeScript)
- [x] Criar middleware `authMiddleware.ts`
  - [x] Extrair token do header `Authorization: Bearer <token>`
  - [x] Validar token usando `verifyToken`
  - [x] Adicionar `userId` e `tenantId` ao objeto `request`
  - [x] Retornar erro 401 se token ausente ou inválido
  - [x] Validar que `tenantId` do token corresponde ao contexto de tenant

- [x] Integrar middleware nas rotas protegidas
  - [x] Aplicar middleware em todas as rotas exceto `/auth/login` e `/auth/register`
  - [x] Testar que rotas protegidas sem token retornam 401
  - [x] Testar que rotas protegidas com token válido funcionam

#### Validação
- [x] Teste: requisição sem token → 401
- [x] Teste: requisição com token inválido → 401
- [x] Teste: requisição com token válido → passa
- [x] Teste: token de tenant A não funciona em contexto de tenant B

---

### 6. Rate Limiting / Throttling

#### Backend (Node.js + TypeScript)
- [x] Instalar biblioteca de rate limiting
  - [x] `npm install express-rate-limit` (se usar Express)
  - [x] Ou `@fastify/rate-limit` (se usar Fastify)

- [x] Configurar rate limiting
  - [x] Limite de tentativas de login: 5 por IP por 15 minutos
  - [x] Limite geral de requisições: 100 por IP por minuto
  - [x] Mensagens de erro adequadas quando limite é excedido

- [x] Aplicar rate limiting
  - [x] Rate limit global para todas as rotas
  - [x] Rate limit específico para `/auth/login` (mais restritivo)

#### Validação
- [x] Teste: após 5 tentativas de login falhadas, próxima tentativa é bloqueada
- [x] Teste: após 15 minutos, tentativas são permitidas novamente
- [x] Teste: requisições normais não são bloqueadas indevidamente

---

### 7. Recuperação/Reset de Senha

#### Backend (Rotas e Lógica)
- [x] Criar tabela `PasswordResetToken` (ou campo em `User`)
  - [x] Campo `token` (UUID ou string aleatória)
  - [x] Campo `expiresAt` (timestamp)
  - [x] Campo `userId` (foreign key)
  - [x] Índice em `token` para busca rápida

- [x] Criar rota `POST /api/auth/forgot-password`
  - [x] Receber `email` no body
  - [x] Buscar usuário por email e tenantId
  - [x] Gerar token de reset (UUID)
  - [x] Salvar token com expiração (ex: 1 hora)
  - [x] Enviar email com link de reset (se email configurado)
  - [x] Retornar sucesso (não revelar se email existe)

- [x] Criar rota `POST /api/auth/reset-password`
  - [x] Receber `token` e `newPassword` no body
  - [x] Validar token (existe e não expirado)
  - [x] Validar nova senha (complexidade mínima)
  - [x] Hash da nova senha
  - [x] Atualizar senha do usuário
  - [x] Invalidar token de reset
  - [x] Retornar sucesso

#### Validação
- [x] Teste: solicitação de reset gera token
- [x] Teste: token expirado não funciona
- [x] Teste: reset de senha atualiza senha corretamente
- [x] Teste: token usado não pode ser reutilizado

---

### 8. Alteração de Senha

#### Backend (Rotas)
- [x] Criar rota `POST /api/auth/change-password`
  - [x] Requer autenticação (middleware)
  - [x] Receber `currentPassword` e `newPassword` no body
  - [x] Validar senha atual (comparar com hash)
  - [x] Validar nova senha (complexidade mínima, diferente da atual)
  - [x] Hash da nova senha
  - [x] Atualizar senha do usuário
  - [x] Retornar sucesso

#### Validação
- [x] Teste: alteração com senha atual correta funciona
- [x] Teste: alteração com senha atual incorreta falha
- [x] Teste: nova senha deve ser diferente da atual

---

### 9. Política de Senhas

#### Backend (Validação)
- [x] Criar validador de senha
  - [x] Mínimo de caracteres (ex: 8)
  - [x] Pelo menos uma letra maiúscula
  - [x] Pelo menos uma letra minúscula
  - [x] Pelo menos um número
  - [x] Pelo menos um caractere especial (opcional na V1)
  - [x] Mensagens de erro claras

- [x] Aplicar validação em:
  - [ ] Registro de usuário (não implementado na V1)
  - [x] Reset de senha
  - [x] Alteração de senha

#### Validação
- [x] Teste: senha fraca é rejeitada
- [x] Teste: senha forte é aceita
- [x] Teste: mensagens de erro são claras

---

### 10. Testes de Autenticação

#### Backend (Testes)
- [x] Testes unitários
  - [x] Hash de senha
  - [x] Geração e validação de JWT
  - [x] Validação de senha

- [x] Testes de integração
  - [x] Fluxo completo de login
  - [x] Fluxo completo de logout
  - [x] Fluxo completo de recuperação de senha
  - [x] Fluxo completo de alteração de senha

- [x] Testes de segurança
  - [x] Tentativas de brute force são bloqueadas
  - [x] Tokens expirados não funcionam
  - [x] Tokens de tenant A não funcionam em tenant B

#### Validação
- [x] Todos os testes passando
- [x] Cobertura de testes > 80% para lógica de autenticação

---

### 11. Documentação

#### Documentação Técnica
- [x] Documentar endpoints de autenticação
  - [x] `POST /api/auth/login`
  - [x] `POST /api/auth/logout`
  - [x] `POST /api/auth/forgot-password`
  - [x] `POST /api/auth/reset-password`
  - [x] `POST /api/auth/change-password`

- [x] Documentar formato de token JWT
  - [x] Estrutura do payload
  - [x] Tempo de expiração
  - [x] Como usar em requisições

- [x] Documentar rate limiting
  - [x] Limites aplicados
  - [x] Como interpretar erros de rate limit

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 3 (ACL)**, verifique:

- [x] Login/logout funcionando
- [x] Tokens JWT válidos e seguros
- [x] Rate limiting ativo
- [x] Recuperação de senha operacional
- [x] Alteração de senha operacional
- [x] Política de senhas implementada
- [x] Testes de autenticação passando
- [x] Documentação atualizada

---

## Tecnologias Utilizadas

- **Backend**: Node.js + TypeScript
- **ORM**: Prisma
- **Banco de dados**: PostgreSQL
- **JWT**: `jsonwebtoken`
- **Hash de senha**: `bcrypt` ou `argon2`
- **Rate limiting**: `express-rate-limit` ou `@fastify/rate-limit`

---

## Próximos Passos

Após completar esta etapa, você pode avançar para:

**→ [Etapa 3: Gestão de Usuários e Controle de Acesso (ACL)](./Etapa-03-ACL.md)**

---

## Notas Importantes

⚠️ **Segurança**:
- Nunca armazenar senhas em texto plano
- Sempre usar HTTPS em produção
- Tokens JWT devem ter expiração adequada
- Rate limiting é essencial para prevenir ataques

✅ **Boas práticas**:
- Não revelar se email existe ou não (prevenir enumeração)
- Logs não devem conter senhas ou tokens
- Validar entrada de dados (email, senha)
- Mensagens de erro genéricas para usuário, detalhadas para logs

---

## Referências

- **Roadmap Funcional**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`
- **Etapa 1 (Multi-tenant)**: `Features/meu_projeto/v1/fases_2/Etapa-01-Multi-tenant.md`
- **Decisão de Stack**: `Features/meu_projeto/v1/Decisao-Stack-V1.md`
