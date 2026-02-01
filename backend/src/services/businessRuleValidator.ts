/**
 * Serviço para validação de regras de negócio
 * 
 * Responsável por:
 * - Validar regras de negócio específicas por entidade
 * - Verificar relacionamentos entre campos
 * - Validar restrições complexas que envolvem múltiplos campos
 * - Aplicar regras personalizadas por tenant
 */

import { ValidationError, ErrorSeverity } from '../types/validation.types';
import { prisma } from '../utils/prisma';

// Interface para regra de negócio
export interface BusinessRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  entityType: string;
  condition: string;
  action: string;
  field?: string;
  errorMessage?: string;
  warningMessage?: string;
  active: boolean;
  isDeleted: boolean;
  severity: string; // Nível de severidade da regra ('info' | 'warning' | 'error' | 'critical')
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Valida regras de negócio para uma entidade específica
 */
export async function validateBusinessRules(
  data: Record<string, any>,
  entityType: string,
  tenantId: string
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Validações específicas por entidade
  switch (entityType.toLowerCase()) {
    case 'contact':
      errors.push(...await validateContactBusinessRules(data, tenantId));
      break;
    case 'company':
      errors.push(...await validateCompanyBusinessRules(data, tenantId));
      break;
    case 'lead':
      errors.push(...await validateLeadBusinessRules(data, tenantId));
      break;
    case 'opportunity':
      errors.push(...await validateOpportunityBusinessRules(data, tenantId));
      break;
    case 'task':
      errors.push(...await validateTaskBusinessRules(data, tenantId));
      break;
    case 'note':
      errors.push(...await validateNoteBusinessRules(data, tenantId));
      break;
    default:
      // Para entidades desconhecidas, não faz validações específicas
      break;
  }

  // Validações personalizadas por tenant
  const customErrors = await validateCustomBusinessRules(data, entityType, tenantId);
  errors.push(...customErrors);

  return errors;
}

/**
 * Valida regras de negócio para Contatos
 */
async function validateContactBusinessRules(data: Record<string, any>, tenantId: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Validação: Se email for fornecido, não pode estar duplicado no mesmo tenant
  if (data.email) {
    const existingContact = await prisma.contact.findFirst({
      where: {
        tenantId,
        emails: {
          some: {
            email: data.email
          }
        },
        id: data.id ? { not: data.id } : undefined, // Ignora o próprio registro se estiver atualizando
        deletedAt: null
      }
    });

    if (existingContact) {
      errors.push({
        field: 'email',
        code: 'NOT_UNIQUE',
        message: `Já existe um contato com o email "${data.email}"`,
        severity: 'error',
        value: data.email
      });
    }
  }

  // Validação: Se CPF/CNPJ for fornecido, deve seguir formato brasileiro padrão
  if (data.taxId) {
    const taxId = String(data.taxId).replace(/\D/g, ''); // Remove caracteres não numéricos
    if (taxId.length !== 11 && taxId.length !== 14) { // CPF (11) ou CNPJ (14)
      errors.push({
        field: 'taxId',
        code: 'INVALID_FORMAT',
        message: 'CPF deve ter 11 dígitos e CNPJ deve ter 14 dígitos',
        severity: 'error',
        value: data.taxId
      });
    }
  }

  // Validação: Se data de nascimento for fornecida, não pode ser no futuro
  if (data.birthDate) {
    const birthDate = new Date(data.birthDate);
    if (birthDate > new Date()) {
      errors.push({
        field: 'birthDate',
        code: 'INVALID_DATE',
        message: 'Data de nascimento não pode ser no futuro',
        severity: 'error',
        value: data.birthDate
      });
    }
  }

  return errors;
}

/**
 * Valida regras de negócio para Empresas
 */
