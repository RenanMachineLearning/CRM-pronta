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
- [ ] Instalar biblioteca de parsing CSV
  - [ ] `npm install csv-parse` ou `papaparse`
  - [ ] Instalar tipos: `npm install -D @types/papaparse`

- [ ] Criar helper `parseCSV(file)`
  - [ ] Receber arquivo (buffer ou stream)
  - [ ] Parsear CSV
  - [ ] Retornar array de objetos (linhas)
  - [ ] Tratar encoding (UTF-8, ISO-8859-1)
  - [ ] Tratar delimitadores (vírgula, ponto-e-vírgula)

#### Validação
- [ ] Teste: parsear CSV simples funciona
- [ ] Teste: parsear CSV com encoding diferente funciona
- [ ] Teste: parsear CSV com delimitador diferente funciona

---

### 2. Processamento de Arquivos Excel

#### Backend (Bibliotecas)
- [ ] Instalar biblioteca de parsing Excel
  - [ ] `npm install xlsx` ou `exceljs`
  - [ ] Instalar tipos: `npm install -D @types/xlsx`

- [ ] Criar helper `parseExcel(file)`
  - [ ] Receber arquivo (buffer)
  - [ ] Parsear Excel (XLSX, XLS)
  - [ ] Retornar array de objetos (linhas)
  - [ ] Tratar múltiplas planilhas (usar primeira por padrão)

#### Validação
- [ ] Teste: parsear Excel XLSX funciona
- [ ] Teste: parsear Excel XLS funciona
- [ ] Teste: parsear múltiplas planilhas funciona

---

### 3. Upload de Arquivos

#### Backend (Rotas e Middleware)
- [ ] Instalar middleware de upload
  - [ ] `npm install multer` (se usar Express)
  - [ ] Ou usar `@fastify/multipart` (se usar Fastify)

- [ ] Criar rota `POST /api/import/upload`
  - [ ] Requer autenticação e permissão "Import.create"
  - [ ] Receber arquivo via multipart/form-data
  - [ ] Validar tipo de arquivo (CSV, XLSX, XLS)
  - [ ] Validar tamanho máximo (ex: 10MB)
  - [ ] Salvar arquivo temporariamente
  - [ ] Retornar `fileId` para processamento

#### Validação
- [ ] Teste: upload de CSV funciona
- [ ] Teste: upload de Excel funciona
- [ ] Teste: arquivo muito grande é rejeitado
- [ ] Teste: tipo de arquivo inválido é rejeitado

---

### 4. Mapeamento de Campos

#### Backend (Rotas)
- [ ] Criar rota `POST /api/import/:fileId/map`
  - [ ] Requer autenticação
  - [ ] Receber: `entityType` (Contact, Company, etc.), `mappings` (array de mapeamentos)
  - [ ] Mapeamento: `{ columnIndex, fieldName, required }`
  - [ ] Validar que campos existem na entidade
  - [ ] Retornar preview de mapeamento (primeiras 5 linhas)

- [ ] Criar helper `mapFieldsToEntity(rows, mappings, entityType)`
  - [ ] Mapear colunas do CSV/Excel para campos da entidade
  - [ ] Validar tipos de campo
  - [ ] Retornar dados mapeados

#### Validação
- [ ] Teste: mapeamento de campos funciona
- [ ] Teste: campos inválidos são rejeitados
- [ ] Teste: preview de mapeamento funciona

---

### 5. Validação de Dados

#### Backend (Validadores)
- [ ] Criar validador `validateImportRow(row, entityType, fields)`
  - [ ] Validar campos obrigatórios
  - [ ] Validar tipos de campo (text, number, date, email, etc.)
  - [ ] Validar formatos (email, telefone, data)
  - [ ] Validar unicidade (se campo marcado como único)
  - [ ] Retornar array de erros

- [ ] Criar helper `normalizeValue(value, fieldType)`
  - [ ] Converter string para número (se tipo number)
  - [ ] Converter string para data (se tipo date)
  - [ ] Normalizar email (lowercase, trim)
  - [ ] Normalizar telefone (remover caracteres especiais)

#### Validação
- [ ] Teste: validação de campos obrigatórios funciona
- [ ] Teste: validação de tipos funciona
- [ ] Teste: validação de formatos funciona
- [ ] Teste: normalização de valores funciona

