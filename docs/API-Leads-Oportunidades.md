# API Leads e Oportunidades - Documentação Técnica

## Visão Geral

Endpoints para gerenciamento de leads, oportunidades e pipelines com suporte a conversão de leads, pipeline configurável, auditoria e isolamento multi-tenant.

**Características:**
- Multi-tenant: Dados isolados por tenant
- Soft delete: Registros não são deletados fisicamente
- Pipeline configurável: Estágios customizáveis por tenant
- Conversão de leads: Transforma leads em contatos e/ou oportunidades
- Permissões por campo: Controle granular de acesso
- Auditoria: Todas as operações são registradas

---

## Endpoints de Leads

### GET /api/leads

Lista leads com paginação e filtros.

**Permissão:** `Lead.list`

**Query params:**
- `limit` (opcional, default: 20, max: 100)
- `offset` (opcional, default: 0)
- `status` (opcional): NEW, QUALIFIED, CONVERTED, LOST
- `source` (opcional): Busca parcial case-insensitive
- `converted` (opcional): true ou false
- `orderBy` (opcional): createdAt, firstName, lastName (default: createdAt)
- `order` (opcional): asc, desc (default: desc)

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "João",
      "lastName": "Silva",
      "email": "joao@example.com",
      "phone": "+5511999999999",
      "company": "Empresa ABC",
      "source": "website",
      "status": "NEW",
      "converted": false,
      "tags": [...],
      "customFields": { "campo1": "valor1" }
    }
  ],
  "pagination": { "total": 100, "limit": 20, "offset": 0 }
}
```

### GET /api/leads/:id

Obtém lead específico.

**Permissão:** `Lead.read`

**Resposta 200:** Mesma estrutura do item em `data` acima.

**Erros:**
- 404: Lead não encontrado ou deletado

### POST /api/leads

Cria novo lead.

**Permissão:** `Lead.create`

**Body:**
```json
{
  "firstName": "João",
  "lastName": "Silva",
  "email": "joao@example.com",
  "phone": "+5511999999999",
  "company": "Empresa ABC",
  "source": "website",
  "status": "NEW",
  "tagIds": ["uuid-tag-1"],
  "customFields": { "campo1": "valor1" }
}
```

**Validações:**
- `firstName`: Obrigatório
- `email`: Formato válido (se fornecido)
- `phone`: Formato válido (se fornecido)
- `status`: NEW, QUALIFIED, CONVERTED, LOST (default: NEW)

**Resposta 201:** Lead criado

### PUT /api/leads/:id

Atualiza lead existente.

**Permissão:** `Lead.update`

**Body:** Todos os campos opcionais (mesma estrutura do POST)

**Nota:** `tagIds` substitui completamente as tags existentes.

**Resposta 200:** Lead atualizado

### DELETE /api/leads/:id

Deleta lead (soft delete).

**Permissão:** `Lead.delete`

**Resposta 200:** `{ "message": "Lead deletado com sucesso", "id": "uuid" }`

---

## Endpoints de Oportunidades

### GET /api/opportunities

Lista oportunidades com paginação e filtros.

**Permissão:** `Opportunity.list`

**Query params:**
- `limit` (opcional, default: 20, max: 100)
- `offset` (opcional, default: 0)
- `stageId` (opcional): UUID do estágio do pipeline
- `status` (opcional): OPEN, WON, LOST, ARCHIVED
- `contactId` (opcional): UUID do contato
- `companyId` (opcional): UUID da empresa
- `orderBy` (opcional): value, closeDate, createdAt (default: createdAt)
- `order` (opcional): asc, desc (default: desc)

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Negócio ABC",
      "value": 50000.00,
      "currency": "BRL",
      "stageId": "uuid-stage",
      "status": "OPEN",
      "closeDate": "2024-12-31T00:00:00.000Z",
      "probability": 60,
      "contact": { "id": "uuid", "firstName": "João", "lastName": "Silva" },
      "company": { "id": "uuid", "name": "Empresa ABC" },
      "tags": [...],
      "customFields": { "campo1": "valor1" }
    }
  ],
  "pagination": { "total": 100, "limit": 20, "offset": 0 }
}
```

### GET /api/opportunities/:id

Obtém oportunidade específica.

**Permissão:** `Opportunity.read`

**Resposta 200:** Mesma estrutura do item em `data` acima.

### POST /api/opportunities

Cria nova oportunidade.

**Permissão:** `Opportunity.create`

**Body:**
```json
{
  "name": "Negócio ABC",
  "value": 50000.00,
  "currency": "BRL",
  "stageId": "uuid-stage",
  "status": "OPEN",
  "closeDate": "2024-12-31T00:00:00.000Z",
  "probability": 60,
  "contactId": "uuid-contact",
  "companyId": "uuid-company",
  "leadId": "uuid-lead",
  "tagIds": ["uuid-tag-1"],
  "customFields": { "campo1": "valor1" }
}
```