async function validateCompanyBusinessRules(data: Record<string, any>, tenantId: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Validação: Nome da empresa é obrigatório
  if (!data.name || data.name.trim() === '') {
    errors.push({
      field: 'name',
      code: 'REQUIRED',
      message: 'Nome da empresa é obrigatório',
      severity: 'error',
      value: data.name
    });
  }

  // Validação: Se CNPJ for fornecido, deve seguir formato brasileiro padrão
  if (data.cnpj) {
    const cnpj = String(data.cnpj).replace(/\D/g, '');
    if (cnpj.length !== 14) {
      errors.push({
        field: 'cnpj',
        code: 'INVALID_FORMAT',
        message: 'CNPJ deve ter 14 dígitos',
        severity: 'error',
        value: data.cnpj
      });
    }
  }

  // Validação: Se email for fornecido, não pode estar duplicado no mesmo tenant
  if (data.email) {
    const existingCompany = await prisma.company.findFirst({
      where: {
        tenantId,
        contacts: {
          some: {
            emails: {
              some: {
                email: data.email
              }
            }
          }
        },
        id: data.id ? { not: data.id } : undefined,
        deletedAt: null
      }
    });

    if (existingCompany) {
      errors.push({
        field: 'email',
        code: 'NOT_UNIQUE',
        message: `Já existe uma empresa com o email "${data.email}"`,
        severity: 'error',
        value: data.email
      });
    }
  }

  return errors;
}

/**
 * Valida regras de negócio para Leads
 */
async function validateLeadBusinessRules(data: Record<string, any>, tenantId: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Validação: Ou firstName ou email devem ser fornecidos
  if ((!data.firstName || data.firstName.trim() === '') && (!data.email || data.email.trim() === '')) {
    errors.push({
      field: 'firstName',
      code: 'REQUIRED_LOGICALLY',
      message: 'É necessário fornecer nome ou email para o lead',
      severity: 'error',
      value: data.firstName
    });
  }

  // Validação: Se email for fornecido, não pode estar duplicado no mesmo tenant
  if (data.email) {
    const existingLead = await prisma.lead.findFirst({
      where: {
        tenantId,
        email: data.email,
        id: data.id ? { not: data.id } : undefined,
        deletedAt: null
      }
    });

    if (existingLead) {
      errors.push({
        field: 'email',
        code: 'NOT_UNIQUE',
        message: `Já existe um lead com o email "${data.email}"`,
        severity: 'error',
        value: data.email
      });
    }
  }

  // Validação: Status deve ser um dos valores válidos
  if (data.status && !isValidLeadStatus(data.status)) {
    errors.push({
      field: 'status',
      code: 'INVALID_VALUE',
      message: `Status "${data.status}" não é um status válido para lead`,
      severity: 'error',
      value: data.status
    });
  }

  // Validação: Fonte deve ser um dos valores válidos
  if (data.source && !isValidLeadSource(data.source)) {
    errors.push({
      field: 'source',
      code: 'INVALID_VALUE',
      message: `Fonte "${data.source}" não é uma fonte válida para lead`,
      severity: 'error',
      value: data.source
    });
  }

  return errors;
}

/**
 * Valida regras de negócio para Oportunidades
 */
async function validateOpportunityBusinessRules(data: Record<string, any>, tenantId: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Validação: Nome é obrigatório
  if (!data.name || data.name.trim() === '') {
    errors.push({
      field: 'name',
      code: 'REQUIRED',
      message: 'Nome da oportunidade é obrigatório',
      severity: 'error',
      value: data.name
    });
  }

  // Validação: Valor não pode ser negativo
  if (data.value !== undefined && data.value < 0) {
    errors.push({
      field: 'value',
      code: 'OUT_OF_RANGE',
      message: 'Valor da oportunidade não pode ser negativo',
      severity: 'error',
      value: data.value
    });
  }

  // Validação: Probabilidade deve estar entre 0 e 100
  if (data.probability !== undefined && (data.probability < 0 || data.probability > 100)) {
    errors.push({
      field: 'probability',
      code: 'OUT_OF_RANGE',
      message: 'Probabilidade deve estar entre 0 e 100',
      severity: 'error',
      value: data.probability
    });
  }

  // Validação: Data de fechamento não pode ser anterior à data atual se status for fechado
  if (data.closeDate && data.status === 'CLOSED_WON' && new Date(data.closeDate) > new Date()) {
    errors.push({
      field: 'closeDate',
      code: 'INVALID_DATE',
      message: 'Data de fechamento não pode ser futura para oportunidades fechadas',
      severity: 'error',
      value: data.closeDate
    });
  }

  // Validação: StageId é obrigatório
  if (!data.stageId) {
    errors.push({
      field: 'stageId',
      code: 'REQUIRED',
      message: 'Estágio da oportunidade é obrigatório',
      severity: 'error',
      value: data.stageId
    });
  } else {
    // Validação: Stage deve existir
    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: data.stageId,
        tenantId
      }
    });

    if (!stage) {
      errors.push({
        field: 'stageId',
        code: 'INVALID_RELATION',
        message: `Estágio com ID "${data.stageId}" não encontrado`,
        severity: 'error',
        value: data.stageId
      });
    }
  }

  return errors;
}

