# Limites e Restrições

## Visão Geral

Esta documentação detalha os limites e restrições técnicas e funcionais do sistema de importação e exportação de dados. Esses limites garantem a estabilidade, segurança e desempenho do sistema multi-tenant.

---

## Limites Técnicos

### Tamanho de Arquivo

#### Importação
- **Tamanho máximo**: 10 MB por arquivo
- **Motivação**: Prevenir sobrecarga de memória e tempo de processamento excessivo
- **Exceções**: Não aplicável
- **Tratamento de excesso**: Rejeição imediata com mensagem de erro

#### Exportação
- **Tamanho máximo**: 50 MB por arquivo exportado
- **Motivação**: Garantir tempo de resposta aceitável e evitar sobrecarga de rede
- **Tratamento de excesso**: Exportação truncada com aviso

### Quantidade de Registros

#### Importação
- **Limite por lote**: 10.000 registros por arquivo
- **Limite por operação**: 50.000 registros por operação de importação
- **Tamanho de lote**: 100 registros por lote (padrão)
- **Motivação**: Manter desempenho e permitir feedback contínuo

#### Exportação
- **Limite por exportação**: 10.000 registros por requisição
- **Motivação**: Garantir tempo de resposta aceitável e evitar sobrecarga de memória
- **Tratamento de excesso**: Exportação truncada com aviso

### Tempo de Processamento

#### Importação
- **Tempo máximo de processamento individual**: 30 minutos por arquivo
- **Tempo máximo de validação**: 5 minutos por arquivo
- **Timeout de upload**: 10 minutos
- **Motivação**: Prevenir operações longas que travem o sistema

#### Exportação
- **Tempo máximo de exportação**: 10 minutos por requisição
- **Motivação**: Garantir disponibilidade do sistema para outros usuários

### Recursos do Sistema

#### Memória
- **Limite por operação de importação**: 512 MB
- **Limite por operação de exportação**: 256 MB
- **Motivação**: Prevenir consumo excessivo de recursos do servidor

#### CPU
- **Prioridade de processamento**: Baixa (para não impactar outras operações)
- **Quantidade máxima de operações simultâneas por tenant**: 3
- **Quantidade máxima de operações simultâneas no sistema**: 20

---

## Limites Funcionais

### Entidades Suportadas

#### Importação
- **Contatos (Contact)**: Suportado
- **Empresas (Company)**: Suportado
- **Leads (Lead)**: Suportado
- **Oportunidades (Opportunity)**: Suportado
- **Tarefas (Task)**: Não suportado
- **Notas (Note)**: Não suportado
- **Outras entidades personalizadas**: Suportado (com validação adicional)

#### Exportação
- **Contatos (Contact)**: Suportado
- **Empresas (Company)**: Suportado
- **Leads (Lead)**: Suportado
- **Oportunidades (Opportunity)**: Suportado
- **Tarefas (Task)**: Suportado
- **Notas (Note)**: Suportado
- **Outras entidades personalizadas**: Suportado

### Campos Suportados

#### Importação
- **Campos obrigatórios**: Devem ser fornecidos e válidos
- **Campos únicos**: São validados por tenant
- **Campos de relacionamento**: Suportados com validação de existência
- **Campos personalizados**: Suportados (devem existir previamente)
- **Campos de sistema (createdAt, updatedAt, etc.)**: Não suportados para importação

#### Exportação
- **Todos os campos da entidade**: Suportados
- **Campos de relacionamento**: Suportados (com opção de inclusão/exclusão)
- **Campos personalizados**: Suportados
- **Campos de sistema**: Suportados

### Tipos de Dados Suportados

#### Importação
- **Texto**: Suportado (até 5000 caracteres por campo)
- **Número**: Suportado (inteiro e decimal)
- **Data**: Suportado (com formatação específica)
- **Data/Hora**: Suportado
- **Email**: Suportado (com validação de formato)
- **Telefone**: Suportado (com normalização)
- **Booleano**: Suportado
- **Moeda**: Suportado
- **Porcentagem**: Suportado
- **URL**: Suportado (com validação de formato)
- **Seleção única**: Suportado (com validação de opções)
- **Seleção múltipla**: Suportado (com validação de opções)
- **JSON**: Não suportado para importação direta

#### Exportação
- **Todos os tipos acima**: Suportados
- **JSON**: Exportado como string formatada

---

## Restrições de Segurança

### Isolamento por Tenant
- **Restrição**: Usuários só podem importar/exportar dados do próprio tenant
- **Validação**: Verificação de `X-Tenant-Id` em todas as requisições
- **Violação**: Resulta em erro 403 (Acesso Negado)

