# Guia de uso dos documentos — V1

> **Objetivo**: Explicar quando e como usar cada documento do projeto V1 para reduzir atritos e acelerar desenvolvimento.

---

## Documentos disponíveis

### Documentos de planejamento
1. **Roadmap-V1.md** — Visão geral das 12 fases
2. **fases/Fase-XX-*.md** — Detalhamento de cada fase (12 arquivos)

### Documentos de referência
3. **Checklist-Pre-Inicio.md** — Validação antes de começar
4. **Decisoes-Arquiteturais-Consolidadas.md** — Todas as decisões técnicas
5. **Modelo-de-Dados-Conceitual.md** — Estrutura de entidades e relacionamentos

---

## Quando usar cada documento

### 1. Checklist-Pre-Inicio.md

**Quando usar**:
- ✅ **Antes de iniciar a Fase 1** — Validar que está tudo pronto
- ✅ **Ao adicionar novo membro ao time** — Garantir que setup está completo
- ✅ **Antes de começar desenvolvimento** — Última checagem de prontidão

**Como usar**:
1. Abra o documento
2. Marque cada item como concluído `[x]` ou pendente `[ ]`
3. Para itens pendentes, defina **plano de ação** e **responsável**
4. Só inicie a Fase 1 quando todos os itens críticos estiverem concluídos

**Exemplo de uso**:
```
❌ Antes: "Vou começar a codar e ver o que falta depois"
✅ Depois: "Vou completar o checklist pré-início primeiro"
```

---

### 2. Decisoes-Arquiteturais-Consolidadas.md

**Quando usar**:
- ✅ **Durante implementação** — Antes de tomar decisão técnica, verificar se já foi decidido
- ✅ **Em code reviews** — Validar que decisões foram seguidas
- ✅ **Em discussões técnicas** — Alinhar time sobre decisões já tomadas
- ✅ **Ao evoluir arquitetura** — Revisar decisões antes de mudar

**Como usar**:
1. **Antes de implementar**: Consulte a seção da fase correspondente
2. **Em dúvida**: Procure por palavras-chave (ex.: "multi-tenant", "autenticação")
3. **Ao revisar código**: Compare implementação com decisões documentadas
4. **Ao mudar decisão**: Atualize o documento e documente o motivo

**Exemplo de uso**:
```
❌ Antes: "Vou usar JWT porque é mais simples"
✅ Depois: "Vou consultar Decisoes-Arquiteturais para ver o que foi decidido sobre autenticação"
```

**Estrutura do documento**:
- Decisões organizadas por fase
- Cada decisão tem: o que foi decidido, justificativa, impacto
- Dependências entre decisões mapeadas

---

### 3. Modelo-de-Dados-Conceitual.md

**Quando usar**:
- ✅ **Fase 5** — Ao definir schema físico e estrutura de tabelas
- ✅ **Fases 6-8** — Ao implementar CRUD de entidades específicas
- ✅ **Code reviews** — Validar que modelo de dados foi seguido
- ✅ **Discussões técnicas** — Alinhar time sobre estrutura de dados
- ✅ **Ao criar queries** — Entender relacionamentos antes de escrever SQL

**Como usar**:
1. **Fase 5**: Use como base para criar schema físico (tabelas, índices, constraints)
2. **Fases 6-8**: Consulte entidades específicas (Contact, Lead, Opportunity, etc.)
3. **Ao criar relacionamentos**: Veja diagrama textual de relacionamentos
4. **Ao criar queries**: Entenda índices críticos para performance

**Exemplo de uso**:
```
❌ Antes: "Vou criar tabela de contatos e ver o que preciso depois"
✅ Depois: "Vou consultar Modelo-de-Dados para ver estrutura completa de Contact e relacionamentos"
```

**Estrutura do documento**:
- Entidades core com campos principais
- Relacionamentos (1:N, N:N) explicitados
- Diagrama textual de relacionamentos
- Índices críticos para performance
- Regras de negócio importantes

---

### 4. Roadmap-V1.md

**Quando usar**:
- ✅ **Visão geral** — Entender todas as fases do projeto
- ✅ **Planejamento** — Ver dependências entre fases
- ✅ **Status do projeto** — Acompanhar progresso geral
- ✅ **Onboarding** — Explicar estrutura do projeto para novos membros

**Como usar**:
1. Leia para entender o escopo completo da V1
2. Use como referência para ver ordem das fases
3. Consulte "Dependências críticas entre fases" antes de pular fases
4. Use checklist de prontidão comercial ao final

---

### 5. fases/Fase-XX-*.md (12 arquivos)

**Quando usar**:
- ✅ **Durante execução da fase** — Guia passo a passo
- ✅ **Planejamento da fase** — Entender o que precisa ser feito
- ✅ **Validação de conclusão** — Usar "Pré-requisitos para Avançar"

