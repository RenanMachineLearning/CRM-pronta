# API de Autenticação - Documentação Técnica

## Visão Geral

A API de autenticação fornece endpoints para gerenciamento de sessão de usuários em um ambiente multi-tenant. Utiliza tokens JWT (JSON Web Tokens) stateless para autenticação e implementa rate limiting para proteção contra ataques de brute force.

### Características Principais

- **Multi-tenant**: Identificação de tenant via headers `X-Tenant-Id` ou `X-Tenant-Slug`
- **JWT Stateless**: Tokens não são armazenados no servidor (V1)
- **Rate Limiting**: Proteção global e específica para login
- **Segurança**: Mensagens de erro genéricas para não revelar informações sensíveis

### Fluxo Básico de Autenticação

1. **Login**: Cliente envia credenciais → Recebe token JWT
2. **Requisições Protegidas**: Cliente envia token no header `Authorization: Bearer <token>`
3. **Logout**: Cliente remove token do storage (V1 - stateless)

---

## Endpoints de Autenticação

### POST /api/auth/login

Realiza login de usuário e retorna token JWT.

#### Autenticação

Não requerida.

#### Rate Limiting

Login limiter: **5 tentativas por IP por 15 minutos**

#### Headers

| Header | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `X-Tenant-Id` | string | Sim* | ID do tenant (UUID) |
| `X-Tenant-Slug` | string | Sim* | Slug do tenant (alternativa ao ID) |

\* Pelo menos um dos headers deve ser fornecido.

#### Body

```json
{
  "email": "usuario@example.com",
  "password": "SenhaSegura123"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `email` | string | Sim | Email do usuário |
| `password` | string | Sim | Senha do usuário |

#### Respostas

**200 OK** - Login bem-sucedido

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ0ZW5hbnRJZCI6IjZiYTdiODEwLTlkYWQtMTFkMS04MGI0LTAwYzA0ZmQ0MzBjOCIsImlhdCI6MTcwMzAwMTIzNCwiZXhwIjoxNzAzNjA2MDM0fQ.signature"
}
```

**400 Bad Request** - Dados inválidos ou faltantes

```json
{
  "error": "Email é obrigatório",
  "message": "Forneça um email válido"
}
```

ou

```json
{
  "error": "Tenant não identificado",
  "message": "Forneça X-Tenant-Id ou X-Tenant-Slug no header"
}
```

**401 Unauthorized** - Credenciais inválidas

```json
{
  "error": "Credenciais inválidas",
  "message": "Email ou senha incorretos"
}
```

**Nota**: A mensagem é genérica e não revela se o email existe ou se a senha está incorreta.

**403 Forbidden** - Tenant inválido ou inativo

```json
{
  "error": "Acesso negado",
  "message": "Tenant inválido ou inativo"
}
```

**429 Too Many Requests** - Rate limit excedido

```json
{
  "error": "Muitas tentativas de login",
  "message": "Tente novamente em 15 minutos."
}
```

#### Exemplo de Requisição

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: 6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  -d '{
    "email": "usuario@example.com",
    "password": "SenhaSegura123"
  }'
```

#### Notas de Segurança

- Mensagens de erro genéricas (não revela se email existe)
- Rate limiting protege contra brute force
- Token JWT contém `userId` e `tenantId` para isolamento multi-tenant

---

### POST /api/auth/logout

Realiza logout de usuário (stateless na V1).

#### Autenticação

Não requerida (V1 - stateless).

#### Rate Limiting

Global limiter: **100 requisições por IP por minuto**

#### Headers

Nenhum obrigatório.

#### Body

Vazio ou opcional.

#### Respostas

**200 OK** - Logout bem-sucedido

```json
{
  "message": "Logout realizado com sucesso"
}
```

#### Exemplo de Requisição

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Content-Type: application/json"
```

#### Notas

- **V1**: Stateless - cliente é responsável por remover token do storage
- **V2**: Pode ser protegido com middleware de autenticação
- Token não é invalidado no servidor (JWT stateless)

---

### POST /api/auth/forgot-password

Solicita reset de senha. Gera token e envia email (ou log em DEV).

