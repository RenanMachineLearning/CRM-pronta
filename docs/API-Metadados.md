# API Metadados - Documentação Técnica

## Visão Geral

Sistema de metadados permite criar entidades customizadas, campos dinâmicos e relacionamentos entre entidades em ambiente multi-tenant.

**Conceitos fundamentais:**
- **Entity**: Entidade (ex: Contact, Product). Pode ser do sistema (pré-definida) ou customizada.
- **Field**: Campo de uma entidade (ex: email, price). Tipos: text, number, date, boolean, lookup, select.
- **Relationship**: Relacionamento entre entidades (oneToMany, manyToMany).

**Isolamento**: Todos os metadados são isolados por tenant.

---

## Como Criar Entidade Customizada

```bash
POST /api/entities
Authorization: Bearer <token>
X-Tenant-Id: <tenant-id>
Content-Type: application/json

{
  "name": "Product",
  "label": "Produto"
}
```

**Validações:**
- `name`: Único por tenant, deve começar com letra, apenas letras/números
- `label`: Obrigatório

**Resposta 201:**
```json
{
  "id": "uuid",
  "name": "Product",
  "label": "Produto",
  "tenantId": "uuid",
  "isSystem": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Como Adicionar Campos

```bash
POST /api/entities/:entityId/fields
Authorization: Bearer <token>
X-Tenant-Id: <tenant-id>
Content-Type: application/json

{
  "name": "price",
  "label": "Preço",
  "type": "number",
  "required": true,
  "unique": false,
  "defaultValue": 0
}
```

**Tipos de campo suportados:**
- `text`: Texto livre
- `number`: Números (inteiros e decimais)
- `date`: Datas
- `boolean`: true/false
- `lookup`: Referência a outra entidade (ex: fornecedor → Company)
- `select`: Lista de opções pré-definidas (requer `options`)

**Campo select (com opções):**
```json
{
  "name": "category",
  "label": "Categoria",
  "type": "select",
  "options": [
    { "value": "electronics", "label": "Eletrônicos", "color": "#FF0000" },
    { "value": "clothing", "label": "Roupas" }
  ]
}
```

**Validações:**
- `name`: Único por entidade, deve começar com letra
- `type`: Deve ser um dos tipos suportados
- `select`: Deve ter pelo menos uma opção

---

## Como Criar Relacionamento

```bash
POST /api/relationships
Authorization: Bearer <token>
X-Tenant-Id: <tenant-id>
Content-Type: application/json