### Permissões de Acesso
- **Importação**: Requer permissão `Import.create`
- **Exportação**: Requer permissão `Export.create`
- **Validação**: Verificação de ACL em cada requisição
- **Violação**: Resulta em erro 403 (Acesso Negado)

### Validação de Conteúdo
- **Arquivos**: Verificados quanto a conteúdo malicioso
- **Scripts**: Bloqueados em células de arquivos Excel
- **Caminhos de arquivo**: Validados para prevenir directory traversal
- **Conteúdo**: Sanitizado conforme necessário

### Rate Limiting
- **Limite de requisições**: 100 requisições por minuto por IP
- **Limite de operações**: 10 operações de importação/exportação por minuto por usuário
- **Excesso**: Bloqueio temporário de 15 minutos

---

## Restrições de Dados

### Dados Sensíveis
- **Campos de senha**: Não suportados para importação/exportação
- **Campos criptografados**: Exportados em formato seguro (não legível)
- **Campos de auditoria**: Não modificáveis via importação

### Dados de Relacionamento
- **Chaves estrangeiras**: Devem apontar para registros existentes no mesmo tenant
- **Validação cruzada**: Realizada durante a importação
- **Falha de relacionamento**: Impede importação da linha específica

### Dados de Unicidade
- **Campos únicos**: Validados por tenant durante importação
- **Conflitos**: Resultam em erro de validação
- **Tratamento**: Pode ser configurado para pular ou atualizar registros duplicados

---

## Limites de Desempenho

### Processamento em Lotes
- **Tamanho de lote configurável**: 10 a 1000 registros (padrão: 100)
- **Paralelismo**: Controlado para não sobrecarregar o banco de dados
- **Feedback**: Status atualizado a cada lote processado

### Cache
- **Metadados de entidade**: Cache TTL de 5 minutos
- **Resultados de validação**: Cache TTL de 2 minutos
- **Configurações de usuário**: Cache TTL de 10 minutos

### Banco de Dados
- **Conexões simultâneas**: Limitadas pelo pool de conexões (padrão: 10)
- **Tempo de query**: Timeout de 30 segundos
- **Transações**: Limitadas a 10 minutos de duração

---

## Tratamento de Erros e Exceções

### Erros de Limite
- **Descrição**: Ocorrem quando um limite técnico é excedido
- **Código HTTP**: 413 (Request Entity Too Large) ou 429 (Too Many Requests)
- **Mensagem**: Clara e descritiva sobre o limite excedido
- **Ação recomendada**: Reduzir o tamanho do arquivo ou quantidade de registros

### Erros de Restrição
- **Descrição**: Ocorrem quando uma restrição funcional ou de segurança é violada
- **Código HTTP**: 400 (Bad Request) ou 403 (Forbidden)
- **Mensagem**: Detalhada sobre a restrição violada
- **Ação recomendada**: Corrigir os dados ou obter permissões adequadas

### Tempo Esgotado (Timeout)
- **Descrição**: Ocorre quando uma operação leva mais tempo que o permitido
- **Código HTTP**: 408 (Request Timeout) ou 504 (Gateway Timeout)
- **Mensagem**: Indicando que a operação foi interrompida
- **Ação recomendada**: Dividir a operação em partes menores

---

## Configurações Personalizáveis

### Limites Configuráveis
- **Tamanho máximo de arquivo**: Pode ser ajustado no `importConfig.ts`
- **Tamanho de lote**: Pode ser ajustado por requisição (dentro dos limites)
- **Tempo de expiração de arquivos temporários**: Configurável (padrão: 1 hora)

### Valores Padrão
- **Tamanho de lote**: 100 registros
- **Tempo de expiração de arquivos**: 1 hora
- **Limite de rate**: 100 requisições/minuto por IP
- **Limite de operações simultâneas**: 3 por tenant

---

## Monitoramento e Alertas

### Métricas Monitoradas
- **Taxa de sucesso/fracasso de importações**
- **Tempo médio de processamento**
- **Uso de recursos (memória, CPU)**
- **Volume de dados processados**

### Alertas Configurados
- **Operações que excedem 80% do tempo limite**
- **Uso de memória acima de 80%**
- **Taxa de falhas acima de 5%**
- **Excesso de requisições por IP/usuário**

---

## Considerações para Administradores

### Ajuste de Limites
- **Limites podem ser ajustados** com base nas necessidades do tenant
- **Requer permissão administrativa**
- **Impacto no desempenho geral** deve ser considerado
- **Monitoramento aumentado** pode ser necessário após ajustes

### Planejamento de Capacidade
- **Análise de volume histórico** para dimensionamento adequado
- **Consideração de picos sazonais** no planejamento
- **Dimensionamento horizontal** como opção para alta demanda