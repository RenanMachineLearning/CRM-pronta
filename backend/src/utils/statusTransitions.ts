/**
 * Utilitário para validação de transições de status
 * 
 * Define regras de negócio para transições de status de Leads e Oportunidades.
 */

import { LeadStatus, OpportunityStatus } from '@prisma/client';

// Matriz de transições permitidas para Leads
// [statusAtual][novoStatus] = true se permitido
const LEAD_TRANSITIONS: Record<LeadStatus, Set<LeadStatus>> = {
  NEW: new Set(['QUALIFIED', 'LOST', 'CONVERTED']), // CONVERTED apenas via conversão automática
  QUALIFIED: new Set(['NEW', 'LOST', 'CONVERTED']), // CONVERTED apenas via conversão automática
  CONVERTED: new Set([]), // Nenhuma transição permitida (status final)
  LOST: new Set(['NEW', 'QUALIFIED']), // Reativar lead
};

// Matriz de transições permitidas para Oportunidades
// [statusAtual][novoStatus] = true se permitido
const OPPORTUNITY_TRANSITIONS: Record<OpportunityStatus, Set<OpportunityStatus>> = {
  OPEN: new Set(['WON', 'LOST', 'ARCHIVED']),
  WON: new Set(['ARCHIVED']), // Apenas arquivar
  LOST: new Set(['OPEN', 'ARCHIVED']), // Reativar ou arquivar
  ARCHIVED: new Set(['OPEN']), // Reativar
};

/**
 * Valida se uma transição de status de Lead é permitida
 * 
 * @param currentStatus - Status atual do lead
 * @param newStatus - Novo status desejado
 * @param isConversion - Se a mudança é resultado de uma conversão (permite CONVERTED)
 * @throws Error se transição não é permitida
 */
export function validateLeadStatusTransition(
  currentStatus: LeadStatus,
  newStatus: LeadStatus,
  isConversion: boolean = false
): void {
  // Se é conversão, permitir mudança para CONVERTED de qualquer status (exceto CONVERTED)
  if (isConversion && newStatus === 'CONVERTED') {
    if (currentStatus === 'CONVERTED') {
      throw new Error('Lead já está convertido e não pode ser convertido novamente');
    }
    return; // Conversão é sempre permitida (exceto se já convertido)
  }

  // Se não é conversão, não permitir mudança manual para CONVERTED
  if (!isConversion && newStatus === 'CONVERTED') {
    throw new Error('Status CONVERTED só pode ser definido automaticamente durante a conversão do lead');
  }

  // Verificar se transição é permitida
  const allowedTransitions = LEAD_TRANSITIONS[currentStatus];
  if (!allowedTransitions.has(newStatus)) {
    throw new Error(
      `Transição de status inválida para Lead: ${currentStatus} → ${newStatus}. ` +
      `Transições permitidas de ${currentStatus}: ${Array.from(allowedTransitions).join(', ')}`
    );
  }
}

/**
 * Valida se uma transição de status de Oportunidade é permitida
 * 
 * @param currentStatus - Status atual da oportunidade
 * @param newStatus - Novo status desejado
 * @throws Error se transição não é permitida
 */
export function validateOpportunityStatusTransition(
  currentStatus: OpportunityStatus,
  newStatus: OpportunityStatus
): void {
  // Se status não mudou, permitir (não é uma transição)
  if (currentStatus === newStatus) {
    return;
  }

  // Verificar se transição é permitida
  const allowedTransitions = OPPORTUNITY_TRANSITIONS[currentStatus];
  if (!allowedTransitions.has(newStatus)) {
    throw new Error(
      `Transição de status inválida para Opportunity: ${currentStatus} → ${newStatus}. ` +
      `Transições permitidas de ${currentStatus}: ${Array.from(allowedTransitions).join(', ')}`
    );
  }
}

/**
 * Obtém lista de status permitidos para transição a partir de um status atual de Lead
 * 
 * @param currentStatus - Status atual do lead
 * @param includeConversion - Se deve incluir CONVERTED (apenas para conversão)
 * @returns Array de status permitidos
 */
export function getAllowedLeadStatusTransitions(
  currentStatus: LeadStatus,
  includeConversion: boolean = false
): LeadStatus[] {
  const allowed = Array.from(LEAD_TRANSITIONS[currentStatus]);
  if (includeConversion && currentStatus !== 'CONVERTED') {
    allowed.push('CONVERTED');
  }
  return allowed;
}

/**
 * Obtém lista de status permitidos para transição a partir de um status atual de Oportunidade
 * 
 * @param currentStatus - Status atual da oportunidade
 * @returns Array de status permitidos
 */
export function getAllowedOpportunityStatusTransitions(
  currentStatus: OpportunityStatus
): OpportunityStatus[] {
  return Array.from(OPPORTUNITY_TRANSITIONS[currentStatus]);
}
