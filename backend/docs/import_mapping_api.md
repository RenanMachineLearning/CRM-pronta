# Documentação da API de Mapeamento de Importação

## Visão Geral

A API de mapeamento de importação permite aos usuários mapear colunas de arquivos CSV/Excel para campos de entidades do CRM. Esta funcionalidade faz parte do processo de importação de dados e permite que os usuários definam como os dados do arquivo devem ser associados aos campos da entidade de destino.

## Endpoints

### POST `/api/import/:fileId/map`

Realiza o mapeamento de campos entre as colunas do arquivo e os campos da entidade especificada.

#### Headers Requeridos

- `X-Tenant-Id`: ID do tenant do usuário
- `Authorization`: Token de autorização JWT

#### Parâmetros de URL

- `fileId` (string, obrigatório): ID do arquivo temporário carregado previamente

#### Corpo da Requisição

- `entityType` (string, obrigatório): Tipo da entidade de destino (Contact, Company, Lead, Opportunity, etc.)
- `mappings` (array, obrigatório): Array de objetos de mapeamento
  - `columnIndex` (number, obrigatório): Índice da coluna no arquivo (0-based)
  - `fieldName` (string, obrigatório): Nome do campo na entidade de destino
  - `required` (boolean, obrigatório): Indica se o campo é obrigatório
  - `fieldType` (string, opcional): Tipo do campo para validação
  - `defaultValue` (any, opcional): Valor padrão se a coluna estiver vazia
  - `transformFn` (string, opcional): Nome da função de transformação a ser aplicada
- `previewRowCount` (number, opcional): Número de linhas para preview (padrão: 5)

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

#### Resposta de Sucesso (200 OK)

```json
{
  "success": true,
  "fileId": "abc123...",
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

#### Resposta de Erro (400 Bad Request)

```json
{
  "error": "Mapeamento inválido",
  "message": "Os mapeamentos fornecidos contêm erros",
  "details": [
    {
      "type": "FIELD_NOT_FOUND",
      "severity": "error",
      "field": "nonexistentField",
      "message": "Campo \"nonexistentField\" não encontrado na entidade \"Contact\"",
      "details": {
        "availableFields": ["firstName", "lastName", "email", "..."]
      }
    }
  ]
}
```

#### Resposta de Erro (404 Not Found)

```json
{
  "error": "Arquivo não encontrado",
  "message": "O arquivo especificado não existe ou expirou"
}
```

#### Resposta de Erro (403 Forbidden)

```json
{
  "error": "Acesso negado",
  "message": "Você não tem permissão para acessar este arquivo"
}
```

## Tipos de Campo Suportados

- `text`: Texto simples
- `number`: Números
- `date`: Data
- `datetime`: Data e hora
- `email`: Endereço de email
- `phone`: Número de telefone
- `boolean`: Verdadeiro ou falso
- `select`: Campo de seleção única
- `multiselect`: Campo de seleção múltipla
- `currency`: Valor monetário
- `percentage`: Percentual
- `url`: Endereço URL
- `textarea`: Texto longo
- `relationship`: Relacionamento com outra entidade

## Funções de Transformação Disponíveis

- `toUpperCase`: Converte texto para maiúsculas
- `toLowerCase`: Converte texto para minúsculas
- `trim`: Remove espaços em branco no início e fim
- `capitalize`: Capitaliza a primeira letra de cada palavra
- `normalizePhone`: Remove caracteres não numéricos
- `normalizeEmail`: Converte para minúsculas e remove espaços

## Validações Realizadas

1. **Validação de parâmetros**: Verifica se todos os parâmetros obrigatórios estão presentes
2. **Validação de acesso**: Verifica se o usuário tem permissão para acessar o arquivo
3. **Validação de campos**: Verifica se os campos especificados existem na entidade
4. **Validação de tipos**: Verifica compatibilidade entre os tipos de campo
5. **Validação de duplicatas**: Verifica se colunas ou campos estão sendo mapeados múltiplas vezes
6. **Validação com dados reais**: Verifica os mapeamentos com as primeiras linhas do arquivo

## Segurança

- **Isolamento de tenant**: Usuários só podem acessar arquivos do próprio tenant
- **Validação de entrada**: Todos os campos são validados para prevenir injeção
- **Controle de acesso**: Requer autenticação e autorização válidas
- **Expiração de arquivos**: Arquivos temporários expiram automaticamente
- **Validação de estrutura**: Verifica a integridade da estrutura de mapeamento

## Limites e Restrições

- Arquivos temporários expiram após 1 hora por padrão
- O preview é limitado a 5 linhas por padrão (configurável)
- Tipos de arquivo suportados: CSV, XLSX, XLS
- Tamanho máximo de arquivo: 10MB
- Limite de rate para prevenir abuso

## Exemplos de Uso

### Mapeamento Simples de Contatos

```javascript
fetch('/api/import/abc123/map', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-Id': 'tenant123',
    'Authorization': 'Bearer jwt-token-here'
  },
  body: JSON.stringify({
    entityType: 'Contact',
    mappings: [
      { columnIndex: 0, fieldName: 'firstName', required: true },
      { columnIndex: 1, fieldName: 'lastName', required: false },
      { columnIndex: 2, fieldName: 'email', required: false, fieldType: 'email' }
    ],
    previewRowCount: 3
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

### Mapeamento com Transformações

```javascript
fetch('/api/import/def456/map', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-Id': 'tenant123',
    'Authorization': 'Bearer jwt-token-here'
  },
  body: JSON.stringify({
    entityType: 'Contact',
    mappings: [
      { 
        columnIndex: 0, 
        fieldName: 'firstName', 
        required: true,
        transformFn: 'capitalize'
      },
      { 
        columnIndex: 1, 
        fieldName: 'phone', 
        required: false,
        transformFn: 'normalizePhone'
      }
    ]
  })
})
.then(response => response.json())
.then(data => console.log(data));
```