/**
 * Valida regras de negócio para Tarefas
 */
async function validateTaskBusinessRules(data: Record<string, any>, _tenantId: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Validação: Título é obrigatório
  if (!data.title || data.title.trim() === '') {
    errors.push({
      field: 'title',
      code: 'REQUIRED',
      message: 'Título da tarefa é obrigatório',
      severity: 'error',
      value: data.title
    });
  }

  // Validação: Data de vencimento não pode ser anterior à data atual se status for concluído
  if (data.dueDate && data.status === 'COMPLETED' && new Date(data.dueDate) > new Date()) {
    errors.push({
      field: 'dueDate',
      code: 'INVALID_DATE',
      message: 'Data de vencimento não pode ser futura para tarefas concluídas',
      severity: 'error',
      value: data.dueDate
    });
  }

  // Validação: Prioridade deve ser um dos valores válidos
  if (data.priority && !isValidTaskPriority(data.priority)) {
    errors.push({
      field: 'priority',
      code: 'INVALID_VALUE',
      message: `Prioridade "${data.priority}" não é uma prioridade válida`,
      severity: 'error',
      value: data.priority
    });
  }

  // Validação: Status deve ser um dos valores válidos
  if (data.status && !isValidTaskStatus(data.status)) {
    errors.push({
      field: 'status',
      code: 'INVALID_VALUE',
      message: `Status "${data.status}" não é um status válido`,
      severity: 'error',
      value: data.status
    });
  }

  // Validação: Se entidade relacionada for especificada, ID também deve ser
  if (data.relatedEntityType && !data.relatedEntityId) {
    errors.push({
      field: 'relatedEntityId',
      code: 'REQUIRED_LOGICALLY',
      message: 'ID da entidade relacionada é necessário quando o tipo é especificado',
      severity: 'error',
      value: data.relatedEntityId
    });
  }

  return errors;
}

/**
 * Valida regras de negócio para Notas
 */
async function validateNoteBusinessRules(data: Record<string, any>, _tenantId: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Validação: Conteúdo é obrigatório
  if (!data.content || data.content.trim() === '') {
    errors.push({
      field: 'content',
      code: 'REQUIRED',
      message: 'Conteúdo da nota é obrigatório',
      severity: 'error',
      value: data.content
    });
  }

  // Validação: Tipo deve ser um dos valores válidos
  if (data.type && !isValidNoteType(data.type)) {
    errors.push({
      field: 'type',
      code: 'INVALID_VALUE',
      message: `Tipo "${data.type}" não é um tipo válido para nota`,
      severity: 'error',
      value: data.type
    });
  }

  // Validação: Se entidade relacionada for especificada, ID também deve ser
  if (data.relatedEntityType && !data.relatedEntityId) {
    errors.push({
      field: 'relatedEntityId',
      code: 'REQUIRED_LOGICALLY',
      message: 'ID da entidade relacionada é necessário quando o tipo é especificado',
      severity: 'error',
      value: data.relatedEntityId
    });
  }

  return errors;
}

/**
 * Valida regras de negócio personalizadas por tenant
 */
async function validateCustomBusinessRules(
  data: Record<string, any>,
  entityType: string,
  tenantId: string
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  try {
    // Recupera regras de negócio personalizadas para este tenant e entidade
    const customRules = await prisma.businessRule.findMany({
      where: {
        tenantId,
        entityType,
        active: true,
        isDeleted: false
      }
    });

    // Aplica cada regra personalizada
    for (const rule of customRules) {
      // Passa os campos necessários diretamente para a função de avaliação
      const ruleErrors = await evaluateCustomRule(data, {
        condition: rule.condition,
        errorMessage: rule.errorMessage || '', // Garante que errorMessage não seja nulo
        description: rule.description || undefined,
        action: rule.action,
        field: rule.field ?? undefined,
        name: rule.name,
        severity: rule.severity,
        warningMessage: rule.warningMessage || undefined
      } as BusinessRule);
      errors.push(...ruleErrors);
    }
  } catch (error) {
    console.error(`Erro ao validar regras de negócio personalizadas para ${entityType} no tenant ${tenantId}:`, error);
    // Não interrompe o processo, apenas registra o erro
  }

  return errors;
}

/**
 * Avalia uma regra de negócio personalizada
 */
