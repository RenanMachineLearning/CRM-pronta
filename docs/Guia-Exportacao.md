# Guia de Exportação de Dados

## Visão Geral

Este guia fornece instruções passo a passo para exportar dados do CRM, incluindo contatos, empresas, leads, oportunidades, tarefas e notas. A exportação permite baixar registros em formatos CSV ou Excel para análise, backup ou integração com outros sistemas.

---

## Antes de Começar

### Verifique suas Permissões

- Você precisa da permissão `Export.create` para realizar exportações
- Certifique-se de estar no tenant correto
- Verifique se você tem permissão para ler os registros do tipo que deseja exportar

### Planeje sua Exportação

- Determine quais campos são necessários
- Considere o volume de dados a ser exportado
- Avalie se precisa de filtros para limitar os resultados
- Verifique se há dados sensíveis que devem ser excluídos

---

## Passo a Passo: Exportação de Dados

### Passo 1: Acesse a Ferramenta de Exportação

1. Faça login no CRM
2. Navegue até a lista de registros que deseja exportar:
   - Contatos
   - Empresas
   - Leads
   - Oportunidades
   - Tarefas
   - Notas
3. Localize a opção de exportação (geralmente um ícone de download ou botão "Exportar")

### Passo 2: Selecione os Campos

1. Escolha os campos que deseja incluir na exportação
2. Selecione campos padrão e personalizados conforme necessário
3. Considere a ordem dos campos na exportação
4. Verifique se incluiu todos os campos necessários

**Dicas de Seleção:**
- Inclua campos de identificação (ID, nome, email)
- Considere campos de relacionamento (empresa, contato associado)
- Evite campos desnecessários para reduzir o tamanho do arquivo
- Verifique campos sensíveis que podem não dever ser exportados

### Passo 3: Aplique Filtros (Opcional)

Se desejar exportar apenas um subconjunto de dados:

1. Clique em "Filtros avançados" ou "Adicionar filtros"
2. Selecione o campo que deseja filtrar
3. Escolha o operador (é igual, contém, maior que, etc.)
4. Insira o valor para o filtro
5. Adicione quantos filtros forem necessários

**Operadores Disponíveis:**
- **É igual (equals)**: Valor exato
- **Contém (contains)**: Parte do texto
- **É maior que (greaterThan)**: Valores numéricos ou datas
- **É menor que (lessThan)**: Valores numéricos ou datas
- **Está em (in)**: Lista de valores possíveis
- **É nulo (isNull)**: Campos sem valor
- **Não é nulo (isNotNull)**: Campos com valor

### Passo 4: Escolha o Formato

Selecione o formato de exportação:

- **CSV (Comma-Separated Values)**:
  - Ideal para planilhas e análise de dados
  - Compatível com Excel, Google Sheets, etc.
  - Menor tamanho de arquivo
  - Sem formatação visual

- **Excel (XLSX)**:
  - Formato nativo do Microsoft Excel
  - Formatação básica preservada
  - Melhor para apresentações
  - Maior tamanho de arquivo

### Passo 5: Revise a Pré-visualização

Antes de exportar:

1. Revise a pré-visualização dos dados
2. Confirme que os campos selecionados estão corretos
3. Verifique se os filtros estão aplicados como esperado
4. Estime o número de registros que serão exportados

### Passo 6: Inicie a Exportação

1. Clique no botão "Exportar" ou "Baixar"
2. Aguarde a geração do arquivo
3. O tempo de espera dependerá do volume de dados

**Limites de Exportação:**
- Máximo de 10.000 registros por exportação
- Tamanho máximo do arquivo: 50 MB
- Se ultrapassar os limites, os dados serão truncados

### Passo 7: Baixe o Arquivo

1. Quando a exportação estiver concluída, o download começará automaticamente
2. O arquivo será salvo no diretório padrão de downloads do seu navegador
3. O nome do arquivo seguirá o padrão: `export-[entidade]-[timestamp].[formato]`

---

## Tipos de Filtros Avançados

### Filtros por Data

- **Intervalo de datas**: Exportar registros dentro de um período específico
- **Datas relativas**: Exportar registros das últimas 24 horas, últimos 7 dias, etc.
- **Comparação de datas**: Registros antes/depois de uma data específica

### Filtros por Status

- **Status específicos**: Apenas contatos ativos, oportunidades ganhas, etc.
- **Múltiplos status**: Contatos ativos OU prospectivos
- **Exclusão de status**: Todos exceto registros inativos

