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
- [ ] Criar tabela `User` no schema Prisma
  - [ ] Campo `id` (UUID)
  - [ ] Campo `email` (único por tenant)
  - [ ] Campo `passwordHash` (senha criptografada, nunca texto plano)
  - [ ] Campo `name` (nome completo)
  - [ ] Campo `tenantId` (foreign key para `Tenant`)
  - [ ] Campo `status` (ativo, inativo, bloqueado)
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Índice único composto: `(tenantId, email)` para garantir email único por tenant

- [ ] Criar migração Prisma
  - [ ] Executar `prisma migrate dev --name add_users`
  - [ ] Validar que a tabela foi criada corretamente

#### Validação
- [ ] Testar criação de usuário via Prisma
- [ ] Verificar que email único por tenant é respeitado
- [ ] Verificar que usuário não pode ser criado sem `tenantId`

---

### 2. Criptografia de Senhas

#### Backend (Node.js + TypeScript)
- [ ] Instalar biblioteca de hash (ex: `bcrypt` ou `argon2`)
  - [ ] `npm install bcrypt` ou `npm install argon2`
  - [ ] Instalar tipos: `npm install -D @types/bcrypt`

- [ ] Criar utilitário de hash de senha
  - [ ] Função `hashPassword(password: string): Promise<string>`
  - [ ] Função `comparePassword(password: string, hash: string): Promise<boolean>`
  - [ ] Usar salt rounds adequado (ex: 10-12 para bcrypt)

#### Validação
- [ ] Teste unitário: hash de senha gera string diferente
- [ ] Teste unitário: comparação de senha correta retorna true
- [ ] Teste unitário: comparação de senha incorreta retorna false

---

### 3. Geração e Validação de Tokens JWT

#### Backend (Node.js + TypeScript)
- [ ] Instalar biblioteca JWT
  - [ ] `npm install jsonwebtoken`
  - [ ] Instalar tipos: `npm install -D @types/jsonwebtoken`

- [ ] Configurar variáveis de ambiente
  - [ ] `JWT_SECRET`: chave secreta para assinatura
  - [ ] `JWT_EXPIRES_IN`: tempo de expiração (ex: "7d", "24h")
  - [ ] Adicionar ao `.env.example`

- [ ] Criar utilitário de JWT
  - [ ] Função `generateToken(userId: string, tenantId: string): string`
  - [ ] Payload do token: `{ userId, tenantId, iat, exp }`
  - [ ] Função `verifyToken(token: string): { userId: string, tenantId: string }`
  - [ ] Tratamento de erros (token expirado, inválido, etc.)

#### Validação
- [ ] Teste unitário: geração de token funciona
- [ ] Teste unitário: validação de token válido funciona
- [ ] Teste unitário: validação de token expirado falha
- [ ] Teste unitário: validação de token inválido falha

---

### 4. Endpoints de Autenticação

#### Backend (Rotas)
- [ ] Criar rota `POST /api/auth/login`
  - [ ] Receber `email` e `password` no body
  - [ ] Validar que email e senha foram fornecidos
  - [ ] Buscar usuário por email e tenantId (do contexto)
  - [ ] Comparar senha com hash armazenado
  - [ ] Se válido: gerar token JWT e retornar
  - [ ] Se inválido: retornar erro 401 (credenciais inválidas)
  - [ ] Não revelar se email existe ou não (segurança)

- [ ] Criar rota `POST /api/auth/logout`
  - [ ] Invalidar token (se usar blacklist) ou apenas retornar sucesso
  - [ ] Para JWT stateless: apenas retornar sucesso (cliente remove token)

- [ ] Criar rota `POST /api/auth/refresh` (opcional)
  - [ ] Receber token atual
  - [ ] Validar token
  - [ ] Gerar novo token e retornar

#### Validação
- [ ] Teste E2E: login com credenciais válidas retorna token
- [ ] Teste E2E: login com credenciais inválidas retorna 401
- [ ] Teste E2E: login com email inexistente retorna 401 (sem revelar)
- [ ] Teste E2E: token retornado pode ser usado em requisições autenticadas

---

### 5. Middleware de Autenticação

#### Backend (Node.js + TypeScript)
- [ ] Criar middleware `authMiddleware.ts`
  - [ ] Extrair token do header `Authorization: Bearer <token>`
  - [ ] Validar token usando `verifyToken`
  - [ ] Adicionar `userId` e `tenantId` ao objeto `request`
  - [ ] Retornar erro 401 se token ausente ou inválido
  - [ ] Validar que `tenantId` do token corresponde ao contexto de tenant

- [ ] Integrar middleware nas rotas protegidas
  - [ ] Aplicar middleware em todas as rotas exceto `/auth/login` e `/auth/register`
  - [ ] Testar que rotas protegidas sem token retornam 401
  - [ ] Testar que rotas protegidas com token válido funcionam

#### Validação
- [ ] Teste: requisição sem token → 401
- [ ] Teste: requisição com token inválido → 401
- [ ] Teste: requisição com token válido → passa
- [ ] Teste: token de tenant A não funciona em contexto de tenant B

---

### 6. Rate Limiting / Throttling

#### Backend (Node.js + TypeScript)
- [ ] Instalar biblioteca de rate limiting
  - [ ] `npm install express-rate-limit` (se usar Express)
  - [ ] Ou `@fastify/rate-limit` (se usar Fastify)

