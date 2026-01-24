/**
 * Tipos e interfaces para o sistema de validação de dados de importação
 */

// Códigos de erro de validação
export type ValidationErrorCode =
  | 'REQUIRED'
  | 'INVALID_TYPE'
  | 'INVALID_FORMAT'
  | 'NOT_UNIQUE'
  | 'OUT_OF_RANGE'
  | 'TOO_LONG'
  | 'TOO_SHORT'
  | 'PATTERN_MISMATCH'
  | 'INVALID_RELATION'
  | 'BUSINESS_RULE_VIOLATION'
  | 'MALFORMED_DATA'
  | 'VALUE_CONVERSION_ERROR'
  | 'INVALID_ENTITY'
  | 'UNIQUENESS_CHECK_ERROR'
  | 'COMPOSITE_UNIQUENESS_CHECK_ERROR'
  | 'INVALID_VALUE'
  | 'INVALID_DATE'
  | 'REQUIRED_LOGICALLY'
  | 'BUSINESS_RULE_WARNING'
  | 'INVALID_FIELD'
  | 'TOO_MANY_ITEMS'
  | 'PAYLOAD_TOO_LARGE';

// Níveis de severidade de erro
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// Interface para erro de validação
export interface ValidationError {
  field: string; // Nome do campo que falhou na validação
  code: ValidationErrorCode; // Código do tipo de erro
  message: string; // Mensagem descritiva do erro
  severity: ErrorSeverity; // Nível de severidade
  value?: any; // Valor que causou o erro (opcional)
  expectedType?: string; // Tipo esperado (para erros de tipo)
  details?: Record<string, any>; // Detalhes adicionais específicos do erro
}

// Interface para regras de validação de campo
export interface FieldValidationRules {
  required?: boolean; // Campo obrigatório
  type?: 'text' | 'number' | 'date' | 'datetime' | 'email' | 'phone' | 'boolean' | 'select' | 'multiselect' | 'currency' | 'percentage' | 'url' | 'textarea' | 'relationship' | 'pattern';
  unique?: boolean; // Valor deve ser único no tenant
  maxLength?: number; // Comprimento máximo para strings
  minLength?: number; // Comprimento mínimo para strings
  maxValue?: number; // Valor máximo para números
  minValue?: number; // Valor mínimo para números
  pattern?: string | RegExp; // Padrão regex para validação
  options?: string[]; // Opções para campos select/multiselect
  relatedEntity?: string; // Entidade relacionada para campos do tipo relationship
  relatedField?: string; // Campo relacionado
  customValidator?: string; // Nome de validador personalizado
  businessRules?: BusinessRule[]; // Regras de negócio específicas
}

// Interface para regra de negócio
export interface BusinessRule {
  condition: string; // Condição que deve ser satisfeita
  errorMessage: string; // Mensagem de erro se condição não for satisfeita
  dependsOn?: string[]; // Campos dos quais esta regra depende
}

// Interface para resultado de validação
export interface ValidationResult {
  isValid: boolean; // Indica se a validação foi bem-sucedida
  errors: ValidationError[]; // Lista de erros encontrados
  warnings: ValidationError[]; // Lista de avisos (não bloqueiam a importação)
  normalizedData: Record<string, any>; // Dados normalizados após validação
  stats: ValidationStats; // Estatísticas da validação
}

// Interface para estatísticas de validação
export interface ValidationStats {
  totalFields: number; // Total de campos analisados
  validFields: number; // Campos válidos
  invalidFields: number; // Campos inválidos
  errorCount: number; // Total de erros
  warningCount: number; // Total de avisos
  processingTimeMs: number; // Tempo de processamento em milissegundos
  normalizationApplied: number; // Quantidade de normalizações aplicadas
}

// Interface para opções de normalização
export interface NormalizationOptions {
  trimStrings?: boolean; // Remover espaços em branco no início e fim
  lowercaseEmails?: boolean; // Converter emails para minúsculas
  normalizePhone?: boolean; // Remover caracteres especiais de telefone
  convertNumbers?: boolean; // Converter strings para números quando possível
  convertDates?: boolean; // Converter strings para objetos Date quando possível
  convertBooleans?: boolean; // Converter strings para booleanos
  sanitizeHtml?: boolean; // Remover HTML potencialmente perigoso
  maxLength?: number; // Comprimento máximo para strings (truncar se exceder)
  customTransformers?: Record<string, (value: any) => any>; // Transformadores personalizados
}

// Interface para configurações de validação
export interface ValidationConfig {
  validateRequiredFields: boolean; // Validar campos obrigatórios
  validateTypes: boolean; // Validar tipos de dados
  validateFormats: boolean; // Validar formatos específicos
  validateUniqueness: boolean; // Validar unicidade de campos
  validateBusinessRules: boolean; // Validar regras de negócio
  continueOnError: boolean; // Continuar validando mesmo após encontrar erros
  maxErrorCount: number; // Número máximo de erros antes de interromper
  timeoutMs: number; // Timeout para operações de validação
  enableNormalization: boolean; // Habilitar normalização de valores
  enableCaching: boolean; // Habilitar cache de resultados de validação
}

// Interface para resultado de validação de unicidade
export interface UniquenessCheckResult {
  isUnique: boolean; // Indica se o valor é único
  conflictingIds?: string[]; // IDs dos registros conflitantes (se não for único)
  error?: ValidationError; // Erro ocorrido durante a verificação
}

// Interface para resultado de validação de relacionamento
export interface RelationshipValidationResult {
  isValid: boolean; // Indica se o relacionamento é válido
  relatedRecordId?: string; // ID do registro relacionado (se encontrado)
  error?: ValidationError; // Erro ocorrido durante a validação
}

// Interface para resultado de validação de tipo
export interface TypeValidationResult {
  isValid: boolean; // Indica se o tipo é válido
  convertedValue?: any; // Valor convertido (se conversão foi possível)
  error?: ValidationError; // Erro ocorrido durante a validação
}

// Interface para resultado de validação de formato
export interface FormatValidationResult {
  isValid: boolean; // Indica se o formato é válido
  normalizedValue?: any; // Valor normalizado (se aplicável)
  error?: ValidationError; // Erro ocorrido durante a validação
}