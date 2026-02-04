# API de Importação de Dados

## Visão Geral

O endpoint de importação permite carregar dados de contatos, empresas, leads e oportunidades a partir de arquivos CSV ou Excel. O processo de importação é dividido em etapas: upload do arquivo, mapeamento de campos e processamento. Requer autenticação e permissão `Import.create`. Os dados são isolados por tenant e sujeitos a validações rigorosas.

### Características

- **Autenticação**: obrigatória (`Authorization: Bearer <token>`)
- **Tenant**: header `X-Tenant-Id` obrigatório
- **Autorização**: permissão `Import.create` (middleware `checkImportPermission`)
- **Formatos**: CSV e Excel (XLSX, XLS)
- **Entidades**: Contact, Company, Lead, Opportunity
- **Validação**: campos obrigatórios, tipos de dados, unicidade, regras de negócio
- **Processamento**: em lotes para melhor performance

---

## Endpoints

### POST /api/import/upload

Recebe um arquivo CSV ou Excel para importação. O arquivo é armazenado temporariamente e um `fileId` é retornado para uso nas próximas etapas.

#### Autenticação

Requerida. Enviar token JWT e tenant:

```
Authorization: Bearer <token>
X-Tenant-Id: <tenant-id>
```

#### Parâmetros de Formulário

| Parâmetro | Tipo   | Obrigatório | Descrição                                |
|-----------|--------|-------------|------------------------------------------|
| `file`    | file   | Sim         | Arquivo CSV ou Excel a ser importado     |

#### Resposta 200 OK

```json
{
  "success": true,
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "contatos.csv",
  "fileSize": 10240,
  "fileType": "csv",
  "rowCount": 100,
  "columns": ["firstName", "lastName", "email", "phone"],
  "timestamp": "2023-10-27T10:00:00.000Z"
}
```

#### Erros

| Código | Condição |
|--------|----------|
| 400    | Arquivo ausente ou inválido |
| 400    | Formato de arquivo não suportado |
| 400    | Arquivo muito grande (>10MB) |
| 401    | Token ausente ou inválido |
| 403    | Sem permissão Import.create ou tenant não autorizado |
| 500    | Erro interno ao processar arquivo |

### POST /api/import/:fileId/map

Define o mapeamento entre as colunas do arquivo e os campos da entidade de destino. Retorna um preview dos dados mapeados para validação.

#### Autenticação

Requerida. Enviar token JWT e tenant:

```
Authorization: Bearer <token>
X-Tenant-Id: <tenant-id>
```

#### Parâmetros de Rota

| Parâmetro | Tipo   | Obrigatório | Descrição                                    |
|-----------|--------|-------------|----------------------------------------------|
| `fileId`  | string | Sim         | ID do arquivo retornado em `/api/import/upload` |

#### Corpo da Requisição

| Campo             | Tipo   | Obrigatório | Descrição                                                                 |
|-------------------|--------|-------------|---------------------------------------------------------------------------|
| `entityType`      | string | Sim         | Entidade de destino: `Contact`, `Company`, `Lead` ou `Opportunity`       |
| `mappings`        | array  | Sim         | Array de objetos de mapeamento (ver abaixo)                              |
| `previewRowCount` | number | Não         | Número de linhas para preview (padrão: 5, máx: 10)                      |

#### Estrutura de `mappings`

| Campo         | Tipo    | Obrigatório | Descrição                                                                 |
|---------------|---------|-------------|---------------------------------------------------------------------------|
| `columnIndex` | number  | Sim         | Índice da coluna no arquivo (0-based)                                     |
| `fieldName`   | string  | Sim         | Nome do campo na entidade de destino                                      |
| `required`    | boolean | Sim         | Indica se o campo é obrigatório                                           |
| `fieldType`   | string  | Não         | Tipo do campo para validação (text, number, date, email, etc.)           |
| `defaultValue`| any     | Não         | Valor padrão se a coluna estiver vazia                                    |
| `transformFn` | string  | Não         | Nome da função de transformação a ser aplicada (toUpperCase, normalizePhone, etc.) |

#### Exemplo de Requisição

