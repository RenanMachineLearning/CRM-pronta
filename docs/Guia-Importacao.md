# Guia de Importação de Dados

## Visão Geral

Este guia fornece instruções passo a passo para importar dados para o CRM, incluindo contatos, empresas, leads e oportunidades. A importação é realizada através de arquivos CSV ou Excel e inclui validação, mapeamento de campos e feedback detalhado.

---

## Antes de Começar

### Verifique suas Permissões

- Você precisa da permissão `Import.create` para realizar importações
- Certifique-se de estar no tenant correto
- Verifique se você tem permissão para criar registros do tipo que deseja importar

### Prepare seus Dados

- Organize os dados em um arquivo CSV ou Excel
- Use UTF-8 como codificação (recomendado)
- Inclua uma linha de cabeçalhos com nomes de colunas claros
- Verifique a qualidade dos dados (emails válidos, formatos consistentes, etc.)

### Baixe um Template (Opcional)

- Acesse a seção de importação no painel
- Selecione a entidade que deseja importar
- Baixe o template correspondente para garantir a estrutura correta

---

## Passo a Passo: Importação de Dados

### Passo 1: Acesse a Ferramenta de Importação

1. Faça login no CRM
2. Navegue até a seção de importação (geralmente em "Ferramentas" ou "Administração")
3. Selecione o tipo de entidade que deseja importar:
   - Contatos
   - Empresas
   - Leads
   - Oportunidades

### Passo 2: Faça Upload do Arquivo

1. Clique no botão "Escolher Arquivo" ou "Upload"
2. Selecione seu arquivo CSV ou Excel
3. Aguarde o upload ser concluído

**Limites:**
- Tamanho máximo: 10 MB
- Formatos suportados: CSV, XLSX, XLS
- Limite de 10.000 linhas por arquivo

### Passo 3: Valide o Arquivo

Após o upload, o sistema irá:
- Analisar a estrutura do arquivo
- Identificar os cabeçalhos
- Contar o número de registros
- Verificar a codificação e formato

Se erros forem encontrados, você será notificado e poderá corrigir o arquivo.

### Passo 4: Mapeie os Campos

1. O sistema mostrará os cabeçalhos do seu arquivo e os campos disponíveis na entidade
2. Arraste e solte ou selecione os campos correspondentes:
   - Exemplo: "Nome" no arquivo → "firstName" na entidade
   - Exemplo: "Email" no arquivo → "email" na entidade

**Dicas de Mapeamento:**
- Mapeie todos os campos obrigatórios
- Verifique se os tipos de dados correspondem
- Use o preview para confirmar que os dados estão corretos
- Campos não mapeados serão ignorados

### Passo 5: Revise e Valide

1. Revise o mapeamento realizado
2. O sistema mostrará um preview dos dados mapeados
3. Verifique se os dados parecem corretos
4. O sistema também realizará validações básicas:
   - Campos obrigatórios preenchidos
   - Formatos de dados válidos
   - Duplicatas potenciais

### Passo 6: Configure Opções de Importação

Antes de processar, configure opções adicionais:

- **Pular duplicatas**: Ignorar registros que já existem
- **Atualizar existentes**: Atualizar registros existentes em vez de gerar erro
- **Apenas validar**: Verificar o arquivo sem salvar os dados
- **Tamanho do lote**: Quantidade de registros processados por vez (padrão: 100)

### Passo 7: Inicie a Importação

1. Clique no botão "Importar" ou "Processar"
2. O sistema começará a importação em lotes
3. Você verá o progresso em tempo real:
   - Total de registros
   - Processados
   - Sucessos
   - Erros
   - Tempo estimado

### Passo 8: Revise os Resultados

Após a conclusão:

1. Verifique o resumo da importação:
   - Total de registros processados
   - Registros importados com sucesso
   - Registros com erros
   - Tempo total de processamento

2. Revise os erros (se houver):
   - Linha específica do erro
   - Campo problemático
   - Descrição do problema
   - Valor que causou o erro

