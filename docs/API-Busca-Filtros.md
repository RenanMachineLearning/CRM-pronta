# API Busca e Filtros - Documentação Técnica

## Visão Geral

Sistema completo de busca global, filtros avançados, ordenação e paginação para todas as entidades do CRM. A busca é tolerante a diacríticos (acentos), case-insensitive e suporta múltiplas entidades simultaneamente.

**Características:**
- Busca global em múltiplas entidades (Contact, Company, Lead, Opportunity)
- 13 operadores de filtro avançado (equals, contains, greaterThan, between, etc.)
- Ordenação por múltiplos campos
- Paginação com page/limit (suporte a offset legado)
- Performance otimizada com limites e timeouts
- Isolamento multi-tenant automático

---

## Busca Global

### GET /api/search

Busca simultânea em múltiplas entidades com resultados agrupados e ordenados por relevância.

**Permissão:** Requer autenticação (qualquer entidade com permissão `read`)

**Query params:**
- `q` (obrigatório): Termo de busca (máx. 500 caracteres)
- `entities[]` (opcional): Filtrar por entidades específicas (`contact`, `company`, `lead`, `opportunity`)
- `limit` (opcional, default: 10, máx: 100): Limite de resultados por entidade

**Exemplo:**
```bash
GET /api/search?q=joão&entities[]=contact&entities[]=company&limit=20
```

**Resposta 200:**
```json
{
  "query": "joão",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "results": {
    "contacts": [
      {
        "id": "uuid",
        "tenantId": "uuid",
        "type": "contact",
        "score": 0.95,
        "snippet": {
          "field": "firstName",
          "text": "...<mark>João</mark> Silva é gerente...",
          "position": 0
        },
        "data": {
          "id": "uuid",
          "firstName": "João",
          "lastName": "Silva",
          "status": "ACTIVE"
        }
      }
    ],
    "companies": [],
    "leads": [],
    "opportunities": []
  },
  "totals": {
    "contacts": 15,
    "companies": 0,
    "leads": 0,
    "opportunities": 0
  }
}
```

**Erros:**
- `400`: Query vazia ou muito longa (> 500 caracteres)
- `400`: Entidade inválida em `entities[]`
- `401`: Não autenticado
- `500`: Erro interno

**Notas:**
- Busca é case-insensitive e tolerante a diacríticos (busca "jose" encontra "José")
- Resultados são ordenados por relevância (score)
- Limite máximo de 100 resultados por entidade

---

## Busca por Entidade

Todas as rotas de listagem suportam busca textual via parâmetro `q`:

**Exemplos:**
```bash
GET /api/contacts?q=joão
GET /api/companies?q=tech
GET /api/leads?q=maria
GET /api/opportunities?q=projeto
```

A busca combina com filtros e ordenação usando operador AND.

---

## Filtros Avançados

Filtros avançados permitem consultas complexas usando 13 operadores diferentes.

### Formato

Filtros são enviados como JSON string no query param `filters`:

```bash
GET /api/contacts?filters=[{"field":"status","operator":"equals","value":"ACTIVE"}]
```

### Operadores Disponíveis

| Operador | Descrição | Tipos Suportados | Exemplo |
|----------|-----------|------------------|---------|
| `equals` | Igual a | string, number, date, enum | `{"field":"status","operator":"equals","value":"ACTIVE"}` |
| `notEquals` | Diferente de | string, number, date, enum | `{"field":"status","operator":"notEquals","value":"INACTIVE"}` |
| `contains` | Contém texto | string | `{"field":"firstName","operator":"contains","value":"joão"}` |
| `notContains` | Não contém texto | string | `{"field":"firstName","operator":"notContains","value":"test"}` |
| `greaterThan` | Maior que | number, date | `{"field":"value","operator":"greaterThan","value":1000}` |
| `lessThan` | Menor que | number, date | `{"field":"value","operator":"lessThan","value":5000}` |
| `greaterThanOrEqual` | Maior ou igual | number, date | `{"field":"createdAt","operator":"greaterThanOrEqual","value":"2024-01-01"}` |
| `lessThanOrEqual` | Menor ou igual | number, date | `{"field":"createdAt","operator":"lessThanOrEqual","value":"2024-12-31"}` |
| `between` | Entre valores | number, date | `{"field":"value","operator":"between","value":[1000,5000]}` |
| `in` | Está na lista | string, number, enum | `{"field":"status","operator":"in","value":["ACTIVE","INACTIVE"]}` |
| `notIn` | Não está na lista | string, number, enum | `{"field":"status","operator":"notIn","value":["ARCHIVED"]}` |
| `isNull` | É nulo | qualquer | `{"field":"companyId","operator":"isNull"}` |
| `isNotNull` | Não é nulo | qualquer | `{"field":"companyId","operator":"isNotNull"}` |