```json
{
  "entityType": "Contact",
  "mappings": [
    {
      "columnIndex": 0,
      "fieldName": "firstName",
      "required": true
    },
    {
      "columnIndex": 1,
      "fieldName": "lastName",
      "required": false
    },
    {
      "columnIndex": 2,
      "fieldName": "email",
      "required": false,
      "fieldType": "email"
    },
    {
      "columnIndex": 3,
      "fieldName": "phone",
      "required": false,
      "transformFn": "normalizePhone"
    }
  ],
  "previewRowCount": 5
}
```

#### Resposta 200 OK

```json
{
  "success": true,
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "entityType": "Contact",
  "mappings": [...],
  "preview": {
    "previewRows": [
      {
        "rowIndex": 0,
        "originalData": ["John", "Doe", "john@example.com", "123456789"],
        "mappedData": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "phone": "123456789"
        },
        "errors": [],
        "isValid": true
      }
    ],
    "stats": {
      "totalRows": 5,
      "validRows": 5,
      "invalidRows": 0,
      "errorCount": 0,
      "warningCount": 0,
      "fieldsMapped": 4,
      "fieldsUnmapped": 2,
      "processingTimeMs": 15
    },
    "errors": [],
    "warnings": []
  },
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": []
  },
  "timestamp": "2023-10-27T10:00:00.000Z"
}
```

#### Erros

| Código | Condição |
|--------|----------|
| 400    | `entityType` inválido |
| 400    | `mappings` ausente ou inválido |
| 400    | Mapeamento contém campos inexistentes |
| 400    | Mapeamento contém colunas duplicadas |
| 401    | Token ausente ou inválido |
| 403    | Sem permissão Import.create ou tenant não autorizado |
| 404    | Arquivo não encontrado ou expirado |
| 500    | Erro interno ao processar mapeamento |

### POST /api/import/:fileId/process

Inicia o processamento do arquivo com base no mapeamento fornecido. Retorna imediatamente um `jobId` para acompanhamento assíncrono.

#### Autenticação

Requerida. Enviar token JWT e tenant:

```
Authorization: Bearer <token>
X-Tenant-Id: <tenant-id>
```

#### Parâmetros de Rota

| Parâmetro | Tipo   | Obrigatório | Descrição                                    |
|-----------|--------|-------------|----------------------------------------------|
| `fileId`  | string | Sim         | ID do arquivo retornado em `/api/import/upload` |

#### Corpo da Requisição

| Campo            | Tipo    | Obrigatório | Descrição                                                                 |
|------------------|---------|-------------|---------------------------------------------------------------------------|
| `entityType`     | string  | Sim         | Entidade de destino: `Contact`, `Company`, `Lead` ou `Opportunity`       |
| `mappings`       | array   | Sim         | Array de objetos de mapeamento (mesmo formato do endpoint `/map`)        |
| `options`        | object  | Não         | Opções adicionais de importação (ver abaixo)                            |

#### Estrutura de `options`

| Campo                | Tipo    | Padrão | Descrição                                                                 |
|----------------------|---------|--------|---------------------------------------------------------------------------|
| `skipDuplicates`     | boolean | false  | Ignorar registros duplicados em vez de gerar erro                         |
| `updateExisting`     | boolean | false  | Atualizar registros existentes em vez de gerar erro                       |
| `validateOnly`       | boolean | false  | Apenas validar, não salvar (retorna estatísticas de validação)            |
| `batchSize`          | number  | 100    | Número de registros por lote                                              |
| `continueOnError`    | boolean | true   | Continuar importação mesmo com erros (false interrompe no primeiro erro)  |

#### Exemplo de Requisição

```json
{
  "entityType": "Contact",
  "mappings": [
    {
      "columnIndex": 0,
      "fieldName": "firstName",
      "required": true
    },
    {
      "columnIndex": 1,
      "fieldName": "email",
      "required": false,
      "fieldType": "email"
    }
  ],
  "options": {
    "skipDuplicates": true,
    "batchSize": 50
  }
}
```

#### Resposta 202 Accepted

```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440001",
  "status": "processing",
  "estimatedCompletion": "2023-10-27T10:05:00.000Z",
  "totalRecords": 1000,
  "timestamp": "2023-10-27T10:00:00.000Z"
}
```

#### Erros

