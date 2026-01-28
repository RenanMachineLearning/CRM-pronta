# API de Relatório de Importação

## Visão Geral

O endpoint de relatório de importação retorna o resultado detalhado de uma importação (job assíncrono), com erros agrupados por linha, avisos e, opcionalmente, resumo de erros por código/severidade/campo e métricas de performance. Requer autenticação e garante isolamento por tenant e por usuário.

### Características

- **Autenticação**: obrigatória (`Authorization: Bearer <token>`)
- **Tenant**: header `X-Tenant-Id` obrigatório
- **Autorização**: apenas o usuário que disparou a importação (do mesmo tenant) pode ver o relatório
- **Cache**: relatórios em cache por 5 minutos para reduzir carga
- **Paginação**: parâmetros `page` e `limit` para grandes volumes de erros

---

## Endpoint

### GET /api/import/:importId/report

Retorna o relatório completo de uma importação. O `importId` deve ser o `jobId` retornado quando a importação foi iniciada em modo assíncrono (ex.: `POST /api/import/:fileId/process` com resposta 202).

#### Autenticação

Requerida. Enviar token JWT no header:

```
Authorization: Bearer <token>
X-Tenant-Id: <tenant-id>
```

#### Parâmetros de Rota

| Parâmetro  | Tipo   | Obrigatório | Descrição                                      |
|------------|--------|-------------|------------------------------------------------|
| `importId` | string | Sim         | ID do job de importação (UUID retornado em 202) |

#### Parâmetros de Query

| Parâmetro               | Tipo    | Padrão | Descrição                                                                 |
|-------------------------|---------|--------|-----------------------------------------------------------------------------|
| `page`                  | number  | 1      | Página da lista de erros (usado junto com `limit`)                          |
| `limit`                 | number  | 0      | Máximo de linhas com erro por página (0 = todas; máx. 500)                  |
| `includeErrorSummary`   | boolean | false  | Incluir agregação de erros por código, severidade e campo                   |
| `includePerformanceMetrics` | boolean | false  | Incluir métricas (processingTimeMs, recordsPerSecond, successRate, errorRate) |

#### Resposta 200 OK

Corpo mínimo (spec itens 154-171):

```json
{
  "importId": "550e8400-e29b-41d4-a716-446655440000",
  "totalRows": 100,
  "successCount": 95,
  "errorCount": 5,
  "errors": [
    { "row": 3, "errors": [{ "code": "VALIDATION_ERROR", "message": "Email inválido", "field": "email", "severity": "error" }] },
    { "row": 7, "errors": [{ "code": "DUPLICATE_KEY", "message": "Registro duplicado", "severity": "error" }] }
  ],
  "warnings": [
    { "row": 2, "code": "WARN_DEFAULT", "message": "Campo vazio assumido como null" }
  ],
  "skippedCount": 0,
  "duplicateCount": 0,
  "processedCount": 100,
  "processingTime": 2500,
  "status": "partial"
}
```

Com `includeErrorSummary=true`:

```json
{
  "importId": "...",
  "totalRows": 100,
  "successCount": 95,
  "errorCount": 5,
  "errors": [ ... ],
  "warnings": [ ... ],
  "errorSummary": {
    "byCode": [
      { "code": "VALIDATION_ERROR", "count": 3, "severity": "error" },
      { "code": "DUPLICATE_KEY", "count": 2, "severity": "error" }
    ],
    "bySeverity": [ { "severity": "error", "count": 5 } ],
    "byField": [
      { "field": "email", "count": 3 },
      { "field": "(sem campo)", "count": 2 }
    ],
    "total": 5
  }
}
```

Com `includePerformanceMetrics=true`:

```json
{
  "importId": "...",
  "totalRows": 100,
  "successCount": 95,
  "errorCount": 5,
  "errors": [ ... ],
  "warnings": [ ... ],
  "performanceMetrics": {
    "processingTimeMs": 2500,
    "recordsPerSecond": 40,
    "successRate": 0.95,
    "errorRate": 0.05,
    "totalProcessed": 100
  }
}
```

Com paginação (`page=1&limit=10`):

```json
{
  "importId": "...",
  "totalRows": 1000,
  "successCount": 980,
  "errorCount": 20,
  "errors": [ ... ],
  "warnings": [ ... ],
  "pagination": { "page": 1, "limit": 10, "total": 20 }
}
```

#### Erros

| Código | Condição |
|--------|----------|
| 400    | `importId` ausente |
| 401    | Token ausente ou inválido |
| 403    | Relatório pertence a outro tenant ou outro usuário |
| 404    | Job não encontrado ou `result` ainda não disponível (job em processamento) |
| 500    | Erro interno |

Exemplo 404:

```json
{
  "error": "Relatório não disponível",
  "message": "O relatório ainda não foi gerado para esta importação (job em processamento ou sem resultado)"
}
```

Exemplo 403:

```json
{
  "error": "Acesso negado",
  "message": "Você não tem permissão para acessar este relatório (tenant)"
}
```

---

## Casos de Uso

1. **Pós-importação assíncrona**: Após receber `jobId` em `POST .../process` (202), o front chama `GET /api/import/:jobId/report` para exibir totais, erros por linha e avisos.
2. **Grandes volumes**: Usar `?page=1&limit=50` para não trazer milhares de linhas com erro de uma vez.
3. **Dashboard/relatórios**: Usar `?includeErrorSummary=true&includePerformanceMetrics=true` para gráficos e totais por tipo de erro e desempenho.

---

## Isolamento e Cache

- **Tenant**: Só é retornado relatório de job do mesmo `tenantId` do header.
- **Usuário**: Só é retornado relatório de job do mesmo `userId` do token.
- **Cache**: Respostas são cacheadas em memória por 5 minutos por chave `importId:page:limit:includeErrorSummary:includePerformanceMetrics`. Dados sensíveis permanecem restritos ao mesmo usuário/tenant.