**Como usar**:
1. **Antes de iniciar fase**: Leia objetivo, procedimentos e decisões técnicas
2. **Durante execução**: Siga procedimentos e consulte decisões técnicas
3. **Ao finalizar**: Use checklist "Pré-requisitos para Avançar" para validar conclusão
4. **Em dúvida**: Consulte tecnologias selecionadas e justificativas

**Estrutura de cada fase**:
- Objetivo da Fase
- Procedimentos (passo a passo)
- Decisões Técnicas (alternativas → decisão → justificativa)
- Tecnologias Selecionadas
- Pré-requisitos para Avançar (checklist)

---

## Fluxo de trabalho recomendado

### Antes de começar (pré-Fase 1)

1. **Leia Roadmap-V1.md** — Entenda o escopo completo
2. **Complete Checklist-Pre-Inicio.md** — Valide prontidão
3. **Revise Decisoes-Arquiteturais-Consolidadas.md** — Familiarize-se com decisões já tomadas
4. **Consulte Modelo-de-Dados-Conceitual.md** — Entenda estrutura de dados (mesmo que ainda não vá implementar)

### Durante execução de cada fase

1. **Abra fases/Fase-XX-*.md** — Leia objetivo e procedimentos
2. **Consulte Decisoes-Arquiteturais-Consolidadas.md** — Verifique decisões da fase
3. **Se fase envolve dados**: Consulte Modelo-de-Dados-Conceitual.md
4. **Execute procedimentos** — Siga passo a passo
5. **Valide conclusão** — Use "Pré-requisitos para Avançar" da fase

### Durante code reviews

1. **Consulte Decisoes-Arquiteturais-Consolidadas.md** — Valide que decisões foram seguidas
2. **Consulte Modelo-de-Dados-Conceitual.md** — Valide que estrutura de dados está correta
3. **Consulte fase correspondente** — Valide que procedimentos foram seguidos

### Ao evoluir arquitetura

1. **Revise Decisoes-Arquiteturais-Consolidadas.md** — Entenda decisões atuais
2. **Documente nova decisão** — Adicione na seção correspondente
3. **Atualize Modelo-de-Dados-Conceitual.md** — Se mudança afetar estrutura de dados
4. **Comunique mudança** — Alerte time sobre decisão revisada

---

## Dicas de uso eficiente

### Busca rápida
- Use `Ctrl+F` (ou `Cmd+F`) para buscar palavras-chave nos documentos
- Exemplos: "multi-tenant", "autenticação", "Contact", "pipeline"

### Links entre documentos
- Documentos fazem referência cruzada entre si
- Use links do Obsidian para navegar rapidamente

### Atualização
- **Decisoes-Arquiteturais-Consolidadas.md**: Atualize quando nova decisão for tomada
- **Modelo-de-Dados-Conceitual.md**: Atualize quando estrutura de dados mudar
- **Checklist-Pre-Inicio.md**: Atualize quando novos pré-requisitos forem identificados

### Versionamento
- Todos os documentos estão em Markdown e versionados no Git
- Use commits descritivos ao atualizar documentos

---

## Perguntas frequentes

### "Preciso ler todos os documentos antes de começar?"
**Não necessariamente**. Leia:
- ✅ Roadmap-V1.md (visão geral)
- ✅ Checklist-Pre-Inicio.md (validação)
- ✅ Fase-01-*.md (primeira fase)

Os outros documentos são consultas conforme necessidade.

### "E se eu não seguir uma decisão arquitetural?"
**Documente o motivo**. Se a decisão precisa mudar:
1. Atualize Decisoes-Arquiteturais-Consolidadas.md
2. Documente justificativa da mudança
3. Comunique ao time

### "O modelo de dados está completo?"
**Para V1, sim**. O modelo cobre todas as entidades core do escopo V1. Se precisar adicionar entidades, atualize o documento.

### "Posso pular fases?"
**Não recomendado**. As fases têm dependências explícitas. Consulte "Dependências críticas entre fases" no Roadmap-V1.md antes de pular.

---

## Referências rápidas

| Situação | Documento a consultar |
|----------|----------------------|
| "Estou pronto para começar?" | Checklist-Pre-Inicio.md |
| "Qual decisão foi tomada sobre X?" | Decisoes-Arquiteturais-Consolidadas.md |
| "Qual a estrutura da entidade Y?" | Modelo-de-Dados-Conceitual.md |
| "O que fazer na Fase X?" | fases/Fase-XX-*.md |
| "Qual o escopo completo do V1?" | Roadmap-V1.md |

---

## Conclusão

Estes documentos foram criados para **reduzir atritos** e **acelerar desenvolvimento**. Use-os como **referência viva** durante todo o projeto V1.

**Lembre-se**: Documentos são ferramentas, não burocracia. Use quando fizer sentido, atualize quando necessário.