| Código | Condição |
|--------|----------|
| 400    | `entityType` ou `mappings` ausente |
| 400    | Mapeamento inválido |
| 401    | Token ausente ou inválido |
| 403    | Sem permissão Import.create ou tenant não autorizado |
| 404    | Arquivo não encontrado ou expirado |
| 500    | Erro interno ao iniciar processamento |

---

## Exemplos de Uso

### 1. Fluxo Completo de Importação

```bash
# Passo 1: Upload do arquivo
curl -X POST /api/import/upload \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant-id>" \
  -F "file=@contatos.csv"

# Resposta: {"success": true, "fileId": "abc123..."}

# Passo 2: Mapeamento de campos
curl -X POST /api/import/abc123/map \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "Contact",
    "mappings": [
      {"columnIndex": 0, "fieldName": "firstName", "required": true},
      {"columnIndex": 1, "fieldName": "email", "required": false, "fieldType": "email"}
    ]
  }'

# Passo 3: Processamento
curl -X POST /api/import/abc123/process \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "Contact",
    "mappings": [
      {"columnIndex": 0, "fieldName": "firstName", "required": true},
      {"columnIndex": 1, "fieldName": "email", "required": false, "fieldType": "email"}
    ],
    "options": {"skipDuplicates": true}
  }'

# Resposta: {"success": true, "jobId": "xyz789...", "status": "processing"}
```

### 2. Importação com Validação Prévia

```bash
# Iniciar processamento com validateOnly=true
curl -X POST /api/import/abc123/process \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "Contact",
    "mappings": [...],
    "options": {"validateOnly": true}
  }'

# Retorna estatísticas de validação sem salvar dados
```

---

## Tipos de Campo Suportados

- `text`: Texto simples
- `number`: Números
- `date`: Data (formatos suportados: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY)
- `datetime`: Data e hora
- `email`: Endereço de email (validação de formato)
- `phone`: Número de telefone (normalização automática)
- `boolean`: Verdadeiro ou falso (true/false, yes/no, sim/não)
- `select`: Campo de seleção única
- `multiselect`: Campo de seleção múltipla
- `currency`: Valor monetário
- `percentage`: Percentual
- `url`: Endereço URL
- `textarea`: Texto longo
- `relationship`: Relacionamento com outra entidade

---

## Funções de Transformação Disponíveis

- `toUpperCase`: Converte texto para maiúsculas
- `toLowerCase`: Converte texto para minúsculas
- `trim`: Remove espaços em branco no início e fim
- `capitalize`: Capitaliza a primeira letra de cada palavra
- `normalizePhone`: Remove caracteres não numéricos de telefones
- `normalizeEmail`: Converte para minúsculas e remove espaços extras
- `parseDate`: Converte string para formato de data
- `formatCurrency`: Formata valor monetário

---

## Validações Realizadas

1. **Validação de parâmetros**: Verifica se todos os parâmetros obrigatórios estão presentes
2. **Validação de acesso**: Verifica se o usuário tem permissão para acessar o arquivo
3. **Validação de campos**: Verifica se os campos especificados existem na entidade
4. **Validação de tipos**: Verifica compatibilidade entre os tipos de campo
5. **Validação de duplicatas**: Verifica campos únicos por tenant
6. **Validação de formato**: Verifica emails, telefones, datas, etc.
7. **Validação de regras de negócio**: Aplica regras específicas por entidade
8. **Validação de relacionamentos**: Verifica integridade referencial

---

## Segurança e Isolamento

- **Isolamento de tenant**: Usuários só podem importar dados para seu próprio tenant
- **Validação de entrada**: Todos os campos são validados para prevenir injeção
- **Controle de acesso**: Requer autenticação e autorização válidas
- **Expiração de arquivos**: Arquivos temporários expiram automaticamente após 1 hora
- **Validação de estrutura**: Verifica a integridade da estrutura de mapeamento
- **Proteção contra ataques**: Validação de tipo e formato de arquivos, sanitização de conteúdo

---

## Referências

- [API-Import-Report](API-Import-Report.md) — relatório detalhado de importação
- [API-Export](API-Export.md) — paridade de documentação (import/export)
- Configuração: `backend/src/config/importConfig.ts` (`MAX_FILE_SIZE`, `BATCH_SIZE`, `EXPIRATION_TIME`)