#### Autenticação

Não requerida.

#### Rate Limiting

Global limiter: **100 requisições por IP por minuto**

#### Headers

| Header | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `X-Tenant-Id` | string | Sim* | ID do tenant (UUID) |
| `X-Tenant-Slug` | string | Sim* | Slug do tenant (alternativa ao ID) |

\* Pelo menos um dos headers deve ser fornecido.

#### Body

```json
{
  "email": "usuario@example.com"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `email` | string | Sim | Email do usuário |

#### Respostas

**200 OK** - Solicitação processada (sempre retorna sucesso)

```json
{
  "message": "Se o email existir, você receberá instruções para resetar sua senha"
}
```

**400 Bad Request** - Dados inválidos

```json
{
  "error": "Email é obrigatório",
  "message": "Forneça um email válido"
}
```

ou

```json
{
  "error": "Tenant não identificado",
  "message": "Forneça X-Tenant-Id ou X-Tenant-Slug no header"
}
```

**403 Forbidden** - Tenant inválido ou inativo

```json
{
  "error": "Acesso negado",
  "message": "Tenant inválido ou inativo"
}
```

#### Exemplo de Requisição

```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: 6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  -d '{
    "email": "usuario@example.com"
  }'
```

#### Notas de Segurança

- **Sempre retorna sucesso** para não revelar se o email existe
- Se o email existir e o usuário estiver ativo, token é gerado e email é enviado
- Em desenvolvimento, token é logado no console (não enviado por email)
- Token expira em 1 hora
- Token é invalidado após uso

---

### POST /api/auth/reset-password

Reseta senha usando token recebido por email.

#### Autenticação

Não requerida.

#### Rate Limiting

Global limiter: **100 requisições por IP por minuto**

#### Headers

| Header | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `X-Tenant-Id` | string | Sim* | ID do tenant (UUID) |
| `X-Tenant-Slug` | string | Sim* | Slug do tenant (alternativa ao ID) |

\* Pelo menos um dos headers deve ser fornecido.

#### Body

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "newPassword": "NovaSenhaSegura123"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `token` | string | Sim | Token de reset recebido por email (UUID) |
| `newPassword` | string | Sim | Nova senha (mínimo 8 caracteres, maiúscula, minúscula, número) |

#### Requisitos de Senha

A nova senha deve atender aos seguintes requisitos:

- Mínimo de 8 caracteres
- Pelo menos uma letra maiúscula (A-Z)
- Pelo menos uma letra minúscula (a-z)
- Pelo menos um número (0-9)
- Caractere especial: opcional na V1

#### Respostas

**200 OK** - Senha redefinida com sucesso

```json
{
  "message": "Senha redefinida com sucesso"
}
```

**400 Bad Request** - Dados inválidos

```json
{
  "error": "Token é obrigatório",
  "message": "Forneça um token de reset de senha."
}
```

ou

```json
{
  "error": "Senha inválida",
  "message": "A senha não atende aos requisitos: A senha deve ter no mínimo 8 caracteres, A senha deve conter pelo menos uma letra maiúscula",
  "errors": [
    "A senha deve ter no mínimo 8 caracteres",
    "A senha deve conter pelo menos uma letra maiúscula"
  ]
}
```

ou

```json
{
  "error": "Token inválido",
  "message": "Token de reset de senha inválido, expirado ou já utilizado."
}
```

**403 Forbidden** - Tenant inválido ou inativo

```json
{
  "error": "Acesso negado",
  "message": "Tenant inválido ou inativo"
}
```

#### Exemplo de Requisição

```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: 6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  -d '{
    "token": "550e8400-e29b-41d4-a716-446655440000",
    "newPassword": "NovaSenhaSegura123"
  }'