3. Baixe o relatório completo se necessário

---

## Tipos de Erros Comuns

### Erros de Formato

- **Email inválido**: Verifique o formato (ex: usuario@dominio.com)
- **Telefone inválido**: Use apenas números ou formato padrão
- **Data inválida**: Use formatos reconhecidos (DD/MM/AAAA, AAAA-MM-DD)

### Erros de Validação

- **Campo obrigatório vazio**: Preencha o campo ou forneça um valor padrão
- **Valor fora do intervalo**: Verifique limites (ex: porcentagem de 0-100)
- **Duplicata detectada**: Verifique opções de tratamento de duplicatas

### Erros de Relacionamento

- **ID de relacionamento não encontrado**: Verifique se o registro relacionado existe
- **Permissão insuficiente**: Verifique se você pode acessar os registros relacionados

---

## Boas Práticas

### Preparação de Dados

1. **Limpeza de dados**
   - Remova linhas em branco
   - Padronize formatação (maiúsculas/minúsculas)
   - Verifique valores inconsistentes

2. **Consistência**
   - Use formatos consistentes para datas, números, etc.
   - Padronize nomes e categorias
   - Verifique ortografia

3. **Teste com amostra pequena**
   - Comece com poucas linhas para testar o processo
   - Verifique o mapeamento e resultados
   - Amplie gradualmente

### Durante a Importação

1. **Monitore o progresso**
   - Acompanhe o status em tempo real
   - Verifique erros assim que ocorrerem
   - Não deixe o processo sem supervisão

2. **Verifique os resultados**
   - Revise registros importados
   - Confirme que os dados estão corretos
   - Verifique integridade dos relacionamentos

### Após a Importação

1. **Valide os dados**
   - Faça buscas para confirmar importação
   - Verifique integridade dos dados
   - Confirme funcionalidades relacionadas

2. **Documente o processo**
   - Anote o que foi importado
   - Registre quaisquer problemas encontrados
   - Guarde cópia do arquivo original

---

## Solução de Problemas

### Importação Demorando Muito

- **Causa provável**: Arquivo muito grande ou servidor sobrecarregado
- **Solução**: Divida o arquivo em partes menores

### Erros Repetidos

- **Causa provável**: Problema estrutural nos dados
- **Solução**: Revise o formato e limpeza dos dados originais

### Dados Importados Incorretamente

- **Causa provável**: Mapeamento incorreto ou formato inesperado
- **Solução**: Revise o mapeamento e faça nova importação de teste

### Acesso Negado

- **Causa provável**: Permissões insuficientes ou tenant incorreto
- **Solução**: Verifique suas permissões com o administrador

---

## Dicas Avançadas

### Uso de Templates Personalizados

- Crie templates específicos para diferentes tipos de importação
- Use campos personalizados em seus templates
- Padronize processos com templates reutilizáveis

### Importação Programática

Para grandes volumes ou automação, considere usar a API de importação diretamente:

```
POST /api/import/upload
POST /api/import/:fileId/map
POST /api/import/:fileId/process
```

Consulte a [API-Import](API-Import.md) para detalhes técnicos.

### Importação em Lotes

- Divida grandes volumes em arquivos menores
- Espere o término de uma importação antes de iniciar outra
- Monitore o uso de recursos durante importações simultâneas

---

## Segurança e Privacidade

- **Dados sensíveis**: Evite importar informações altamente sensíveis
- **Auditoria**: O sistema registra todas as importações
- **Isolamento**: Dados são mantidos separadamente por tenant
- **Validação**: Todos os dados são validados antes da importação

---

## Suporte

Se encontrar problemas durante a importação:

1. Revise este guia
2. Verifique os arquivos de log de erro
3. Contate o suporte com:
   - Descrição do problema
   - Arquivo de exemplo (se possível)
   - Mensagens de erro específicas
   - Passos para reproduzir o problema