---

### 6. Processamento em Lote

#### Backend (Lógica)
- [ ] Decidir estratégia de processamento
  - [ ] **Opção A**: Síncrono (processar tudo de uma vez)
  - [ ] **Opção B**: Assíncrono (job em background)
  - [ ] **Recomendação V1**: Síncrono para arquivos pequenos (< 1000 linhas), assíncrono para maiores

- [ ] Criar rota `POST /api/import/:fileId/process`
  - [ ] Requer autenticação
  - [ ] Receber: `entityType`, `mappings`, `options` (skipErrors, updateExisting)
  - [ ] Processar arquivo linha por linha
  - [ ] Validar cada linha
  - [ ] Criar/atualizar registros
  - [ ] Retornar relatório: `{ total, success, errors: [] }`

- [ ] Criar helper `processImportBatch(rows, mappings, entityType, tenantId)`
  - [ ] Processar em lotes (ex: 100 registros por vez)
  - [ ] Validar e criar registros
  - [ ] Coletar erros
  - [ ] Retornar estatísticas

#### Validação
- [ ] Teste: processamento síncrono funciona
- [ ] Teste: processamento em lote funciona
- [ ] Teste: erros são coletados corretamente

---

### 7. Relatórios de Erro e Estatísticas

#### Backend (Lógica)
- [ ] Criar estrutura de relatório
  - [ ] `totalRows`: total de linhas processadas
  - [ ] `successCount`: linhas importadas com sucesso
  - [ ] `errorCount`: linhas com erro
  - [ ] `errors`: array de erros `{ row, errors: [] }`
  - [ ] `warnings`: array de avisos

- [ ] Criar rota `GET /api/import/:importId/report`
  - [ ] Requer autenticação
  - [ ] Retornar relatório completo de importação
  - [ ] Incluir erros detalhados por linha

#### Validação
- [ ] Teste: relatório de importação funciona
- [ ] Teste: erros são reportados corretamente

---

### 8. Exportação de Dados

#### Backend (Rotas)
- [ ] Criar rota `GET /api/export/:entityType`
  - [ ] Requer autenticação e permissão "Export.create"
  - [ ] Receber: `format` (CSV, Excel), `fields[]` (campos a exportar), `filters[]` (filtros da Etapa 8)
  - [ ] Buscar registros com filtros aplicados
  - [ ] Selecionar apenas campos solicitados
  - [ ] Gerar arquivo CSV/Excel
  - [ ] Retornar arquivo para download

- [ ] Criar helper `generateCSV(data, fields)`
  - [ ] Receber array de objetos e campos
  - [ ] Gerar CSV com headers
  - [ ] Retornar buffer CSV

- [ ] Criar helper `generateExcel(data, fields)`
  - [ ] Receber array de objetos e campos
  - [ ] Gerar Excel com headers
  - [ ] Retornar buffer Excel

#### Validação
- [ ] Teste: exportação CSV funciona
- [ ] Teste: exportação Excel funciona
- [ ] Teste: filtros aplicados na exportação funcionam
- [ ] Teste: seleção de campos funciona

---

### 9. Templates de Importação

#### Backend (Rotas)
- [ ] Criar rota `GET /api/import/templates/:entityType`
  - [ ] Requer autenticação
  - [ ] Gerar template CSV/Excel com headers corretos
  - [ ] Incluir exemplos de dados
  - [ ] Retornar arquivo para download

- [ ] Criar helper `generateImportTemplate(entityType)`
  - [ ] Buscar campos da entidade
  - [ ] Gerar CSV/Excel com headers
  - [ ] Adicionar linha de exemplo
  - [ ] Retornar buffer

#### Validação
- [ ] Teste: template de importação funciona
- [ ] Teste: template tem headers corretos

---

### 10. Frontend — Upload e Mapeamento