**Validações:**
- `name`: Obrigatório
- `value`: Obrigatório, número positivo maior que zero
- `stageId`: Obrigatório, UUID válido de PipelineStage do tenant
- `closeDate`: Opcional, deve ser futura ou presente (não pode ser passada)
- `probability`: Opcional, 0-100 (se não fornecido, usa do PipelineStage)
- `status`: OPEN, WON, LOST, ARCHIVED (default: OPEN)

**Resposta 201:** Oportunidade criada

**Erros:**
- 400: Dados inválidos (value negativo, closeDate passada, probability fora do range)
- 404: PipelineStage, Contact, Company ou Lead não encontrado

### PUT /api/opportunities/:id

Atualiza oportunidade existente.

**Permissão:** `Opportunity.update`

**Body:** Todos os campos opcionais (mesma estrutura do POST)

**Nota:** `tagIds` substitui completamente as tags existentes. Campos relacionais (contactId, companyId, leadId) podem ser `null` para remover associação.

**Resposta 200:** Oportunidade atualizada

### DELETE /api/opportunities/:id

Deleta oportunidade (soft delete).

**Permissão:** `Opportunity.delete`

**Resposta 200:** `{ "message": "Oportunidade deletada com sucesso", "id": "uuid" }`

---

## Sistema de Pipeline

Pipeline é um conjunto de estágios que representam o fluxo de vendas. Cada tenant pode ter múltiplos pipelines, mas apenas um pode ser marcado como padrão.

### GET /api/pipelines

Lista pipelines do tenant.