### Exemplos Práticos

**1. Múltiplos filtros (AND):**
```bash
GET /api/contacts?filters=[
  {"field":"status","operator":"equals","value":"ACTIVE"},
  {"field":"firstName","operator":"contains","value":"joão"}
]
```

**2. Filtro em relacionamento:**
```bash
GET /api/contacts?filters=[
  {"field":"tags.name","operator":"equals","value":"VIP"}
]
```

**3. Filtro de data:**
```bash
GET /api/opportunities?filters=[
  {"field":"createdAt","operator":"greaterThan","value":"2024-01-01"}
]
```

**4. Filtro numérico:**
```bash
GET /api/opportunities?filters=[
  {"field":"value","operator":"between","value":[10000,50000]}
]
```

**Erros:**
- `400`: Campo inválido ou não filtrável
- `400`: Operador inválido para tipo do campo
- `400`: JSON inválido
- `400`: Valor inválido (ex: array para operador que não aceita)

---

## Ordenação

Ordenação por um ou múltiplos campos usando parâmetros `sortBy` e `sortOrder`.

### Parâmetros

- `sortBy` (opcional): Campo(s) para ordenar (string ou array)
- `sortOrder` (opcional): Direção da ordenação - `asc` ou `desc` (string ou array)

**Prioridade:** `sortBy`/`sortOrder` (novo) sobre `orderBy`/`order` (legado)

### Exemplos

**Ordenação simples:**
```bash
GET /api/contacts?sortBy=firstName&sortOrder=asc
```

**Ordenação múltipla:**
```bash
GET /api/contacts?sortBy=firstName,lastName&sortOrder=asc,asc
```

**Com filtros e busca:**
```bash
GET /api/contacts?q=joão&filters=[...]&sortBy=createdAt&sortOrder=desc
```

**Campos ordenáveis por entidade:**
- **Contact**: `firstName`, `lastName`, `status`, `createdAt`, `updatedAt`
- **Company**: `name`, `industry`, `status`, `createdAt`
- **Lead**: `firstName`, `lastName`, `status`, `createdAt`
- **Opportunity**: `name`, `value`, `status`, `createdAt`, `closeDate`

---

## Paginação

Paginação usando `page` e `limit` (suporte a `offset` para compatibilidade).

### Parâmetros

- `page` (opcional, default: 1): Número da página (≥ 1)
- `limit` (opcional, default: 20, máx: 100): Itens por página
- `offset` (legado): Alternativa a `page` (mantido para compatibilidade)

### Estrutura de Resposta

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "offset": 0
  }
}
```

### Exemplos

**Página específica:**
```bash
GET /api/contacts?page=2&limit=10
```

**Com filtros e ordenação:**
```bash
GET /api/contacts?filters=[...]&sortBy=firstName&page=1&limit=20
```

**Erros:**
- `400`: `page` < 1 ou não numérico
- `400`: `limit` < 1, > 100 ou não numérico

---

## Combinação de Recursos

Todos os recursos podem ser combinados:

```bash
GET /api/contacts?q=joão&filters=[
  {"field":"status","operator":"equals","value":"ACTIVE"},
  {"field":"companyId","operator":"isNotNull"}
]&sortBy=firstName,lastName&sortOrder=asc,asc&page=1&limit=20
```

**Ordem de aplicação:**
1. Filtros simples (status, companyId, etc.) - têm prioridade
2. Filtros avançados (JSON)
3. Busca textual (`q`) - combina com AND
4. Ordenação
5. Paginação

---

## Performance e Limites

### Limites de Resultados

- **Busca global**: Máx. 100 resultados por entidade
- **Listagem**: Máx. 100 itens por página (`limit`)
- **Busca textual**: Máx. 500 caracteres no termo (`q`)

### Timeouts

- **Busca**: 5 segundos
- **Listagem**: 5 segundos
- **Queries**: 5 segundos (timeout automático)

### Índices Recomendados

Para melhor performance, garantir índices em:
- `tenantId` (todas as entidades)
- Campos de busca frequente (`firstName`, `lastName`, `name`, `email`)
- Campos de filtro comum (`status`, `companyId`)
- Campos de ordenação (`createdAt`, `updatedAt`)

### Cache

Resultados de busca e listagem são cacheados por 5 minutos (300s). Cache é invalidado automaticamente após operações CRUD.

---

## Referências

- **Etapa 08**: `docs/v1/fases/Etapa-08-Busca-Filtros.md`
- **Testes**: `backend/tests/README.md`
- **Outras APIs**: `docs/API-Contatos-Empresas.md`, `docs/API-Leads-Oportunidades.md`