#### Frontend (React + TypeScript)
- [ ] Criar componente `ImportWizard`
  - [ ] **Passo 1**: Upload de arquivo
    - [ ] Drag-and-drop ou seleção de arquivo
    - [ ] Validação de tipo e tamanho
    - [ ] Preview do arquivo
  - [ ] **Passo 2**: Seleção de entidade
    - [ ] Dropdown: Contact, Company, Lead, Opportunity
  - [ ] **Passo 3**: Mapeamento de campos
    - [ ] Tabela: Coluna do arquivo → Campo da entidade
    - [ ] Dropdown para selecionar campo
    - [ ] Checkbox "Obrigatório"
    - [ ] Preview de primeiras linhas mapeadas
  - [ ] **Passo 4**: Opções de importação
    - [ ] Checkbox "Atualizar registros existentes"
    - [ ] Checkbox "Ignorar erros e continuar"
  - [ ] **Passo 5**: Processamento
    - [ ] Barra de progresso
    - [ ] Estatísticas em tempo real
  - [ ] **Passo 6**: Relatório
    - [ ] Estatísticas finais
    - [ ] Lista de erros (se houver)
    - [ ] Botão "Baixar relatório"

#### Validação
- [ ] Teste: wizard de importação funciona
- [ ] Teste: mapeamento de campos funciona
- [ ] Teste: preview de mapeamento funciona

---

### 11. Frontend — Exportação

#### Frontend (React + TypeScript)
- [ ] Criar componente `ExportDialog`
  - [ ] Seleção de formato (CSV, Excel)
  - [ ] Seleção de campos (checkboxes)
  - [ ] Aplicar filtros atuais (se em página de listagem)
  - [ ] Botão "Exportar"
  - [ ] Download automático do arquivo

- [ ] Integrar em páginas de listagem
  - [ ] Botão "Exportar" em cada página
  - [ ] Abrir dialog de exportação

#### Validação
- [ ] Teste: exportação funciona
- [ ] Teste: seleção de campos funciona
- [ ] Teste: filtros aplicados funcionam

---

### 12. Tratamento de Erros

#### Backend (Lógica)
- [ ] Tratamento de erros de parsing
  - [ ] Arquivo corrompido
  - [ ] Encoding inválido
  - [ ] Formato inválido

- [ ] Tratamento de erros de validação
  - [ ] Campos obrigatórios faltando
  - [ ] Tipos inválidos
  - [ ] Valores duplicados (se campo único)

- [ ] Tratamento de erros de processamento
  - [ ] Timeout
  - [ ] Memória insuficiente
  - [ ] Erro de banco de dados

#### Validação
- [ ] Teste: erros são tratados adequadamente
- [ ] Teste: mensagens de erro são claras

---

### 13. Performance e Limites

#### Backend (Configurações)
- [ ] Definir limites
  - [ ] Tamanho máximo de arquivo: 10MB
  - [ ] Número máximo de linhas: 10.000 (síncrono), ilimitado (assíncrono)
  - [ ] Timeout: 5 minutos

- [ ] Otimizações
  - [ ] Processar em lotes (100-500 registros)
  - [ ] Usar transações para rollback em caso de erro
  - [ ] Limitar memória (streaming para arquivos grandes)

#### Validação
- [ ] Teste: arquivo grande é processado corretamente
- [ ] Teste: timeout é respeitado

---

### 14. Testes

#### Backend (Testes)
- [ ] Testes unitários
  - [ ] Parsing CSV
  - [ ] Parsing Excel
  - [ ] Mapeamento de campos
  - [ ] Validação de dados
  - [ ] Geração de CSV/Excel

- [ ] Testes de integração
  - [ ] Importação completa de CSV
  - [ ] Importação completa de Excel
  - [ ] Exportação completa
  - [ ] Tratamento de erros

#### Validação
- [ ] Todos os testes passando
- [ ] Cobertura de testes > 70%

---

### 15. Documentação

#### Documentação Técnica
- [ ] Documentar API de importação/exportação
- [ ] Documentar formatos suportados
- [ ] Documentar limites e restrições
- [ ] Documentar templates de importação

#### Documentação de Usuário
- [ ] Guia de importação
- [ ] Guia de exportação
- [ ] Exemplos de arquivos

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 10 (Interface/UX)**, verifique:

- [ ] Importação de CSV/Excel funcionando
- [ ] Mapeamento de campos operacional
- [ ] Validação e relatórios de erro funcionando
- [ ] Exportação de dados em CSV funcionando
- [ ] Templates de importação disponíveis
- [ ] Frontend básico funcionando
- [ ] Testes passando
- [ ] Documentação atualizada

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