### Filtros por Relacionamentos

- **Associados a**: Exportar contatos de uma empresa específica
- **Sem associação**: Registros sem relacionamentos
- **Múltiplos relacionamentos**: Combinar critérios de diferentes entidades

### Filtros por Campos Personalizados

- **Campos específicos**: Filtrar por valores em campos personalizados
- **Tipos de campos**: Aplicar filtros apropriados ao tipo de dado
- **Opções de seleção**: Filtrar por valores específicos em campos de seleção

---

## Boas Práticas

### Planejamento da Exportação

1. **Defina objetivos claros**
   - Qual a finalidade da exportação?
   - Quais análises serão feitas?
   - Quem utilizará os dados exportados?

2. **Minimize o volume**
   - Use filtros para limitar os dados
   - Selecione apenas campos necessários
   - Considere exportações em partes se necessário

3. **Considere a frequência**
   - Exportações recorrentes podem ser automatizadas
   - Planeje horários para minimizar impacto no sistema
   - Considere exportações incrementais

### Durante a Exportação

1. **Monitore o processo**
   - Verifique o número estimado de registros
   - Acompanhe o progresso se disponível
   - Aguarde a conclusão completa antes de repetir

2. **Verifique os resultados**
   - Confirme que o arquivo foi baixado completamente
   - Verifique se o número de registros está correto
   - Confirme que os dados parecem válidos

### Após a Exportação

1. **Valide os dados**
   - Abra o arquivo para verificar conteúdo
   - Confirme que todos os campos necessários estão presentes
   - Verifique integridade dos dados

2. **Armazene com segurança**
   - Mantenha dados exportados em locais seguros
   - Considere criptografia para dados sensíveis
   - Estabeleça prazo para eliminação de cópias desnecessárias

---

## Solução de Problemas

### Exportação Demorando Muito

- **Causa provável**: Volume muito grande de dados
- **Solução**: Aplique filtros para reduzir o volume ou divida em várias exportações

### Arquivo Não Baixa

- **Causa provável**: Pop-ups bloqueados ou problema de rede
- **Solução**: Verifique configurações de pop-up e conectividade

### Dados Ausentes

- **Causa provável**: Filtros muito restritivos ou campos não selecionados
- **Solução**: Revise filtros e seleção de campos

### Formato Incorreto

- **Causa provável**: Problemas de codificação ou caracteres especiais
- **Solução**: Verifique o arquivo em diferentes aplicativos

### Acesso Negado

- **Causa provável**: Permissões insuficientes ou tenant incorreto
- **Solução**: Verifique suas permissões com o administrador

---

## Dicas Avançadas

### Exportação Programática

Para automação ou grandes volumes, considere usar a API de exportação diretamente:

```
GET /api/export/:entityType
```

Consulte a [API-Export](API-Export.md) para detalhes técnicos.

### Exportação Agendada

Embora não suportada nativamente, você pode:
- Criar scripts que utilizem a API
- Configurar tarefas agendadas para exportações regulares
- Integrar com ferramentas de automação

### Exportação de Relacionamentos

- Inclua campos de relacionamento para manter contexto
- Considere exportar entidades relacionadas separadamente
- Planeje como os dados serão reconectados após exportação

---

## Segurança e Privacidade

- **Dados sensíveis**: Revise cuidadosamente dados antes da exportação
- **Auditoria**: O sistema registra todas as exportações
- **Isolamento**: Apenas dados do seu tenant são exportados
- **Validação**: Permissões são verificadas antes da exportação
- **Tratamento**: Trate dados exportados com o mesmo cuidado do sistema original

---

## Limites Importantes

- **Quantidade de registros**: Máximo de 10.000 por exportação
- **Tamanho do arquivo**: Máximo de 50 MB
- **Campos por exportação**: Não limitado, mas afeta desempenho
- **Frequência**: Sujeito a rate limiting (100 requisições/minuto por IP)

Se você precisar exportar mais dados do que os limites permitem, divida a exportação em várias solicitações com filtros diferentes.

---

## Suporte

Se encontrar problemas durante a exportação:

1. Revise este guia
2. Verifique se está dentro dos limites estabelecidos
3. Contate o suporte com:
   - Descrição do problema
   - Tipo de entidade sendo exportada
   - Filtros aplicados
   - Mensagens de erro específicas