{
  "sourceEntityId": "uuid-contact",
  "targetEntityId": "uuid-company",
  "type": "oneToMany",
  "name": "companies"
}
```

**Tipos:**
- `oneToMany`: Um-para-muitos (ex: uma Empresa tem muitos Contatos)
- `manyToMany`: Muitos-para-muitos (ex: Contatos e Tags)

**Direcionalidade:** `sourceEntity → targetEntity`. O `name` pertence ao lado `sourceEntity`.

**Exemplo:** Contact (source) → Company (target) com name "companies" significa que do ponto de vista de Contact, há um relacionamento "companies" com Company.

---

## Endpoints de Entidades

### GET /api/entities
Lista entidades do tenant com contagem de campos.

**Permissão:** `Entity.list`

**Resposta 200:**
```json
[
  {
    "id": "uuid",
    "name": "Contact",
    "label": "Contato",
    "isSystem": true,
    "fieldsCount": 6
  }
]
```

### GET /api/entities/:id
Obtém entidade com campos e relacionamentos.

**Permissão:** `Entity.read`

**Resposta 200:**
```json
{
  "id": "uuid",
  "name": "Contact",
  "label": "Contato",
  "fields": [...],
  "relationships": [...]
}
```

### GET /api/entities/:entityId/lookup
Busca registros para lookup (retorna id e label).

**Query params:**
- `query` (opcional): Termo de busca
- `limit` (opcional, default: 20, max: 100)

**Resposta 200:**
```json
[
  { "id": "uuid", "label": "Nome do Registro" }
]
```

### POST /api/entities
Cria entidade customizada.

**Permissão:** `Entity.create`

**Body:**
```json
{
  "name": "Product",
  "label": "Produto"
}
```

**Erros:**
- 409: Nome duplicado
- 400: Dados inválidos

### PUT /api/entities/:id
Atualiza label da entidade (name não pode ser alterado).

**Permissão:** `Entity.update`

**Body:**
```json
{
  "label": "Novo Label"
}
```

**Erros:**
- 400: Entidade do sistema não pode ser alterada

### DELETE /api/entities/:id
Deleta entidade customizada.

**Permissão:** `Entity.delete`

**Erros:**
- 400: Entidade do sistema ou tem campos associados

---

## Endpoints de Campos

### GET /api/entities/:entityId/fields
Lista campos ordenados por `order`.

**Permissão:** `Field.list`

**Query params:**
- `includeDeletedFields` (opcional): Se "true", inclui campos deletados

**Resposta 200:**
```json
[
  {
    "id": "uuid",
    "name": "email",
    "label": "E-mail",
    "type": "text",
    "required": true,
    "unique": true,
    "order": 0,
    "isDeleted": false
  }
]
```

### GET /api/fields/:id
Obtém campo específico.

**Permissão:** `Field.read`

### GET /api/fields/:id/options
Obtém opções de campo select.

**Resposta 200:**
```json
[
  { "value": "option1", "label": "Opção 1", "color": "#FF0000" }
]
```

### POST /api/entities/:entityId/fields
Cria campo.

**Permissão:** `Field.create`

**Body:**
```json
{
  "name": "price",
  "label": "Preço",
  "type": "number",
  "required": true,
  "unique": false,
  "defaultValue": 0,
  "order": 0
}
```

**Erros:**
- 409: Nome duplicado na entidade
- 400: Tipo inválido ou select sem opções

### PUT /api/fields/:id
Atualiza campo (tipo não pode ser alterado).

**Permissão:** `Field.update`

**Body:**
```json
{
  "label": "Novo Label",
  "required": true,
  "unique": false,
  "defaultValue": null,
  "order": 1
}
```

**Erros:**
- 400: Campo de entidade do sistema ou tentativa de alterar tipo

### PUT /api/fields/:id/options
Atualiza opções de campo select.

**Permissão:** `Field.update`

**Body:**
```json
[
  { "value": "option1", "label": "Opção 1 Atualizada" },
  { "value": "option2", "label": "Nova Opção" }
]
```

**Nota:** A ordem do array é preservada.

### DELETE /api/fields/:id
Soft delete do campo (marca `isDeleted: true`).

**Permissão:** `Field.delete`

**Erros:**
- 400: Campo de entidade do sistema

---

## Endpoints de Relacionamentos

### GET /api/entities/:id/relationships
Lista relacionamentos da entidade (source e target).

**Permissão:** `Relationship.list`

**Resposta 200:**
```json
[
  {
    "id": "uuid",
    "type": "oneToMany",
    "name": "companies",
    "sourceEntity": { "id": "uuid", "name": "Contact", "label": "Contato" },
    "targetEntity": { "id": "uuid", "name": "Company", "label": "Empresa" }
  }
]
```

### POST /api/relationships
Cria relacionamento.

**Permissão:** `Relationship.create`

**Body:**
```json
{
  "sourceEntityId": "uuid",
  "targetEntityId": "uuid",
  "type": "oneToMany",
  "name": "companies"
}
```

**Erros:**
- 409: Nome já está em uso para esta entidade origem
- 404: Entidade não encontrada

### DELETE /api/relationships/:id
Deleta relacionamento.

**Permissão:** `Relationship.delete`

---

## Exemplo Completo: Criar Entidade com Campos

```bash
# 1. Criar entidade
POST /api/entities
{
  "name": "Product",
  "label": "Produto"
}
# Resposta: { "id": "entity-uuid", ... }

# 2. Adicionar campo texto
POST /api/entities/entity-uuid/fields
{
  "name": "name",
  "label": "Nome",
  "type": "text",
  "required": true
}

# 3. Adicionar campo número
POST /api/entities/entity-uuid/fields
{
  "name": "price",
  "label": "Preço",
  "type": "number",
  "required": true
}

# 4. Adicionar campo select
POST /api/entities/entity-uuid/fields
{
  "name": "category",
  "label": "Categoria",
  "type": "select",
  "options": [
    { "value": "electronics", "label": "Eletrônicos" },
    { "value": "clothing", "label": "Roupas" }
  ]
}
```

---

## Regras de Negócio

**Entidades:**
- Nome único por tenant
- Entidades do sistema não podem ser alteradas/deletadas
- Não pode deletar entidade com campos associados

**Campos:**
- Nome único por entidade
- Tipo não pode ser alterado após criação
- Campos de entidades do sistema não podem ser alterados/deletados
- Soft delete preserva dados históricos
- Ordem controlada por campo `order`

**Relacionamentos:**
- Nome único por entidade origem (sourceEntity)
- Links entre registros armazenados em `EntityRelationData`

---

## Erros Comuns

**409 - Nome duplicado:**
- Entidade: Nome já existe no tenant
- Campo: Nome já existe na entidade
- Relacionamento: Nome já existe para esta entidade origem

**400 - Dados inválidos:**
- Campo select sem opções
- Tipo de campo inválido
- Tentativa de alterar tipo de campo
- Entidade do sistema não pode ser alterada/deletada

**404 - Não encontrado:**
- Entidade/Campo/Relacionamento não existe ou não pertence ao tenant

