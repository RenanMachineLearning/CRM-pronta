/**
 * Validação de unicidade de campos
 * 
 * Valida se um valor de campo marcado como `unique: true` já existe,
 * considerando isolamento por tenant e ignorando o registro atual em atualizações.
 * 
 * IMPORTANTE - Implementação Preparatória:
 * - As tabelas de dados das entidades do sistema (Contact, Company, etc.) ainda não existem
 *   (serão criadas nas Etapas 5-7)
 * - A tabela EntityData também ainda não existe (será criada na seção 10)
 * - Esta implementação valida apenas a estrutura (campo existe, é único, entidade existe)
 * - Quando as tabelas existirem, a busca real será implementada
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Exceção customizada para erros de validação de unicidade
 */
export class UniqueFieldValidationError extends Error {
  constructor(
    public fieldName: string,
    public fieldLabel: string,
    message: string
  ) {
    super(message);
    this.name = 'UniqueFieldValidationError';
    // Manter stack trace para debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UniqueFieldValidationError);
    }
  }
}

/**
 * Valida se valor de campo único já existe
 * 
 * IMPLEMENTAÇÃO PREPARATÓRIA:
 * - Valida apenas estrutura (campo existe, é único, entidade existe)
 * - Não busca dados reais por enquanto (retorna sucesso se estrutura válida)
 * - Quando tabelas existirem, implementar busca real
 * 
 * @param tenantId - ID do tenant (obrigatório para isolamento)
 * @param entityId - ID da entidade
 * @param fieldId - ID do campo a validar
 * @param value - Valor a ser validado
 * @param recordId - ID do registro atual (opcional, para atualizações - ignora este registro na busca)
 * @throws UniqueFieldValidationError se campo não encontrado, não é único, ou valor duplicado
 * @throws Error se entidade não encontrada
 */
export async function validateUniqueField(
  tenantId: string,
  entityId: string,
  fieldId: string,
  value: any,
  recordId?: string
): Promise<void> {
  // Validar que entidade existe e pertence ao tenant
  const entity = await prisma.entity.findFirst({
    where: {
      id: entityId,
      tenantId, // Isolamento multi-tenant obrigatório
    },
  });

  if (!entity) {
    throw new Error('Entidade não encontrada');
  }

  // Buscar campo e validar que existe e pertence à entidade
  const field = await prisma.field.findFirst({
    where: {
      id: fieldId,
      entityId,
      tenantId, // Isolamento multi-tenant obrigatório
      isDeleted: false, // Apenas campos não deletados
    },
  });

  if (!field) {
    throw new UniqueFieldValidationError(
      fieldId,
      'Campo',
      'Campo não encontrado ou não pertence à entidade'
    );
  }

  // Validar que campo está marcado como único
  if (!field.unique) {
    throw new UniqueFieldValidationError(
      field.name,
      field.label,
      'Campo não está marcado como único'
    );
  }

  // Se valor é null/undefined e campo não é required, permitir (múltiplos nulls são permitidos em SQL)
  if (value === null || value === undefined) {
    // Valores nulos são permitidos mesmo em campos únicos (comportamento padrão SQL)
    return;
  }

  // Validar que valor não é string vazia (se campo é required)
  if (field.required && typeof value === 'string' && value.trim().length === 0) {
    throw new UniqueFieldValidationError(
      field.name,
      field.label,
      'Valor não pode ser vazio para campo obrigatório'
    );
  }

  // ============================================================================
  // IMPLEMENTAÇÃO PREPARATÓRIA - Apenas validar estrutura por enquanto
  // ============================================================================
  //
  // Quando as tabelas existirem, implementar busca real:
  //
  // Para entidades do sistema (isSystem=true):
  // - Contact, Company, Lead, Opportunity, Task, Note terão tabelas próprias
  // - Query será: SELECT id FROM [tabela] WHERE tenantId = ? AND [campo] = ? [AND id != ?]
  // - Exemplo: SELECT id FROM contacts WHERE tenant_id = $1 AND email = $2 AND id != $3
  //
  // Para entidades customizadas (isSystem=false):
  // - Usar tabela EntityData (será criada na seção 10)
  // - Query será: SELECT id FROM entity_data WHERE tenantId = ? AND entityId = ? AND data->>'[campo]' = ? [AND id != ?]
  // - Exemplo: SELECT id FROM entity_data WHERE tenant_id = $1 AND entity_id = $2 AND data->>'customField' = $3 AND id != $4
  //
  // Por enquanto, apenas validar estrutura (retornar sucesso se estrutura válida)
  // ============================================================================

  // TODO: Quando tabelas existirem, implementar busca real aqui
  // Exemplo para entidades do sistema:
  // if (entity.isSystem) {
  //   const tableName = entity.name.toLowerCase() + 's'; // contacts, companies, etc.
  //   const fieldName = field.name;
  //   
  //   // Normalizar valor para busca (case-insensitive para strings)
  //   let searchValue = value;
  //   if (typeof value === 'string') {
  //     searchValue = value.trim().toLowerCase();
  //   }
  //   
  //   // Construir query
  //   let query = `SELECT id FROM ${tableName} WHERE tenant_id = $1 AND ${fieldName} = $2`;
  //   const params: any[] = [tenantId, searchValue];
  //   
  //   // Se é atualização, excluir registro atual
  //   if (recordId) {
  //     query += ' AND id != $3';
  //     params.push(recordId);
  //   }
  //   
  //   const existing = await prisma.$queryRawUnsafe(query, ...params);
  //   
  //   if (existing && Array.isArray(existing) && existing.length > 0) {
  //     throw new UniqueFieldValidationError(
  //       field.name,
  //       field.label,
  //       `Valor "${value}" já está em uso`
  //     );
  //   }
  // }
  //
  // Exemplo para entidades customizadas:
  // else {
  //   // Normalizar valor para busca
  //   let searchValue = value;
  //   if (typeof value === 'string') {
  //     searchValue = value.trim();
  //   }
  //   
  //   const where: any = {
  //     tenantId,
  //     entityId,
  //     data: {
  //       path: [field.name],
  //       equals: searchValue
  //     }
  //   };
  //   
  //   // Se é atualização, excluir registro atual
  //   if (recordId) {
  //     where.id = { not: recordId };
  //   }
  //   
  //   const existing = await prisma.entityData.findFirst({
  //     where
  //   });
  //   
  //   if (existing) {
  //     throw new UniqueFieldValidationError(
  //       field.name,
  //       field.label,
  //       `Valor "${value}" já está em uso`
  //     );
  //   }
  // }

  // Por enquanto, apenas validar estrutura (implementação preparatória)
  // Quando tabelas existirem, a busca real será implementada acima
}

