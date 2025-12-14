# Fase 10 – Importação e exportação de dados

## Objetivo da Fase
Permitir onboarding e migração no V1 com **importação de dados (CSV/Excel e/ou templates)**, **mapeamento de campos**, **validação com relatórios de erro/estatísticas** e **exportação de dados (CSV e outros formatos)** no mínimo necessário para venda.

## Procedimentos
- Definir entidades suportadas na importação do V1 (mínimo):
  - Contatos
  - Empresas
  - Leads
  - Oportunidades
- Definir formato(s) suportado(s) no V1:
  - CSV como base
  - Excel como opcional conforme capacidade
- Definir o fluxo de importação:
  - Upload do arquivo
  - Mapeamento de colunas → campos (inclui campos customizados quando aplicável)
  - Validação e pré-visualização (se houver)
  - Execução do processamento em lote
  - Relatório final (sucessos, falhas, motivos)
- Definir regras de validação:
  - Tipos de dados
  - Campos obrigatórios
  - Unicidade por tenant
  - Regras de relacionamento (ex.: contato ligado a empresa)
- Definir política de deduplicação na importação:
  - Detecção e reporte (mínimo)
  - Bloqueio ou merge (apenas se estritamente necessário no V1)
- Definir exportação:
  - Exportação por entidade
  - Exportação respeitando filtros atuais (quando aplicável)
  - Formato padrão (CSV)
- Definir limites operacionais:
  - Tamanho máximo de arquivo
  - Tempo máximo de processamento
  - Comportamento quando excede limites

## Decisões Técnicas

### Decisão 1 — Formato principal no V1 (CSV vs Excel)
- **O que está sendo decidido**: Quais formatos suportar no MVP vendável.
- **Alternativas consideradas**:
  - (A) Apenas CSV
  - (B) CSV + Excel (XLSX)
- **Decisão tomada**: **CSV como obrigatório**; Excel **somente se viável** sem atrasar o V1.
- **Justificativa objetiva**: CSV cobre a maioria das migrações com menor complexidade; Excel aumenta esforço e casos de borda.

### Decisão 2 — Processamento (síncrono vs lote com acompanhamento)
- **O que está sendo decidido**: Como executar importações sem travar a experiência.
- **Alternativas consideradas**:
  - (A) Síncrono (arquivo pequeno)
  - (B) Processamento em lote com status e resultado
- **Decisão tomada**: **Processamento em lote** como padrão do V1.
- **Justificativa objetiva**: Importação é crítica para venda e pode ser pesada; o V1 precisa de previsibilidade operacional.

### Decisão 3 — Estratégia de deduplicação
- **O que está sendo decidido**: Como tratar duplicatas no V1.
- **Alternativas consideradas**:
  - (A) Apenas reportar duplicatas e deixar o usuário corrigir
  - (B) Bloquear importação ao detectar duplicata
  - (C) Fazer merge automático
- **Decisão tomada**: **(A)**.
- **Justificativa objetiva**: Merge automático é arriscado e tende a gerar incidentes; o V1 deve privilegiar segurança/controle.

### Decisão 4 — Escopo do mapeamento de campos
- **O que está sendo decidido**: Até onde vai o mapeamento no V1.
- **Alternativas consideradas**:
  - (A) Mapeamento simples apenas para campos fixos
  - (B) Mapeamento incluindo campos customizados
- **Decisão tomada**: **(B)** quando os campos customizados fizerem parte do modelo do V1.
- **Justificativa objetiva**: O V1 inclui campos personalizáveis; importação deve respeitar isso para reduzir fricção comercial.

## Tecnologias Selecionadas
- **Processamento em lote**: mecanismo de jobs (categoria) para executar importações com status e relatórios.
- **Armazenamento temporário de arquivos**: storage compatível com SaaS (categoria).
- **Persistência relacional**: validações de unicidade e relacionamentos.
- **Relatórios de importação**: estrutura de resultado por job (sucesso/erro/detalhes), com escopo de tenant.

## Pré-requisitos para Avançar
- [ ] Entidades suportadas na importação do V1 definidas
- [ ] Formato(s) suportado(s) definidos (CSV obrigatório)
- [ ] Regras de validação definidas (tipos, obrigatórios, unicidade, relacionamentos)
- [ ] Política de deduplicação definida (mínimo: reportar)
- [ ] Fluxo de processamento em lote definido (status + resultado)
- [ ] Exportação definida (entidades + CSV + respeitar filtros quando aplicável)
- [ ] Limites operacionais definidos (tamanho/tempo/comportamento)


