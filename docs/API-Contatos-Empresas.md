# API Contatos e Empresas - Documentação Técnica

## Visão Geral

Endpoints para gerenciamento de contatos e empresas com suporte a campos customizados, permissões por campo, auditoria e isolamento multi-tenant.

**Características:**
- Multi-tenant: Dados isolados por tenant
- Soft delete: Registros não são deletados fisicamente
- Campos customizados: Via sistema de metadados (Entity/Field)
- Permissões por campo: Controle granular de acesso
- Auditoria: Todas as operações são registradas

---

## Endpoints de Contatos

### GET /api/contacts

Lista contatos com paginação e filtros.

**Permissão:** `Contact.list`

**Query params:**
- `limit` (opcional, default: 20, max: 100)
- `offset` (opcional, default: 0)
- `companyId` (opcional): Filtrar por empresa
- `status` (opcional): ACTIVE, INACTIVE, ARCHIVED
- `tagId` (opcional): Filtrar por tag
- `orderBy` (opcional): firstName, lastName, createdAt
- `order` (opcional): asc, desc

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "João",
      "lastName": "Silva",
      "title": "Desenvolvedor",
      "status": "ACTIVE",
      "companyId": "uuid",
      "emails": [...],
      "phones": [...],
      "addresses": [...],
      "tags": [...],
      "customFields": { "campo1": "valor1" }
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

### GET /api/contacts/:id

Obtém contato específico.

**Permissão:** `Contact.read`

**Resposta 200:** Mesma estrutura do item em `data` acima.

**Erros:**
- 404: Contato não encontrado ou deletado

### POST /api/contacts

Cria novo contato.

**Permissão:** `Contact.create`

**Body:**
```json
{
  "firstName": "João",
  "lastName": "Silva",
  "title": "Desenvolvedor",
  "gender": "MALE",
  "birthDate": "1990-01-01",
  "notes": "Notas",
  "status": "ACTIVE",
  "companyId": "uuid",
  "emails": [
    { "email": "joao@example.com", "type": "WORK" }
  ],
  "phones": [
    { "phone": "+5511999999999", "type": "MOBILE" }
  ],
  "addresses": [
    {
      "street": "Rua Exemplo",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01234-567",
      "country": "Brasil",
      "type": "WORK"
    }
  ],
  "tagIds": ["uuid"],
  "customFields": {
    "campoCustomizado": "valor"
  }
}
```

**Validações:**
- Pelo menos `firstName` ou `lastName` obrigatório
- Emails: Formato válido
- Phones: Formato válido (E.164)
- Website: URL válida
- Campos customizados: Validados conforme Field definitions

**Resposta 201:** Contato criado

**Erros:**
- 400: Dados inválidos
- 404: Company não encontrada (se companyId fornecido)

### PUT /api/contacts/:id

Atualiza contato existente.

**Permissão:** `Contact.update` (e permissões por campo para campos específicos)

**Body:** Mesma estrutura de POST (todos os campos opcionais)

**Validações:** Mesmas de POST

**Resposta 200:** Contato atualizado

**Erros:**
- 400: Dados inválidos
- 403: Sem permissão para atualizar campo específico
- 404: Contato não encontrado

### DELETE /api/contacts/:id

Soft delete do contato.

**Permissão:** `Contact.delete`

**Resposta 200:** Contato deletado

**Nota:** Soft delete - registro não é removido fisicamente, apenas marcado com `deletedAt`.

---

## Endpoints de Empresas

### GET /api/companies

Lista empresas com paginação e filtros.

**Permissão:** `Company.list`

**Query params:**
- `limit` (opcional, default: 20, max: 100)
- `offset` (opcional, default: 0)
- `industry` (opcional): Busca parcial
- `size` (opcional): SMALL, MEDIUM, LARGE, ENTERPRISE
- `orderBy` (opcional): name, createdAt
- `order` (opcional): asc, desc

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Empresa Exemplo",
      "website": "https://example.com",
      "industry": "Tecnologia",
      "size": "MEDIUM",
      "status": "ACTIVE",
      "addresses": [...],
      "tags": [...],
      "contactsCount": 5,
      "customFields": { "campo1": "valor1" }
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

### GET /api/companies/:id

Obtém empresa específica.

**Permissão:** `Company.read`

**Resposta 200:** Mesma estrutura do item em `data` acima.

### POST /api/companies

Cria nova empresa.

**Permissão:** `Company.create`

**Body:**
```json
{
  "name": "Empresa Exemplo",
  "website": "https://example.com",
  "industry": "Tecnologia",
  "size": "MEDIUM",
  "status": "ACTIVE",
  "addresses": [...],
  "tagIds": ["uuid"],
  "customFields": {
    "campoCustomizado": "valor"
  }
}
```

**Validações:**
- `name`: Obrigatório, não vazio
- `website`: URL válida (normalizada automaticamente)
- Campos customizados: Validados conforme Field definitions

**Resposta 201:** Empresa criada

### PUT /api/companies/:id

Atualiza empresa existente.

**Permissão:** `Company.update` (e permissões por campo)

**Body:** Mesma estrutura de POST