async function evaluateCustomRule(
  data: Record<string, any>,
  rule: BusinessRule
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  try {
    // Avalia a condição da regra
    const conditionMet = evaluateCondition(data, rule.condition);

    if (conditionMet) {
      // A condição é verdadeira, então a regra se aplica
      if (rule.action === 'ERROR') {
        errors.push({
          field: rule.field || 'general',
          code: 'BUSINESS_RULE_VIOLATION',
          message: rule.errorMessage || `Regra de negócio violada: ${rule.name}`,
          severity: isValidErrorSeverity(rule.severity) ? rule.severity : 'error',
          value: rule.field ? data[rule.field] : undefined,
          details: {
            ruleName: rule.name,
            ruleDescription: rule.description
          }
        });
      } else if (rule.action === 'WARNING') {
        errors.push({
          field: rule.field || 'general',
          code: 'BUSINESS_RULE_WARNING',
          message: rule.warningMessage || `Aviso de regra de negócio: ${rule.name}`,
          severity: isValidErrorSeverity(rule.severity) ? rule.severity : 'warning',
          value: rule.field ? data[rule.field] : undefined,
          details: {
            ruleName: rule.name,
            ruleDescription: rule.description
          }
        });
      }
    }
  } catch (error) {
    console.error(`Erro ao avaliar regra personalizada "${rule.name}":`, error);
    // Não interrompe o processo, apenas registra o erro
  }

  return errors;
}

/**
 * Avalia uma condição de regra de negócio
 */
function evaluateCondition(data: Record<string, any>, condition: string): boolean {
  // Esta é uma implementação simplificada
  // Em um sistema real, isso seria mais robusto e seguro
  
  try {
    // Substitui os placeholders de campo por valores reais
    let evaluatedCondition = condition;
    
    for (const [field, value] of Object.entries(data)) {
      // Substitui {{fieldName}} por seu valor real
      const regex = new RegExp(`\\{\\{\\s*${field}\\s*\\}\\}`, 'g');
      if (typeof value === 'string') {
        evaluatedCondition = evaluatedCondition.replace(regex, `"${value}"`);
      } else {
        evaluatedCondition = evaluatedCondition.replace(regex, JSON.stringify(value));
      }
    }
    
    // Avalia a condição (em um sistema real, usaria um parser seguro)
    // Por segurança, vamos implementar uma avaliação mais segura
    return evaluateSafely(evaluatedCondition, data);
  } catch (error) {
    console.error(`Erro ao avaliar condição: ${condition}`, error);
    return false; // Retorna falso em caso de erro
  }
}

/**
 * Avaliação segura de expressões condicionais
 */