```

#### Notas de Segurança

- Token é invalidado após uso (não pode ser reutilizado)
- Token expira em 1 hora
- Token de tenant A não funciona em tenant B (isolamento multi-tenant)
- Senha deve atender requisitos de complexidade

---

### POST /api/auth/change-password

Altera senha do usuário autenticado.

#### Autenticação

**Requerida** - Token JWT no header `Authorization: Bearer <token>`

#### Rate Limiting

Global limiter: **100 requisições por IP por minuto**

#### Headers

| Header | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `Authorization` | string | Sim | Token JWT no formato `Bearer <token>` |
| `X-Tenant-Id` | string | Sim* | ID do tenant (UUID) |
| `X-Tenant-Slug` | string | Sim* | Slug do tenant (alternativa ao ID) |

\* Pelo menos um dos headers deve ser fornecido.

#### Body

```json
{
  "currentPassword": "SenhaAtual123",
  "newPassword": "NovaSenhaSegura456"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `currentPassword` | string | Sim | Senha atual do usuário |
| `newPassword` | string | Sim | Nova senha (diferente da atual, mínimo 8 caracteres, maiúscula, minúscula, número) |

#### Requisitos de Senha

A nova senha deve atender aos seguintes requisitos:

- Mínimo de 8 caracteres
- Pelo menos uma letra maiúscula (A-Z)
- Pelo menos uma letra minúscula (a-z)
- Pelo menos um número (0-9)
- Deve ser diferente da senha atual
- Caractere especial: opcional na V1

#### Respostas

**200 OK** - Senha alterada com sucesso

```json
{
  "message": "Senha alterada com sucesso"
}
```

**400 Bad Request** - Dados inválidos

```json
{
  "error": "Senha atual é obrigatória",
  "message": "Forneça a senha atual"
}
```

ou

```json
{
  "error": "Nova senha inválida",
  "message": "Nova senha deve ser diferente da atual."
}
```

ou

```json
{
  "error": "Senha inválida",
  "message": "A senha não atende aos requisitos: A senha deve ter no mínimo 8 caracteres",
  "errors": [
    "A senha deve ter no mínimo 8 caracteres"
  ]
}
```

**401 Unauthorized** - Token inválido ou senha atual incorreta

```json
{
  "error": "Token não fornecido",
  "message": "Forneça um token de autenticação no header Authorization"
}
```

ou

```json
{
  "error": "Credenciais inválidas",
  "message": "Email ou senha incorretos"
}
```

**Nota**: Mensagem genérica não revela se o token está inválido ou se a senha atual está incorreta.

**403 Forbidden** - Tenant inválido ou token não autorizado

```json
{
  "error": "Acesso negado",
  "message": "Token não autorizado para este tenant"
}
```

#### Exemplo de Requisição

```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Tenant-Id: 6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  -d '{
    "currentPassword": "SenhaAtual123",
    "newPassword": "NovaSenhaSegura456"
  }'
```

#### Notas de Segurança

- Rota protegida por `authMiddleware` (requer token JWT válido)
- Mensagens de erro genéricas (não revela qual validação falhou)
- Token de tenant A não funciona em tenant B
- **V2**: Considerar invalidar tokens após troca de senha

---

## Formato de Token JWT

### Estrutura do Payload

O token JWT contém as seguintes informações no payload:

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "iat": 1703001234,
  "exp": 1703606034
}
```

### Campos do Payload

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `sub` | string | ID do usuário (userId) - padrão JWT para "subject" |
| `tenantId` | string | ID do tenant (obrigatório para isolamento multi-tenant) |
| `iat` | number | Timestamp de emissão (issued at) - gerado automaticamente |
| `exp` | number | Timestamp de expiração (expiration) - calculado automaticamente |

### Tempo de Expiração

- **Padrão**: 7 dias
- **Configurável**: Via variável de ambiente `JWT_EXPIRES_IN`
- **Formatos aceitos**:
  - `"7d"` - 7 dias
  - `"12h"` - 12 horas
  - `"1h"` - 1 hora
  - `"30m"` - 30 minutos

**Exemplo de configuração** (`.env`):
```env
JWT_EXPIRES_IN="7d"
```

### Como Usar em Requisições

O token JWT deve ser enviado no header `Authorization` com o prefixo `Bearer`:

```
Authorization: Bearer <token>
```

**Exemplo**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ0ZW5hbnRJZCI6IjZiYTdiODEwLTlkYWQtMTFkMS04MGI0LTAwYzA0ZmQ0MzBjOCIsImlhdCI6MTcwMzAwMTIzNCwiZXhwIjoxNzAzNjA2MDM0fQ.signature
```