**Autenticação:** Requerida (sem permissão específica)

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Pipeline de Vendas",
      "description": "Pipeline principal",
      "isDefault": true,
      "stages": [
        {
          "id": "uuid",
          "name": "Qualificação",
          "order": 1,
          "probability": 25,
          "color": "#3B82F6"
        }
      ]
    }
  ]
}
```

### GET /api/pipelines/:id

Obtém pipeline específico com seus estágios.

**Autenticação:** Requerida (sem permissão específica)

**Resposta 200:** Pipeline com array de `stages` ordenado por `order`

### POST /api/pipelines

Cria novo pipeline.

**Permissão:** `Pipeline.create`

**Body:**
```json
{
  "name": "Pipeline de Vendas",
  "description": "Pipeline principal",
  "isDefault": false,
  "stages": [
    {
      "name": "Qualificação",
      "order": 1,
      "probability": 25,
      "color": "#3B82F6"
    },
    {
      "name": "Proposta",
      "order": 2,
      "probability": 50,
      "color": "#10B981"
    }
  ]
}
```

**Validações:**
- `name`: Obrigatório, único por tenant
- `stages`: Array com pelo menos 1 estágio
- `stages[].name`: Obrigatório, único no pipeline
- `stages[].order`: Obrigatório, números sequenciais começando em 1
- `stages[].probability`: Opcional, 0-100 (default: 0)
- `stages[].color`: Opcional, formato hexadecimal (#RRGGBB)

**Resposta 201:** Pipeline criado com estágios

**Nota:** Se `isDefault: true`, o pipeline anterior marcado como padrão é automaticamente atualizado para `isDefault: false`.

### PUT /api/pipelines/:id

Atualiza pipeline existente.

**Permissão:** `Pipeline.update`

**Body:** Todos os campos opcionais (mesma estrutura do POST)

**Validações:**
- Pipeline padrão não pode ser deletado se tiver estágios em uso
- Estágios em uso não podem ser deletados

**Resposta 200:** Pipeline atualizado

### DELETE /api/pipelines/:id

Deleta pipeline (soft delete).

**Permissão:** `Pipeline.delete`

**Validações:**
- Pipeline padrão não pode ser deletado
- Pipeline com estágios em uso não pode ser deletado

**Resposta 200:** `{ "message": "Pipeline deletado com sucesso", "id": "uuid" }`

---

## Conversão de Lead

### POST /api/leads/:id/convert

Converte lead em contato e/ou oportunidade.

**Permissão:** `Lead.convert`

**Validações:**
- Lead não pode estar convertido (`converted: false`)
- Pelo menos uma opção deve estar marcada (`createContact` ou `createOpportunity`)

**Body:**
```json
{
  "createContact": true,
  "createOpportunity": true,
  "opportunityData": {
    "name": "Negócio ABC",
    "value": 50000.00,
    "currency": "BRL",
    "stageId": "uuid-stage",
    "closeDate": "2024-12-31T00:00:00.000Z",
    "probability": 60
  }
}
```

**Campos:**
- `createContact`: boolean - Se deve criar contato a partir do lead
- `createOpportunity`: boolean - Se deve criar oportunidade
- `opportunityData`: objeto (obrigatório se `createOpportunity: true`)
  - `name`: string (opcional) - Nome da oportunidade (gerado automaticamente se não fornecido)
  - `value`: number (obrigatório) - Valor da oportunidade (deve ser positivo)
  - `currency`: string (opcional, default: "BRL")
  - `stageId`: string (opcional) - UUID do estágio (usa primeiro estágio do pipeline padrão se não fornecido)
  - `closeDate`: string (opcional) - Data de fechamento (deve ser futura ou presente)
  - `probability`: number (opcional, 0-100) - Probabilidade (usa do estágio se não fornecido)

**Processo de Conversão:**

1. **Validações:**
   - Lead existe e não foi convertido
   - Pelo menos uma opção marcada
   - Se `createOpportunity: true`, `value` é obrigatório e positivo

2. **Criação de Contato (se `createContact: true`):**
   - Cria contato com `firstName`, `lastName` do lead
   - Adiciona email do lead (se válido) como email WORK primário
   - Adiciona telefone do lead (se válido) como telefone MOBILE primário
   - Status: ACTIVE

3. **Criação de Oportunidade (se `createOpportunity: true`):**
   - Nome: `opportunityData.name` ou "Oportunidade de {firstName} {lastName}"
   - Estágio: `opportunityData.stageId` ou primeiro estágio do pipeline padrão
   - Associa contato criado (se `createContact: true`)
   - Associa empresa (se encontrada pelo nome do lead)
   - Status: OPEN

4. **Atualização do Lead:**
   - `converted: true`
   - `convertedAt: Date atual`
   - `convertedToContactId: uuid` (se contato criado)
   - `convertedToOpportunityId: uuid` (se oportunidade criada)
   - `status: CONVERTED`

**Resposta 200:**
```json
{
  "lead": {
    "id": "uuid",
    "converted": true,
    "convertedAt": "2024-01-15T10:30:00.000Z",
    "convertedToContactId": "uuid-contact",
    "convertedToOpportunityId": "uuid-opportunity",
    "status": "CONVERTED"
  },
  "contact": {
    "id": "uuid-contact",
    "firstName": "João",
    "lastName": "Silva",
    "email": "joao@example.com"
  },
  "opportunity": {
    "id": "uuid-opportunity",
    "name": "Oportunidade de João Silva",
    "value": 50000.00,
    "stageId": "uuid-stage"
  }
}
```

**Erros:**
- 400: Dados inválidos (value não fornecido ou inválido, closeDate passada)
- 404: Lead não encontrado ou pipeline padrão não encontrado (se stageId não fornecido)
- 409: Lead já foi convertido anteriormente
- 403: Sem permissão

**Notas:**
- Lead pode ser convertido apenas uma vez
- Contato e oportunidade são criados no mesmo tenant do lead
- Se empresa não for encontrada pelo nome, oportunidade é criada sem associação
- Email/telefone inválidos do lead não bloqueiam criação do contato (apenas não são adicionados)

---

## Códigos de Status HTTP

### Sucesso
- `200 OK`: Operação bem-sucedida (GET, PUT, DELETE)
- `201 Created`: Recurso criado (POST)

### Erros do Cliente
- `400 Bad Request`: Dados inválidos (validações falharam)
- `401 Unauthorized`: Não autenticado
- `403 Forbidden`: Sem permissão
- `404 Not Found`: Recurso não encontrado
- `409 Conflict`: Lead já convertido

### Erros do Servidor
- `500 Internal Server Error`: Erro interno do servidor

---

## Exemplos Práticos

### Criar Lead e Converter

```bash
# 1. Criar lead
curl -X POST http://localhost:5000/api/leads \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "João",
    "lastName": "Silva",
    "email": "joao@example.com",
    "phone": "+5511999999999",
    "company": "Empresa ABC",
    "source": "website"
  }'

# 2. Converter lead em contato e oportunidade
curl -X POST http://localhost:5000/api/leads/<lead-id>/convert \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "createContact": true,
    "createOpportunity": true,
    "opportunityData": {
      "value": 50000.00,
      "closeDate": "2024-12-31T00:00:00.000Z"
    }
  }'
```

### Criar Oportunidade com Pipeline

```bash
# 1. Obter pipeline padrão
curl -X GET http://localhost:5000/api/pipelines \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant-id>"

# 2. Criar oportunidade usando stageId do pipeline
curl -X POST http://localhost:5000/api/opportunities \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Negócio ABC",
    "value": 50000.00,
    "stageId": "<stage-id>",
    "contactId": "<contact-id>"
  }'
```
