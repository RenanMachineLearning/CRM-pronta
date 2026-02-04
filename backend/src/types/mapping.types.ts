/**
 * Tipos e interfaces para o sistema de mapeamento de campos de importação
 */

// Tipos suportados para campos de entidade
export type FieldType = 
  | 'text'
  | 'number'
  | 'date'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'currency'
  | 'percentage'
  | 'url'
  | 'textarea'
  | 'relationship';

// Tipos de erro de mapeamento
export type MappingErrorType =
  | 'FIELD_NOT_FOUND'
  | 'TYPE_MISMATCH'
  | 'REQUIRED_FIELD_EMPTY'
  | 'INVALID_FORMAT'
  | 'DUPLICATE_MAPPING'
  | 'UNIQUE_VIOLATION'
  | 'PERMISSION_DENIED'
  | 'CUSTOM_VALIDATION_ERROR';

// Nível de severidade de erro
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// Interface para definição de campo
export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  unique?: boolean;
  defaultValue?: any;
  validationRules?: ValidationRule[];
  options?: SelectOption[]; // Para campos do tipo select
  relationship?: RelationshipInfo; // Para campos do tipo relationship
  description?: string;
  custom?: boolean; // Indica se é um campo personalizado
  tenantId?: string; // ID do tenant para campos personalizados
}

// Regras de validação
export interface ValidationRule {
  rule: 'regex' | 'minLength' | 'maxLength' | 'minValue' | 'maxValue' | 'custom';
  value: string | number;
  message: string;
}

// Opções para campos do tipo select
export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

// Informações de relacionamento para campos do tipo relationship
export interface RelationshipInfo {
  entity: string; // Nome da entidade relacionada
  field: string; // Campo na entidade relacionada
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
}

// Interface para mapeamento de campo
export interface FieldMapping {
  columnIndex: number; // Índice da coluna no arquivo (0-based)
  fieldName: string; // Nome do campo na entidade
  required: boolean; // Indica se o campo é obrigatório
  fieldType?: FieldType; // Tipo do campo (opcional, para validação)
  transformFn?: string; // Função de transformação personalizada (nome)
  defaultValue?: any; // Valor padrão se coluna estiver vazia
  validationOverride?: ValidationRule[]; // Regras de validação específicas para este mapeamento
}

// Interface para resultado de validação de mapeamento
export interface MappingValidationResult {
  isValid: boolean;
  errors: MappingError[];
  warnings: MappingError[];
  suggestions?: FieldMappingSuggestion[]; // Sugestões de mapeamento automático
}

// Interface para erro de mapeamento
export interface MappingError {
  type: MappingErrorType;
  severity: ErrorSeverity;
  field?: string; // Nome do campo envolvido
  column?: number; // Índice da coluna envolvida
  row?: number; // Número da linha (se aplicável)
  message: string;
  details?: any; // Detalhes adicionais específicos do erro
}

// Interface para sugestão de mapeamento
export interface FieldMappingSuggestion {
  columnIndex: number;
  fieldName: string;
  confidence: number; // 0-1, nível de confiança na sugestão
  reason: string; // Motivo da sugestão
}

// Interface para preview de mapeamento
export interface MappingPreview {
  previewRows: MappedRow[];
  stats: MappingStats;
  errors: MappingError[];
  warnings: MappingError[];
}

// Interface para linha mapeada
export interface MappedRow {
  rowIndex: number; // Índice da linha no arquivo original
  originalData: any[]; // Dados originais da linha
  mappedData: Record<string, any>; // Dados mapeados para campos da entidade
  errors: MappingError[]; // Erros específicos desta linha
  isValid: boolean; // Indica se a linha é válida para importação
}

// Interface para estatísticas de mapeamento
export interface MappingStats {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errorCount: number;
  warningCount: number;
  fieldsMapped: number;
  fieldsUnmapped: number;
  processingTimeMs: number;
}

// Interface para solicitação de mapeamento
export interface MappingRequest {
  fileId: string; // ID do arquivo temporário
  entityType: string; // Tipo da entidade (Contact, Company, etc.)
  mappings: FieldMapping[]; // Mapeamentos de campos
  previewRowCount?: number; // Número de linhas para preview (padrão: 5)
  validateOnly?: boolean; // Se true, apenas valida sem retornar preview
}

// Interface para resposta de mapeamento
export interface MappingResponse {
  success: boolean;
  fileId: string;
  entityType: string;
  mappings: FieldMapping[];
  preview?: MappingPreview;
  validation: MappingValidationResult;
  timestamp: Date;
}

// Interface para perfil de mapeamento (salvo para reutilização)
export interface MappingProfile {
  id: string;
  name: string;
  tenantId: string;
  userId: string;
  entityType: string;
  mappings: FieldMapping[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  description?: string;
}

// Interface para configurações de mapeamento
export interface MappingConfig {
  maxPreviewRows: number; // Máximo de linhas para preview
  maxMappingsPerRequest: number; // Máximo de mapeamentos por requisição
  enableAutoSuggestions: boolean; // Habilitar sugestões automáticas
  enableTransformFunctions: boolean; // Habilitar funções de transformação
  validationLevel: 'strict' | 'moderate' | 'relaxed'; // Nível de validação
  timeoutMs: number; // Timeout para operações de mapeamento
}