function evaluateSafely(condition: string, data: Record<string, any>): boolean {
  // Esta é uma implementação mais segura que evita eval malicioso
  // Em um sistema de produção real, usaria uma biblioteca专门 para avaliação de expressões
  
  try {
    // Substitui operadores comuns por suas versões seguras
    let safeCondition = condition
      .replace(/\bAND\b/gi, '&&')
      .replace(/\bOR\b/gi, '||')
      .replace(/\bNOT\b/gi, '!')
      .replace(/\btrue\b/gi, 'true')
      .replace(/\bfalse\b/gi, 'false');
    
    // Substitui os campos por seus valores (de forma segura)
    for (const [field, value] of Object.entries(data)) {
      const regex = new RegExp(`{{\\s*${field}\\s*}}`, 'g');
      if (typeof value === 'string') {
        // Escapa aspas para evitar problemas de parsing
        const escapedValue = value.replace(/"/g, '\\"');
        safeCondition = safeCondition.replace(regex, `"${escapedValue}"`);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        safeCondition = safeCondition.replace(regex, String(value));
      } else {
        // Para outros tipos, converte para string
        safeCondition = safeCondition.replace(regex, JSON.stringify(String(value)));
      }
    }
    
    // Remove qualquer tentativa de execução de código
    if (/[;{}]/.test(safeCondition)) {
      console.warn('Tentativa de injeção de código detectada:', safeCondition);
      return false;
    }
    
    // Avalia a expressão de forma segura
    // Em um sistema real, usaria uma biblioteca专门 como math.js ou expr-eval
    // Por enquanto, vamos retornar false para qualquer condição complexa
    // para evitar vulnerabilidades
    return evaluateSimpleExpression(safeCondition);
  } catch (error) {
    console.error('Erro na avaliação segura:', error);
    return false;
  }
}

/**
 * Avaliação de expressões simples
 */
function evaluateSimpleExpression(expression: string): boolean {
  // Implementação básica para expressões simples
  // Em um sistema real, usaria uma biblioteca专门
  
  try {
    // Exemplo de expressão: "status == 'active' && value > 100"
    // Esta implementação é limitada e deve ser expandida conforme necessário
    
    // Para fins de demonstração, vamos implementar uma lógica básica
    if (expression.includes('==')) {
      const [left, right] = expression.split('==').map(s => s.trim());
      const leftVal = processValue(left);
      const rightVal = processValue(right);
      return leftVal === rightVal;
    } else if (expression.includes('!=')) {
      const [left, right] = expression.split('!=').map(s => s.trim());
      const leftVal = processValue(left);
      const rightVal = processValue(right);
      return leftVal !== rightVal;
    } else if (expression.includes('>=')) {
      const [left, right] = expression.split('>=').map(s => s.trim());
      const leftVal = parseFloat(processValue(left));
      const rightVal = parseFloat(processValue(right));
      return !isNaN(leftVal) && !isNaN(rightVal) && leftVal >= rightVal;
    } else if (expression.includes('<=')) {
      const [left, right] = expression.split('<=').map(s => s.trim());
      const leftVal = parseFloat(processValue(left));
      const rightVal = parseFloat(processValue(right));
      return !isNaN(leftVal) && !isNaN(rightVal) && leftVal <= rightVal;
    } else if (expression.includes('>')) {
      const [left, right] = expression.split('>').map(s => s.trim());
      const leftVal = parseFloat(processValue(left));
      const rightVal = parseFloat(processValue(right));
      return !isNaN(leftVal) && !isNaN(rightVal) && leftVal > rightVal;
    } else if (expression.includes('<')) {
      const [left, right] = expression.split('<').map(s => s.trim());
      const leftVal = parseFloat(processValue(left));
      const rightVal = parseFloat(processValue(right));
      return !isNaN(leftVal) && !isNaN(rightVal) && leftVal < rightVal;
    } else if (expression.includes('&&')) {
      const parts = expression.split('&&').map(s => s.trim());
      return parts.every(part => evaluateSimpleExpression(part));
    } else if (expression.includes('||')) {
      const parts = expression.split('||').map(s => s.trim());
      return parts.some(part => evaluateSimpleExpression(part));
    } else {
      // Se não for uma expressão reconhecida, tenta converter para booleano
      return Boolean(expression.trim());
    }
  } catch (error) {
    console.error('Erro ao avaliar expressão simples:', error);
    return false;
  }
}

/**
 * Processa um valor para avaliação
 */
function processValue(value: string): any {
  // Remove aspas se estiverem presentes
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.substring(1, value.length - 1);
  }
  
  // Tenta converter para número
  const numValue = parseFloat(value);
  if (!isNaN(numValue) && isFinite(numValue)) {
    return numValue;
  }
  
  // Tenta converter para booleano
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  
  // Retorna como string
  return value;
}

/**
 * Funções auxiliares para validação de valores específicos
 */
function isValidLeadStatus(status: string): boolean {
  const validStatuses = [
    'NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 
    'APPOINTMENT_SET', 'DEMO_SCHEDULED', 'CLOSURE_SCHEDULED', 
    'CONVERTED', 'LOST'
  ];
  return validStatuses.includes(status.toUpperCase());
}

function isValidLeadSource(source: string): boolean {
  const validSources = [
    'WEBSITE', 'REFERRAL', 'AD_CAMPAIGN', 'SOCIAL_MEDIA', 
    'EVENT', 'OTHER'
  ];
  return validSources.includes(source.toUpperCase());
}

function isValidTaskPriority(priority: string): boolean {
  const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  return validPriorities.includes(priority.toUpperCase());
}

function isValidTaskStatus(status: string): boolean {
  const validStatuses = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  return validStatuses.includes(status.toUpperCase());
}

function isValidNoteType(type: string): boolean {
  const validTypes = ['COMMENT', 'CALL', 'MEETING', 'EMAIL', 'TASK'];
  return validTypes.includes(type.toUpperCase());
}

/**
 * Verifica se o nível de severidade é válido
 */
function isValidErrorSeverity(severity: string): severity is ErrorSeverity {
  const validSeverities: ErrorSeverity[] = ['info', 'warning', 'error', 'critical'];
  return validSeverities.includes(severity as ErrorSeverity);
}