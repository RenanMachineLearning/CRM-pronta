# Funcionalidade de Importação/Exportação de Dados

## Visão Geral

Este documento descreve a funcionalidade de importação e exportação de dados implementada no CRM SaaS. A funcionalidade permite que os usuários importem dados de contatos, empresas, leads e oportunidades a partir de arquivos CSV e Excel, com validação de campos, mapeamento personalizado e garantia de segurança e isolamento por tenant.

## Componentes do Sistema

### 1. Serviços de Importação

#### `csvImportService.ts`
- Responsável pelo processamento de arquivos CSV e Excel
- Implementa validação de formato e conteúdo
- Gerencia o fluxo de importação em lotes
- Aplica regras de negócio específicas por entidade
- Fornece feedback detalhado sobre o processo de importação

#### `uploadService.ts`
- Gerencia o upload de arquivos temporários
- Implementa validações de segurança para arquivos
- Previne ataques de injeção e conteúdo malicioso
- Armazena arquivos temporariamente com TTL (Time To Live)
- Garante isolamento de tenant para arquivos

### 2. Validadores

#### `importValidator.ts`
- Validação de linhas individuais de importação
- Verificação de campos obrigatórios
- Validação de tipos de dados
- Validação de formatos específicos (email, telefone, etc.)
- Aplica regras de negócio

#### `fieldMapper.ts`
- Mapeamento de colunas do arquivo para campos da entidade
- Converte valores entre diferentes tipos
- Aplica transformações específicas por tipo
- Normaliza dados de entrada

#### `uniquenessValidator.ts`
- Verifica unicidade de campos por tenant
- Implementa cache para resultados de validação
- Previne race conditions em validações concorrentes
- Fornece feedback sobre conflitos de unicidade

#### `businessRuleValidator.ts`
- Aplica regras de negócio específicas por entidade
- Validações complexas que envolvem múltiplos campos
- Verificações de integridade referencial
- Garante consistência de dados

### 3. Tipos e Interfaces

#### `validation.types.ts`
- Define interfaces para erros de validação
- Tipos para resultados de validação
- Códigos de erro padronizados
- Níveis de severidade

## Endpoints da API

### Upload de Arquivo
```
POST /api/import/upload
```
- Requer autenticação e permissão "Import.create"
- Aceita arquivos CSV, XLSX e XLS
- Valida tipo e tamanho do arquivo
- Armazena arquivo temporariamente
- Retorna fileId para processamento

### Validação de Arquivo
```
POST /api/import/validate
```
- Valida formato e conteúdo do arquivo
- Retorna informações sobre colunas e linhas
- Sugere mapeamento de campos com base nos headers
- Retorna preview de dados

### Mapeamento de Campos
```
POST /api/import/:fileId/map
```
- Requer autenticação e permissão "Import.create"
- Recebe: `entityType`, `mappings` (array de mapeamentos)
- Mapeamento: `{ columnIndex, fieldName, required }`
- Valida que campos existem na entidade
- Retorna preview de mapeamento (primeiras 5 linhas)

### Processamento de Importação
```
POST /api/import/process
```
- Processa o arquivo com base no mapeamento fornecido
- Importa dados em lotes para melhor performance
- Retorna estatísticas de importação
- Aplica todas as validações necessárias

## Funcionalidades de Segurança

### Isolamento por Tenant
- Usuários só podem importar dados para seu próprio tenant
- Arquivos temporários são isolados por tenant
- Validações de unicidade respeitam o contexto do tenant
- Permissões são verificadas em cada operação

### Proteção contra Ataques
- Validação de tipo e formato de arquivos
- Sanitização de conteúdo
- Prevenção de injeção de SQL e NoSQL
- Limites de tamanho de payload
- Rate limiting para prevenir abuso

### Validação de Conteúdo
- Verificação de conteúdo malicioso
- Sanitização de valores de entrada
- Validação de formatos específicos
- Controle de acesso baseado em permissões

## Performance e Otimizações

### Cache
- Resultados de validação são cacheados
- Metadados de campos são cacheados
- Consultas de unicidade utilizam cache
- TTL configurável para entradas de cache

### Processamento em Lotes
- Importação dividida em lotes menores
- Limite configurável de linhas por lote
- Processamento paralelo com controle de concorrência
- Feedback contínuo sobre progresso

### Timeouts
- Operações de validação com timeouts configuráveis
- Prevenção de operações longas que travam o sistema
- Tratamento adequado de timeouts com mensagens claras

## Validação de Dados

### Tipos de Validação
- **Campos obrigatórios**: Verifica presença de valores
- **Tipos de campo**: Valida tipos (text, number, date, email, etc.)
- **Formatos específicos**: Valida emails, telefones, datas, etc.
- **Unicidade**: Verifica campos únicos por tenant
- **Regras de negócio**: Validações complexas específicas por entidade
- **Relacionamentos**: Verifica integridade referencial

### Normalização de Valores
- Conversão de tipos (strings para números, datas, booleanos)
- Sanitização de emails (lowercase, trim)
- Normalização de telefones (remoção de caracteres especiais)
- Padronização de datas para formato ISO
- Tratamento de valores booleanos (true/false, yes/no, sim/não)

## Integração com Frontend

### Componente de Importação
- Interface de usuário para upload de arquivos
- Visualização de preview de dados
- Mapeamento visual de campos
- Feedback de erros e progresso
- Validação em tempo real

### Fluxo de Usuário
1. Upload de arquivo CSV/Excel
2. Validação de formato e conteúdo
3. Mapeamento de campos para entidade
4. Validação de dados com preview
5. Confirmação e processamento
6. Feedback de resultados

## Testes e Qualidade

### Testes Unitários
- Validação de tipos de campos
- Conversão e normalização de valores
- Mapeamento de campos
- Regras de negócio

### Testes de Integração
- Fluxo completo de importação
- Isolamento por tenant
- Segurança e permissões
- Performance com grandes volumes

### Testes de Segurança
- Acesso não autorizado
- Cross-tenant data access
- Injeção de conteúdo malicioso
- Validação de bypass

## Configurações e Limites

### Limites de Proteção
- Tamanho máximo de arquivo: 10MB
- Número máximo de linhas por lote: 1000
- Tempo máximo de validação: 30 segundos
- TTL de arquivos temporários: 1 hora
- Limite de rate limiting: 100 requisições por minuto

### Configurações de Performance
- Tamanho de lote configurável
- TTL de cache configurável
- Timeouts configuráveis
- Limite de concorrência

## Mensagens de Erro

Todas as mensagens de erro são fornecidas em português com contexto claro:
- Campo específico que causou o erro
- Tipo de erro (obrigatório, tipo inválido, formato incorreto, etc.)
- Valor que causou o erro
- Detalhes adicionais quando aplicável

## Monitoramento e Logging

- Logs estruturados para todas as operações
- Métricas de performance
- Contadores de sucesso/erro
- Identificação de contexto (tenant, usuário, entidade)
- Rastreamento de operações com correlation IDs

## Considerações de Produção

### Escalabilidade
- Processamento em lotes para grandes volumes
- Cache para reduzir carga no banco de dados
- Operações assíncronas para uploads grandes
- Pool de conexões configurável

### Resiliência
- Tratamento de erros com fallbacks
- Validação de schema para prevenir falhas
- Timeouts para prevenir operações longas
- Recuperação de falhas parciais

### Manutenibilidade
- Código modular e bem documentado
- Separação clara de responsabilidades
- Tipagem rigorosa com TypeScript
- Testes abrangentes para todas as funcionalidades