### Validação

O token é validado automaticamente pelo `authMiddleware`:

- ✅ **Token válido**: Requisição prossegue, `userId` e `tenantId` são adicionados ao `req`
- ❌ **Token inválido**: Retorna `401 Unauthorized`
- ❌ **Token expirado**: Retorna `401 Unauthorized` com mensagem "Token expirado ou inválido"
- ❌ **Token sem campos obrigatórios**: Retorna `401 Unauthorized`
- ❌ **Token de tenant diferente**: Retorna `403 Forbidden` se `tenantId` do token não corresponder ao contexto

### Isolamento Multi-tenant

**Importante**: Tokens são isolados por tenant. Um token gerado para o tenant A não funciona em requisições para o tenant B, mesmo que o `userId` seja válido em ambos os tenants.

---

## Rate Limiting

### Limites Aplicados

A API implementa dois níveis de rate limiting:

#### 1. Rate Limiter Global

- **Limite**: 100 requisições por IP por minuto
- **Aplicado em**: Todas as rotas (exceto `/health`)
- **Janela**: 1 minuto (60 segundos)
- **Headers de resposta**: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

#### 2. Rate Limiter de Login

- **Limite**: 5 tentativas por IP por 15 minutos
- **Aplicado em**: `POST /api/auth/login`
- **Janela**: 15 minutos
- **Conta**: Todas as tentativas (inclusive sucessos)
- **Headers de resposta**: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

### Comportamento

- **Login limiter prevalece**: Se ambos os limiters se aplicarem, o mais restritivo prevalece
- **Health check isento**: A rota `/health` não conta no rate limiter global
- **Por IP**: Rate limiting é baseado no IP do cliente (pode ser ajustado na V2)

### Headers de Rate Limit

A API retorna headers padrão (RFC draft) com informações sobre o rate limit:

| Header | Descrição | Exemplo |
|--------|-----------|---------|
| `RateLimit-Limit` | Limite total de requisições | `100` |
| `RateLimit-Remaining` | Requisições restantes na janela | `45` |
| `RateLimit-Reset` | Timestamp de reset da janela | `1703001234` |

### Como Interpretar Erros de Rate Limit

Quando o rate limit é excedido, a API retorna:

**Status**: `429 Too Many Requests`

**Response Body** (Rate Limiter Global):
```json
{
  "error": "Muitas requisições",
  "message": "Tente novamente em alguns instantes."
}
```

**Response Body** (Rate Limiter de Login):
```json
{
  "error": "Muitas tentativas de login",
  "message": "Tente novamente em 15 minutos."
}
```

**Headers**:
```
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1703001234
```

### Recomendações

- **Implementar retry com backoff**: Aguardar antes de tentar novamente
- **Monitorar headers**: Usar `RateLimit-Remaining` para controlar requisições
- **Respeitar limites**: Não tentar contornar rate limiting

---

## Códigos de Status HTTP

### Sucesso

| Código | Descrição | Quando Usar |
|--------|-----------|-------------|
| `200 OK` | Operação bem-sucedida | Login, logout, reset/change password bem-sucedidos |

### Erros do Cliente

| Código | Descrição | Quando Usar |
|--------|-----------|-------------|
| `400 Bad Request` | Dados inválidos ou faltantes | Email/senha não fornecidos, tenant não identificado, senha inválida |
| `401 Unauthorized` | Não autenticado | Token ausente, inválido ou expirado / Credenciais inválidas |
| `403 Forbidden` | Acesso negado | Tenant inválido ou inativo / Token não autorizado para tenant |
| `429 Too Many Requests` | Rate limit excedido | Muitas requisições ou tentativas de login |

### Erros do Servidor

| Código | Descrição | Quando Usar |
|--------|-----------|-------------|
| `500 Internal Server Error` | Erro interno do servidor | Erro inesperado no processamento |
| `501 Not Implemented` | Funcionalidade não implementada | Refresh token (V1) |

---

## Exemplos Práticos