- [ ] Configurar rate limiting
  - [ ] Limite de tentativas de login: 5 por IP por 15 minutos
  - [ ] Limite geral de requisições: 100 por IP por minuto
  - [ ] Mensagens de erro adequadas quando limite é excedido

- [ ] Aplicar rate limiting
  - [ ] Rate limit global para todas as rotas
  - [ ] Rate limit específico para `/auth/login` (mais restritivo)

#### Validação
- [ ] Teste: após 5 tentativas de login falhadas, próxima tentativa é bloqueada
- [ ] Teste: após 15 minutos, tentativas são permitidas novamente
- [ ] Teste: requisições normais não são bloqueadas indevidamente

---

### 7. Recuperação/Reset de Senha

#### Backend (Rotas e Lógica)
- [ ] Criar tabela `PasswordResetToken` (ou campo em `User`)
  - [ ] Campo `token` (UUID ou string aleatória)
  - [ ] Campo `expiresAt` (timestamp)
  - [ ] Campo `userId` (foreign key)
  - [ ] Índice em `token` para busca rápida

- [ ] Criar rota `POST /api/auth/forgot-password`
  - [ ] Receber `email` no body
  - [ ] Buscar usuário por email e tenantId
  - [ ] Gerar token de reset (UUID)
  - [ ] Salvar token com expiração (ex: 1 hora)
  - [ ] Enviar email com link de reset (se email configurado)
  - [ ] Retornar sucesso (não revelar se email existe)

- [ ] Criar rota `POST /api/auth/reset-password`
  - [ ] Receber `token` e `newPassword` no body
  - [ ] Validar token (existe e não expirado)
  - [ ] Validar nova senha (complexidade mínima)
  - [ ] Hash da nova senha
  - [ ] Atualizar senha do usuário
  - [ ] Invalidar token de reset
  - [ ] Retornar sucesso

#### Validação
- [ ] Teste: solicitação de reset gera token
- [ ] Teste: token expirado não funciona
- [ ] Teste: reset de senha atualiza senha corretamente
- [ ] Teste: token usado não pode ser reutilizado

---

### 8. Alteração de Senha

#### Backend (Rotas)
- [ ] Criar rota `POST /api/auth/change-password`
  - [ ] Requer autenticação (middleware)
  - [ ] Receber `currentPassword` e `newPassword` no body
  - [ ] Validar senha atual (comparar com hash)
  - [ ] Validar nova senha (complexidade mínima, diferente da atual)
  - [ ] Hash da nova senha
  - [ ] Atualizar senha do usuário
  - [ ] Retornar sucesso

#### Validação
- [ ] Teste: alteração com senha atual correta funciona
- [ ] Teste: alteração com senha atual incorreta falha
- [ ] Teste: nova senha deve ser diferente da atual

---

### 9. Política de Senhas

#### Backend (Validação)
- [ ] Criar validador de senha
  - [ ] Mínimo de caracteres (ex: 8)
  - [ ] Pelo menos uma letra maiúscula
  - [ ] Pelo menos uma letra minúscula
  - [ ] Pelo menos um número
  - [ ] Pelo menos um caractere especial (opcional na V1)
  - [ ] Mensagens de erro claras

- [ ] Aplicar validação em:
  - [ ] Registro de usuário
  - [ ] Reset de senha
  - [ ] Alteração de senha

#### Validação
- [ ] Teste: senha fraca é rejeitada
- [ ] Teste: senha forte é aceita
- [ ] Teste: mensagens de erro são claras

---

### 10. Testes de Autenticação

#### Backend (Testes)
- [ ] Testes unitários
  - [ ] Hash de senha
  - [ ] Geração e validação de JWT
  - [ ] Validação de senha

- [ ] Testes de integração
  - [ ] Fluxo completo de login
  - [ ] Fluxo completo de logout
  - [ ] Fluxo completo de recuperação de senha
  - [ ] Fluxo completo de alteração de senha

- [ ] Testes de segurança
  - [ ] Tentativas de brute force são bloqueadas
  - [ ] Tokens expirados não funcionam
  - [ ] Tokens de tenant A não funcionam em tenant B

#### Validação
- [ ] Todos os testes passando
- [ ] Cobertura de testes > 80% para lógica de autenticação

---

### 11. Documentação

#### Documentação Técnica
- [ ] Documentar endpoints de autenticação
  - [ ] `POST /api/auth/login`
  - [ ] `POST /api/auth/logout`
  - [ ] `POST /api/auth/forgot-password`
  - [ ] `POST /api/auth/reset-password`
  - [ ] `POST /api/auth/change-password`

- [ ] Documentar formato de token JWT
  - [ ] Estrutura do payload
  - [ ] Tempo de expiração
  - [ ] Como usar em requisições

- [ ] Documentar rate limiting
  - [ ] Limites aplicados
  - [ ] Como interpretar erros de rate limit

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 3 (ACL)**, verifique:

- [ ] Login/logout funcionando
- [ ] Tokens JWT válidos e seguros
- [ ] Rate limiting ativo
- [ ] Recuperação de senha operacional
- [ ] Alteração de senha operacional
- [ ] Política de senhas implementada
- [ ] Testes de autenticação passando
- [ ] Documentação atualizada

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