**Resposta 200:** Empresa atualizada

**Erros:**
- 400: Dados inválidos
- 403: Sem permissão para atualizar campo específico
- 404: Empresa não encontrada

### DELETE /api/companies/:id

Soft delete da empresa.

**Permissão:** `Company.delete`

**Resposta 200:** Empresa deletada

---

## Endpoints Relacionados

### GET /api/companies/:id/contacts

Lista contatos de uma empresa.

**Permissão:** `Contact.list`

**Query params:** Mesmos de `GET /api/contacts`

**Resposta 200:** Lista de contatos da empresa

---

## Campos Customizados

Campos customizados são definidos via sistema de metadados (`/api/entities/:id/fields`) e armazenados em `EntityData`.

**Como usar:**

1. Criar campo customizado:
```bash
POST /api/entities/:entityId/fields
{
  "name": "campoCustomizado",
  "label": "Campo Customizado",
  "type": "text",
  "required": false
}
```

2. Usar em Contact/Company:
```json
{
  "firstName": "João",
  "customFields": {
    "campoCustomizado": "valor"
  }
}
```

**Tipos suportados:** text, number, date, boolean, select, lookup

**Validação automática:**
- Tipo conforme Field definition
- Required conforme Field definition
- Unique conforme Field definition
- Opções válidas (para select)

---

## Permissões por Campo

Controle granular de acesso a campos específicos.

**Formato de permissão:**
- Por entidade: `Contact.read`, `Contact.update`
- Por campo: `Contact.read.firstName`, `Contact.update.firstName`

**Comportamento:**
- GET: Campos sem permissão não aparecem na resposta
- PUT: Tentar atualizar campo sem permissão retorna 403
- Admin: Sempre vê e pode atualizar todos os campos

**Exemplo de erro 403:**
```json
{
  "error": "Acesso negado",
  "message": "Você não tem permissão para atualizar os seguintes campos: lastName"
}
```

---

## Auditoria

Todas as operações CRUD são registradas automaticamente em `AuditLog`.

**Estrutura do log:**
```json
{
  "id": "uuid",
  "entityType": "Contact",
  "entityId": "uuid",
  "action": "create",
  "userId": "uuid",
  "tenantId": "uuid",
  "changes": null,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Para updates:**
```json
{
  "action": "update",
  "changes": {
    "firstName": {
      "old": "João",
      "new": "João Atualizado"
    }
  }
}
```

**Campos técnicos excluídos:** id, tenantId, createdAt, updatedAt, deletedAt

---

## Validações

### Contatos

- **Nome:** Pelo menos `firstName` ou `lastName` obrigatório
- **Email:** Formato válido (regex)
- **Phone:** Formato E.164 válido
- **BirthDate:** Não pode ser data futura
- **Status:** ACTIVE, INACTIVE, ARCHIVED

### Empresas

- **Name:** Obrigatório, não vazio
- **Website:** URL válida (normalizada com http:// se necessário)
- **Size:** SMALL, MEDIUM, LARGE, ENTERPRISE
- **Status:** ACTIVE, INACTIVE, ARCHIVED

### Campos Customizados

- **Tipo:** Validado conforme Field.type
- **Required:** Validado se Field.required = true
- **Unique:** Validado se Field.unique = true
- **Select:** Valor deve estar em Field.options

---

## Estrutura de Dados

### Contact

```typescript
{
  id: string;
  tenantId: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  birthDate: Date | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  companyId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  emails: ContactEmail[];
  phones: ContactPhone[];
  addresses: Address[];
  tags: Tag[];
  company: Company | null;
  customFields: Record<string, any>;
}
```

### Company

```typescript
{
  id: string;
  tenantId: string;
  name: string;
  website: string | null;
  industry: string | null;
  size: "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE" | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  addresses: Address[];
  tags: Tag[];
  contacts: Contact[];
  contactsCount: number;
  customFields: Record<string, any>;
}
```

---

## Erros Comuns

**400 Bad Request:**
- Dados inválidos (formato, tipo, validação de negócio)
- Campo obrigatório ausente
- Valor fora das opções (select)

**403 Forbidden:**
- Sem permissão para acessar endpoint
- Sem permissão para atualizar campo específico

**404 Not Found:**
- Registro não encontrado
- Registro deletado (soft delete)
- Relacionamento não encontrado (companyId, tagId)

**409 Conflict:**
- Campo único duplicado

---

## Exemplos de Uso

### Criar contato com campos customizados

```bash
POST /api/contacts
{
  "firstName": "João",
  "lastName": "Silva",
  "emails": [{ "email": "joao@example.com", "type": "WORK" }],
  "customFields": {
    "numeroCliente": "12345",
    "categoria": "VIP"
  }
}
```

### Atualizar apenas campos específicos

```bash
PUT /api/contacts/:id
{
  "title": "Gerente",
  "customFields": {
    "categoria": "Premium"
  }
}
```

### Filtrar contatos por empresa

```bash
GET /api/contacts?companyId=uuid&status=ACTIVE
```

### Listar empresas com paginação

```bash
GET /api/companies?limit=50&offset=0&orderBy=name&order=asc
```