### Fluxo Completo de Autenticação

#### 1. Login

```bash
# Fazer login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: 6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  -d '{
    "email": "usuario@example.com",
    "password": "SenhaSegura123"
  }'

# Response:
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# }
```

#### 2. Usar Token em Requisição Protegida

```bash
# Fazer requisição autenticada (exemplo: rota /api/test)
curl -X GET http://localhost:5000/api/test \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Tenant-Id: 6ba7b810-9dad-11d1-80b4-00c04fd430c8"

# Response:
# {
#   "message": "Rota protegida",
#   "tenantId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
#   "userId": "550e8400-e29b-41d4-a716-446655440000"
# }
```

#### 3. Logout (V1 - Stateless)

```bash
# Logout (cliente remove token do storage)
curl -X POST http://localhost:5000/api/auth/logout

# Response:
# {
#   "message": "Logout realizado com sucesso"
# }
```

### Fluxo de Recuperação de Senha

#### 1. Solicitar Reset

```bash
# Solicitar reset de senha
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: 6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  -d '{
    "email": "usuario@example.com"
  }'

# Response (sempre sucesso):
# {
#   "message": "Se o email existir, você receberá instruções para resetar sua senha"
# }
```

**Nota**: Em desenvolvimento, o token é logado no console. Em produção, será enviado por email.

#### 2. Resetar Senha

```bash
# Resetar senha com token recebido
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: 6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  -d '{
    "token": "550e8400-e29b-41d4-a716-446655440000",
    "newPassword": "NovaSenhaSegura123"
  }'

# Response:
# {
#   "message": "Senha redefinida com sucesso"
# }
```

### Fluxo de Alteração de Senha

```bash
# Alterar senha (requer autenticação)
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Tenant-Id: 6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  -d '{
    "currentPassword": "SenhaAtual123",
    "newPassword": "NovaSenhaSegura456"
  }'

# Response:
# {
#   "message": "Senha alterada com sucesso"
# }
```

---

## Segurança

### Boas Práticas

1. **Nunca expor tokens em logs**
   - Tokens JWT são sensíveis e não devem aparecer em logs do servidor ou cliente

2. **Usar HTTPS em produção**
   - Tokens devem ser transmitidos apenas sobre conexões seguras (HTTPS)

3. **Validar tokens no frontend**
   - Verificar expiração antes de usar token em requisições
   - Remover token expirado do storage

4. **Implementar refresh token na V2**
   - Quando necessário, implementar mecanismo de refresh token para renovar tokens sem reautenticação

### Limitações da V1

- **JWT Stateless**: Tokens não são armazenados no servidor (sem blacklist)
- **Logout não invalida token**: Cliente é responsável por remover token do storage
- **Refresh token não implementado**: Token deve ser renovado via novo login quando expirar
- **Email em DEV**: Tokens de reset são logados no console, não enviados por email

### Política de Senhas

A senha deve atender aos seguintes requisitos:

- ✅ Mínimo de 8 caracteres
- ✅ Pelo menos uma letra maiúscula (A-Z)
- ✅ Pelo menos uma letra minúscula (a-z)
- ✅ Pelo menos um número (0-9)
- ⚠️ Caractere especial: opcional na V1

**Exemplos de senhas válidas**:
- `SenhaSegura123`
- `MinhaSenha456`
- `Password789`

**Exemplos de senhas inválidas**:
- `senha` (muito curta, sem maiúscula, sem número)
- `SENHA123` (sem minúscula)
- `senhasegura` (sem maiúscula, sem número)

---

## Referências

- **Código-fonte**: `backend/src/routes/authRoutes.ts`
- **Controllers**: `backend/src/controllers/authController.ts`
- **JWT Utils**: `backend/src/utils/jwt.ts`
- **Rate Limiting**: `backend/src/middleware/rateLimiter.ts`
- **Testes**: `backend/tests/README.md`

---

## Suporte

Para questões sobre a API de autenticação, consulte:

- Documentação de testes: `backend/tests/README.md`
- Etapa 2 - Autenticação: `docs/v1/fases/Etapa-02-Autenticacao.md`

