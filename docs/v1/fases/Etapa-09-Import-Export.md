# Etapa 9 — Importação e Exportação de Dados

> **Dependências**: Etapas 5, 6, 7 (Entidades core) ✅, Etapa 8 (Filtros) ✅  
> **Stack**: Node.js + TypeScript, PostgreSQL, Prisma, React + TypeScript  
> **Referência**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`

## Objetivo da Etapa

Implementar importação de dados (CSV/Excel) e exportação (CSV), com validação e mapeamento de campos. Importação precisa mapear para campos já existentes. Exportação pode usar filtros da Etapa 8.

---

## Checklist de Implementação

### 1. Processamento de Arquivos CSV

#### Backend (Bibliotecas)
- [x] Instalar biblioteca de parsing CSV
  - [x] `npm install csv-parse` ou `papaparse`
  - [x] Instalar tipos: `npm install -D @types/papaparse`

- [x] Criar helper `parseCSV(file)`
  - [x] Receber arquivo (buffer ou stream)
  - [x] Parsear CSV
  - [x] Retornar array de objetos (linhas)
  - [x] Tratar encoding (UTF-8, ISO-8859-1)
  - [x] Tratar delimitadores (vírgula, ponto-e-vírgula)

#### Validação
- [x] Teste: parsear CSV simples funciona
- [x] Teste: parsear CSV com encoding diferente funciona
- [x] Teste: parsear CSV com delimitador diferente funciona

---

### 2. Processamento de Arquivos Excel

#### Backend (Bibliotecas)
- [x] Instalar biblioteca de parsing Excel
  - [x] `npm install xlsx` ou `exceljs`
  - [x] Instalar tipos: `npm install -D @types/xlsx`

- [x] Criar helper `parseExcel(file)`
  - [x] Receber arquivo (buffer)
  - [x] Parsear Excel (XLSX, XLS)
  - [x] Retornar array de objetos (linhas)
  - [x] Tratar múltiplas planilhas (usar primeira por padrão)

#### Validação
- [x] Teste: parsear Excel XLSX funciona
- [x] Teste: parsear Excel XLS funciona
- [x] Teste: parsear múltiplas planilhas funciona

---

### 3. Upload de Arquivos

#### Backend (Rotas e Middleware)
- [x] Instalar middleware de upload
  - [x] `npm install multer` (se usar Express)
  - [x] Ou usar `@fastify/multipart` (se usar Fastify)

- [x] Criar rota `POST /api/import/upload`
  - [x] Requer autenticação e permissão "Import.create"
  - [x] Receber arquivo via multipart/form-data
  - [x] Validar tipo de arquivo (CSV, XLSX, XLS)
  - [x] Validar tamanho máximo (ex: 10MB)
  - [x] Salvar arquivo temporariamente
  - [x] Retornar `fileId` para processamento

#### Validação
- [x] Teste: upload de CSV funciona
- [x] Teste: upload de Excel funciona
- [x] Teste: arquivo muito grande é rejeitado
- [x] Teste: tipo de arquivo inválido é rejeitado

---

### 4. Mapeamento de Campos

#### Backend (Rotas)
- [x] Criar rota `POST /api/import/:fileId/map`
  - [x] Requer autenticação
  - [x] Receber: `entityType` (Contact, Company, etc.), `mappings` (array de mapeamentos)
  - [x] Mapeamento: `{ columnIndex, fieldName, required }`
  - [x] Validar que campos existem na entidade
  - [x] Retornar preview de mapeamento (primeiras 5 linhas)

- [x] Criar helper `mapFieldsToEntity(rows, mappings, entityType)`
  - [x] Mapear colunas do CSV/Excel para campos da entidade
  - [x] Validar tipos de campo
  - [x] Retornar dados mapeados

#### Validação
- [x] Teste: mapeamento de campos funciona
- [x] Teste: campos inválidos são rejeitados
- [x] Teste: preview de mapeamento funciona

---

### 5. Validação de Dados

#### Backend (Validadores)
- [x] Criar validador `validateImportRow(row, entityType, fields)`
  - [x] Validar campos obrigatórios
  - [x] Validar tipos de campo (text, number, date, email, etc.)
  - [x] Validar formatos (email, telefone, data)
  - [x] Validar unicidade (se campo marcado como único)
  - [x] Retornar array de erros

- [x] Criar helper `normalizeValue(value, fieldType)`
  - [x] Converter string para número (se tipo number)
  - [x] Converter string para data (se tipo date)
  - [x] Normalizar email (lowercase, trim)
  - [x] Normalizar telefone (remover caracteres especiais)

#### Validação
- [x] Teste: validação de campos obrigatórios funciona
- [x] Teste: validação de tipos funciona
- [x] Teste: validação de formatos funciona
- [x] Teste: normalização de valores funciona

---

### 6. Processamento em Lote

#### Backend (Lógica)
- [x] Decidir estratégia de processamento
  - [x] **Opção A**: Síncrono (processar tudo de uma vez)
  - [x] **Opção B**: Assíncrono (job em background)
  - [x] **Recomendação V1**: Síncrono para arquivos pequenos (< 1000 linhas), assíncrono para maiores

- [x] Criar rota `POST /api/import/:fileId/process`
  - [x] Requer autenticação
  - [x] Receber: `entityType`, `mappings`, `options` (skipErrors, updateExisting)
  - [x] Processar arquivo linha por linha
  - [x] Validar cada linha
  - [x] Criar/atualizar registros
  - [x] Retornar relatório: `{ total, success, errors: [] }`

- [x] Criar helper `processImportBatch(rows, mappings, entityType, tenantId)`
  - [x] Processar em lotes (ex: 100 registros por vez)
  - [x] Validar e criar registros
  - [x] Coletar erros
  - [x] Retornar estatísticas

#### Validação
- [x] Teste: processamento síncrono funciona
- [x] Teste: processamento em lote funciona
- [x] Teste: erros são coletados corretamente

---

### 7. Relatórios de Erro e Estatísticas

#### Backend (Lógica)
- [x] Criar estrutura de relatório
  - [x] `totalRows`: total de linhas processadas
  - [x] `successCount`: linhas importadas com sucesso
  - [x] `errorCount`: linhas com erro
  - [x] `errors`: array de erros `{ row, errors: [] }`
  - [x] `warnings`: array de avisos

- [x] Criar rota `GET /api/import/:importId/report`
  - [x] Requer autenticação
  - [x] Retornar relatório completo de importação
  - [x] Incluir erros detalhados por linha

#### Validação
- [x] Teste: relatório de importação funciona
- [x] Teste: erros são reportados corretamente

---

### 8. Exportação de Dados

#### Backend (Rotas)
- [x] Criar rota `GET /api/export/:entityType`
  - [x] Requer autenticação e permissão "Export.create"
  - [x] Receber: `format` (CSV, Excel), `fields[]` (campos a exportar), `filters[]` (filtros da Etapa 8)
  - [x] Buscar registros com filtros aplicados
  - [x] Selecionar apenas campos solicitados
  - [x] Gerar arquivo CSV/Excel
  - [x] Retornar arquivo para download

- [x] Criar helper `generateCSV(data, fields)`
  - [x] Receber array de objetos e campos
  - [x] Gerar CSV com headers
  - [x] Retornar buffer CSV

- [x] Criar helper `generateExcel(data, fields)`
  - [x] Receber array de objetos e campos
  - [x] Gerar Excel com headers
  - [x] Retornar buffer Excel

#### Validação
- [x] Teste: exportação CSV funciona
- [x] Teste: exportação Excel funciona
- [x] Teste: filtros aplicados na exportação funcionam
- [x] Teste: seleção de campos funciona

---

### 9. Templates de Importação

#### Backend (Rotas)
- [x] Criar rota `GET /api/import/templates/:entityType`
  - [x] Requer autenticação
  - [x] Gerar template CSV/Excel com headers corretos
  - [x] Incluir exemplos de dados
  - [x] Retornar arquivo para download

- [x] Criar helper `generateImportTemplate(entityType)`
  - [x] Buscar campos da entidade
  - [x] Gerar CSV/Excel com headers
  - [x] Adicionar linha de exemplo
  - [x] Retornar buffer

#### Validação
- [x] Teste: template de importação funciona
- [x] Teste: template tem headers corretos

---

### 10. Frontend — Upload e Mapeamento

#### Frontend (React + TypeScript)
- [x] Criar componente `ImportWizard`
  - [x] **Passo 1**: Upload de arquivo
    - [x] Drag-and-drop ou seleção de arquivo
    - [x] Validação de tipo e tamanho
    - [x] Preview do arquivo
  - [x] **Passo 2**: Seleção de entidade
    - [x] Dropdown: Contact, Company, Lead, Opportunity
  - [x] **Passo 3**: Mapeamento de campos
    - [x] Tabela: Coluna do arquivo → Campo da entidade
    - [x] Dropdown para selecionar campo
    - [x] Checkbox "Obrigatório"
    - [x] Preview de primeiras linhas mapeadas
  - [x] **Passo 4**: Opções de importação
    - [x] Checkbox "Atualizar registros existentes"
    - [x] Checkbox "Ignorar erros e continuar"
  - [x] **Passo 5**: Processamento
    - [x] Barra de progresso
    - [x] Estatísticas em tempo real
  - [x] **Passo 6**: Relatório
    - [x] Estatísticas finais
    - [x] Lista de erros (se houver)
    - [x] Botão "Baixar relatório"

#### Validação
- [x] Teste: wizard de importação funciona
- [x] Teste: mapeamento de campos funciona
- [x] Teste: preview de mapeamento funciona

---

### 11. Frontend — Exportação

#### Frontend (React + TypeScript)
- [x] Criar componente `ExportDialog`
  - [x] Seleção de formato (CSV, Excel)
  - [x] Seleção de campos (checkboxes)
  - [x] Aplicar filtros atuais (se em página de listagem)
  - [x] Botão "Exportar"
  - [x] Download automático do arquivo

- [x] Integrar em páginas de listagem
  - [x] Botão "Exportar" em cada página
  - [x] Abrir dialog de exportação

#### Validação
- [x] Teste: exportação funciona
- [x] Teste: seleção de campos funciona
- [x] Teste: filtros aplicados funcionam

---

### 12. Tratamento de Erros

#### Backend (Lógica)
- [x] Tratamento de erros de parsing
  - [x] Arquivo corrompido
  - [x] Encoding inválido
  - [x] Formato inválido

- [x] Tratamento de erros de validação
  - [x] Campos obrigatórios faltando
  - [x] Tipos inválidos
  - [x] Valores duplicados (se campo único)

- [x] Tratamento de erros de processamento
  - [x] Timeout
  - [x] Memória insuficiente
  - [x] Erro de banco de dados

#### Validação
- [x] Teste: erros são tratados adequadamente
- [x] Teste: mensagens de erro são claras

---

### 13. Performance e Limites

#### Backend (Configurações)
- [x] Definir limites
  - [x] Tamanho máximo de arquivo: 10MB
  - [x] Número máximo de linhas: 10.000 (síncrono), ilimitado (assíncrono)
  - [x] Timeout: 5 minutos

- [x] Otimizações
  - [x] Processar em lotes (100-500 registros)
  - [x] Usar transações para rollback em caso de erro
  - [x] Limitar memória (streaming para arquivos grandes)

#### Validação
- [x] Teste: arquivo grande é processado corretamente
- [x] Teste: timeout é respeitado

---

### 14. Testes

#### Backend (Testes)
- [x] Testes unitários
  - [x] Parsing CSV
  - [x] Parsing Excel
  - [x] Mapeamento de campos
  - [x] Validação de dados
  - [x] Geração de CSV/Excel

- [x] Testes de integração
  - [x] Importação completa de CSV
  - [x] Importação completa de Excel
  - [x] Exportação completa
  - [x] Tratamento de erros

#### Validação
- [x] Todos os testes passando
- [x] Cobertura de testes > 70%

---

### 15. Documentação

#### Documentação Técnica
- [x] Documentar API de importação/exportação
- [x] Documentar formatos suportados
- [x] Documentar limites e restrições
- [x] Documentar templates de importação

#### Documentação de Usuário
- [x] Guia de importação
- [x] Guia de exportação
- [x] Exemplos de arquivos

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 10 (Interface/UX)**, verifique:

- [x] Importação de CSV/Excel funcionando
- [x] Mapeamento de campos operacional
- [x] Validação e relatórios de erro funcionando
- [x] Exportação de dados em CSV funcionando
- [x] Templates de importação disponíveis
- [x] Frontend básico funcionando
- [x] Testes passando
- [x] Documentação atualizada

---

## Tecnologias Utilizadas

- **Backend**: Node.js + TypeScript
- **ORM**: Prisma
- **Banco de dados**: PostgreSQL
- **Parsing CSV**: `csv-parse` ou `papaparse`
- **Parsing Excel**: `xlsx` ou `exceljs`
- **Upload**: `multer` ou `@fastify/multipart`
- **Frontend**: React + TypeScript

---

## Próximos Passos

Após completar esta etapa, você pode avançar para:

**→ [Etapa 10: Interface Responsiva e Tratamento de Estados](./Etapa-10-Interface-UX.md)**

---

## Notas Importantes

⚠️ **Performance**:
- Arquivos grandes devem ser processados assincronamente
- Limites de tamanho previnem problemas de memória
- Processamento em lotes é essencial

✅ **Boas práticas**:
- Sempre validar dados antes de importar
- Relatórios de erro devem ser detalhados
- Templates facilitam importação correta
- Exportação deve respeitar filtros aplicados

---

## Referências

- **Roadmap Funcional**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`
- **Etapa 8 (Filtros)**: `Features/meu_projeto/v1/fases_2/Etapa-08-Busca-Filtros.md`
- **Decisão de Stack**: `Features/meu_projeto/v1/Decisao-Stack-V1.md`
