/**
 * Utilitário para mapeamento de campos de arquivos para entidades
 * 
 * Responsável por:
 * - Converter dados de arquivos (CSV/Excel) para formato de entidade
 * - Aplicar transformações e validações de tipo
 * - Gerar previews de mapeamento
 * - Tratar erros de mapeamento granularmente
 */

import { FieldMapping, MappedRow, MappingPreview, MappingStats, MappingError } from '../types/mapping.types';
import { FieldMetadataService } from '../services/fieldMetadataService';

/**
 * Função principal para mapear campos de linhas para entidade
 */
export async function mapFieldsToEntity(
  rows: any[][],
  mappings: FieldMapping[],
  entityType: string,
  tenantId: string
): Promise<MappedRow[]> {
  const mappedRows: MappedRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const originalRow = rows[i];
    const mappedRow: MappedRow = {
      rowIndex: i,
      originalData: originalRow,
      mappedData: {},
      errors: [],
      isValid: true
    };

    // Aplica cada mapeamento à linha
    for (const mapping of mappings) {
      try {
        const { columnIndex, fieldName, required, fieldType, defaultValue, validationOverride } = mapping;
        
        // Verifica se o índice da coluna é válido
        if (columnIndex < 0 || columnIndex >= originalRow.length) {
          mappedRow.errors.push({
            type: 'FIELD_NOT_FOUND',
            severity: 'error',
            field: fieldName,
            column: columnIndex,
            row: i,
            message: `Coluna ${columnIndex} não encontrada na linha ${i}`,
            details: { columnIndex, originalRowLength: originalRow.length }
          });
          mappedRow.isValid = false;
          continue;
        }

        // Obtém o valor da coluna
        let value = originalRow[columnIndex];

        // Se o valor estiver vazio e houver valor padrão, usa o valor padrão
        if ((value === null || value === undefined || value === '') && defaultValue !== undefined) {
          value = defaultValue;
        }

        // Se o campo for obrigatório e o valor estiver vazio, adiciona erro
        if (required && (value === null || value === undefined || value === '')) {
          mappedRow.errors.push({
            type: 'REQUIRED_FIELD_EMPTY',
            severity: 'error',
            field: fieldName,
            column: columnIndex,
            row: i,
            message: `Campo obrigatório "${fieldName}" está vazio na linha ${i}`,
            details: { required, value }
          });
          mappedRow.isValid = false;
          continue;
        }

        // Se o valor estiver vazio e não for obrigatório, pula
        if (value === null || value === undefined || value === '') {
          continue;
        }

        // Converte o valor para o tipo apropriado
        const conversionResult = convertFieldValue(value, fieldType);
        if (!conversionResult.success) {
          mappedRow.errors.push({
            type: 'TYPE_MISMATCH',
            severity: 'error',
            field: fieldName,
            column: columnIndex,
            row: i,
            message: `Erro de conversão de tipo para campo "${fieldName}": ${conversionResult.error}`,
            details: { originalValue: value, expectedType: fieldType }
          });
          mappedRow.isValid = false;
          continue;
        }

        // Aplica validações específicas do campo
        const validationResult = await validateField(
          fieldName,
          conversionResult.value,
          entityType,
          tenantId,
          validationOverride
        );
        
        if (!validationResult.isValid) {
          mappedRow.errors.push({
            type: 'CUSTOM_VALIDATION_ERROR',
            severity: 'error',
            field: fieldName,
            column: columnIndex,
            row: i,
            message: `Erro de validação para campo "${fieldName}": ${validationResult.errorMessage}`,
            details: { value: conversionResult.value, validationErrors: validationResult.errors }
          });
          mappedRow.isValid = false;
          continue;
        }

        // Aplica transformações personalizadas se especificadas
        if (mapping.transformFn) {
          try {
            const transformedValue = await applyTransformFunction(
              conversionResult.value,
              mapping.transformFn
            );
            mappedRow.mappedData[fieldName] = transformedValue;
          } catch (transformError) {
            mappedRow.errors.push({
              type: 'CUSTOM_VALIDATION_ERROR',
              severity: 'error',
              field: fieldName,
              column: columnIndex,
              row: i,
              message: `Erro na transformação do campo "${fieldName}": ${transformError instanceof Error ? transformError.message : 'Erro desconhecido'}`,
              details: { originalValue: conversionResult.value, transformFunction: mapping.transformFn }
            });
            mappedRow.isValid = false;
          }
        } else {
          mappedRow.mappedData[fieldName] = conversionResult.value;
        }
      } catch (error) {
        // Erro inesperado no mapeamento
        mappedRow.errors.push({
          type: 'CUSTOM_VALIDATION_ERROR',
          severity: 'critical',
          field: mapping.fieldName,
          column: mapping.columnIndex,
          row: i,
          message: `Erro inesperado no mapeamento do campo "${mapping.fieldName}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          details: { error: error instanceof Error ? error.stack : error }
        });
        mappedRow.isValid = false;
      }
    }

    mappedRows.push(mappedRow);
  }

  return mappedRows;
}

/**
 * Converte um valor para o tipo apropriado
 */
export function convertFieldValue(value: any, fieldType?: string) {
  // Se não houver tipo definido, retorna o valor como string
  if (!fieldType) {
    return { success: true, value: String(value) };
  }

  try {
    switch (fieldType) {
      case 'number':
        // Tenta converter para número
        const numValue = parseFloat(String(value));
        if (isNaN(numValue)) {
          return { success: false, error: `Não é possível converter "${value}" para número` };
        }
        return { success: true, value: numValue };

      case 'date':
        // Tenta converter para data
        const dateValue = new Date(String(value));
        if (isNaN(dateValue.getTime())) {
          return { success: false, error: `Não é possível converter "${value}" para data` };
        }
        return { success: true, value: dateValue };

      case 'datetime':
        // Tenta converter para datetime
        const dateTimeValue = new Date(String(value));
        if (isNaN(dateTimeValue.getTime())) {
          return { success: false, error: `Não é possível converter "${value}" para data/hora` };
        }
        return { success: true, value: dateTimeValue };

      case 'boolean':
        // Converte para booleano
        if (typeof value === 'boolean') {
          return { success: true, value };
        }
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (['true', '1', 'yes', 'sim', 'on', 'ativo', 'verdadeiro'].includes(lowerValue)) {
            return { success: true, value: true };
          } else if (['false', '0', 'no', 'não', 'off', 'inativo', 'falso'].includes(lowerValue)) {
            return { success: true, value: false };
          }
        }
        if (typeof value === 'number') {
          return { success: true, value: !!value };
        }
        return { success: false, error: `Não é possível converter "${value}" para booleano` };

      case 'email':
        // Valida formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailValue = String(value).toLowerCase().trim();
        if (!emailRegex.test(emailValue)) {
          return { success: false, error: `Formato de email inválido: "${value}"` };
        }
        return { success: true, value: emailValue };

      case 'phone':
        // Remove caracteres não numéricos exceto + e espaços
        const phoneValue = String(value).replace(/[^\d\s+()-]/g, '');
        return { success: true, value: phoneValue };

      case 'url':
        // Valida formato de URL
        try {
          new URL(String(value));
          return { success: true, value: String(value) };
        } catch {
          return { success: false, error: `Formato de URL inválido: "${value}"` };
        }

      case 'text':
      case 'textarea':
      default:
        // Para textos, apenas converte para string
        return { success: true, value: String(value) };
    }
  } catch (error) {
    return { success: false, error: `Erro na conversão de tipo: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
  }
}

/**
 * Valida um campo de acordo com as regras definidas
 */
async function validateField(
  fieldName: string,
  value: any,
  entityType: string,
  tenantId: string,
  validationOverride?: any[]
): Promise<{ isValid: boolean; errorMessage?: string; errors?: any[] }> {
  // Primeiro, obtemos as informações do campo
  const fieldInfo = await FieldMetadataService.getFieldInfo(entityType, fieldName, tenantId);
  
  if (!fieldInfo) {
    return {
      isValid: false,
      errorMessage: `Campo "${fieldName}" não encontrado na entidade "${entityType}"`
    };
  }

  // Validações padrão baseadas nas propriedades do campo
  const errors: MappingError[] = [];

  // Validação de tipo
  if (fieldInfo.type && typeof value !== fieldInfo.type) {
    // A conversão de tipo já foi feita anteriormente, mas fazemos uma verificação extra
    if (fieldInfo.type === 'number' && typeof value !== 'number') {
      errors.push({
        type: 'TYPE_MISMATCH',
        severity: 'error',
        field: fieldName,
        message: `Tipo inválido para "${fieldName}", esperado: ${fieldInfo.type}, recebido: ${typeof value}`
      });
    }
  }

  // Validação de obrigatoriedade (já foi feita anteriormente, mas mantemos como verificação extra)
  if (fieldInfo.required && (value === null || value === undefined || value === '')) {
    errors.push({
      type: 'REQUIRED_FIELD_EMPTY',
      severity: 'error',
      field: fieldName,
      message: `Campo obrigatório "${fieldName}" está vazio`
    });
  }

  // Validação de unicidade (simplificada - na prática, precisaria verificar no banco de dados)
  if (fieldInfo.unique && value !== '') {
    // Neste ponto, não temos como verificar unicidade sem consultar o banco de dados
    // Esta validação seria feita durante o processo de importação real
  }

  // Validações personalizadas
  const validationRules = validationOverride || fieldInfo.validationRules || [];
  for (const rule of validationRules) {
    const ruleResult = validateRule(value, rule);
    if (!ruleResult.isValid) {
      errors.push({
        type: 'CUSTOM_VALIDATION_ERROR',
        severity: 'error',
        field: fieldName,
        message: ruleResult.message
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errorMessage: errors.length > 0 ? errors[0].message : undefined,
    errors
  };
}

/**
 * Valida uma regra específica
 */
function validateRule(value: any, rule: any): { isValid: boolean; message: string } {
  switch (rule.rule) {
    case 'regex':
      const regex = new RegExp(rule.value);
      if (!regex.test(String(value))) {
        return {
          isValid: false,
          message: rule.message || `Valor "${value}" não corresponde ao padrão esperado`
        };
      }
      break;
    case 'minLength':
      if (String(value).length < rule.value) {
        return {
          isValid: false,
          message: rule.message || `Valor "${value}" é muito curto (mínimo: ${rule.value})`
        };
      }
      break;
    case 'maxLength':
      if (String(value).length > rule.value) {
        return {
          isValid: false,
          message: rule.message || `Valor "${value}" é muito longo (máximo: ${rule.value})`
        };
      }
      break;
    case 'minValue':
      if (typeof value === 'number' && value < rule.value) {
        return {
          isValid: false,
          message: rule.message || `Valor ${value} é menor que o mínimo permitido (${rule.value})`
        };
      }
      break;
    case 'maxValue':
      if (typeof value === 'number' && value > rule.value) {
        return {
          isValid: false,
          message: rule.message || `Valor ${value} é maior que o máximo permitido (${rule.value})`
        };
      }
      break;
    default:
      return { isValid: true, message: '' };
  }

  return { isValid: true, message: '' };
}

/**
 * Aplica uma função de transformação personalizada
 */
async function applyTransformFunction(value: any, functionName: string): Promise<any> {
  // Neste exemplo, implementamos algumas funções de transformação comuns
  switch (functionName) {
    case 'toUpperCase':
      return typeof value === 'string' ? value.toUpperCase() : value;
    case 'toLowerCase':
      return typeof value === 'string' ? value.toLowerCase() : value;
    case 'trim':
      return typeof value === 'string' ? value.trim() : value;
    case 'capitalize':
      if (typeof value === 'string') {
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      }
      return value;
    case 'normalizePhone':
      if (typeof value === 'string') {
        // Remove todos os caracteres não numéricos
        return value.replace(/\D/g, '');
      }
      return value;
    case 'normalizeEmail':
      if (typeof value === 'string') {
        return value.toLowerCase().trim();
      }
      return value;
    default:
      // Em um sistema real, poderíamos ter um sistema de plugins ou funções registradas
      console.warn(`Função de transformação desconhecida: ${functionName}`);
      return value;
  }
}

/**
 * Gera um preview de mapeamento com base nas primeiras linhas
 */
export async function generateMappingPreview(
  rows: any[][],
  mappings: FieldMapping[],
  entityType: string,
  tenantId: string,
  maxPreviewRows: number = 5
): Promise<MappingPreview> {
  const startTime = Date.now();

  // Limita o número de linhas para o preview
  const previewRows = rows.slice(0, maxPreviewRows);

  // Mapeia as linhas
  const mappedRows = await mapFieldsToEntity(previewRows, mappings, entityType, tenantId);

  // Calcula estatísticas
  const stats: MappingStats = {
    totalRows: previewRows.length,
    validRows: mappedRows.filter(row => row.isValid).length,
    invalidRows: mappedRows.filter(row => !row.isValid).length,
    errorCount: mappedRows.reduce((count, row) => count + row.errors.length, 0),
    warningCount: 0, // Avisos seriam implementados em uma versão futura
    fieldsMapped: mappings.length,
    fieldsUnmapped: 0, // Não temos informação sobre campos não mapeados aqui
    processingTimeMs: Date.now() - startTime
  };

  // Coleta todos os erros e avisos
  const allErrors: MappingError[] = [];
  const allWarnings: MappingError[] = [];

  for (const row of mappedRows) {
    allErrors.push(...row.errors);
  }

  return {
    previewRows: mappedRows,
    stats,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Gera um preview detalhado com informações adicionais para o usuário
 */
export async function generateDetailedMappingPreview(
  rows: any[][],
  mappings: FieldMapping[],
  entityType: string,
  tenantId: string,
  maxPreviewRows: number = 5
): Promise<MappingPreview> {
  const startTime = Date.now();

  // Limita o número de linhas para o preview
  const previewRows = rows.slice(0, maxPreviewRows);

  // Mapeia as linhas
  const mappedRows = await mapFieldsToEntity(previewRows, mappings, entityType, tenantId);

  // Calcula estatísticas detalhadas
  const stats: MappingStats = {
    totalRows: previewRows.length,
    validRows: mappedRows.filter(row => row.isValid).length,
    invalidRows: mappedRows.filter(row => !row.isValid).length,
    errorCount: mappedRows.reduce((count, row) => count + row.errors.length, 0),
    warningCount: 0, // Avisos seriam implementados em uma versão futura
    fieldsMapped: mappings.length,
    fieldsUnmapped: 0, // Não temos informação sobre campos não mapeados aqui
    processingTimeMs: Date.now() - startTime
  };

  // Coleta todos os erros e categoriza por tipo
  const allErrors: MappingError[] = [];
  const allWarnings: MappingError[] = [];

  for (const row of mappedRows) {
    allErrors.push(...row.errors);
  }

  // Adiciona informações sobre campos mapeados e não mapeados
  const availableFields = await FieldMetadataService.getEntityFields(entityType, tenantId);
  const mappedFieldNames = new Set(mappings.map(m => m.fieldName));
  const unmappedFields = availableFields.filter(f => !mappedFieldNames.has(f.name));

  stats.fieldsUnmapped = unmappedFields.length;

  // Cria um preview mais informativo
  const detailedPreviewRows = mappedRows.map(row => {
    // Adiciona informações sobre os dados originais para comparação
    const enhancedRow = { ...row };
    enhancedRow.originalData = row.originalData; // Já está incluído, mas destacando

    return enhancedRow;
  });

  return {
    previewRows: detailedPreviewRows,
    stats,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Validação completa de mapeamento
 */
export async function validateMapping(
  mappings: FieldMapping[],
  entityType: string,
  tenantId: string
): Promise<{ isValid: boolean; errors: MappingError[]; warnings: MappingError[] }> {
  const errors: MappingError[] = [];
  const warnings: MappingError[] = [];

  // Verifica se há mapeamentos
  if (!mappings || mappings.length === 0) {
    errors.push({
      type: 'FIELD_NOT_FOUND',
      severity: 'error',
      message: 'Nenhum mapeamento fornecido',
      details: { mappingsCount: 0 }
    });
  }

  // Recupera os campos disponíveis para a entidade
  const availableFields = await FieldMetadataService.getEntityFields(entityType, tenantId);

  // Verifica cada mapeamento
  const usedColumns = new Set<number>();
  const usedFields = new Set<string>();

  for (const [index, mapping] of mappings.entries()) {
    const { columnIndex, fieldName, required, fieldType } = mapping;

    // Verifica se o índice da coluna já foi usado
    if (usedColumns.has(columnIndex)) {
      errors.push({
        type: 'DUPLICATE_MAPPING',
        severity: 'error',
        field: fieldName,
        column: columnIndex,
        message: `Coluna ${columnIndex} mapeada para múltiplos campos`,
        details: { mappingIndex: index }
      });
    } else {
      usedColumns.add(columnIndex);
    }

    // Verifica se o campo já foi mapeado
    if (usedFields.has(fieldName)) {
      errors.push({
        type: 'DUPLICATE_MAPPING',
        severity: 'error',
        field: fieldName,
        message: `Campo "${fieldName}" mapeado de múltiplas colunas`,
        details: { mappingIndex: index }
      });
    } else {
      usedFields.add(fieldName);
    }

    // Verifica se o campo existe na entidade
    const fieldExists = availableFields.some(f => f.name === fieldName);
    if (!fieldExists) {
      errors.push({
        type: 'FIELD_NOT_FOUND',
        severity: 'error',
        field: fieldName,
        message: `Campo "${fieldName}" não encontrado na entidade "${entityType}"`,
        details: { availableFields: availableFields.map(f => f.name) }
      });
    } else {
      // Se o campo existe, verifica compatibilidade de tipo se especificado
      const fieldDefinition = availableFields.find(f => f.name === fieldName);
      if (fieldDefinition && fieldType && !isTypeCompatible(fieldDefinition.type, fieldType)) {
        warnings.push({
          type: 'TYPE_MISMATCH',
          severity: 'warning',
          field: fieldName,
          message: `Campo "${fieldName}" é do tipo "${fieldDefinition.type}", mas está mapeado como "${fieldType}"`,
          details: { expectedType: fieldDefinition.type, providedType: fieldType }
        });
      }

      // Verifica se campos obrigatórios estão marcados corretamente
      if (fieldDefinition && fieldDefinition.required && !required) {
        warnings.push({
          type: 'REQUIRED_FIELD_EMPTY',
          severity: 'warning',
          field: fieldName,
          message: `Campo "${fieldName}" é obrigatório na entidade mas não está marcado como obrigatório no mapeamento`,
          details: { fieldIsRequired: fieldDefinition.required, markedAsRequired: required }
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validação de mapeamento com base em dados reais
 */
export async function validateMappingWithData(
  mappings: FieldMapping[],
  rows: any[][],
  entityType: string,
  tenantId: string
): Promise<{ isValid: boolean; errors: MappingError[]; warnings: MappingError[]; sampleErrors?: any[] }> {
  const { isValid, errors, warnings } = await validateMapping(mappings, entityType, tenantId);

  if (!isValid) {
    return { isValid, errors, warnings };
  }

  // Se o mapeamento básico for válido, faz validação com dados reais
  const sampleErrors: any[] = [];

  // Limitar a quantidade de linhas para validação com dados reais
  const sampleRows = rows.slice(0, Math.min(10, rows.length));

  for (let rowIndex = 0; rowIndex < sampleRows.length; rowIndex++) {
    const row = sampleRows[rowIndex];

    for (const mapping of mappings) {
      const { columnIndex, fieldName, required, fieldType } = mapping;

      // Verifica se o índice da coluna é válido para esta linha
      if (columnIndex >= row.length) {
        sampleErrors.push({
          rowIndex,
          field: fieldName,
          error: `Índice da coluna ${columnIndex} excede o número de colunas (${row.length}) na linha ${rowIndex}`
        });
        continue;
      }

      const value = row[columnIndex];

      // Se o campo for obrigatório e o valor estiver vazio
      if (required && (value === null || value === undefined || value === '')) {
        sampleErrors.push({
          rowIndex,
          field: fieldName,
          value,
          error: `Campo obrigatório "${fieldName}" está vazio na linha ${rowIndex}`
        });
      }

      // Se houver tipo definido, tenta converter e verificar
      if (fieldType && value !== null && value !== undefined && value !== '') {
        const conversionResult = convertFieldValue(value, fieldType);
        if (!conversionResult.success) {
          sampleErrors.push({
            rowIndex,
            field: fieldName,
            value,
            error: `Erro de conversão de tipo: ${conversionResult.error}`
          });
        }
      }
    }
  }

  // Adiciona erros encontrados durante a validação com dados reais
  if (sampleErrors.length > 0) {
    errors.push({
      type: 'CUSTOM_VALIDATION_ERROR',
      severity: 'error',
      message: `Erros encontrados ao validar com dados reais: ${sampleErrors.length} problema(s)`,
      details: { sampleErrors }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sampleErrors
  };
}

/**
 * Verifica compatibilidade de tipos
 */
function isTypeCompatible(expectedType: string, providedType: string): boolean {
  if (expectedType === providedType) return true;

  // Agrupamentos de tipos compatíveis
  const textLikeTypes = ['text', 'email', 'phone', 'url', 'textarea', 'select'];
  const numericTypes = ['number', 'currency', 'percentage'];
  const dateTypes = ['date', 'datetime'];

  // Verifica compatibilidade dentro dos grupos
  if (textLikeTypes.includes(expectedType) && textLikeTypes.includes(providedType)) return true;
  if (numericTypes.includes(expectedType) && numericTypes.includes(providedType)) return true;
  if (dateTypes.includes(expectedType) && dateTypes.includes(providedType)) return true;

  // Boolean pode vir de texto em alguns casos
  if ((expectedType === 'boolean') && (providedType === 'text')) return true;

  return false;
}