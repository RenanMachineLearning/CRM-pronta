# Formatos Suportados

## Visão Geral

O sistema de importação/exportação suporta diversos formatos de arquivo para facilitar a integração de dados. Esta documentação detalha os formatos suportados, suas características e limitações.

---

## Formatos de Importação

### CSV (Comma-Separated Values)

**Extensão**: `.csv`

**Características**:
- Separador de campos: vírgula (`,`) ou ponto e vírgula (`;`)
- Codificação: UTF-8 (padrão), ISO-8859-1 (Latin-1)
- Linha de cabeçalhos: obrigatória (primeira linha define os nomes das colunas)
- Delimitador de texto: aspas duplas (`"`)

**Exemplo de estrutura**:
```
firstName,lastName,email,phone
João,Silva,joao@email.com,11999999999
Maria,Santos,maria@email.com,11988888888
```

**Considerações**:
- O sistema detecta automaticamente o separador (vírgula ou ponto e vírgula)
- O sistema detecta automaticamente a codificação (UTF-8 ou ISO-8859-1)
- Cabeçalhos devem corresponder aos nomes dos campos da entidade
- Valores com vírgulas ou quebras de linha devem estar entre aspas

### Excel (XLSX)

**Extensão**: `.xlsx`

**Características**:
- Formato binário do Microsoft Excel (Open XML)
- Suporte a múltiplas planilhas (apenas a primeira é processada por padrão)
- Preserva formatação básica de células
- Suporte a fórmulas (valores calculados são importados)

**Considerações**:
- Apenas a primeira planilha é processada automaticamente
- Fórmulas são resolvidas e valores resultantes são importados
- Formatação visual é ignorada durante a importação
- Células mescladas podem causar problemas de alinhamento

### Excel (XLS)

**Extensão**: `.xls`

**Características**:
- Formato legado do Microsoft Excel (BIFF - Binary Interchange File Format)
- Menor suporte a recursos avançados comparado ao XLSX
- Limitado a 65.536 linhas por planilha

**Considerações**:
- Recomendado converter para XLSX quando possível
- Menor suporte a caracteres especiais
- Menor suporte a fórmulas complexas

---

## Formatos de Exportação

### CSV (Comma-Separated Values)

**Extensão**: `.csv`

**Características**:
- Separador de campos: vírgula (`,`)
- Codificação: UTF-8
- Linha de cabeçalhos: sempre incluída
- Delimitador de texto: aspas duplas (`"`)

**Considerações**:
- Cabeçalhos correspondem aos nomes dos campos exportados
- Dados são escapados conforme necessário para manter conformidade CSV
- Quebras de linha dentro de campos são substituídas por espaços

### Excel (XLSX)

**Extensão**: `.xlsx`

**Características**:
- Formato binário do Microsoft Excel (Open XML)
- Única planilha contendo os dados exportados
- Cabeçalhos na primeira linha
- Formatação básica aplicada (negrito para cabeçalhos)

**Considerações**:
- Mais adequado para compartilhamento com usuários finais
- Melhor suporte para caracteres especiais
- Menor tamanho de arquivo para grandes volumes de dados

---

## Tipos de Dados Suportados

### Texto
- **Formatos de entrada**: Qualquer string de caracteres
- **Validação**: Tamanho máximo de 5000 caracteres (configurável por campo)
- **Transformações comuns**: trim, toUpperCase, toLowerCase

### Números
- **Formatos de entrada**: Inteiros e decimais (ex: 123, 123.45, -67.89)
- **Separador decimal**: Ponto (.) ou vírgula (,)
- **Validação**: Verificação de formato numérico
- **Transformações comuns**: Remoção de símbolos não numéricos

### Data
- **Formatos de entrada**: 
  - YYYY-MM-DD (ISO 8601): 2023-12-25
  - DD/MM/YYYY: 25/12/2023
  - MM/DD/YYYY: 12/25/2023
  - DD-MM-YYYY: 25-12-2023
- **Validação**: Verificação de data válida (ano, mês, dia)
- **Transformações comuns**: Conversão para formato ISO 8601

### Data/Hora
- **Formatos de entrada**: Combinação de data e hora com separadores
- **Formatos suportados**: YYYY-MM-DD HH:mm:ss, DD/MM/YYYY HH:mm, MM/DD/YYYY HH:mm:ss
- **Validação**: Verificação de data e hora válidas
- **Transformações comuns**: Conversão para formato ISO 8601

### Email
- **Formatos de entrada**: Endereços de email padrão
- **Validação**: Verificação de formato RFC 5322
- **Transformações comuns**: Conversão para minúsculas, remoção de espaços

### Telefone
- **Formatos de entrada**: Qualquer combinação de dígitos, parênteses, traços, espaços
- **Validação**: Verificação de formato (mínimo de 8 dígitos)
- **Transformações comuns**: Remoção de caracteres não numéricos

### Booleano
- **Formatos de entrada verdadeiro**: `true`, `1`, `yes`, `sim`, `v`, `s`
- **Formatos de entrada falso**: `false`, `0`, `no`, `não`, `n`
- **Validação**: Verificação de valor booleano válido
- **Transformações comuns**: Normalização para `true`/`false`

### Moeda
- **Formatos de entrada**: Valores numéricos com símbolo opcional
- **Separador decimal**: Ponto (.) ou vírgula (,)
- **Validação**: Verificação de formato monetário
- **Transformações comuns**: Remoção de símbolos monetários, conversão para número

---

## Codificação de Caracteres

### Importação
- **Detecção automática**: UTF-8, ISO-8859-1 (Latin-1)
- **Suporte a acentuação**: Completo para idiomas latinos
- **Tratamento de caracteres especiais**: Preservação de caracteres Unicode

### Exportação
- **Padrão**: UTF-8 para garantir compatibilidade internacional
- **Preservação**: Todos os caracteres Unicode são mantidos

---

## Limitações Conhecidas

### CSV
- Não suporta fórmulas ou formatação visual
- Problemas com campos que contenham aspas não escapadas
- Limitações com caracteres Unicode em alguns leitores

### Excel (XLS)
- Limitado a 65.536 linhas por planilha
- Menor suporte a caracteres Unicode
- Menor suporte a formatos de data/hora complexos

### Excel (XLSX)
- Maior consumo de memória durante processamento
- Possível perda de fórmulas complexas durante leitura
- Incompatibilidade com versões muito antigas do Excel

---

## Recomendações

1. **Para importação de grandes volumes**: Use CSV em vez de Excel
2. **Para compartilhamento com usuários**: Use XLSX para melhor experiência
3. **Para dados com caracteres especiais**: Use UTF-8 como codificação
4. **Para dados com fórmulas**: Converta para valores antes da importação
5. **Para dados sensíveis**: Evite fórmulas ou macros nos arquivos Excel

---

## Validação de Formato

Todos os arquivos são submetidos a validação de formato antes do processamento:

- Verificação de extensão de arquivo
- Validação de estrutura do arquivo
- Detecção de codificação de caracteres
- Verificação de integridade do conteúdo
- Análise de cabeçalhos (no caso de CSV)