# API de Exportação de Dados

## Visão Geral

O endpoint de exportação permite baixar registros das entidades do CRM em formatos CSV ou Excel, com filtros avançados e seleção de campos. Requer autenticação e permissão `Export.create`. Os dados são isolados por tenant e sujeitos a limite máximo de registros por requisição.

### Características

- **Autenticação**: obrigatória (`Authorization: Bearer <token>`)
- **Tenant**: header `X-Tenant-Id` obrigatório
- **Autorização**: permissão `Export.create` (middleware `checkExportPermission`)
- **Formatos**: CSV e Excel (XLSX)
- **Entidades**: Contact, Company, Lead, Opportunity
- **Limite**: até 10.000 registros por exportação (configurável em `EXPORT_CONFIG.LIMIT_EXPORT`)

---

## Endpoint

### GET /api/export/:entityType

Gera um arquivo para download com os registros da entidade indicada, aplicando filtros e incluindo apenas os campos solicitados.

#### Autenticação

Requerida. Enviar token JWT e tenant:

```
Authorization: Bearer <token>
X-Tenant-Id: <tenant-id>
```

#### Parâmetros de Rota

| Parâmetro   | Tipo   | Obrigatório | Descrição                                                       |
|-------------|--------|-------------|------------------------------------------------------------------|
| `entityType`| string | Sim         | Entidade a exportar: `Contact`, `Company`, `Lead` ou `Opportunity` |

#### Parâmetros de Query

| Parâmetro | Tipo   | Obrigatório | Descrição                                                                 |
|-----------|--------|-------------|----------------------------------------------------------------------------|
| `format`  | string | Não         | Formato do arquivo: `csv` ou `excel`. Padrão: `csv`                        |
| `fields`  | string ou array | Sim | Campos a incluir. Pode ser string separada por vírgula (`id,firstName,lastName`) ou `fields[]=id&fields[]=firstName` |
| `filters` | string | Não         | JSON array de filtros avançados (mesmo formato da [API-Busca-Filtros](API-Busca-Filtros.md)) |
| `q`       | string | Não         | Busca textual (quando suportado pela entidade)                             |
| `status`  | string | Não         | Filtro rápido por status (depende da entidade)                             |
| Outros    | —      | Não         | Parâmetros específicos da entidade: `companyId`, `tagId`, `industry`, `size`, `source`, `converted`, `stageId`, `contactId` |

#### Formato dos filtros

O parâmetro `filters` deve ser uma **string JSON** com array de objetos no padrão da Etapa 8 / [API-Busca-Filtros](API-Busca-Filtros.md):

```json
[
  { "field": "status", "operator": "equals", "value": "ACTIVE" },
  { "field": "firstName", "operator": "contains", "value": "Silva" }
]
```

Operadores disponíveis: `equals`, `notEquals`, `contains`, `notContains`, `greaterThan`, `lessThan`, `greaterThanOrEqual`, `lessThanOrEqual`, `between`, `in`, `notIn`, `isNull`, `isNotNull`.

#### Campos com path (relacionamentos)

É possível exportar campos de relacionamentos usando notação de path, por exemplo: `company.name`, `contact.email`. O controller utiliza `getByPath` para extrair o valor do objeto retornado pelo service.

#### Resposta 200 OK

Corpo é o **arquivo binário** (CSV ou XLSX). Headers:

| Header              | Valor                                                                 |
|---------------------|-----------------------------------------------------------------------|
| `Content-Disposition` | `attachment; filename="export-{entityType}-{timestamp}.csv"` ou `.xlsx` |
| `Content-Type`      | `text/csv; charset=utf-8` ou `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

Nome do arquivo: `export-{entityType}-{Date.now()}.csv` ou `.xlsx`.

#### Erros

| Código | Condição |
|--------|----------|
| 400    | `entityType` inválido (não está em Contact, Company, Lead, Opportunity) |
| 400    | `format` inválido (não é csv ou excel) |
| 400    | `fields` ausente ou vazio |
| 400    | `filters` presente mas não é JSON válido ou não é array |
| 401    | Token ausente ou inválido |
| 403    | Sem permissão Export.create ou tenant não autorizado |
| 500    | Erro interno ao gerar arquivo |

Exemplo 400 (entityType inválido):

```json
{
  "error": "entityType inválido",
  "message": "Deve ser um de: Contact, Company, Lead, Opportunity"
}
```

Exemplo 400 (fields vazio):

```json
{
  "error": "fields obrigatório",
  "message": "Informe ao menos um campo em fields[]"
}
```

---

## Exemplos de Uso

### 1. Exportar contatos em CSV (campos básicos)

```bash
GET /api/export/Contact?format=csv&fields=id,firstName,lastName,email
Authorization: Bearer <token>
X-Tenant-Id: <tenant-id>
```

### 2. Exportar contatos em Excel com filtro de status

```bash
GET /api/export/Contact?format=excel&fields=id,firstName,lastName&filters=[{"field":"status","operator":"equals","value":"ACTIVE"}]
Authorization: Bearer <token>
X-Tenant-Id: <tenant-id>
```

### 3. Exportar oportunidades com campo de relacionamento

```bash
GET /api/export/Opportunity?format=csv&fields=id,title,value,status,company.name
Authorization: Bearer <token>
X-Tenant-Id: <tenant-id>
```

### 4. Exportar leads com busca textual e filtro

```bash
GET /api/export/Lead?format=csv&fields=id,title,status,source&q=maria&filters=[{"field":"status","operator":"in","value":["NEW","CONTACTED"]}]
Authorization: Bearer <token>
X-Tenant-Id: <tenant-id>
```

---

## Limites e Segurança

- **Limite de registros**: Máximo de 10.000 registros por exportação (`EXPORT_CONFIG.LIMIT_EXPORT`). Acima disso a lista é truncada internamente (paginação interna usa `page: 1`, `limit: LIMIT_EXPORT`).
- **Permissão**: A rota usa o middleware `checkExportPermission`, que exige usuário autenticado e, em implementação completa, permissão `Export.create` via ACL.
- **Isolamento**: Apenas dados do `tenantId` do header e respeitando ACL/regras do usuário são retornados (via services de listagem).

---

## Referências

- [API-Busca-Filtros](API-Busca-Filtros.md) — formato dos filtros avançados e operadores.
- [API-Import-Report](API-Import-Report.md) — paridade de documentação (import/export).
- Configuração: `backend/src/config/exportConfig.ts` (`LIMIT_EXPORT`, `ENTITY_TYPES`, `FORMATS`).
